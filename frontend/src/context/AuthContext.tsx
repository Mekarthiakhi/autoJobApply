import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';

export interface User {
  id: string;
  email: string;
  fullName: string;
  isVerified?: boolean;
  preferredLocations?: string;
  employmentType?: string;
  minMatchScore?: number;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName: string) => Promise<boolean>;
  demoLogin: () => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getCleanStoredToken(): string | null {
  const token = localStorage.getItem('token');
  if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
    localStorage.removeItem('token');
    return null;
  }
  return token;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getCleanStoredToken);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    const currentToken = getCleanStoredToken();
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await authAPI.getProfile();
      setUser(res.data);
      setError(null);
    } catch (err: any) {
      console.warn('Profile fetch failed:', err.response?.data?.error || err.message);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token, fetchProfile]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const res = await authAPI.login(email, password);
      const resToken = res.data?.token;
      const resUser = res.data?.user;

      if (resToken) {
        localStorage.setItem('token', resToken);
        setToken(resToken);
        setUser(resUser || null);
        return true;
      }
      setError('Login succeeded but token was missing');
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const res = await authAPI.register(email, password, fullName);
      const resToken = res.data?.token;
      const resUser = res.data?.user;

      if (resToken) {
        localStorage.setItem('token', resToken);
        setToken(resToken);
        setUser(resUser || null);
        return true;
      }

      // If backend returned success without token (requires explicit login)
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Registration failed.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const demoLogin = useCallback(async (): Promise<boolean> => {
    return login('test.user@autojobapply.local', 'TestPassword123!');
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: Boolean(token && token !== 'undefined' && token !== 'null'),
    loading,
    error,
    login,
    register,
    demoLogin,
    logout,
    refreshProfile: fetchProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
