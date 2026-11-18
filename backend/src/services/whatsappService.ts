import axios from 'axios';
import { logger } from '../utils/logger.js';

export interface WhatsAppSendResult {
  sent: boolean;
  provider?: 'callmebot' | 'twilio' | 'meta';
  error?: string;
}

export interface WhatsAppConfig {
  phone?: string | null;
  apiKey?: string | null;
}

export class WhatsAppService {
  /**
   * Sends a real WhatsApp message using CallMeBot Free API (or Twilio/Meta if configured).
   * To activate CallMeBot: add +34 644 71 98 39 on WhatsApp and send "I allow callmebot to send me messages".
   */
  async sendMessage(message: string, config?: WhatsAppConfig): Promise<WhatsAppSendResult> {
    const rawPhone = (config?.phone || process.env.WHATSAPP_PHONE || '').replace(/[^0-9+]/g, '');
    const apiKey = (config?.apiKey || process.env.CALLMEBOT_API_KEY || '').trim();

    // 1. Meta WhatsApp Cloud API (if configured via env)
    if (process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && rawPhone) {
      try {
        const cleanDigits = rawPhone.replace(/^\+/, '');
        await axios.post(
          `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: 'whatsapp',
            to: cleanDigits,
            type: 'text',
            text: { body: message.slice(0, 4000) },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
        logger.info(`WhatsApp message sent via Meta Cloud API to ${rawPhone}`);
        return { sent: true, provider: 'meta' };
      } catch (err: any) {
        logger.error('Meta WhatsApp delivery failed', err?.response?.data || err?.message);
      }
    }

    // 2. CallMeBot Free WhatsApp API
    if (rawPhone && apiKey) {
      try {
        const encodedText = encodeURIComponent(message.slice(0, 1500));
        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(rawPhone)}&text=${encodedText}&apikey=${encodeURIComponent(apiKey)}`;
        const res = await axios.get(url, { timeout: 15000 });
        logger.info(`WhatsApp message sent via CallMeBot to ${rawPhone}`, { status: res.status });
        return { sent: true, provider: 'callmebot' };
      } catch (err: any) {
        const msg = err?.response?.data || err?.message || 'CallMeBot delivery failed';
        logger.error('CallMeBot WhatsApp delivery failed', { phone: rawPhone, error: msg });
        return { sent: false, provider: 'callmebot', error: String(msg) };
      }
    }

    return {
      sent: false,
      error: 'WhatsApp not configured yet (add your phone & CallMeBot API key in Settings)',
    };
  }

  buildRunSummaryMessage(items: Array<{
    jobTitle: string;
    companyName: string;
    matchScore: number;
    externalStatus: string;
    applyUrl?: string;
    reason?: string;
  }>, appUrl: string): string {
    const verified = items.filter(
      (i) => i.externalStatus === 'VERIFIED_ATS_SUBMITTED' || i.externalStatus === 'VERIFIED_EMAIL_SENT'
    );
    const manual = items.filter(
      (i) => i.externalStatus !== 'VERIFIED_ATS_SUBMITTED' && i.externalStatus !== 'VERIFIED_EMAIL_SENT'
    );

    const lines: string[] = [
      `AutoApply AI Hourly Report`,
      `Verified Externally Submitted: ${verified.length}`,
      `AI Prepared (1-Click Apply): ${manual.length}`,
      ``,
    ];

    if (verified.length > 0) {
      lines.push(`VERIFIED APPLIED:`);
      verified.slice(0, 5).forEach((item, idx) => {
        lines.push(`${idx + 1}. ${item.jobTitle} @ ${item.companyName} (${item.matchScore}%)`);
      });
      lines.push(``);
    }

    if (manual.length > 0) {
      lines.push(`READY FOR 1-CLICK APPLY (Tailored Resume + Cover Letter ready):`);
      manual.slice(0, 5).forEach((item, idx) => {
        lines.push(`${idx + 1}. ${item.jobTitle} @ ${item.companyName} (${item.matchScore}%) - ${item.applyUrl || appUrl}`);
      });
      lines.push(``);
    }

    lines.push(`View Proof & Screenshots: ${appUrl}/applications`);
    return lines.join('\n');
  }
}

export const whatsappService = new WhatsAppService();
