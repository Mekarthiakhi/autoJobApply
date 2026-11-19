import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Sliders, Sparkles, CheckCircle2, ShieldCheck, HelpCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'steps' | 'faqs'>('steps');

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '20px 16px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '820px',
          maxHeight: 'min(90vh, 760px)',
          height: 'auto',
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 40px rgba(99, 102, 241, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          margin: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            flexShrink: 0,
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Sparkles size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
                How AutoJobApply Works
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>
                Step-by-step guide for candidates and test users
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '3px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('steps')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'steps' ? 'rgba(99, 102, 241, 0.8)' : 'transparent',
                  color: activeTab === 'steps' ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                4-Step Flow
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('faqs')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'faqs' ? 'rgba(99, 102, 241, 0.8)' : 'transparent',
                  color: activeTab === 'faqs' ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                Common FAQs
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0, lineHeight: 1.5 }}>
          {activeTab === 'steps' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Step 1 */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(99, 102, 241, 0.18)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#818cf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#f1f5f9' }}>
                      Upload Your Resume (PDF or DOCX)
                    </h3>
                    <Link
                      to="/resume"
                      onClick={onClose}
                      style={{ fontSize: '12px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 500 }}
                    >
                      Go to Resume <ExternalLink size={12} />
                    </Link>
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 6px' }}>
                    The AI parser dynamically extracts your <strong>full name</strong>, <strong>mobile phone number</strong>, <strong>work history</strong>, and <strong>skills</strong> with zero static data.
                  </p>
                  <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    ✓ Does NOT immediately apply — parses your profile first
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(99, 102, 241, 0.18)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(168, 85, 247, 0.2)',
                    color: '#c084fc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#f1f5f9' }}>
                      Set Your Minimum Match Score & Preferences
                    </h3>
                    <Link
                      to="/settings"
                      onClick={onClose}
                      style={{ fontSize: '12px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 500 }}
                    >
                      Go to Settings <ExternalLink size={12} />
                    </Link>
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 6px' }}>
                    Set your preferred roles, locations (e.g. Remote), and set the <strong>Minimum Match Score</strong> slider to <strong>50%–55%</strong>.
                  </p>
                  <span style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    💡 Only roles matching above your threshold are qualified
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(99, 102, 241, 0.18)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(236, 72, 153, 0.2)',
                    color: '#f472b6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  3
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#f1f5f9' }}>
                      AI Discovers Jobs & Tailors Each Application
                    </h3>
                    <Link
                      to="/jobs"
                      onClick={onClose}
                      style={{ fontSize: '12px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 500 }}
                    >
                      Browse Jobs <ExternalLink size={12} />
                    </Link>
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 6px' }}>
                    The background cron runs every 1-5 hours (or click <strong>"Run Pipeline"</strong> on Dashboard). For each job, Gemini AI generates:
                  </p>
                  <ul style={{ margin: '0 0 6px 18px', padding: 0, fontSize: '12px', color: '#cbd5e1' }}>
                    <li>A <strong>tailored resume</strong> optimized for that specific job posting</li>
                    <li>A personalized <strong>cover letter</strong> matching the company</li>
                    <li>Verified form responses for application questions</li>
                  </ul>
                </div>
              </div>

              {/* Step 4 */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  4
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#f1f5f9' }}>
                      Review Queue & Authorize Submission
                    </h3>
                    <Link
                      to="/review-queue"
                      onClick={onClose}
                      style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 600 }}
                    >
                      Open Review Queue <ArrowRight size={13} />
                    </Link>
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 6px' }}>
                    Every drafted job waits in the <strong>Review Queue</strong> for candidate safety. Check the box <em>"I have verified all application answers"</em> and click <strong>"Authorize & Submit Application"</strong>.
                  </p>
                  <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    🔒 Cryptographically binds your approval & records submission in Applications
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={16} color="#818cf8" />
                  Does uploading my resume immediately apply to companies?
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                  <strong>No.</strong> Uploading parses your qualifications and starts job matching. Drafts are prepared and sent to the <strong>Review Queue</strong> so you can inspect the tailored resume and cover letter before anything is sent.
                </p>
              </div>

              <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={16} color="#818cf8" />
                  What does "Authorize & Submit Application" do?
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                  It confirms you reviewed the AI-generated responses and cover letter. It cryptographically signs the draft, submits it, and moves it to your <strong>Applications</strong> tab with proof screenshots.
                </p>
              </div>

              <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={16} color="#818cf8" />
                  Is WhatsApp setup mandatory?
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                  <strong>No, WhatsApp is completely optional.</strong> All job matching, applications, and hourly summaries are automatically delivered to your registered email and tracked on the Web Dashboard.
                </p>
              </div>

              <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={16} color="#818cf8" />
                  How do I run the AI job search right now?
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                  Go to your <strong>Dashboard</strong> and click the purple <strong>"Run Pipeline"</strong> button, or go to the <strong>Jobs</strong> tab and click <strong>"Discover Live Jobs"</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            flexShrink: 0,
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.95)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <ShieldCheck size={16} color="#10b981" />
            Human-in-the-Loop safety enforced for candidate protection
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
            }}
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
