import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('clinbridge_access_token') || null);
  const [refreshTokenVal, setRefreshTokenVal] = useState(() => localStorage.getItem('clinbridge_refresh_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('clinbridge_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register'

  // Configure Axios Request Interceptor for Bearer Token
  useEffect(() => {
    const reqInterceptor = axios.interceptors.request.use(
      (config) => {
        const activeToken = localStorage.getItem('clinbridge_access_token');
        if (activeToken) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${activeToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const resInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Automatically handle 401 Unauthorized
        if (error.response && error.response.status === 401) {
          // If a request fails with 401 and it's not a login attempt
          const url = error.config?.url || '';
          if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
            console.warn('[ClinBridge Auth] 401 Unauthorized received. Session expired or revoked.');
            // Only auto-logout if we previously thought we were logged in
            if (localStorage.getItem('clinbridge_access_token')) {
              logout(false);
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, []);

  // Validate session on app launch
  useEffect(() => {
    const verifySession = async () => {
      const savedToken = localStorage.getItem('clinbridge_access_token');
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` }
        });
        setUser(res.data);
        localStorage.setItem('clinbridge_user', JSON.stringify(res.data));
      } catch (err) {
        console.warn('[ClinBridge Auth] Stored session invalid, attempting refresh or logout:', err.message);
        // Attempt refresh if refresh token exists
        const savedRefresh = localStorage.getItem('clinbridge_refresh_token');
        if (savedRefresh) {
          try {
            const refreshRes = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: savedRefresh });
            const { access_token, refresh_token, user: freshUser } = refreshRes.data;
            setToken(access_token);
            setRefreshTokenVal(refresh_token);
            setUser(freshUser);
            localStorage.setItem('clinbridge_access_token', access_token);
            localStorage.setItem('clinbridge_refresh_token', refresh_token);
            localStorage.setItem('clinbridge_user', JSON.stringify(freshUser));
          } catch {
            logout(false);
          }
        } else {
          logout(false);
        }
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: email.trim().toLowerCase(),
      password
    });
    const { access_token, refresh_token, user: userData } = res.data;

    setToken(access_token);
    setRefreshTokenVal(refresh_token);
    setUser(userData);

    localStorage.setItem('clinbridge_access_token', access_token);
    localStorage.setItem('clinbridge_refresh_token', refresh_token);
    localStorage.setItem('clinbridge_user', JSON.stringify(userData));

    setAuthModalOpen(false);
    return userData;
  }, []);

  const register = useCallback(async (registrationData) => {
    // 1. Call register
    await axios.post(`${API_BASE}/auth/register`, registrationData);
    // 2. Automatically log in to get session tokens
    return await login(registrationData.email, registrationData.password);
  }, [login]);

  const logout = useCallback(async (notifyServer = true) => {
    const activeToken = localStorage.getItem('clinbridge_access_token');
    if (notifyServer && activeToken) {
      try {
        await axios.post(
          `${API_BASE}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${activeToken}` } }
        );
      } catch (err) {
        console.warn('[ClinBridge Auth] Server logout notice failed:', err.message);
      }
    }

    setToken(null);
    setRefreshTokenVal(null);
    setUser(null);

    localStorage.removeItem('clinbridge_access_token');
    localStorage.removeItem('clinbridge_refresh_token');
    localStorage.removeItem('clinbridge_user');
  }, []);

  const openAuthModal = useCallback((mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const hasRole = useCallback((...allowedRoles) => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  }, [user]);

  const value = useMemo(() => ({
    user,
    token,
    refreshTokenVal,
    isAuthenticated: !!token && !!user,
    role: user?.role || 'guest',
    loading,
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
    hasRole
  }), [
    user,
    token,
    refreshTokenVal,
    loading,
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
    hasRole
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

