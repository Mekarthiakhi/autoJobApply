import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, FileCheck, Building2, FileText, Settings as SettingsIcon, LogOut } from 'lucide-react';
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
          to="/jobs" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Briefcase size={20} />
          <span>Jobs</span>
        </NavLink>
        
        <NavLink 
          to="/applications" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <FileCheck size={20} />
          <span>Applications</span>
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
