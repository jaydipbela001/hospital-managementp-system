import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../../features/auth/services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const token = localStorage.getItem('hms_token');
        if (token) {
          const res = await authService.getCurrentUser();
          if (res?.data?.user) {
            setUser(res.data.user);
          }
        }
      } catch (err) {
        // Token expired or invalid
        localStorage.removeItem('hms_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res?.data) {
      if (res.data.token) {
        localStorage.setItem('hms_token', res.data.token);
      }
      setUser(res.data.user);
    }
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      // Continue client cleanup even if network fails
    } finally {
      localStorage.removeItem('hms_token');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
