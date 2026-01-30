// API Configuration — points to your Python backend (set in .env)
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export { API_BASE_URL }

export const getApiUrl = (endpoint) => {
  const base = API_BASE_URL.replace(/\/$/, '')
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  return base ? `${base}/${cleanEndpoint}` : `/${cleanEndpoint}`
}

export default API_BASE_URL
