import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await authApi.getMe();
      if (data && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
      if (err.status !== 401 && err.status !== 403) {
        console.error('Auth verification error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username, password) => {
    setAuthError(null);
    try {
      const data = await authApi.login({ username, password });
      if (data && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        return data;
      }
    } catch (err) {
      const message = err.data?.detail || err.message || 'Login failed. Please check your credentials.';
      setAuthError(message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const role = user?.role || 'STUDENT';
  const isStudent = role === 'STUDENT';
  const isEducator = ['PLATFORM_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'].includes(role);
  const isTeacher = role === 'TEACHER';
  const isInstituteAdmin = role === 'INSTITUTE_ADMIN' || role === 'PLATFORM_ADMIN';
  const isPlatformAdmin = role === 'PLATFORM_ADMIN';
  const isSuperuser = Boolean(user?.is_superuser);
  const isStaff = Boolean(user?.is_staff);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isStudent,
        isEducator,
        isTeacher,
        isInstituteAdmin,
        isPlatformAdmin,
        isSuperuser,
        isStaff,
        institution: user?.institution,
        isAuthenticated,
        isLoading,
        authError,
        login,
        logout,
        refreshUser: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
