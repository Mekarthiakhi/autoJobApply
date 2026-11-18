import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  Copy,
  Download,
  RefreshCw,
  MessageCircle,
  X,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import { applicationsAPI } from '../../api/auth';
import { useToast } from '../../context/ToastContext';

interface ParsedProof {
  method?: string;
  verified?: boolean;
  atsPlatform?: string;
  finalUrl?: string;
  screenshotFile?: string | null;
  screenshotUrl?: string | null;
  confirmationText?: string | null;
  emailMessageId?: string | null;
  recruiterEmail?: string | null;
  missingFields?: string[];
  reason?: string;
  attemptedAt?: string;
}

function parseProof(raw: any): ParsedProof {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function isExternallyVerified(app: any): boolean {
  const s = app.external_status || '';
  return (
    s === 'VERIFIED_ATS_SUBMITTED' ||
    s === 'VERIFIED_EMAIL_SENT' ||
    s === 'USER_CONFIRMED_APPLIED'
  );
}

export const ApplicationsList: React.FC = () => {
  const toast = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await applicationsAPI.getApplications();
      const list = Array.isArray(response.data) ? response.data : [];
      setApplications(list);
      if (selectedApp) {
        const updated = list.find((item: any) => item.id === selectedApp.id);
        if (updated) setSelectedApp(updated);
      }
    } catch (error) {
      console.error('Failed to fetch applications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const verifiedCount = applications.filter((a) => isExternallyVerified(a)).length;
  const manualNeededCount = applications.filter(
    (a) => !isExternallyVerified(a) && a.status !== 'rejected'
  ).length;
  const interviewsCount = applications.filter((a) => a.status === 'interview').length;
  const offersCount = applications.filter((a) => a.status === 'offer').length;

  const filteredApps = applications.filter((app) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'verified') return isExternallyVerified(app);
    if (filterStatus === 'manual') return !isExternallyVerified(app) && app.status !== 'rejected';
    return app.status === filterStatus;
  });

  const handleVerifySubmit = async (app: any) => {
    setVerifyingId(app.id);
    try {
      toast.info(`Checking & attempting external submission on ${app.company_name}...`);
      const res = await applicationsAPI.verifySubmit(app.id);
      await fetchApplications();
      if (res.data?.verified) {
        toast.success(`Verified externally submitted to ${app.company_name}! Check proof screenshot & your Gmail.`);
      } else {
        toast.info(res.data?.proof?.reason || 'External portal requires 1-click manual completion. Open View Proof to see screenshot.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Verification attempt failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleConfirmApplied = async (app: any) => {
    setConfirmingId(app.id);
    try {
      await applicationsAPI.confirmApplied(app.id);
      await fetchApplications();
      toast.success(`Marked "${app.job_title || app.title}" as confirmed applied!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update status');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSendWhatsApp = async () => {
    setSendingWhatsApp(true);
    try {
      const res = await applicationsAPI.notifyWhatsApp();
      if (res.data?.sent) {
        toast.success('WhatsApp summary sent automatically to your phone!');
      } else if (res.data?.whatsappShareUrl) {
        window.open(res.data.whatsappShareUrl, '_blank', 'noopener,noreferrer');
        toast.info('Opened WhatsApp with your verified application summary. Add your CallMeBot key in Settings for automatic hourly WhatsApp messages.');
      }
    } catch (err: any) {
      toast.error('Failed to build WhatsApp summary');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleCopyCoverLetter = (text: string) => {
    navigator.clipboard.writeText(text || '');
    toast.success('Cover letter copied to clipboard!');
  };

  const handleDownloadResume = (app: any) => {
    const content = app.resume_content || 'Tailored resume not available';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(app.company_name || 'Company').replace(/[^a-zA-Z0-9]+/g, '_')}_Tailored_Resume.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded tailored resume!');
  };

  const getBadge = (app: any) => {
    const ext = app.external_status || '';
    if (ext === 'VERIFIED_ATS_SUBMITTED') {
      return {
        label: 'Verified Applied (ATS)',
        color: '#34d399',
        bg: 'rgba(16, 185, 129, 0.14)',
        border: 'rgba(16, 185, 129, 0.35)',
        icon: <ShieldCheck size={13} />,
      };
    }
    if (ext === 'VERIFIED_EMAIL_SENT') {
      return {
        label: 'Verified Applied (Email)',
        color: '#34d399',
        bg: 'rgba(16, 185, 129, 0.14)',
        border: 'rgba(16, 185, 129, 0.35)',
        icon: <Mail size={13} />,
      };
    }
    if (ext === 'USER_CONFIRMED_APPLIED') {
      return {
        label: 'Confirmed Applied',
        color: '#60a5fa',
        bg: 'rgba(59, 130, 246, 0.14)',
        border: 'rgba(59, 130, 246, 0.35)',
        icon: <CheckCircle2 size={13} />,
      };
    }
    return {
      label: 'AI Prepared · 1-Click Apply',
      color: '#fbbf24',
      bg: 'rgba(245, 158, 11, 0.14)',
      border: 'rgba(245, 158, 11, 0.35)',
      icon: <AlertCircle size={13} />,
    };
  };

  const getLogoColor = (companyName: string) => {
    if (!companyName) return { bg: 'rgba(255,255,255,0.1)', color: '#FFFFFF' };
    const colors = [
      { bg: 'rgba(0,119,255,0.12)', color: '#60A5FA' },
      { bg: 'rgba(255,165,0,0.12)', color: '#FBBF24' },
      { bg: 'rgba(108,99,255,0.15)', color: '#A5A0FF' },
      { bg: 'rgba(74,222,128,0.1)', color: '#4ADE80' },
    ];
    return colors[companyName.length % colors.length];
  };

  if (loading && applications.length === 0) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6C63FF]"></div>
      </div>
    );
  }

  const selectedProof = selectedApp ? parseProof(selectedApp.submission_proof) : {};
  const selectedScreenshotUrl =
    selectedProof.screenshotUrl ||
    (selectedApp?.screenshot_path && !selectedApp.screenshot_path.includes('/') && !selectedApp.screenshot_path.includes('\\')
      ? `/api/screenshots/${selectedApp.screenshot_path}`
      : null);

  return (
    <div className="content max-w-7xl mx-auto px-6 md:px-8 py-6 md:py-8 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">My Applications &amp; Proof</h1>
          <p className="text-sm text-gray-400 mt-1">
            {verifiedCount} externally verified · {manualNeededCount} AI-prepared with tailored resume &amp; cover letter ready
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSendWhatsApp}
            disabled={sendingWhatsApp || applications.length === 0}
            className="neumo-btn"
            style={{ borderColor: 'rgba(34, 197, 94, 0.4)', color: '#4ade80' }}
          >
            <MessageCircle size={15} />
            {sendingWhatsApp ? 'Sending...' : 'Send to WhatsApp'}
          </button>
          <button onClick={fetchApplications} className="neumo-btn">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Honest Verification Explanation Banner */}
      <div className="neumo-card p-4 border border-indigo-500/25 bg-indigo-950/20 text-xs text-gray-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <strong className="text-white">How to verify a genuine application:</strong>{' '}
          <span className="text-emerald-400 font-semibold">Verified Applied</span> means our agent genuinely submitted on the company ATS (with live confirmation screenshot) or emailed the recruiter directly (check your Gmail for company confirmation).{' '}
          <span className="text-amber-400 font-semibold">AI Prepared · 1-Click Apply</span> means the external site has login, CAPTCHA, or custom questions — click <strong>View Proof &amp; Kit</strong> to grab your tailored resume + cover letter and submit directly.
        </div>
      </div>

      {/* Stat Strip */}
      <div className="stat-strip">
        <div className="stat-cell">
          <div className="stat-label">Verified Applied</div>
          <div className="stat-val green">{verifiedCount}</div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">AI Prepared (1-Click)</div>
          <div className="stat-val amber">{manualNeededCount}</div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">Interviews</div>
          <div className="stat-val">{interviewsCount}</div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">Offers</div>
          <div className="stat-val green">{offersCount}</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'all', label: `All (${applications.length})` },
          { key: 'verified', label: `Verified Applied (${verifiedCount})` },
          { key: 'manual', label: `1-Click Apply Needed (${manualNeededCount})` },
          { key: 'interview', label: `Interviews (${interviewsCount})` },
          { key: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={filterStatus === tab.key ? 'neumo-btn-primary' : 'neumo-btn'}
            style={{ padding: '7px 14px', fontSize: '12px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Application Rows */}
      <div className="space-y-3">
        {filteredApps.length > 0 ? (
          filteredApps.map((app) => {
            const proof = parseProof(app.submission_proof);
            const badge = getBadge(app);
            const logoColor = getLogoColor(app.company_name);
            const targetUrl = proof.finalUrl || app.apply_url;
            const verified = isExternallyVerified(app);

            return (
              <div
                key={app.id}
                className="neumo-card p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                style={{ opacity: app.status === 'rejected' ? 0.55 : 1 }}
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div
                    className="job-logo shrink-0"
                    style={{ background: logoColor.bg, color: logoColor.color }}
                  >
                    {app.company_name ? app.company_name.substring(0, 2).toUpperCase() : 'NA'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-base">
                        {app.title || app.job_title}
                      </span>
                      <span className="text-gray-400 text-sm">· {app.company_name || 'Company'}</span>
                      {typeof app.match_score === 'number' && app.match_score > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold">
                          {Math.round(app.match_score)}% match
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                      <span>{app.location || 'Remote'}</span>
                      {proof.atsPlatform && <span>· {proof.atsPlatform}</span>}
                      {app.source && <span>· Portal: {app.source}</span>}
                      <span>
                        · {new Date(app.verified_at || app.updated_at || app.applied_at || Date.now()).toLocaleString()}
                      </span>
                    </div>

                    {(proof.confirmationText || proof.reason || app.notes) && (
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                        {proof.confirmationText || proof.reason || app.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Status + Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center gap-2 shrink-0">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{
                      color: badge.color,
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="neumo-btn"
                      style={{ padding: '7px 12px', fontSize: '12px' }}
                    >
                      <Eye size={13} />
                      View Proof &amp; Kit
                    </button>

                    {targetUrl && (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="neumo-btn-primary"
                        style={{ padding: '7px 12px', fontSize: '12px' }}
                      >
                        <ExternalLink size={13} />
                        Open Site
                      </a>
                    )}

                    {!verified && (
                      <>
                        <button
                          onClick={() => handleVerifySubmit(app)}
                          disabled={verifyingId === app.id}
                          className="neumo-btn"
                          style={{ padding: '7px 12px', fontSize: '12px' }}
                          title="Attempt live Playwright/Email external submission and capture proof screenshot"
                        >
                          <RefreshCw size={13} className={verifyingId === app.id ? 'animate-spin' : ''} />
                          {verifyingId === app.id ? 'Checking...' : 'Auto-Submit'}
                        </button>
                        <button
                          onClick={() => handleConfirmApplied(app)}
                          disabled={confirmingId === app.id}
                          className="neumo-btn"
                          style={{ padding: '7px 12px', fontSize: '12px', color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.35)' }}
                        >
                          <CheckCircle2 size={13} />
                          Mark Applied
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="neumo-card p-10 text-center text-gray-400 text-sm">
            No applications match this filter yet. Run job discovery from Dashboard or wait for the hourly auto-apply scheduler.
          </div>
        )}
      </div>

      {/* Proof & AI Application Kit Modal */}
      {selectedApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 7, 15, 0.82)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="neumo-card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-white">
                  {selectedApp.title || selectedApp.job_title} · {selectedApp.company_name}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Platform: {selectedProof.atsPlatform || selectedApp.source || 'External Portal'} ·{' '}
                  {selectedApp.verified_at
                    ? `Verified ${new Date(selectedApp.verified_at).toLocaleString()}`
                    : `Checked ${new Date(selectedProof.attemptedAt || selectedApp.updated_at || Date.now()).toLocaleString()}`}
                </p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="neumo-btn p-2">
                <X size={16} />
              </button>
            </div>

            {/* Proof Details Box */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 text-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  External Verification Proof
                </span>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    color: isExternallyVerified(selectedApp) ? '#34d399' : '#fbbf24',
                    background: isExternallyVerified(selectedApp) ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)',
                  }}
                >
                  {selectedApp.external_status || 'AI_PREPARED'}
                </span>
              </div>
              <p className="text-gray-200 text-xs leading-relaxed">
                {selectedProof.confirmationText || selectedProof.reason || selectedApp.notes || 'Prepared by AI agent.'}
              </p>
              {selectedProof.emailMessageId && (
                <p className="text-xs text-emerald-400">
                  Email Delivery Proof ID: <code>{selectedProof.emailMessageId}</code> → {selectedProof.recruiterEmail}
                </p>
              )}
              {(selectedProof.finalUrl || selectedApp.apply_url) && (
                <a
                  href={selectedProof.finalUrl || selectedApp.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 underline break-all"
                >
                  <ExternalLink size={12} />
                  {selectedProof.finalUrl || selectedApp.apply_url}
                </a>
              )}
            </div>

            {/* Live Captured Company Page / Confirmation Screenshot */}
            {selectedScreenshotUrl && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Live Captured Company Page Screenshot
                </div>
                <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
                  <img
                    src={selectedScreenshotUrl}
                    alt="External application verification screenshot"
                    className="w-full h-auto max-h-[360px] object-contain"
                  />
                </div>
              </div>
            )}

            {/* Cover Letter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Gemini AI Cover Letter
                </span>
                {selectedApp.cover_letter_content && (
                  <button
                    onClick={() => handleCopyCoverLetter(selectedApp.cover_letter_content)}
                    className="neumo-btn"
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                  >
                    <Copy size={12} />
                    Copy Cover Letter
                  </button>
                )}
              </div>
              <div className="p-4 rounded-xl bg-[#0D0E1A] border border-white/10 text-xs text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {selectedApp.cover_letter_content || 'No cover letter generated for this application yet.'}
              </div>
            </div>

            {/* Tailored Resume */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-white/10">
              <div className="text-xs text-gray-400">
                Tailored Resume: <strong className="text-white">{selectedApp.resume_version_label || 'Default Resume'}</strong>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleDownloadResume(selectedApp)}
                  className="neumo-btn"
                  style={{ padding: '7px 12px', fontSize: '12px' }}
                >
                  <Download size={13} />
                  Download Tailored Resume
                </button>
                {(selectedProof.finalUrl || selectedApp.apply_url) && (
                  <a
                    href={selectedProof.finalUrl || selectedApp.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neumo-btn-primary"
                    style={{ padding: '7px 14px', fontSize: '12px' }}
                  >
                    <ExternalLink size={13} />
                    Open Company Apply Page
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsList;
