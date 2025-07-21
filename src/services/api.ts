// src/services/api.ts
import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// API_URL - 프록시 사용
// const API_URL = 'http://192.168.35.96:3001/api'; // 로컬 테스트용
const API_URL = 'https://week3server-production.up.railway.app/api'; // Railway 배포용

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // 해치웠나?!?!?!?
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

// 중복확인 API
export const checkUsername = (username: string) => api.get(`/users/check-username/${username}`);
export const checkNickname = (nickname: string) => api.get(`/users/check-nickname/${nickname}`);

export default api;
