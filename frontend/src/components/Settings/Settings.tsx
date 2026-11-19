import React, { useState, useEffect } from 'react';
import { authAPI, resumeAPI, applicationsAPI } from '../../api/auth';
import { Save, Send } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';

export const Settings: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const [preferredLocations, setPreferredLocations] = useState<string[]>(['Remote']);
  const [newLocation, setNewLocation] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [minMatchScore, setMinMatchScore] = useState(55);
  
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(true);
  const [autoApplyIntervalHours, setAutoApplyIntervalHours] = useState<number>(1);
  const [activelyHiringOnly, setActivelyHiringOnly] = useState(true);
  const [directApplyFirst, setDirectApplyFirst] = useState(true);
  const [lastAutoApplyRunAt, setLastAutoApplyRunAt] = useState<string | null>(null);
  const [nextAutoApplyRunAt, setNextAutoApplyRunAt] = useState<string | null>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');
  const [imapEnabled, setImapEnabled] = useState(false);
  const [imapEmail, setImapEmail] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  const [imapPasswordConfigured, setImapPasswordConfigured] = useState(false);
  const [imapHost, setImapHost] = useState('imap.gmail.com');
  const [sendingTest, setSendingTest] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [currentResumeName, setCurrentResumeName] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, resumeRes] = await Promise.all([
          authAPI.getProfile(),
          resumeAPI.getResume().catch(() => ({ data: null })),
        ]);
        const profile = profileRes.data;
        if (profile.preferredLocations) {
          let locs = profile.preferredLocations;
          if (typeof locs === 'string') {
            try {
              locs = JSON.parse(locs);
            } catch {
              locs = locs.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          }
          if (Array.isArray(locs)) {
            setPreferredLocations(locs);
          }
        }
        if (typeof profile.minMatchScore === 'number') setMinMatchScore(profile.minMatchScore);
        if (profile.telegramEnabled !== undefined) setTelegramEnabled(Boolean(profile.telegramEnabled));
        if (profile.emailEnabled !== undefined) setEmailEnabled(Boolean(profile.emailEnabled));
        if (profile.autoApplyEnabled !== undefined) setAutoApplyEnabled(Boolean(profile.autoApplyEnabled));
        if (typeof profile.autoApplyIntervalHours === 'number') setAutoApplyIntervalHours(profile.autoApplyIntervalHours);
        if (profile.activelyHiringOnly !== undefined) setActivelyHiringOnly(Boolean(profile.activelyHiringOnly));
        if (profile.directApplyFirst !== undefined) setDirectApplyFirst(Boolean(profile.directApplyFirst));
        if (profile.lastAutoApplyRunAt) setLastAutoApplyRunAt(profile.lastAutoApplyRunAt);
        if (profile.nextAutoApplyRunAt) setNextAutoApplyRunAt(profile.nextAutoApplyRunAt);
        if (profile.whatsappEnabled !== undefined) setWhatsappEnabled(Boolean(profile.whatsappEnabled));
        if (profile.whatsappPhone) setWhatsappPhone(profile.whatsappPhone);
        if (profile.whatsappApiKey) setWhatsappApiKey(profile.whatsappApiKey);
        if (profile.imapEnabled !== undefined) setImapEnabled(Boolean(profile.imapEnabled));
        if (profile.imapEmail) setImapEmail(profile.imapEmail);
        if (profile.imapHost) setImapHost(profile.imapHost);
        if (profile.imapPasswordConfigured) setImapPasswordConfigured(true);
        if (resumeRes.data?.file_name) setCurrentResumeName(resumeRes.data.file_name);
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);
      const saveRes = await authAPI.updateProfile({
        preferredLocations,
        minMatchScore,
        employmentType: 'Full-Time',
        telegramEnabled,
        emailEnabled,
        autoApplyEnabled,
        autoApplyIntervalHours,
        activelyHiringOnly,
        directApplyFirst,
        whatsappEnabled,
        whatsappPhone,
        whatsappApiKey,
        imapEnabled,
        imapEmail,
        imapPassword: imapPassword || undefined,
        imapHost,
      });
      if (saveRes.data?.nextAutoApplyRunAt) setNextAutoApplyRunAt(saveRes.data.nextAutoApplyRunAt);
      if (imapPassword) {
        setImapPasswordConfigured(true);
        setImapPassword('');
      }
      setSaveMessage('Settings saved successfully.');
      toast.success('Settings saved successfully.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setSaveMessage('Failed to save settings.');
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingResume(true);
      const formData = new FormData();
      formData.append('resume', file);
      await resumeAPI.uploadResume(formData);
      setCurrentResumeName(file.name);
      // Immediately refresh profile to load the phone number extracted from this resume
      const profileRes = await authAPI.getProfile().catch(() => ({ data: null }));
      if (profileRes?.data?.whatsappPhone) {
        setWhatsappPhone(profileRes.data.whatsappPhone);
        toast.success(`"${file.name}" uploaded! Auto-detected phone: ${profileRes.data.whatsappPhone}`);
      } else {
        toast.success(`"${file.name}" uploaded and parsed successfully!`);
      }
      setSaveMessage(`Uploaded ${file.name} successfully.`);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      console.error('Resume upload failed', err);
      setSaveMessage('Failed to upload resume.');
      toast.error(err?.response?.data?.error || 'Failed to upload resume.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSendTestReport = async () => {
    try {
      setSendingTest(true);
      const res = await applicationsAPI.sendTestReport({
        phone: whatsappPhone,
        apiKey: whatsappApiKey,
      });
      const emailOk = res.data?.email?.sent;
      const waOk = res.data?.whatsapp?.sent;
      if (emailOk && waOk) {
        toast.success(`Live report delivered to ${res.data.email.to} AND WhatsApp (${res.data.whatsapp.phone})!`);
      } else if (emailOk) {
        toast.success(`Live report emailed to ${res.data.email.to}!${res.data?.whatsapp?.phone ? ` Detected WhatsApp: ${res.data.whatsapp.phone}` : ''}`);
        if (!waOk && res.data?.whatsapp?.whatsappShareUrl) {
          window.open(res.data.whatsapp.whatsappShareUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        toast.error(res.data?.email?.error || 'Could not deliver report email');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send live report');
    } finally {
      setSendingTest(false);
    }
  };

  const addLocation = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newLocation.trim()) {
      if (!preferredLocations.includes(newLocation.trim())) {
        setPreferredLocations([...preferredLocations, newLocation.trim()]);
      }
      setNewLocation('');
      setIsAddingLocation(false);
    }
  };

  return (
    <div className="content fade-in">
      <div className="section-header">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/70 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Active Profile: {user?.fullName || 'Candidate'} ({user?.email})
            </span>
          </div>
          <div className="section-title">Settings</div>
          <div className="section-sub">Customize automation preferences for {user?.fullName || user?.email || 'your account'}</div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="setting-section">
          <div className="setting-title">Job preferences</div>
          
          <div className="slider-label">
            <span>Minimum match score</span>
            <span className="slider-val">{minMatchScore}%</span>
          </div>
          
          {/* Custom Slider replacing native input to match styling exactly */}
          <div className="relative w-full h-6 mb-5 group">
            <input
              type="range"
              min="0"
              max="100"
              value={minMatchScore}
              onChange={(e) => setMinMatchScore(parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="slider-track" style={{ marginTop: '9px', marginBottom: 0 }}>
              <div className="slider-fill" style={{ width: `${minMatchScore}%` }}></div>
              <div className="slider-thumb" style={{ left: `calc(${minMatchScore}% - 9px)` }}></div>
            </div>
          </div>
          
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '16px', marginTop: '-8px' }}>
            Only show jobs above this AI confidence threshold
          </div>
          
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>
            Preferred locations
          </div>
          
          <div className="tag-list">
            {(Array.isArray(preferredLocations) ? preferredLocations : []).map((location) => (
              <div key={location} className="tag">
                {location} 
                <span className="x" onClick={() => setPreferredLocations(preferredLocations.filter((l) => l !== location))}>✕</span>
              </div>
            ))}
            
            {!isAddingLocation ? (
              <div 
                className="tag" 
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.08)', cursor: 'pointer' }}
                onClick={() => setIsAddingLocation(true)}
              >
                + Add location
              </div>
            ) : (
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={addLocation}
                onBlur={() => setIsAddingLocation(false)}
                autoFocus
                placeholder="Type & Enter"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(108,99,255,0.4)',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  color: 'white',
                  fontSize: '12px',
                  outline: 'none',
                  width: '120px'
                }}
              />
            )}
          </div>

          <div style={{ marginTop: '18px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
            <div className="toggle-row" style={{ paddingTop: '6px' }}>
              <div className="toggle-info">
                <div className="toggle-name">Actively Hiring Only (Default ON)</div>
                <div className="toggle-desc">Only apply to fresh active postings (≤ 14–21 days) &amp; auto-skip closed jobs</div>
              </div>
              <div className={`toggle ${activelyHiringOnly ? 'on' : ''}`} onClick={() => setActivelyHiringOnly(!activelyHiringOnly)}>
                <div className="toggle-dot"></div>
              </div>
            </div>

            <div className="toggle-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div className="toggle-info">
                <div className="toggle-name">Direct ATS Auto-Apply First (Default ON)</div>
                <div className="toggle-desc">Prioritize Greenhouse, Ashby, Lever &amp; direct email roles over login-walled portals</div>
              </div>
              <div className={`toggle ${directApplyFirst ? 'on' : ''}`} onClick={() => setDirectApplyFirst(!directApplyFirst)}>
                <div className="toggle-dot"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="setting-section">
          <div className="setting-title">Notifications</div>
          
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-name">Telegram alerts</div>
              <div className="toggle-desc">Get notified when new matches appear</div>
            </div>
            <div className={`toggle ${telegramEnabled ? 'on' : ''}`} onClick={() => setTelegramEnabled(!telegramEnabled)}>
              <div className="toggle-dot"></div>
            </div>
          </div>
          
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-name">Email digest</div>
              <div className="toggle-desc">Daily summary of top matches</div>
            </div>
            <div className={`toggle ${emailEnabled ? 'on' : ''}`} onClick={() => setEmailEnabled(!emailEnabled)}>
              <div className="toggle-dot"></div>
            </div>
          </div>
          
          <div className="toggle-row" style={{ borderBottom: autoApplyEnabled ? 'none' : undefined }}>
            <div className="toggle-info">
              <div className="toggle-name">Scheduled Auto-Apply Cron (Default ON)</div>
              <div className="toggle-desc">
                Runs automatically every {autoApplyIntervalHours} {autoApplyIntervalHours === 1 ? 'hour' : 'hours'} · discovers Remote-first roles, tailors resume &amp; verifies external submission
              </div>
            </div>
            <div className={`toggle ${autoApplyEnabled ? 'on' : ''}`} onClick={() => setAutoApplyEnabled(!autoApplyEnabled)}>
              <div className="toggle-dot"></div>
            </div>
          </div>

          {autoApplyEnabled && (
            <div style={{ marginTop: '10px', marginBottom: '12px', padding: '12px', borderRadius: '10px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.28)' }}>
              <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
                  Apply Frequency Gap (Cron Job)
                </span>
                <code style={{ fontSize: '11px', color: '#a5b4fc', background: 'rgba(13,14,26,0.65)', padding: '2px 8px', borderRadius: '6px' }}>
                  {autoApplyIntervalHours === 1 ? '0 * * * *' : `0 */${autoApplyIntervalHours} * * *`}
                </code>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setAutoApplyIntervalHours(hrs)}
                    className={autoApplyIntervalHours === hrs ? 'neumo-btn-primary' : 'neumo-btn'}
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    Every {hrs} {hrs === 1 ? 'hr' : 'hrs'}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
                {lastAutoApplyRunAt
                  ? `Last cron run: ${new Date(lastAutoApplyRunAt.endsWith('Z') ? lastAutoApplyRunAt : lastAutoApplyRunAt + 'Z').toLocaleString()}${nextAutoApplyRunAt ? ` · Next due: ${new Date(nextAutoApplyRunAt).toLocaleString()}` : ''}`
                  : `Active cron schedule: runs automatically every ${autoApplyIntervalHours} ${autoApplyIntervalHours === 1 ? 'hour' : 'hours'} once saved.`}
              </div>
            </div>
          )}

          <div className="toggle-row" style={{ borderBottom: whatsappEnabled ? 'none' : undefined }}>
            <div className="toggle-info">
              <div className="toggle-name">WhatsApp Reports (Auto-Extracted Phone)</div>
              <div className="toggle-desc">
                {whatsappPhone
                  ? `Phone auto-extracted from resume: ${whatsappPhone} · pushes hourly verified reports`
                  : 'Automatically extracts mobile number from your uploaded resume (upload resume in /resume or below)'}
              </div>
            </div>
            <div className={`toggle ${whatsappEnabled ? 'on' : ''}`} onClick={() => setWhatsappEnabled(!whatsappEnabled)}>
              <div className="toggle-dot"></div>
            </div>
          </div>

          {whatsappEnabled && (
            <div style={{ marginTop: '10px', marginBottom: '12px', padding: '14px', borderRadius: '10px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.22)' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', marginBottom: '10px', lineHeight: 1.6 }}>
                <strong style={{ color: '#4ade80' }}>Free 30-Second Setup to receive WhatsApp alerts:</strong>
                <ol style={{ margin: '6px 0 10px 18px', padding: 0, color: 'rgba(255,255,255,0.75)' }}>
                  <li>
                    <a
                      href="https://wa.me/34644719839?text=I%20allow%20callmebot%20to%20send%20me%20messages"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#22c55e', textDecoration: 'underline', fontWeight: 600 }}
                    >
                      Click here to open WhatsApp (+34 644 71 98 39) ↗
                    </a>
                  </li>
                  <li>
                    Send the pre-filled message: <code style={{ color: '#4ade80', background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: '4px' }}>I allow callmebot to send me messages</code>
                  </li>
                  <li>
                    CallMeBot will reply with your API Key (e.g. <code style={{ color: '#38bdf8' }}>123456</code>). Paste it below and click <strong>Save Settings</strong>.
                  </li>
                </ol>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Your WhatsApp Phone Number</label>
                  <input
                    type="text"
                    className="neumo-input"
                    placeholder="WhatsApp Phone (e.g. +919876543210)"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>CallMeBot API Key (from WhatsApp reply)</label>
                  <input
                    type="text"
                    className="neumo-input"
                    placeholder="e.g. 123456"
                    value={whatsappApiKey}
                    onChange={(e) => setWhatsappApiKey(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '8px' }}>
                {whatsappPhone 
                  ? `✅ Mobile ${whatsappPhone} automatically extracted from your resume. You can also edit it above if needed.`
                  : 'ℹ️ No phone number detected in resume yet. Upload your resume in /resume to auto-detect, or enter your mobile number above.'}
              </div>
            </div>
          )}

          <div className="toggle-row" style={{ borderBottom: imapEnabled ? 'none' : undefined }}>
            <div className="toggle-info">
              <div className="toggle-name">Company Reply Inbox Tracker (Gmail / IMAP)</div>
              <div className="toggle-desc">Read-only inbox scan every hour to detect company confirmation emails, interview invites &amp; rejections</div>
            </div>
            <div className={`toggle ${imapEnabled ? 'on' : ''}`} onClick={() => setImapEnabled(!imapEnabled)}>
              <div className="toggle-dot"></div>
            </div>
          </div>

          {imapEnabled && (
            <div style={{ marginTop: '10px', padding: '12px', borderRadius: '10px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginBottom: '10px', lineHeight: 1.5 }}>
                For Gmail: enable 2-Step Verification → create an <strong>App Password</strong> under Google Account Security and paste it below (strictly read-only):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="email"
                  className="neumo-input"
                  placeholder="Inbox Email"
                  value={imapEmail}
                  onChange={(e) => setImapEmail(e.target.value)}
                />
                <input
                  type="password"
                  className="neumo-input"
                  placeholder={imapPasswordConfigured ? 'App Password saved (leave blank to keep)' : '16-char Gmail App Password'}
                  value={imapPassword}
                  onChange={(e) => setImapPassword(e.target.value)}
                />
                <input
                  type="text"
                  className="neumo-input"
                  placeholder="imap.gmail.com"
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="setting-section" style={{ marginBottom: '20px' }}>
        <div className="setting-title">Resume</div>
        <div className="drop-zone relative">
          <input
            type="file"
            onChange={handleResumeUpload}
            disabled={uploadingResume}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.docx,.doc"
          />
          <div className="drop-icon">📄</div>
          <div className="drop-text">
            {uploadingResume
              ? 'Uploading and parsing resume...'
              : currentResumeName
              ? <>Active resume: <strong>{currentResumeName}</strong> (click to replace)</>
              : <><strong>Drop your resume here</strong> or click to browse</>}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '6px' }}>
            PDF, DOCX · max 5 MB · used for AI match scoring
          </div>
        </div>
      </div>

      {saveMessage && (
        <div style={{ marginBottom: '12px', fontSize: '13px', color: saveMessage.includes('Failed') ? '#f87171' : '#4ade80' }}>
          {saveMessage}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          <Save size={15} />
          {saving ? 'Saving...' : 'Save settings'}
        </button>
        <button className="neumo-btn" onClick={handleSendTestReport} disabled={sendingTest}>
          <Send size={14} />
          {sendingTest ? 'Sending Report...' : 'Send Live Report (Email + WhatsApp)'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
