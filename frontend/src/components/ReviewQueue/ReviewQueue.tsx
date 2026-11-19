import React, { useState, useEffect } from 'react';
import { reviewQueueAPI } from '../../api/auth';
import { Check, X, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Shield, FileText, Lock } from 'lucide-react';
import styles from './ReviewQueue.module.css';
import { useToast } from '../../context/ToastContext';

interface ApplicationAnswerItem {
  question: string;
  answer: string;
  field_type?: string;
  confidence?: number;
  source?: string;
}

interface MissingFieldItem {
  field: string;
  question: string;
  reason?: string;
}

interface UncertainFieldItem {
  field: string;
  question: string;
  candidate_value: string;
  confidence: number;
  reason?: string;
}

interface ReviewItem {
  application_id: string;
  job_title: string;
  company_name: string;
  job_location: string;
  job_salary: string;
  apply_url: string;
  match_score: number;
  resume_label?: string;
  resume_version_name?: string;
  stage_status?: string;
  candidate_verified?: boolean | number;
  cover_letter?: string;
  cover_letter_content?: string;
  warnings?: string[];
  scraped_questions?: string[];
  application_answers?: ApplicationAnswerItem[];
  missing_fields?: MissingFieldItem[];
  uncertain_fields?: UncertainFieldItem[];
  draft_version?: number;
}

