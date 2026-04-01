import axios from 'axios';

const BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ----------------------------------------------------------------
// Auth endpoints
// ----------------------------------------------------------------
export const authAPI = {
  login:       (credentials) => api.post('/auth/login',       credentials),
  register:    (data)        => api.post('/auth/register',    data),
  me:          ()            => api.get('/auth/me'),
  getAllUsers:  ()            => api.get('/auth/users'),
  createUser:  (data)        => api.post('/auth/users',       data),
  deleteUser:  (id)          => api.delete(`/auth/users/${id}`),
};

// ----------------------------------------------------------------
// Video endpoints
// ----------------------------------------------------------------
export const videoAPI = {
  getAll:      (params) => api.get('/videos',           { params }),
  getOne:      (id)     => api.get(`/videos/${id}`),
  getAllAdmin:  (params) => api.get('/videos/admin/all', { params }),
  upload:      (formData) => api.post('/videos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete:      (id)     => api.delete(`/videos/${id}`),
};

export default api;
