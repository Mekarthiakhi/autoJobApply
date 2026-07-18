import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LayoutDashboard, Briefcase, FileText, Building2, BarChart3, Settings as SettingsIcon } from 'lucide-react';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="nav">
      <div className="nav-brand">
        <div className="rocket">🚀</div>
        AI Job Automation
      </div>
      <div className="nav-links">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        <NavLink to="/jobs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Briefcase size={16} /> Jobs
        </NavLink>
        <NavLink to="/applications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileText size={16} /> Applications
        </NavLink>
        <NavLink to="/companies" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Building2 size={16} /> Companies
        </NavLink>
        <NavLink to="/resume" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileText size={16} /> Resume
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <BarChart3 size={16} /> Analytics
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <SettingsIcon size={16} /> Settings
        </NavLink>
      </div>
      <button className="btn-logout" onClick={handleLogout}>Logout</button>
    </nav>
  );
};

export default Navbar;
