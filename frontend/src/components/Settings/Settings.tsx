import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './Settings.module.css';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [preferredLocations, setPreferredLocations] = useState(['Remote', 'Hyderabad', 'Bangalore']);
  const [minMatchScore, setMinMatchScore] = useState(80);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');

  const handleSave = async () => {
    // Call API to save settings
    console.log('Settings saved:', { preferredLocations, minMatchScore, telegramEnabled });
  };

  return (
    <div className="settings-container glass-dark">
      <h1 className="settings-title">Settings</h1>
      
      <div className="settings-sections">
        <div className="settings-section glass">
          <h2>Job Preferences</h2>
          <div className="form-group">
            <label>Minimum Match Score</label>
            <div className="range-input">
              <input
                type="range"
                min="0"
                max="100"
                value={minMatchScore}
                onChange={(e) => setMinMatchScore(parseInt(e.target.value))}
                className="range-slider"
              />
              <span className="range-value">{minMatchScore}%</span>
            </div>
          </div>

          <div className="form-group">
            <label>Preferred Locations</label>
            <div className="locations-list">
              {preferredLocations.map((location) => (
                <div key={location} className="location-tag">
                  {location}
                  <button
                    type="button"
                    onClick={() =>
                      setPreferredLocations(preferredLocations.filter((l) => l !== location))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-section glass">
          <h2>Notifications</h2>
          
          <div className="toggle-group">
            <label>
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
              />
              <span>Enable Telegram Notifications</span>
            </label>
          </div>

          {telegramEnabled && (
            <div className="form-group">
              <label>Telegram Chat ID</label>
              <input
                type="text"
                className="input"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Your Telegram Chat ID"
              />
            </div>
          )}
        </div>

        <div className="settings-section glass">
          <h2>Resume</h2>
          <div className="file-upload">
            <input type="file" accept=".pdf,.doc,.docx" />
            <p>Upload your resume for AI matching</p>
          </div>
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleSave}>
        Save Settings
      </button>
    </div>
  );
};

export default Settings;
