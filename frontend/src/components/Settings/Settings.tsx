import React, { useState, useEffect } from 'react';
import { authAPI } from '../../api/auth';
import { Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const [preferredLocations, setPreferredLocations] = useState(['Remote', 'Hyderabad', 'Bangalore']);
  const [newLocation, setNewLocation] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [minMatchScore, setMinMatchScore] = useState(80);
  
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authAPI.getProfile();
        const profile = response.data;
        if (profile.preferredLocations) setPreferredLocations(profile.preferredLocations);
        if (profile.minMatchScore) setMinMatchScore(profile.minMatchScore);
        if (profile.telegramEnabled !== undefined) setTelegramEnabled(profile.telegramEnabled);
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await authAPI.updateProfile({
        preferredLocations,
        minMatchScore,
        employmentType: 'Full-Time',
      });
      setTimeout(() => setSaving(false), 1000); // Mock success
    } catch (error) {
      console.error(error);
      setSaving(false);
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
            {preferredLocations.map((location) => (
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
              <div className="toggle-name">Auto-apply</div>
              <div className="toggle-desc">Apply automatically above 90% match</div>
            </div>
            <div className={`toggle ${autoApplyEnabled ? 'on' : ''}`} onClick={() => setAutoApplyEnabled(!autoApplyEnabled)}>
              <div className="toggle-dot"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="setting-section" style={{ marginBottom: '20px' }}>
        <div className="setting-title">Resume</div>
        <div className="drop-zone relative">
          <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.docx,.doc" />
          <div className="drop-icon">📄</div>
          <div className="drop-text"><strong>Drop your resume here</strong> or click to browse</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '6px' }}>
            PDF, DOCX · max 5 MB · used for AI match scoring
          </div>
        </div>
      </div>

      <button className="save-btn" onClick={handleSave} disabled={saving}>
        <Save size={15} />
        {saving ? 'Saving...' : 'Save settings'}
      </button>
    </div>
  );
};

export default Settings;
