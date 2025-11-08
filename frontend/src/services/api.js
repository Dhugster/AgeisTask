import axios from 'axios';

const isDesktop = window.__TAURI__ !== undefined;

const DEFAULT_DESKTOP_API = 'http://localhost:3001/api';
const inferWebApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const hostname = window.location.hostname;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]';

  if (isLocal) {
    return DEFAULT_DESKTOP_API;
  }

  return '/api';
};

const rawApiBase = isDesktop ? DEFAULT_DESKTOP_API : inferWebApiBase();
const API_BASE_URL = rawApiBase.replace(/\/+$/, '');

const toRelativePath = (path = '') => path.replace(/^\/+/, '');
const resolveAbsoluteApiUrl = (path = '') => {
  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (/^https?:\/\//i.test(normalizedBase)) {
    return `${normalizedBase}${normalizedPath}`;
  }

  const prefix = normalizedBase.startsWith('/')
    ? normalizedBase
    : `/${normalizedBase}`;

  return `${window.location.origin}${prefix}${normalizedPath}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 5000, // 5 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

const isBrowser = typeof window !== 'undefined';
const TOKEN_STORAGE_KEY = 'repoResumeToken';

const safeGetItem = (key) => {
  if (!isBrowser) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('localStorage getItem failed:', error);
    return null;
  }
};

const safeSetItem = (key, value) => {
  if (!isBrowser) return;
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn('localStorage setItem failed:', error);
  }
};

const applyAuthHeader = (token) => {
  if (!isDesktop) {
    delete api.defaults.headers.common.Authorization;
    return;
  }

  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

const getStoredToken = () => safeGetItem(TOKEN_STORAGE_KEY);

const setStoredToken = (token) => {
  safeSetItem(TOKEN_STORAGE_KEY, token ?? null);
  applyAuthHeader(token);
};

const clearStoredToken = () => {
  safeSetItem(TOKEN_STORAGE_KEY, null);
  applyAuthHeader(null);
};

const bootstrapAuthTokenFromStorage = () => {
  if (!isDesktop) {
    applyAuthHeader(null);
    return;
  }
  const token = getStoredToken();
  if (token) {
    applyAuthHeader(token);
  }
};

bootstrapAuthTokenFromStorage();

export const bootstrapAuthTokenFromUrl = () => {
  if (!isBrowser || !isDesktop) return;

  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('sessionToken');

    if (token) {
      setStoredToken(token);
      url.searchParams.delete('sessionToken');
      const newSearch = url.searchParams.toString();
      const newUrl = `${url.pathname}${newSearch ? `?${newSearch}` : ''}${url.hash}`;
      window.history.replaceState({}, document.title, newUrl);
    }
  } catch (error) {
    console.warn('Failed to bootstrap auth token from URL:', error);
  }
};

export const clearAuthToken = () => clearStoredToken();
export const getAuthToken = () => getStoredToken();

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
    if (error.response?.status === 401 && getStoredToken()) {
      clearStoredToken();
    }
    const message = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject({ ...error, message });
  }
);

// Auth API
export const authAPI = {
  getCurrentUser: async () => {
    try {
      return await api.get(toRelativePath('auth/me'));
    } catch (error) {
      if (error.response?.status === 401) {
        return null;
      }
      throw error;
    }
  },
  logout: () => api.post(toRelativePath('auth/logout')),
  loginWithGithub: () => {
    const loginUrl = resolveAbsoluteApiUrl('/auth/github');
    window.location.assign(loginUrl);
  },
};

// Repositories API
export const repositoriesAPI = {
  getAll: () => api.get(toRelativePath('repositories')),
  getById: (id) => api.get(toRelativePath(`repositories/${id}`)),
  sync: () => api.post(toRelativePath('repositories/sync')),
  analyze: (id) => api.post(toRelativePath(`repositories/${id}/analyze`)),
  getTasks: (id) => api.get(toRelativePath(`repositories/${id}/tasks`)),
  update: (id, data) => api.put(toRelativePath(`repositories/${id}`), data),
  delete: (id) => api.delete(toRelativePath(`repositories/${id}`)),
};

// Tasks API
export const tasksAPI = {
  getAll: (params) => api.get(toRelativePath('tasks'), { params }),
  getById: (id) => api.get(toRelativePath(`tasks/${id}`)),
  update: (id, data) => api.put(toRelativePath(`tasks/${id}`), data),
  complete: (id) => api.post(toRelativePath(`tasks/${id}/complete`)),
  snooze: (id, until) => api.post(toRelativePath(`tasks/${id}/snooze`), { until }),
  delete: (id) => api.delete(toRelativePath(`tasks/${id}`)),
};

// Users API
export const usersAPI = {
  getSettings: () => api.get(toRelativePath('users/settings')),
  updateSettings: (data) => api.put(toRelativePath('users/settings'), data),
  getStatistics: () => api.get(toRelativePath('users/stats')),
};

// Export API
export const exportAPI = {
  exportTasks: (format, repositoryId) => {
    const params = new URLSearchParams({ format });
    if (repositoryId) params.append('repository_id', repositoryId);
    window.open(
      `${resolveAbsoluteApiUrl('/export/tasks')}?${params.toString()}`,
      '_blank'
    );
  },
  exportRepository: (id, format) => {
    const params = new URLSearchParams({ format });
    window.open(
      `${resolveAbsoluteApiUrl(`/export/repository/${id}`)}?${params.toString()}`,
      '_blank'
    );
  },
};

export default api;
