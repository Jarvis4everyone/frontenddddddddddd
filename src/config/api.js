// API Configuration
// In development, ALWAYS use proxy to local backend (/api)
// In production, use relative path (same server)
// Force local backend in development - ignore environment variables
const API_URL = import.meta.env.DEV 
  ? '/api'  // Always use proxy in development
  : (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api');

export const API_BASE_URL = API_URL;

// Helper to get full API endpoint
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If API_BASE_URL already includes /api, don't add it again
  if (API_BASE_URL.endsWith('/api')) {
    return `${API_BASE_URL}/${cleanEndpoint}`;
  }
  
  // Otherwise, ensure /api prefix
  const apiPrefix = cleanEndpoint.startsWith('api/') ? '' : 'api/';
  return `${API_BASE_URL}/${apiPrefix}${cleanEndpoint}`;
};

export default API_BASE_URL;
