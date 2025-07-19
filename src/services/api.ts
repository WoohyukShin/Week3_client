// src/services/api.ts
import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// 환경에 따른 API URL 설정
// Railway 배포 후 실제 도메인으로 변경하세요!
// 예: https://your-backend-name.railway.app/api
const API_URL = import.meta.env.VITE_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://week3server-production.up.railway.app/api' // 실제 백엔드 도메인으로 변경
    : 'http://localhost:3001/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// JWT 토큰을 헤더에 추가하는 인터셉터
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터 - 토큰 만료 시 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const registerUser = (userData: any) => api.post('/users/register', userData);
export const loginUser = (credentials: any) => api.post('/users/login', credentials);
export const getRanking = () => api.get('/users/ranking');

export default api;
