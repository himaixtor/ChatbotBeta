/**
 * Axios API client with auth token injection and refresh handling.
 */
import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearAuth } from './auth';

function getApiUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured && configured !== 'auto') {
    return configured.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') {
    return '';
  }

  return `${window.location.protocol}//${window.location.hostname}:5000`;
}

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Handle license expired
    if (error.response?.status === 403) {
      const reason = error.response?.data?.reason;
      if (reason === 'LICENSE_EXPIRED') {
        // Dispatch custom event for license expiry
        const licenseExpiredEvent = new CustomEvent('licenseExpired', {
          detail: {
            message: error.response?.data?.message,
            tokenCostExceeded: error.response?.data?.tokenCostExceeded,
          }
        });
        window.dispatchEvent(licenseExpiredEvent);
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
          });
          setTokens(data.accessToken, data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          clearAuth();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
