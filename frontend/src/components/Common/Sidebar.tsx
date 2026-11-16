import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, FileCheck, Building2, FileText, BarChart3, Inbox, Activity, Files, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import styles from './Common.module.css';

export const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
