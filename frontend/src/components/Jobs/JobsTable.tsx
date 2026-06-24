import React, { useEffect, useState } from 'react';
import { useJobs } from '../../hooks/useJobs';
import './Jobs.css';

export const JobsTable: React.FC = () => {
  const { jobs, loading, fetchJobs, searchJobs } = useJobs();
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [applyStatus, setApplyStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchJobs([searchQuery.trim()]);
    } else {
      fetchJobs();
    }
  };

  const handleApply = async (jobId: string) => {
    try {
      setApplyingJobId(jobId);
      setApplyStatus('Applying...');
      await applicationsAPI.applyToJob(jobId);
      setApplyStatus('Application submitted successfully!');
      setTimeout(() => {
        setApplyStatus(null);
        setApplyingJobId(null);
        if (selectedJob?.id === jobId) {
          setSelectedJob(null);
        }
      }, 2000);
    } catch (err: any) {
      setApplyStatus(err.response?.data?.error || 'Failed to submit application.');
      setTimeout(() => {
        setApplyStatus(null);
        setApplyingJobId(null);
      }, 3000);
    }
  };

  if (loading && jobs.length === 0) return <div className={styles.jobsLoading}>Loading jobs...</div>;

  return (
    <div className={`${styles.jobsContainer} glass-dark`}>
      <div className={styles.jobsHeader}>
        <h1 className={styles.jobsTitle}>Available Jobs</h1>
        <form onSubmit={handleSearch} className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search by title, company, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
          <button type="submit" className="btn btn-primary">
            <Search size={16} />
            <span>Search</span>
          </button>
        </form>
      </div>

      <div className={styles.jobsTable}>
        <div className={styles.tableHeader}>
          <div>Company</div>
          <div>Position</div>
          <div>Location</div>
          <div>Match Score</div>
          <div>Action</div>
        </div>
        {jobs.length > 0 ? (
          jobs.map((job: any) => (
            <div key={job.id} className={styles.tableRow}>
              <div>{job.company_name}</div>
              <div>{job.title}</div>
              <div className={styles.locationCol}>
                <MapPin size={14} style={{ marginRight: 4 }} />
                {job.location || 'Remote'}
              </div>
              <div>
                <span className={`${styles.matchBadge} ${styles['match' + capitalize(getMatchLevel(job.match_score))]}`}>
                  {job.match_score !== null && job.match_score !== undefined ? `${Math.round(job.match_score)}%` : 'N/A'}
                </span>
              </div>
              <div>
                <button className="btn btn-primary" onClick={() => setSelectedJob(job)}>
                  View
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noJobs}>No jobs found matching your criteria.</div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedJob && (
        <div className={styles.modalOverlay} onClick={() => setSelectedJob(null)}>
          <div className={`${styles.modalContent} glass-dark`} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedJob(null)}>
              <X size={20} />
            </button>
            
            <div className={styles.modalHeader}>
              <span className={styles.modalCompany}>{selectedJob.company_name}</span>
              <h2>{selectedJob.title}</h2>
              <div className={styles.modalMeta}>
                <span><MapPin size={14} /> {selectedJob.location || 'Remote'}</span>
                {selectedJob.salary && <span><DollarSign size={14} /> {selectedJob.salary}</span>}
                {selectedJob.experience_level && <span><Award size={14} /> {selectedJob.experience_level}</span>}
              </div>
            </div>

            <div className={styles.modalBody}>
              {/* AI Analysis Card */}
              {selectedJob.match_score !== null && selectedJob.match_score !== undefined && (
                <div className={`${styles.aiCard} glass`}>
                  <div className={styles.aiHeader}>
                    <Sparkles size={18} className={styles.sparkleIcon} />
                    <h3>AI Match Analysis</h3>
                    <span className={`${styles.matchBadge} ${styles['match' + capitalize(getMatchLevel(selectedJob.match_score))]}`}>
                      {Math.round(selectedJob.match_score)}% Score
                    </span>
                  </div>
                  <div className={styles.aiDetails}>
                    {selectedJob.matching_skills && selectedJob.matching_skills.length > 0 && (
                      <div className={styles.skillsSection}>
                        <strong>Matching Skills:</strong>
                        <div className={styles.skillsTags}>
                          {selectedJob.matching_skills.map((skill: string) => (
                            <span key={skill} className={styles.matchingTag}>{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedJob.missing_skills && selectedJob.missing_skills.length > 0 && (
                      <div className={styles.skillsSection}>
                        <strong>Missing Skills:</strong>
                        <div className={styles.skillsTags}>
                          {selectedJob.missing_skills.map((skill: string) => (
                            <span key={skill} className={styles.missingTag}>{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedJob.strengths && selectedJob.strengths.length > 0 && (
                      <div className={styles.strengthsSection}>
                        <strong>Key Strengths:</strong>
                        <ul>
                          {selectedJob.strengths.map((str: string, index: number) => (
                            <li key={index}>{str}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className={styles.jobDesc}>
                <h3>Job Description</h3>
                <p>{selectedJob.job_description || 'No description available.'}</p>
              </div>
            </div>

            <div className={styles.modalFooter}>
              {applyStatus && <span className={styles.statusMessage}>{applyStatus}</span>}
              <button 
                className="btn btn-primary" 
                onClick={() => handleApply(selectedJob.id)}
                disabled={applyingJobId !== null}
              >
                {applyingJobId === selectedJob.id ? 'Applying...' : 'Apply via EasyApply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getMatchLevel(score: number | null): string {
  if (score === null || score === undefined) return 'low';
  if (score >= 90) return 'high';
  if (score >= 75) return 'medium';
  return 'low';
}

function capitalize(val: string): string {
  return val.charAt(0).toUpperCase() + val.slice(1);
}

export default JobsTable;
