import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, FileCheck, Building2, FileText, BarChart3, Inbox, Activity, Files, Settings as SettingsIcon, LogOut, Bot } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import styles from './Common.module.css';

export const Sidebar: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email && email.includes('@')) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <aside className={`${styles.sidebar} glass-dark`}>
      <div className={styles.logoContainer}>
        <span className={`${styles.logo} gradient-text`}>AutoJobApply</span>
      </div>
      
      <nav className={styles.navigation}>
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/agents" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Bot size={20} />
          <span>Agents Studio</span>
        </NavLink>

        <NavLink 
          to="/review-queue" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Inbox size={20} />
          <span>Review Queue</span>
        </NavLink>
        
        <NavLink 
          to="/jobs" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Briefcase size={20} />
          <span>Job Search</span>
        </NavLink>
        
        <NavLink 
          to="/applications" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <FileCheck size={20} />
          <span>Applications</span>
        </NavLink>

        <NavLink 
          to="/cover-letters" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <FileText size={20} />
          <span>Cover Letters</span>
        </NavLink>

        <NavLink 
          to="/resume-versions" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Files size={20} />
          <span>Resume Versions</span>
        </NavLink>
        
        <NavLink 
          to="/activity-logs" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Activity size={20} />
          <span>Activity Logs</span>
        </NavLink>
        
        <NavLink 
          to="/companies" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Building2 size={20} />
          <span>Companies</span>
        </NavLink>

        <NavLink 
          to="/resume" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <FileText size={20} />
          <span>Resume</span>
        </NavLink>

        <NavLink 
          to="/analytics" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <BarChart3 size={20} />
          <span>Analytics</span>
        </NavLink>
        
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <SettingsIcon size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>
      
      <div className={styles.footer}>
        {user && (
          <div style={{
            padding: '10px 12px',
            marginBottom: '12px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4F8EF7 0%, #10B981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px',
              color: '#ffffff',
              flexShrink: 0
            }}>
              {getInitials(user.fullName, user.email)}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.fullName || user.email?.split('@')[0] || 'Candidate'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
              <div style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: 500 }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                Logged in
              </div>
            </div>
          </div>
        )}
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
