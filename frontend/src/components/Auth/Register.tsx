import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';
import styles from './Auth.module.css';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const { register, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await register(email, password, fullName);
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
            Get Started Free
          </div>
          <h1 className="gradient-text slide-in-left" style={{ fontSize: '26px', margin: '4px 0' }}>Create Account</h1>
          <p className="auth-subtitle" style={{ fontSize: '13px', color: '#94a3b8' }}>Deploy AI agents to automate your job search</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup} style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#cbd5e1' }}>Full Name</label>
            <input
              type="text"
              className={styles.inputField}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Morgan"
              required
              style={{ fontSize: '13px', padding: '10px 12px' }}
            />
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#cbd5e1' }}>Email Address</label>
            <input
              type="email"
              className={styles.inputField}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
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
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <p className={styles.authLink} style={{ fontSize: '12px', marginTop: '16px', textAlign: 'center', color: '#94a3b8' }}>
          Already have an account? <Link to="/login" style={{ color: '#818cf8', fontWeight: 600 }}>Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
