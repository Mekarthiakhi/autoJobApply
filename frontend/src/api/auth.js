import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const client = axios.create({
    baseURL: API_URL,
});
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
export const authAPI = {
    register: (email, password, fullName) => client.post('/auth/register', { email, password, fullName }),
    login: (email, password) => client.post('/auth/login', { email, password }),
    getProfile: () => client.get('/auth/profile'),
    updateProfile: (data) => client.put('/auth/profile', data),
};
export const jobsAPI = {
    getJobs: (limit = 50) => client.get(`/jobs?limit=${limit}`),
    getJobDetails: (jobId) => client.get(`/jobs/${jobId}`),
    searchJobs: (keywords) => client.post('/jobs/search', { keywords }),
};
export const applicationsAPI = {
    applyToJob: (jobId) => client.post('/applications/apply', { jobId }),
    getApplications: () => client.get('/applications'),
    updateStatus: (applicationId, status) => client.put(`/applications/${applicationId}`, { status }),
};
export const dashboardAPI = {
    getDashboard: () => client.get('/dashboard'),
};
export default client;
