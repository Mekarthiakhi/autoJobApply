import { useState, useCallback, useEffect } from 'react';
import { authAPI } from '../api/auth';
export function useAuth() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (token) {
            fetchProfile();
        }
    }, [token]);
    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            const response = await authAPI.getProfile();
            setUser(response.data);
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch profile');
        }
        finally {
            setLoading(false);
        }
    }, []);
    const login = useCallback(async (email, password) => {
        try {
            setLoading(true);
            setError(null);
            const response = await authAPI.login(email, password);
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            return true;
        }
        catch (err) {
            const errorMsg = err.response?.data?.error || 'Login failed';
            setError(errorMsg);
            return false;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const register = useCallback(async (email, password, fullName) => {
        try {
            setLoading(true);
            setError(null);
            const response = await authAPI.register(email, password, fullName);
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            return true;
        }
        catch (err) {
            const errorMsg = err.response?.data?.error || 'Registration failed';
            setError(errorMsg);
            return false;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    }, []);
    return { user, token, loading, error, login, register, logout, isAuthenticated: !!token };
}
