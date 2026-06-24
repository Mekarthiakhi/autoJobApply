import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import client, { authAPI } from '../../api/auth';
import styles from './Settings.module.css';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [minMatchScore, setMinMatchScore] = useState(80);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [newLocation, setNewLocation] = useState('');
  
  const [resume, setResume] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setPreferredLocations(user.preferredLocations || []);
      setMinMatchScore(user.minMatchScore || 80);
      setTelegramEnabled(user.telegramEnabled || false);
      setTelegramChatId(user.telegramChatId || '');
      fetchResume();
    }
  }, [user]);

  const fetchResume = async () => {
    try {
      const res = await client.get('/resumes');
      setResume(res.data);
    } catch (err) {
      console.error('Failed to fetch resume', err);
    }
  };

  const handleSave = async () => {
    try {
      setSaveStatus('Saving...');
      await authAPI.updateProfile({
        preferredLocations,
        minMatchScore,
        telegramEnabled,
        telegramChatId,
      });
      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('Failed to save settings.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLocation.trim() && !preferredLocations.includes(newLocation.trim())) {
      setPreferredLocations([...preferredLocations, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('resume', file);

    try {
      setUploading(true);
      await client.post('/resumes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploading(false);
      fetchResume();
    } catch (err) {
      setUploading(false);
      alert('Failed to upload resume. Please ensure it is a valid PDF/Word file.');
    }
  };

  return (
    <div className={`${styles.settingsContainer} glass-dark`}>
      <h1 className={styles.settingsTitle}>Settings</h1>
      
      <div className={styles.settingsSections}>
        {/* Job Preferences */}
        <div className={`${styles.settingsSection} glass`}>
          <h2>Job Preferences</h2>
          
          <div className={styles.formGroup}>
            <label>Minimum Match Score</label>
            <div className={styles.rangeInput}>
              <input
                type="range"
                min="0"
                max="100"
                value={minMatchScore}
                onChange={(e) => setMinMatchScore(parseInt(e.target.value))}
                className={styles.rangeSlider}
              />
              <span className={styles.rangeValue}>{minMatchScore}%</span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Preferred Locations</label>
            <div className={styles.locationsList}>
              {preferredLocations.map((location) => (
                <div key={location} className={styles.locationTag}>
                  {location}
                  <button
                    type="button"
                    onClick={() =>
                      setPreferredLocations(preferredLocations.filter((l) => l !== location))
                    }
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleAddLocation} className={styles.addLocationForm}>
              <input
                type="text"
                placeholder="Add location (e.g. Remote, Bangalore)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="input"
              />
              <button type="submit" className="btn btn-secondary">Add</button>
            </form>
          </div>
        </div>

        {/* Notifications */}
        <div className={`${styles.settingsSection} glass`}>
          <h2>Notifications</h2>
          
          <div className={styles.toggleGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
              />
              <span>Enable Telegram Notifications</span>
            </label>
          </div>

          {telegramEnabled && (
            <div className={styles.formGroup}>
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

        {/* Resume */}
        <div className={`${styles.settingsSection} glass`}>
          <h2>Resume</h2>
          
          {resume ? (
            <div className={styles.currentResume}>
              <p>📄 <strong>Current Resume:</strong> {resume.file_name}</p>
              <p>📅 <strong>Uploaded on:</strong> {new Date(resume.uploaded_at).toLocaleDateString()}</p>
              <div className={styles.skillsSummary}>
                <strong>Parsed Skills:</strong>
                <div className={styles.skillsList}>
                  {resume.skills && resume.skills.length > 0 ? (
                    resume.skills.map((skill: string) => (
                      <span key={skill} className={styles.skillTag}>{skill}</span>
                    ))
                  ) : (
                    <span>No skills extracted yet</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.noResume}>No resume uploaded yet. Upload one below to enable AI matching.</p>
          )}

          <div className={styles.fileUpload}>
            <input 
              type="file" 
              accept=".pdf,.doc,.docx" 
              onChange={handleFileUpload} 
              id="resume-file-input"
              style={{ display: 'none' }}
            />
            <label htmlFor="resume-file-input" className="btn btn-secondary">
              {uploading ? 'Uploading...' : 'Choose Resume File'}
            </label>
            <p className={styles.uploadHelp}>Supported formats: PDF, DOC, DOCX (Max 5MB)</p>
          </div>
        </div>
      </div>

      <div className={styles.saveAction}>
        {saveStatus && <span className={styles.statusMessage}>{saveStatus}</span>}
        <button className="btn btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;
