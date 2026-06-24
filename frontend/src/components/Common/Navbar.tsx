import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { Search, LayoutDashboard, FileText, Settings as SettingsIcon, LogOut, MoreHorizontal, Briefcase } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { to: '/jobs', label: 'Jobs', icon: <Briefcase size={16} /> },
    { to: '/applications', label: 'Applications', icon: <FileText size={16} /> },
    { to: '/settings', label: 'Settings', icon: <SettingsIcon size={16} /> },
  ];

  return (
    <nav className="w-full bg-[#1e1e2e] border-b border-[#2d2d44] px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link to="/dashboard" className="text-xl font-semibold text-[#a39df7] flex items-center gap-2">
          <span>🚀</span> 
          AI Job Automation
        </Link>
        
        <div className="flex items-center space-x-2">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-[#2d2d44] text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-[#2d2d44]/50'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#e11d48] border border-[#e11d48]/50 hover:bg-[#e11d48]/10 rounded-lg transition-colors"
          onClick={handleLogout}
        >
          Logout
        </button>
        <button className="p-2 text-gray-400 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
          <MoreHorizontal size={20} className="text-gray-800" />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
