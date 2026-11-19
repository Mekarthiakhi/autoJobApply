import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LayoutDashboard, Briefcase, FileText, Building2, BarChart3, Settings as SettingsIcon, LogOut } from 'lucide-react';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

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
    <nav className="nav">
      <div className="nav-brand">
        <div className="rocket">🚀</div>
        <span>AutoJobApply</span>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: 'auto' }}>
        {user && (
          <div
            className="user-profile-pill"
            title={`Logged in as ${user.fullName || user.email}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '4px 12px 4px 6px',
              borderRadius: '24px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6C63FF 0%, #9B5CF6 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(108, 99, 255, 0.35)',
                flexShrink: 0,
              }}
            >
              {getInitials(user.fullName, user.email)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, textAlign: 'left' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.2px' }}>
                {user.fullName || user.email?.split('@')[0] || 'Candidate'}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </span>
            </div>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                marginLeft: '4px',
              }}
              title="Active User Session"
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
              Online
            </span>
          </div>
        )}
        <button className="btn-logout" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
