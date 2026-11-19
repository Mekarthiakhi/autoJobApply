import React, { useState } from 'react';
import Navbar from './Navbar';
import { HowItWorksModal } from './HowItWorksModal';
import { Sparkles, HelpCircle } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <div className="app">
      <Navbar />
      {children}

      {/* Persistent Floating "How It Works Guide" Button (Floats with screen) */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9000,
        }}
      >
        <button
          type="button"
          onClick={() => setIsGuideOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.55)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.35)',
            color: '#f8fafc',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            backdropFilter: 'blur(10px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.85)';
            e.currentTarget.style.boxShadow = '0 14px 28px -4px rgba(0, 0, 0, 0.7), 0 0 28px rgba(99, 102, 241, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.55)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.35)';
          }}
          title="Click to view How AutoJobApply Works guide & FAQs"
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 0 10px rgba(99, 102, 241, 0.6)',
            }}
          >
            <Sparkles size={14} color="#ffffff" />
          </span>
          <span>How It Works?</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '9999px',
              background: 'rgba(99, 102, 241, 0.25)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#a5b4fc',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Guide
          </span>
        </button>
      </div>

      <HowItWorksModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
};

export default Layout;
