import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token - use api instance to go through proxy
        const response = await api.post('/auth/refresh', {});
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear token and redirect to login
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (userData) => {
    // Ensure we only send the required fields in the correct format
    // Field name must be exactly 'contact_number' (with underscore) as per API
    const registrationPayload = {
      name: String(userData.name || '').trim(),
      email: String(userData.email || '').trim(),
      contact_number: String(userData.contact_number || '').trim(),
      password: String(userData.password || ''),
    };
    const response = await api.post('/auth/register', registrationPayload);
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('access_token', response.data.access_token);
    return response.data;
  },

  refresh: async () => {
    const response = await api.post('/auth/refresh');
    localStorage.setItem('access_token', response.data.access_token);
    return response.data;
  },
};

// Contact API
export const contactAPI = {
  sendMessage: async (contactData) => {
    // Get token if user is logged in
    const token = localStorage.getItem('access_token');
    
    // Use api instance but add auth header if token exists
    const config = {};
    if (token) {
      config.headers = { 'Authorization': `Bearer ${token}` };
    }
    const response = await api.post('/contact', contactData, config);
    return response.data;
  },
};

// Profile API
export const profileAPI = {
  getMyProfile: async () => {
    const response = await api.get('/profile/me');
    return response.data;
  },

  updateMyProfile: async (profileData) => {
    const response = await api.put('/profile/me', profileData);
    return response.data;
  },

  getMySubscription: async () => {
    const response = await api.get('/profile/subscription');
    return response.data;
  },

  getDashboard: async () => {
    const response = await api.get('/profile/dashboard');
    return response.data;
  },
};

// Subscription API
export const subscriptionAPI = {
  getMySubscription: async () => {
    try {
      const response = await api.get('/subscriptions/me');
      // Backend now returns null (200 status) instead of 404 for no subscription
      return response.data;
    } catch (error) {
      // Handle any unexpected errors
      console.error('Subscription fetch error:', error);
      throw error;
    }
  },

  getPrice: async () => {
    // Public endpoint, no auth required - use api instance to go through proxy
    const response = await api.get('/subscriptions/price');
    return response.data;
  },

  renew: async (months) => {
    const response = await api.post('/subscriptions/renew', { months });
    return response.data;
  },

  cancel: async () => {
    const response = await api.post('/subscriptions/cancel');
    return response.data;
  },
};

// Download API
export const downloadAPI = {
  downloadFile: async () => {
    const response = await api.get('/download/file', {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Payment API
export const paymentAPI = {
  /**
   * Create a payment order
   * @param {number} amount - Amount in rupees (e.g., 299.00)
   * @param {string} currency - Currency code (default: 'INR')
   * @returns {Promise<Object>} Order data with order_id, amount (in paise), currency, key_id, payment_id
   */
  createOrder: async (amount, currency = 'INR') => {
    const response = await api.post('/payments/create-order', {
      amount,
      currency,
    });
    return response.data;
  },

  /**
   * Verify payment after Razorpay checkout
   * @param {Object} paymentData - Payment verification data
   * @param {string} paymentData.razorpay_order_id - Order ID from Razorpay
   * @param {string} paymentData.razorpay_payment_id - Payment ID from Razorpay
   * @param {string} paymentData.razorpay_signature - Payment signature from Razorpay
   * @returns {Promise<Object>} Verification result with payment details
   */
  verifyPayment: async (paymentData) => {
    const response = await api.post('/payments/verify', {
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_payment_id: paymentData.razorpay_payment_id,
      razorpay_signature: paymentData.razorpay_signature,
    });
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  // User Management
  getAllUsers: async (skip = 0, limit = 100) => {
    const response = await api.get(`/admin/users?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getUserById: async (userId) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data;
  },

  resetUserPassword: async (userId, newPassword) => {
    const response = await api.post(`/admin/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Subscription Management
  activateSubscription: async (userId, months) => {
    const response = await api.post('/admin/subscriptions/activate', {
      user_id: userId,
      months,
    });
    return response.data;
  },

  extendSubscription: async (userId, months) => {
    const response = await api.post(`/admin/subscriptions/${userId}/extend`, {
      months,
    });
    return response.data;
  },

  cancelSubscription: async (userId) => {
    const response = await api.post(`/admin/subscriptions/${userId}/cancel`);
    return response.data;
  },

  // Payment Management
  getAllPayments: async (skip = 0, limit = 100) => {
    const response = await api.get(`/admin/payments?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Contact Management
  getAllContacts: async (skip = 0, limit = 100, status = null) => {
    let url = `/contact/admin/all?skip=${skip}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }
    const response = await api.get(url);
    return response.data;
  },

  getContactById: async (contactId) => {
    const response = await api.get(`/contact/admin/${contactId}`);
    return response.data;
  },

  updateContactStatus: async (contactId, status) => {
    const response = await api.patch(`/contact/admin/${contactId}/status`, { status });
    return response.data;
  },

  deleteContact: async (contactId) => {
    const response = await api.delete(`/contact/admin/${contactId}`);
    return response.data;
  },
};

// Health Check API
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
  getInfo: async () => {
    const response = await api.get('/');
    return response.data;
  },
};

// Utility function to check subscription status (as per API docs)
export const checkSubscriptionStatus = async () => {
  try {
    const subscription = await subscriptionAPI.getMySubscription();
    
    if (subscription.status === 'active') {
      // Check if not expired
      const endDate = new Date(subscription.end_date);
      const now = new Date();
      
      if (endDate > now) {
        return { active: true, subscription };
      } else {
        return { active: false, expired: true, subscription };
      }
    }
    
    return { active: false, subscription };
  } catch (error) {
    if (error.response?.status === 404 || error.message?.includes('No subscription found')) {
      return { active: false, noSubscription: true };
    }
    throw error;
  }
};

// Utility function to check if subscription is truly active (not expired)
export const isSubscriptionActive = (subscription) => {
  if (!subscription || subscription.status !== 'active') {
    return false;
  }
  
  const endDate = new Date(subscription.end_date);
  const now = new Date();
  
  return endDate > now;
};

export default api;

