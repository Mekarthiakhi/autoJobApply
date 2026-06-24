import React, { useState } from 'react';
import { authAPI } from '../../api/auth';
import { motion } from 'framer-motion';

export const Settings: React.FC = () => {
  const [preferredLocations, setPreferredLocations] = useState(['Remote', 'Hyderabad', 'Bangalore']);
  const [newLocation, setNewLocation] = useState('');
  const [minMatchScore, setMinMatchScore] = useState(80);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    try {
      setSaving(true);
      setSuccessMessage('');
      setErrorMessage('');

      await authAPI.updateProfile({
        preferredLocations,
        minMatchScore,
        employmentType: 'Full-Time',
      });

      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to save settings.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const addLocation = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newLocation.trim()) {
      if (!preferredLocations.includes(newLocation.trim())) {
        setPreferredLocations([...preferredLocations, newLocation.trim()]);
      }
      setNewLocation('');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex justify-between items-end">
        <h1 className="text-4xl font-light text-white tracking-wide">Settings</h1>
        <button 
          className="px-6 py-2 bg-neon-indigo/20 hover:bg-neon-indigo/30 border border-neon-indigo/50 text-white rounded-xl shadow-glow-indigo transition-all duration-300 disabled:opacity-50"
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </motion.div>
      
      {successMessage && <div className="mb-6 p-4 rounded-xl bg-neon-emerald/20 border border-neon-emerald/50 text-neon-emerald shadow-glow-emerald animate-pulse">{successMessage}</div>}
      {errorMessage && <div className="mb-6 p-4 rounded-xl bg-neon-rose/20 border border-neon-rose/50 text-neon-rose shadow-glow-rose">{errorMessage}</div>}

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Job Preferences Card */}
        <motion.div variants={itemVariants} className="glass-card p-8 md:col-span-2">
          <div className="glass-shimmer"></div>
          <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
            <span className="text-neon-cyan text-2xl">✨</span> Job Preferences
          </h2>
          
          <div className="mb-8">
            <label className="block text-sm uppercase tracking-widest text-gray-400 mb-4">Minimum Match Score</label>
            <div className="flex items-center gap-6">
              <div className="relative flex-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minMatchScore}
                  onChange={(e) => setMinMatchScore(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none bg-black/40 cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #6366f1 ${minMatchScore}%, rgba(0,0,0,0.4) ${minMatchScore}%)`,
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
                  }}
                />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-glow-indigo text-xl font-light text-white">
                {minMatchScore}<span className="text-xs text-gray-400 ml-1">%</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm uppercase tracking-widest text-gray-400 mb-4">Preferred Locations</label>
            <div className="flex flex-wrap gap-3 mb-4">
              {preferredLocations.map((location) => (
                <div key={location} className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-purple/10 border border-neon-purple/50 text-neon-purple shadow-[0_0_8px_rgba(168,85,247,0.4)] transition-all hover:bg-neon-purple/20">
                  <span className="text-sm font-medium">{location}</span>
                  <button type="button" onClick={() => setPreferredLocations(preferredLocations.filter((l) => l !== location))} className="text-neon-purple/70 hover:text-white transition-colors">×</button>
                </div>
              ))}
            </div>
            <input
              type="text"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-purple focus:shadow-glow-purple transition-all"
              placeholder="Type a location and press Enter..."
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyDown={addLocation}
            />
          </div>
        </motion.div>

        {/* Notifications Card */}
        <motion.div variants={itemVariants} className="glass-card p-8">
          <div className="glass-shimmer"></div>
          <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
            <span className="text-neon-amber text-2xl">🔔</span> Notifications
          </h2>
          
          <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-black/20 border border-white/5">
            <span className="text-gray-300 font-medium">Telegram Alerts</span>
            <button 
              onClick={() => setTelegramEnabled(!telegramEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${telegramEnabled ? 'bg-neon-amber shadow-glow-amber' : 'bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${telegramEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {telegramEnabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-2">
              <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">Telegram Chat ID</label>
              <input
                type="text"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-amber focus:shadow-glow-amber transition-all"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Enter Chat ID"
              />
            </motion.div>
          )}
        </motion.div>

        {/* Resume Card */}
        <motion.div variants={itemVariants} className="glass-card p-8">
          <div className="glass-shimmer"></div>
          <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
            <span className="text-neon-emerald text-2xl">📄</span> Resume
          </h2>
          
          <div className="relative group cursor-pointer border-2 border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center justify-center bg-black/20 hover:bg-neon-emerald/5 hover:border-neon-emerald/50 transition-all duration-300">
            {/* Pulsing glow on hover */}
            <div className="absolute inset-0 bg-neon-emerald/0 group-hover:bg-neon-emerald/10 transition-colors duration-500 rounded-2xl group-hover:animate-pulse pointer-events-none"></div>
            
            <span className="text-4xl mb-4 opacity-70 group-hover:opacity-100 transition-opacity">☁️</span>
            <p className="text-gray-300 font-medium text-center mb-2 group-hover:text-neon-emerald transition-colors">Drag & drop your resume</p>
            <p className="text-gray-500 text-sm text-center">PDF, DOC, DOCX up to 5MB</p>
            <input type="file" accept=".pdf,.doc,.docx" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default Settings;
