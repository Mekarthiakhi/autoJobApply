import tls from 'tls';
import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { whatsappService } from './whatsappService.js';
import { sendMail } from '../utils/email.js';

export interface ImapConfig {
  host: string;
  port?: number;
  email: string;
  password: string;
}

export interface InboxMessageHeader {
  from: string;
  subject: string;
  date: string;
}

export interface CompanyReplyMatch {
  applicationId: string;
  companyName: string;
  jobTitle: string;
  replyStatus: 'APPLICATION_CONFIRMED' | 'INTERVIEW_INVITE' | 'REJECTED' | 'COMPANY_REPLIED';
  subject: string;
  from: string;
  date: string;
}

export interface ReplyCheckResult {
  checked: boolean;
  messagesScanned: number;
  matchesFound: CompanyReplyMatch[];
  error?: string;
}

/**
 * Lightweight zero-dependency TLS IMAP client (works with Gmail App Passwords, Outlook, Yahoo, Zoho, Fastmail).
 * Strictly read-only (EXAMINE INBOX) — never modifies or deletes any user emails.
 */
async function fetchRecentInboxHeaders(config: ImapConfig, limit = 40): Promise<InboxMessageHeader[]> {
  return new Promise((resolve, reject) => {
    const port = config.port || 993;
    const socket = tls.connect({ host: config.host, port, rejectUnauthorized: true }, () => {});
    socket.setTimeout(15000);

    let buffer = '';
    let step = 0;
    let totalMessages = 0;
    const headers: InboxMessageHeader[] = [];
    let finished = false;

    const finish = (err?: Error) => {
      if (finished) return;
      finished = true;
      try {
        socket.write('A5 LOGOUT\r\n');
        socket.end();
      } catch {}
      if (err) reject(err);
      else resolve(headers);
    };

    socket.on('timeout', () => finish(new Error('IMAP connection timed out')));
    socket.on('error', (err) => finish(err));

    const escapeImapStr = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');

      if (step === 0 && buffer.includes('\r\n')) {
        buffer = '';
        step = 1;
        socket.write(`A1 LOGIN ${escapeImapStr(config.email)} ${escapeImapStr(config.password)}\r\n`);
        return;
      }

      if (step === 1 && buffer.includes('A1 ')) {
        if (buffer.includes('A1 OK')) {
          buffer = '';
          step = 2;
          socket.write('A2 EXAMINE INBOX\r\n');
        } else {
          finish(new Error('IMAP login failed — check your email and App Password (for Gmail, create a 16-char App Password under Google Account → Security → App Passwords).'));
        }
        return;
      }

      if (step === 2 && buffer.includes('A2 ')) {
        if (buffer.includes('A2 OK')) {
          const existsMatch = buffer.match(/\*\s+(\d+)\s+EXISTS/i);
          totalMessages = existsMatch ? parseInt(existsMatch[1], 10) : 0;
          buffer = '';
          if (totalMessages === 0) {
            finish();
            return;
          }
          const start = Math.max(1, totalMessages - limit + 1);
          step = 3;
          socket.write(`A3 FETCH ${start}:${totalMessages} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])\r\n`);
        } else {
          finish(new Error('Failed to open INBOX'));
        }
        return;
      }

      if (step === 3 && buffer.includes('A3 ')) {
        // Parse individual FETCH blocks
        const blocks = buffer.split(/\*\s+\d+\s+FETCH\s+/i).slice(1);
        for (const block of blocks) {
          const fromMatch = block.match(/^From:\s*(.+)$/im);
          const subjectMatch = block.match(/^Subject:\s*(.+)$/im);
          const dateMatch = block.match(/^Date:\s*(.+)$/im);
          if (fromMatch || subjectMatch) {
            headers.push({
              from: (fromMatch?.[1] || '').trim(),
              subject: (subjectMatch?.[1] || '').trim(),
              date: (dateMatch?.[1] || '').trim(),
            });
          }
        }
        finish();
      }
    });
  });
}

function classifyEmailReply(subject: string): CompanyReplyMatch['replyStatus'] {
  const s = (subject || '').toLowerCase();
  if (/interview|schedule|invitation|assessment|coding\s+challenge|technical\s+round|next\s+step|phone\s+screen|hiring\s+manager/i.test(s)) {
    return 'INTERVIEW_INVITE';
  }
  if (/unfortunately|not\s+moving\s+forward|regret|position\s+filled|other\s+candidates|application\s+update.*not/i.test(s)) {
    return 'REJECTED';
  }
  if (/thank\s+you\s+for\s+applying|thanks\s+for\s+applying|application\s+received|received\s+your\s+application|application\s+submitted|we\s+got\s+your\s+application|confirmation/i.test(s)) {
    return 'APPLICATION_CONFIRMED';
  }
  return 'COMPANY_REPLIED';
}

