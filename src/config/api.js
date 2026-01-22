// API Configuration
// Supports both VITE_API_URL and VITE_API_BASE_URL for compatibility
const API_URL = import.meta.env.VITE_API_URL || 
                import.meta.env.VITE_API_BASE_URL || 
                'http://localhost:8000';

export const API_BASE_URL = API_URL;

// Helper to get full API endpoint
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

export default API_BASE_URL;
