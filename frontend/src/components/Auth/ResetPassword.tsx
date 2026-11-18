import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import './Auth.css';
import styles from './Auth.module.css';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlToken = searchParams.get('token') || '';

  const [token, setToken] = useState(urlToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError('Reset token is missing. Please use the link from your email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetPassword(token.trim(), password);
      setSuccessMessage(response.data?.message || 'Password has been reset successfully.');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. Your reset link may have expired.');
    } finally {
      setLoading(false);
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
            marginBottom: '10px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }}></span>
            Set New Password
          </div>
          <h1 className="gradient-text" style={{ fontSize: '26px', margin: '4px 0' }}>Reset Password</h1>
          <p className="auth-subtitle" style={{ fontSize: '13px', color: '#94a3b8' }}>
            Choose a strong new password for your account
          </p>
        </div>

        {successMessage ? (
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(52, 211, 153, 0.35)',
            color: '#d1fae5',
            fontSize: '13px',
            lineHeight: 1.5,
            marginBottom: '18px',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', color: '#6ee7b7' }}>Password Updated</div>
            <div>{successMessage} Redirecting to Sign In...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {!urlToken && (
              <div className={styles.formGroup} style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#cbd5e1' }}>Reset Token</label>
                <input
                  type="text"
                  className={styles.inputField}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your reset token"
                  required
                  style={{ fontSize: '13px', padding: '10px 12px' }}
                />
              </div>
            )}

            <div className={styles.formGroup} style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#cbd5e1' }}>New Password</label>
              <input
                type="password"
                className={styles.inputField}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                style={{ fontSize: '13px', padding: '10px 12px' }}
              />
            </div>

            <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#cbd5e1' }}>Confirm New Password</label>
              <input
                type="password"
                className={styles.inputField}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                minLength={6}
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
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className={styles.authLink} style={{ fontSize: '12px', marginTop: '16px', textAlign: 'center', color: '#94a3b8' }}>
          <Link to="/login" style={{ color: '#818cf8', fontWeight: 600 }}>Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
