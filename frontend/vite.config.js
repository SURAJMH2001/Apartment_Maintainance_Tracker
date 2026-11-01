import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          'react-router-dom': ['react-router-dom'],
          '@tanstack/react-query': ['@tanstack/react-query']
        }
      }
    }
  }
})
