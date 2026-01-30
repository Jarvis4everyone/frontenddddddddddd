import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, subscriptionAPI, profileAPI } from '../services/api';

// Create context with default values to prevent "must be used within AuthProvider" errors
const defaultContext = {
  user: null,
  subscription: null,
  loading: true,
  isAuthenticated: false,
  login: async () => ({ success: false, error: 'Not initialized' }),
  register: async () => ({ success: false, error: 'Not initialized' }),
  logout: () => {},
  refreshSubscription: async () => null,
  refreshUser: async () => null,
};

const AuthContext = createContext(defaultContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  // Always return context - if it's the default, that means we're outside provider
  // but at least it won't crash
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
      checkAuth().catch((error) => {
        // Handle any uncaught errors during auth check
        console.error('Error during auth check:', error);
        setLoading(false);
      });
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
          // getMySubscription returns null for 404 (no subscription found)
          setSubscription(sub);
        } catch (subError) {
          // Handle any other errors gracefully
          console.error('Error fetching subscription:', subError);
          setSubscription(null);
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

  const getAuthErrorMessage = (error, fallback) => {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (error.message && error.code !== 'ERR_NETWORK') return error.message;
    return fallback;
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
        error: getAuthErrorMessage(error, 'Incorrect email or password. Please try again.'),
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
      return await login(userData.email, userData.password);
    } catch (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error, 'Registration failed. Please try again.'),
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
      // getMySubscription returns null for 404 (no subscription found)
      setSubscription(sub);
      return sub;
    } catch (error) {
      // Handle errors gracefully - don't throw, just set to null
      // This prevents uncaught promise rejections
      console.error('Error refreshing subscription:', error);
      setSubscription(null);
      // Return null instead of throwing to prevent uncaught promise errors
      return null;
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

