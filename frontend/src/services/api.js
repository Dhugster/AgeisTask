import axios from 'axios';

// In desktop app, always use localhost:3001
// In web app, use relative path or env variable
const isDesktop = window.__TAURI__ !== undefined;
const API_BASE_URL = isDesktop 
  ? 'http://localhost:3001/api'
  : (import.meta.env.VITE_API_URL || '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject({ ...error, message });
  }
);

// Auth API
export const authAPI = {
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  loginWithGithub: () => {
    window.location.href = `${API_BASE_URL}/auth/github`;
  },
};

// Repositories API
export const repositoriesAPI = {
  getAll: () => api.get('/repositories'),
  getById: (id) => api.get(`/repositories/${id}`),
  sync: () => api.post('/repositories/sync'),
  analyze: (id) => api.post(`/repositories/${id}/analyze`),
  getTasks: (id) => api.get(`/repositories/${id}/tasks`),
  update: (id, data) => api.put(`/repositories/${id}`, data),
  delete: (id) => api.delete(`/repositories/${id}`),
};

// Tasks API
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  complete: (id) => api.post(`/tasks/${id}/complete`),
  snooze: (id, until) => api.post(`/tasks/${id}/snooze`, { until }),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// Users API
export const usersAPI = {
  getSettings: () => api.get('/users/settings'),
  updateSettings: (data) => api.put('/users/settings', data),
  getStatistics: () => api.get('/users/stats'),
};

// Export API
export const exportAPI = {
  exportTasks: (format, repositoryId) => {
    const params = new URLSearchParams({ format });
    if (repositoryId) params.append('repository_id', repositoryId);
    window.open(`${API_BASE_URL}/export/tasks?${params.toString()}`, '_blank');
  },
  exportRepository: (id, format) => {
    const params = new URLSearchParams({ format });
    window.open(`${API_BASE_URL}/export/repository/${id}?${params.toString()}`, '_blank');
  },
};

export default api;
