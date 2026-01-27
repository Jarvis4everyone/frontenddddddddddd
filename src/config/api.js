// API Configuration
// Since backend and frontend are integrated on the same server,
// we always use relative /api path in both development and production
// VITE_API_URL is only used at build time for environment variables, not runtime
const API_URL = '/api';

export const API_BASE_URL = API_URL;

export default API_BASE_URL;
