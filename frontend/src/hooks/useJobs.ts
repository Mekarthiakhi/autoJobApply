import { useState, useCallback } from 'react';
import { jobsAPI } from '../api/auth';

export interface CandidateProfileSummary {
  hasResume: boolean;
  skills: string[];
  preferredLocations: string[];
  targetRoles: string[];
  minMatchScore: number;
}

export function useJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfileSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (params: any = { limit: 100 }) => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = typeof params === 'number' ? { limit: params } : (params || { limit: 100 });
      const response = await jobsAPI.getJobs(queryParams);
      const raw = response.data;
      const list = Array.isArray(raw) ? raw : (raw?.jobs && Array.isArray(raw.jobs) ? raw.jobs : []);
      if (raw?.candidateProfile) {
        setCandidateProfile(raw.candidateProfile);
      }
      setJobs(list);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchJobs = useCallback(async (keywords: string[]) => {
    try {
      setLoading(true);
      setError(null);
      const response = await jobsAPI.searchJobs(keywords);
      const raw = response.data;
      const list = Array.isArray(raw) ? raw : (raw?.jobs && Array.isArray(raw.jobs) ? raw.jobs : []);
      setJobs(list);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { jobs, candidateProfile, loading, error, fetchJobs, searchJobs };
}
