import { useState, useCallback } from 'react';
import { jobsAPI } from '../api/auth';

export function useJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (limit = 50) => {
    try {
      setLoading(true);
      setError(null);
      const response = await jobsAPI.getJobs(limit);
      const raw = response.data;
      const list = Array.isArray(raw) ? raw : (raw?.jobs && Array.isArray(raw.jobs) ? raw.jobs : []);
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

  return { jobs, loading, error, fetchJobs, searchJobs };
}
