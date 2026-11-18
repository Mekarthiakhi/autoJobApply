import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import './Auth.css';
import styles from './Auth.module.css';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmittedMessage(null);
    setLoading(true);
    try {
      const response = await authAPI.forgotPassword(email.trim());
      setSubmittedMessage(
        response.data?.message ||
          'A password reset link has been sent to your email.'
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send password reset instructions.');
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
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8' }}></span>
            Account Recovery
          </div>
          <h1 className="gradient-text" style={{ fontSize: '26px', margin: '4px 0' }}>Forgot Password</h1>
          <p className="auth-subtitle" style={{ fontSize: '13px', color: '#94a3b8' }}>
            Enter your email address and we&apos;ll send you a link to reset your password
          </p>
        </div>

        {submittedMessage ? (
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
            <div style={{ fontWeight: 600, marginBottom: '6px', color: '#6ee7b7' }}>Check your email</div>
            <div>{submittedMessage}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
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
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div className="loading" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', borderStyle: 'solid', animation: 'spin 1s linear infinite' }}></div>
                  Sending reset link...
                </span>
              ) : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className={styles.authLink} style={{ fontSize: '12px', marginTop: '16px', textAlign: 'center', color: '#94a3b8' }}>
          Remembered your password?{' '}
          <Link to="/login" style={{ color: '#818cf8', fontWeight: 600 }}>Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
