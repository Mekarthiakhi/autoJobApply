import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';
import styles from './Auth.module.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, demoLogin, loading, error, isAuthenticated, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleDemoSignIn = async () => {
    clearError();
    const success = await demoLogin();
    if (success) {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleAkhileshSignIn = async () => {
    clearError();
    const success = await login('akhileshmekarthi28@gmail.com', 'TestPassword123!');
    if (success) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="auth-container fade-in">
      <div className="auth-form glass" style={{ maxWidth: '440px', padding: '28px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#a5b4fc',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '10px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }}></span>
            AI Job Automation Platform
          </div>
          <h1 className="gradient-text slide-in-right" style={{ fontSize: '26px', margin: '4px 0' }}>Welcome Back</h1>
          <p className="auth-subtitle" style={{ fontSize: '13px', color: '#94a3b8' }}>Sign in to manage your automated job applications</p>
        </div>

        {/* 1-Click Quick Demo Sign In */}
        <div style={{
          marginBottom: '20px',
          padding: '12px 14px',
          borderRadius: '10px',
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚡ Instant Testing
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Verified Staging User</span>
          </div>
          <button
            type="button"
            onClick={handleDemoSignIn}
            disabled={loading}
            style={{
              padding: '8px 14px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
              border: '1px solid rgba(129, 140, 248, 0.4)',
              color: '#e0e7ff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>Sign In as Verified Test User</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>(1-Click)</span>
          </button>

          <button
            type="button"
            onClick={handleAkhileshSignIn}
            disabled={loading}
            style={{
              padding: '8px 14px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.25) 100%)',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              color: '#d1fae5',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>👤 Sign In as Akhilesh Mekarthi</span>
            <span style={{ fontSize: '11px', color: '#6ee7b7' }}>(Live Candidate)</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }}></div>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>or sign in with email</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }}></div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup} style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#cbd5e1' }}>Email Address</label>
            <input
              type="email"
              className={styles.inputField}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              style={{ fontSize: '13px', padding: '10px 12px' }}
            />
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#cbd5e1' }}>Password</label>
            <input
              type="password"
              className={styles.inputField}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ fontSize: '13px', padding: '10px 12px' }}
            />
          </div>

          {error && (
            <div className={styles.errorMessage} style={{ fontSize: '12px', padding: '10px 12px', marginBottom: '14px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            style={{
              padding: '11px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div className="loading" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', borderStyle: 'solid', animation: 'spin 1s linear infinite' }}></div>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <p className={styles.authLink} style={{ fontSize: '12px', marginTop: '16px', textAlign: 'center', color: '#94a3b8' }}>
          Don't have an account? <Link to="/register" style={{ color: '#818cf8', fontWeight: 600 }}>Create account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
