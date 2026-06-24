import React, { useEffect } from 'react';
import { useJobs } from '../../hooks/useJobs';
import './Jobs.css';

export const JobsTable: React.FC = () => {
  const { jobs, loading, fetchJobs } = useJobs();

  useEffect(() => {
    fetchJobs();
  }, []);

  if (loading) return <div className="jobs-loading">Loading jobs...</div>;

  return (
    <div className="jobs-container glass-dark">
      <h1 className="jobs-title">Available Jobs</h1>
      <div className="jobs-table">
        <div className="table-header">
          <div>Company</div>
          <div>Position</div>
          <div>Location</div>
          <div>Match Score</div>
          <div>Action</div>
        </div>
        {jobs.map((job: any) => (
          <div key={job.id} className="table-row">
            <div>{job.company_name}</div>
            <div>{job.title}</div>
            <div>{job.location}</div>
            <div>
              <span className={`match-badge match-${getMatchLevel(job.match_score)}`}>
                {job.match_score || 'N/A'}%
              </span>
            </div>
            <div>
              <button className="btn btn-primary">View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function getMatchLevel(score: number): string {
  if (score >= 90) return 'high';
  if (score >= 75) return 'medium';
  return 'low';
}

export default JobsTable;
