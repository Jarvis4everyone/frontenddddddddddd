import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
    // API: set VITE_API_BASE_URL in .env to your Python backend URL
  }
})
