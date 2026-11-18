import React, { useState, useEffect } from 'react';
import { authAPI, resumeAPI } from '../../api/auth';
import { Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const Settings: React.FC = () => {
  const toast = useToast();
  const [preferredLocations, setPreferredLocations] = useState<string[]>(['Remote']);
  const [newLocation, setNewLocation] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [minMatchScore, setMinMatchScore] = useState(55);
  
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');

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
        if (profile.whatsappEnabled !== undefined) setWhatsappEnabled(Boolean(profile.whatsappEnabled));
        if (profile.whatsappPhone) setWhatsappPhone(profile.whatsappPhone);
        if (profile.whatsappApiKey) setWhatsappApiKey(profile.whatsappApiKey);
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
      await authAPI.updateProfile({
        preferredLocations,
        minMatchScore,
        employmentType: 'Full-Time',
        telegramEnabled,
        emailEnabled,
        autoApplyEnabled,
        whatsappEnabled,
        whatsappPhone,
        whatsappApiKey,
      });
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
      setSaveMessage(`Uploaded ${file.name} successfully.`);
      toast.success(`"${file.name}" uploaded and parsed successfully!`);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      console.error('Resume upload failed', err);
      setSaveMessage('Failed to upload resume.');
      toast.error(err?.response?.data?.error || 'Failed to upload resume.');
    } finally {
      setUploadingResume(false);
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
          <div className="section-title">Settings</div>
          <div className="section-sub">Customize your job hunt preferences</div>
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
          
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-name">Hourly Auto-Apply (Default ON)</div>
              <div className="toggle-desc">Runs every 1 hour · discovers Remote-first roles, tailors resume &amp; verifies external submission</div>
            </div>
            <div className={`toggle ${autoApplyEnabled ? 'on' : ''}`} onClick={() => setAutoApplyEnabled(!autoApplyEnabled)}>
              <div className="toggle-dot"></div>
            </div>
          </div>

          <div className="toggle-row" style={{ borderBottom: whatsappEnabled ? 'none' : undefined }}>
            <div className="toggle-info">
              <div className="toggle-name">WhatsApp Reports (CallMeBot Free API)</div>
              <div className="toggle-desc">Automatically message your WhatsApp after every hourly run with verified proof &amp; links</div>
            </div>
            <div className={`toggle ${whatsappEnabled ? 'on' : ''}`} onClick={() => setWhatsappEnabled(!whatsappEnabled)}>
              <div className="toggle-dot"></div>
            </div>
          </div>

          {whatsappEnabled && (
            <div style={{ marginTop: '10px', padding: '12px', borderRadius: '10px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.22)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginBottom: '10px', lineHeight: 1.5 }}>
                Free 30-second setup: Save <strong>+34 644 71 98 39</strong> on WhatsApp, send{' '}
                <code style={{ color: '#4ade80' }}>I allow callmebot to send me messages</code>, then paste your number &amp; API key below:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  className="neumo-input"
                  placeholder="WhatsApp Phone (e.g. +919876543210)"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                />
                <input
                  type="text"
                  className="neumo-input"
                  placeholder="CallMeBot API Key"
                  value={whatsappApiKey}
                  onChange={(e) => setWhatsappApiKey(e.target.value)}
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

      <button className="save-btn" onClick={handleSave} disabled={saving}>
        <Save size={15} />
        {saving ? 'Saving...' : 'Save settings'}
      </button>
    </div>
  );
};

export default Settings;
