import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',  // Always use local backend in development
        changeOrigin: true,
        rewrite: (path) => path  // Keep path as-is (already has /api prefix)
      }
    }
  }
})

 