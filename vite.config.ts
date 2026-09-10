import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The API base can be overridden with VITE_API_PROXY (e.g. a deployed backend).
const apiTarget = process.env.VITE_API_PROXY || 'http://localhost:8787'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all /api calls to the Express backend in server/.
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