const ReviewQueue: React.FC = () => {
  const toast = useToast();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({});
  const [submittingMap, setSubmittingMap] = useState<Record<string, boolean>>({});
  const [actionErrorMap, setActionErrorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await reviewQueueAPI.getPendingReviews();
      const list = Array.isArray(response.data) ? response.data : [];
      setReviews(list);
      // Initialize verifiedMap from candidate_verified
      const initialVerified: Record<string, boolean> = {};
      list.forEach((r: ReviewItem) => {
        if (r.candidate_verified) {
          initialVerified[r.application_id] = true;
        }
      });
      setVerifiedMap(initialVerified);
    } catch (error) {
      console.error('Failed to fetch reviews', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerified = (appId: string) => {
    setVerifiedMap(prev => ({
      ...prev,
      [appId]: !prev[appId]
    }));
  };

  const handleApprove = async (review: ReviewItem) => {
    const id = review.application_id;
    if (!verifiedMap[id]) {
      toast.error('Please check the verification box to confirm all application answers first.');
      return;
    }

    try {
      setSubmittingMap(prev => ({ ...prev, [id]: true }));
      setActionErrorMap(prev => ({ ...prev, [id]: '' }));

      // Step 1: Verify answers on backend
      const answers = review.application_answers || [];
      try {
        await reviewQueueAPI.verifyAnswers(id, answers);
      } catch (verifyErr) {
        console.warn('verifyAnswers notice:', verifyErr);
      }

      // Step 2: Approve application
      await reviewQueueAPI.approve(id);

      // Remove from pending reviews
      setReviews(prev => prev.filter(r => r.application_id !== id));
      toast.success(`Authorized & submitted "${review.job_title}" at ${review.company_name}!`);
    } catch (error: any) {
      console.error('Approve failed', error);
      const msg = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to authorize application submission';
      setActionErrorMap(prev => ({ ...prev, [id]: msg }));
      toast.error(`Submission Error: ${msg}`);
    } finally {
      setSubmittingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await reviewQueueAPI.reject(id, 'Candidate rejected draft');
      setReviews(prev => prev.filter(r => r.application_id !== id));
      toast.info('Application draft rejected.');
    } catch (error) {
      console.error('Reject failed', error);
      toast.error('Failed to reject application');
    }
  };

  if (loading) return <div className="p-6 text-gray-300">Loading review queue...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Human-in-the-Loop Safety & Controlled Execution Banner */}
      <div className="mb-6 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-sm flex items-start gap-3 shadow-lg">
        <Shield className="text-indigo-400 mt-0.5 shrink-0" size={22} />
        <div>
          <strong className="text-white block mb-0.5 text-base">Human-in-the-Loop Controlled Execution Enforced</strong>
          AI agents discover positions, prepare drafts, optimize resumes, and prepare form answers. 
          Applications are strictly halted before submission and cryptographically bound to your approved draft version. 
          Zero applications are submitted without explicit individual candidate verification.
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-white">Application Review Queue</h1>
          <p className="text-gray-400 text-sm">
            Review every generated response, resume version, and cover letter before authorizing final submission.
          </p>
        </div>

        {/* Phase 10: Bulk Approval Policy Indicator */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-700 text-gray-400 text-xs">
          <Lock size={14} className="text-amber-400" />
          <span>Bulk Approval Disabled by Policy — Individual Verification Required</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="glass-dark p-12 rounded-xl text-center border border-gray-800">
          <p className="text-gray-400 text-base">No applications pending review. The multi-agent discovery pipeline is actively searching for matching roles.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => {
            const isExpanded = expandedId === review.application_id;
            const answers = review.application_answers || [];
            const missing = review.missing_fields || [];
            const uncertain = review.uncertain_fields || [];
            const warnings = review.warnings || [];
            const isVerified = Boolean(verifiedMap[review.application_id]);
            const isSubmitting = Boolean(submittingMap[review.application_id]);
            const actionError = actionErrorMap[review.application_id];
            const stage = review.stage_status || 'READY_FOR_REVIEW';

            return (
              <div 
                key={review.application_id} 
                className={`glass-dark rounded-xl p-6 border transition-all ${styles.reviewCard} ${
                  missing.length > 0 ? 'border-amber-500/40' : 'border-gray-800'
                }`}
              >
                {/* Header Row: Title, Company, Match Score & Stage Badge */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-xl font-bold text-white">{review.job_title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                        stage === 'READY_FOR_REVIEW' ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50' :
                        stage === 'NEEDS_CANDIDATE_INPUT' ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50' :
                        stage === 'APPROVED' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' :
                        'bg-gray-800 text-gray-300 border border-gray-700'
                      }`}>
                        {stage.replace(/_/g, ' ')}
                      </span>
                      {review.draft_version && review.draft_version > 1 && (
                        <span className="text-xs text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded">
                          v{review.draft_version}
                        </span>
                      )}
                    </div>
                    <p className="text-indigo-400 font-medium text-base">{review.company_name}</p>
                    <div className="flex gap-4 mt-2 text-sm text-gray-400">
                      <span>📍 {review.job_location || 'Location N/A'}</span>
                      <span>💰 {review.job_salary || 'Salary N/A'}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400">
                      {review.match_score || 0}%
                    </div>
                    <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Match Score</div>
                  </div>
                </div>

                {/* Missing / Uncertain Alerts */}
                {missing.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-100 font-semibold">Missing Candidate Information:</strong>
                      <ul className="list-disc list-inside mt-1 text-amber-300 space-y-0.5">
                        {missing.map((m, idx) => (
                          <li key={idx}><strong>{m.field}:</strong> {m.question} {m.reason ? `(${m.reason})` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {uncertain.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 text-blue-200 text-xs flex items-start gap-2">
                    <AlertCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-blue-100 font-semibold">Low-Confidence Answers (Review Recommended):</strong>
                      <ul className="list-disc list-inside mt-1 text-blue-300 space-y-0.5">
                        {uncertain.map((u, idx) => (
                          <li key={idx}>
                            <strong>{u.question}:</strong> &ldquo;{u.candidate_value}&rdquo; (Confidence: {Math.round(u.confidence * 100)}%)
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Expanded Details: Answers, Resume Version, Cover Letter */}
                {isExpanded && (
                  <div className="mt-5 pt-5 border-t border-gray-800 space-y-5">
                    {/* Documents Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-lg bg-gray-900/60 border border-gray-800">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-1">
                          <FileText size={16} className="text-indigo-400" />
                          <span>Selected Resume Version</span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {review.resume_version_name || review.resume_label || 'Default Candidate Resume'}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-lg bg-gray-900/60 border border-gray-800">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-300">Original Posting</span>
                          <a 
                            href={review.apply_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            Open Link <ExternalLink size={12} />
                          </a>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{review.apply_url}</p>
                      </div>
                    </div>

                    {/* Generated Application Answers */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <span>Generated Application Answers ({answers.length})</span>
                        <span className="text-xs text-gray-400 font-normal">Candidate review required</span>
                      </h4>
                      {answers.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">Standard profile information will be utilized.</p>
                      ) : (
                        <div className="space-y-2">
                          {answers.map((ans, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-gray-900/80 border border-gray-800 flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <p className="text-xs text-gray-400 mb-1 font-medium">{ans.question}</p>
                                <p className="text-sm text-gray-100 font-mono bg-gray-950/60 px-2.5 py-1.5 rounded border border-gray-800">
                                  {ans.answer || '<empty>'}
                                </p>
                              </div>
                              {ans.confidence !== undefined && (
                                <div className="text-right shrink-0">
                                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                                    ans.confidence >= 0.8 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' :
                                    ans.confidence >= 0.5 ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50' :
                                    'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                                  }`}>
                                    {Math.round(ans.confidence * 100)}% match
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Cover Letter Preview if present */}
                    {(review.cover_letter_content || review.cover_letter) && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-200 mb-2">Tailored Gemini AI Cover Letter Draft</h4>
                        <div className="p-4 rounded-lg bg-gray-950/80 border border-gray-800 text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto">
                          {review.cover_letter_content || review.cover_letter}
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-amber-400 mb-1">Application Warnings</h4>
                        <ul className="list-disc list-inside text-xs text-gray-400 space-y-0.5">
                          {warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Candidate Verification Checkbox */}
                <div className="mt-5 pt-4 border-t border-gray-800/80 flex items-start gap-3 bg-indigo-950/20 p-3 rounded-lg border border-indigo-900/30">
                  <input
                    type="checkbox"
                    id={`verify-${review.application_id}`}
                    checked={isVerified}
                    onChange={() => toggleVerified(review.application_id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label 
                    htmlFor={`verify-${review.application_id}`} 
                    className="text-xs text-indigo-200 cursor-pointer select-none leading-relaxed"
                  >
                    <strong className="text-white block font-semibold mb-0.5">I have verified all application answers and draft details.</strong>
                    Checking this confirms that the resume version, cover letter, and form responses accurately represent my qualifications.
                  </label>
                </div>

                {actionError && (
                  <p className="mt-2 text-xs text-rose-400 font-medium">⚠️ {actionError}</p>
                )}

                {/* Action Controls */}
                <div className="flex justify-between items-center mt-4 pt-2">
                  <button 
                    onClick={() => setExpandedId(isExpanded ? null : review.application_id)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    {isExpanded ? <><ChevronUp size={16} /> Hide Draft Details</> : <><ChevronDown size={16} /> View Answers & Details</>}
                  </button>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleReject(review.application_id)}
                      disabled={isSubmitting}
                      className={`btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg ${styles.rejectBtn}`}
                    >
                      <X size={14} /> Reject Draft
                    </button>
                    <button 
                      onClick={() => handleApprove(review)}
                      disabled={!isVerified || isSubmitting}
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all ${
                        isVerified && !isSubmitting
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer shadow-emerald-900/30'
                          : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                      }`}
                      title={!isVerified ? 'Verification of answers is required before approval' : 'Authorize final submission'}
                    >
                      <Check size={14} /> 
                      {isSubmitting ? 'Authorizing...' : 'Authorize & Submit Application'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviewQueue;
