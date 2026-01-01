import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, subscriptionAPI, profileAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated on mount
    const token = localStorage.getItem('access_token');
    if (token) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuth = async () => {
    try {
      // Use dashboard endpoint to get both user and subscription in one call
      const dashboardData = await profileAPI.getDashboard();
      setUser(dashboardData.user);
      setSubscription(dashboardData.subscription);
      setIsAuthenticated(true);
    } catch (error) {
      // If dashboard fails, try to get profile to verify token
      try {
        const userData = await profileAPI.getMyProfile();
        setUser(userData);
        setIsAuthenticated(true);
        // Try to get subscription separately
        try {
          const sub = await subscriptionAPI.getMySubscription();
          setSubscription(sub);
        } catch (subError) {
          // 404 means no subscription found, which is valid
          if (subError.response?.status === 404) {
            setSubscription(null);
          }
        }
      } catch (profileError) {
        // Token invalid or expired (401, 403, etc.)
        localStorage.removeItem('access_token');
        setIsAuthenticated(false);
        setUser(null);
        setSubscription(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      await authAPI.login(email, password);
      setIsAuthenticated(true);
      await checkAuth();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await profileAPI.getMyProfile();
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      await authAPI.register(userData);
      // Auto login after registration
      return await login(userData.email, userData.password);
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    setSubscription(null);
    setIsAuthenticated(false);
  };

  const refreshSubscription = async () => {
    try {
      const sub = await subscriptionAPI.getMySubscription();
      setSubscription(sub);
      return sub;
    } catch (error) {
      // 404 means no subscription found, which is valid
      if (error.response?.status === 404) {
        setSubscription(null);
        return null;
      }
      setSubscription(null);
      throw error;
    }
  };

  const value = {
    user,
    subscription,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshSubscription,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

