import { createContext, useContext, useState, useCallback } from 'react';
import api from '../utils/api';
import { setTokens, setUser, getUser, clearAuth, isAuthenticated } from '../utils/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser());
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password, captchaToken) => {
    setLoading(true);
    try {
      // TODO: Enable captchaToken when CAPTCHA is uncommented
      const { data } = await api.post('/api/auth/login', { email, password }); // captchaToken commented out
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      setUserState(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {
        refreshToken: localStorage.getItem('chatbot_refresh_token'),
      });
    } catch {
      /* ignore */
    }
    clearAuth();
    setUserState(null);
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: isAuthenticated(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
