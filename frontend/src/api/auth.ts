import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRequest = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthRequest) {
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (email: string, password: string, fullName: string) =>
    client.post('/auth/register', { email, password, fullName }),
  
  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }),
  
  getProfile: () => client.get('/auth/profile'),
  
  updateProfile: (data: any) => client.put('/auth/profile', data),
};

export const jobsAPI = {
  getJobs: (limit = 50) => client.get(`/jobs?limit=${limit}`),
  getJobDetails: (jobId: string) => client.get(`/jobs/${jobId}`),
  searchJobs: (keywords: string[]) => client.post('/jobs/search', { keywords }),
};

export const applicationsAPI = {
  applyToJob: (jobId: string) => client.post('/applications/apply', { jobId }),
  getApplications: () => client.get('/applications'),
  updateStatus: (applicationId: string, status: string) =>
    client.put(`/applications/${applicationId}`, { status }),
};

export const dashboardAPI = {
  getDashboard: (params?: any) => client.get('/dashboard', { params }),
  runAgents: (options?: any) => client.post('/agents/run', options),
};

// --- Multi-Agent Intelligence APIs ---
export const agentsAPI = {
  getStatus: () => client.get('/agents/run'),
  getAgents: () => client.get('/agents/list'),
  runAgents: (options?: any) => client.post('/agents/run', options),
  testAsUser: (options?: any) => client.post('/agents/test-as-user', options),
  createCustomAgent: (data: any) => client.post('/agents/create', data),
};

export const reviewQueueAPI = {
  getPendingReviews: () => client.get('/review-queue'),
  getReviewDetail: (id: string) => client.get(`/review-queue/${id}`),
  verifyAnswers: (id: string, answers: any[]) => client.post(`/review-queue/${id}/verify-answers`, { answers }),
  updateDraft: (id: string, data: any) => client.put(`/review-queue/${id}/draft`, data),
  approve: (id: string, draftHash?: string) => client.post(`/review-queue/${id}/approve`, { approvedDraftHash: draftHash }),
  approveAll: (confirmed: boolean = true) => client.post('/review-queue/approve-all', { confirmed }),
  reject: (id: string, reason?: string) => client.post(`/review-queue/${id}/reject`, { reason }),
};

export const resumeVersionsAPI = {
  getVersions: () => client.get('/resume-versions'),
  createVersion: (formData: FormData) => client.post('/resume-versions', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateVersion: (id: string, data: any) => client.put(`/resume-versions/${id}`, data),
  deleteVersion: (id: string) => client.delete(`/resume-versions/${id}`),
  setDefault: (id: string) => client.post(`/resume-versions/${id}/default`),
};

export const coverLettersAPI = {
  getLetters: () => client.get('/cover-letters'),
  getLetter: (id: string) => client.get(`/cover-letters/${id}`),
  generate: (jobId: string, resumeVersionId?: string) => client.post('/cover-letters/generate', { jobId, resumeVersionId }),
  updateLetter: (id: string, content: string) => client.put(`/cover-letters/${id}`, { content }),
  deleteLetter: (id: string) => client.delete(`/cover-letters/${id}`),
};

export const activityLogsAPI = {
  getLogs: (params?: any) => client.get('/activity-logs', { params }),
  getStats: () => client.get('/activity-logs/stats'),
};

export const settingsAPI = {
  getSettings: () => client.get('/settings'),
  updateSettings: (data: any) => client.put('/settings', data),
};

export const exportsAPI = {
  getApplicationsCsvUrl: () => `${API_URL}/exports/applications/csv`,
  getApplicationsXlsxUrl: () => `${API_URL}/exports/applications/xlsx`,
  getActivityLogsCsvUrl: () => `${API_URL}/exports/activity-logs/csv`,
};

export const resumeAPI = {
  uploadResume: (formData: FormData) => client.post('/resumes/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getResume: () => client.get('/resumes'),
};

export const analyticsAPI = {
  getAnalytics: (params?: any) => client.get('/analytics', { params }),
};

export default client;