export class CompanyReplyTracker {
  /**
   * Scans the user's configured IMAP inbox (read-only) for real replies & confirmation emails
   * from companies the user has applied to, updates DB status, and sends WhatsApp/Email alerts.
   */
  async checkUserReplies(userId: string): Promise<ReplyCheckResult> {
    const db = await getDatabase();
    const settings = await db.get<any>(
      `SELECT imap_enabled, imap_email, imap_password, imap_host, whatsapp_enabled, whatsapp_phone, whatsapp_api_key, email_notifications
       FROM automation_settings WHERE user_id = ?`,
      [userId]
    );

    const imapEmail = settings?.imap_email || process.env.IMAP_EMAIL || '';
    const imapPassword = (settings?.imap_password || process.env.IMAP_PASSWORD || '').replace(/\s+/g, '');
    const imapHost = settings?.imap_host || process.env.IMAP_HOST || 'imap.gmail.com';

    if (!imapEmail || !imapPassword) {
      return {
        checked: false,
        messagesScanned: 0,
        matchesFound: [],
        error: 'Inbox Reply Tracker is not configured yet. Add your email + App Password in Settings → Company Reply Tracker to automatically detect company confirmations & interview invites.',
      };
    }

    try {
      const headers = await fetchRecentInboxHeaders({ host: imapHost, email: imapEmail, password: imapPassword }, 50);
      const apps = await db.all<any[]>(
        `SELECT a.id, a.job_id, a.company_reply_status, a.company_reply_subject, j.title as job_title, j.company_name
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE a.user_id = ?`,
        [userId]
      );

      const matchesFound: CompanyReplyMatch[] = [];
      const newlyDetected: CompanyReplyMatch[] = [];

      for (const app of apps || []) {
        const companyRaw = (app.company_name || '').trim();
        if (companyRaw.length < 2) continue;
        // Clean company token for matching (e.g. "Virtual Vocations Inc" -> "virtual vocations")
        const companyToken = companyRaw
          .toLowerCase()
          .replace(/\b(inc|llc|ltd|corp|corporation|technologies|tech|labs|solutions|pvt|private|limited)\b/g, '')
          .replace(/[^a-z0-9\s]/g, '')
          .trim();
        const compactToken = companyToken.replace(/\s+/g, '');
        if (companyToken.length < 3) continue;

        // Find matching email from this company (newest first)
        const reversed = [...headers].reverse();
        const matchedMsg = reversed.find((h) => {
          const hay = `${h.from} ${h.subject}`.toLowerCase();
          // Ignore AutoApply's own digest emails
          if (hay.includes('autoapply ai') || hay.includes('autoapply report')) return false;
          return hay.includes(companyToken) || (compactToken.length >= 4 && hay.includes(compactToken));
        });

        if (!matchedMsg) continue;

        const replyStatus = classifyEmailReply(matchedMsg.subject);
        const matchObj: CompanyReplyMatch = {
          applicationId: app.id,
          companyName: app.company_name,
          jobTitle: app.job_title,
          replyStatus,
          subject: matchedMsg.subject,
          from: matchedMsg.from,
          date: matchedMsg.date || new Date().toISOString(),
        };
        matchesFound.push(matchObj);

        const isNewReply = app.company_reply_subject !== matchedMsg.subject;
        if (isNewReply) {
          newlyDetected.push(matchObj);
          const nextStatus =
            replyStatus === 'INTERVIEW_INVITE'
              ? 'interview'
              : replyStatus === 'REJECTED'
              ? 'rejected'
              : 'applied';
          const nextExternalStatus =
            replyStatus === 'APPLICATION_CONFIRMED' || replyStatus === 'INTERVIEW_INVITE'
              ? 'VERIFIED_COMPANY_EMAIL_CONFIRMED'
              : undefined;

          await db.run(
            `UPDATE applications
             SET company_reply_status = ?,
                 company_reply_subject = ?,
                 company_reply_from = ?,
                 company_reply_at = CURRENT_TIMESTAMP,
                 status = ?,
                 interview_scheduled = CASE WHEN ? = 'INTERVIEW_INVITE' THEN 1 ELSE interview_scheduled END,
                 rejected = CASE WHEN ? = 'REJECTED' THEN 1 ELSE rejected END,
                 external_status = COALESCE(?, external_status),
                 verified_at = CASE WHEN ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE verified_at END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`,
            [
              replyStatus,
              matchedMsg.subject.slice(0, 240),
              matchedMsg.from.slice(0, 200),
              nextStatus,
              replyStatus,
              replyStatus,
              nextExternalStatus || null,
              nextExternalStatus || null,
              app.id,
              userId,
            ]
          );
        }
      }

      // Send instant WhatsApp + Email notification when new company replies are detected
      if (newlyDetected.length > 0) {
        const alertLines = [
          `📩 Company Reply Alert (${newlyDetected.length} new)!`,
          ...newlyDetected.map((m) => `• ${m.companyName} (${m.replyStatus.replace(/_/g, ' ')}): "${m.subject}"`),
        ];
        if (settings?.whatsapp_enabled === 1 || (process.env.WHATSAPP_PHONE && process.env.CALLMEBOT_API_KEY)) {
          whatsappService
            .sendMessage(alertLines.join('\n'), {
              phone: settings?.whatsapp_phone,
              apiKey: settings?.whatsapp_api_key,
            })
            .catch(() => {});
        }
        const user = await db.get<{ email: string }>(`SELECT email FROM users WHERE id = ?`, [userId]);
        if (user?.email && settings?.email_notifications !== 0) {
          sendMail({
            to: user.email,
            subject: `Company Reply Detected: ${newlyDetected[0].companyName} (${newlyDetected.length} update${newlyDetected.length > 1 ? 's' : ''})`,
            html: `<h3>Company Replies Detected</h3><ul>${newlyDetected
              .map((m) => `<li><strong>${m.companyName}</strong> (${m.jobTitle}) — <em>${m.replyStatus.replace(/_/g, ' ')}</em>: ${m.subject}</li>`)
              .join('')}</ul>`,
          }).catch(() => {});
        }
      }

      logger.info(`📬 Company reply scan finished for user ${userId}: scanned=${headers.length}, matched=${matchesFound.length}, new=${newlyDetected.length}`);
      return {
        checked: true,
        messagesScanned: headers.length,
        matchesFound,
      };
    } catch (err: any) {
      logger.warn('Company reply IMAP check failed', { userId, error: err?.message });
      return {
        checked: false,
        messagesScanned: 0,
        matchesFound: [],
        error: err?.message || 'Failed to check inbox for company replies',
      };
    }
  }
}

export const companyReplyTracker = new CompanyReplyTracker();
