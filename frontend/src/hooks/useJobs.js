import { useState, useCallback } from 'react';
import { jobsAPI } from '../api/auth';
export function useJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fetchJobs = useCallback(async (limit = 50) => {
        try {
            setLoading(true);
            setError(null);
            const response = await jobsAPI.getJobs(limit);
            setJobs(response.data);
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch jobs');
        }
        finally {
            setLoading(false);
        }
    }, []);
    const searchJobs = useCallback(async (keywords) => {
        try {
            setLoading(true);
            setError(null);
            const response = await jobsAPI.searchJobs(keywords);
            setJobs(response.data);
        }
        catch (err) {
            setError(err.response?.data?.error || 'Search failed');
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { jobs, loading, error, fetchJobs, searchJobs };
}
