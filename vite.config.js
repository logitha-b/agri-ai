import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    proxy: {
      '/health': { target: 'http://127.0.0.1:8004', changeOrigin: true },
      '/api/voice': { target: 'http://127.0.0.1:8004', changeOrigin: true },
      '/api/translate': { target: 'http://127.0.0.1:8004', changeOrigin: true },
      '/api/assistant': { target: 'http://127.0.0.1:8004', changeOrigin: true },
      '/api/conversations': { target: 'http://127.0.0.1:8004', changeOrigin: true },
      '/api/health': { target: 'http://127.0.0.1:8003', changeOrigin: true },
      '/api/water': { target: 'http://127.0.0.1:8003', changeOrigin: true },
      '/api/soil': { target: 'http://127.0.0.1:8003', changeOrigin: true },
      '/api/recommend': { target: 'http://127.0.0.1:8003', changeOrigin: true },
      '/api/market': { target: 'http://127.0.0.1:8003', changeOrigin: true },
      '/api/loss': { target: 'http://127.0.0.1:8003', changeOrigin: true },
      '/api/cashflow': { target: 'http://127.0.0.1:8003', changeOrigin: true },
      '/api/pearl': { target: 'http://127.0.0.1:8003', changeOrigin: true },
      '/api/lac': { target: 'http://127.0.0.1:8004', changeOrigin: true },
      '/api/production': { target: 'http://127.0.0.1:8002', changeOrigin: true },
      '/api/schemes': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/schemes-api': { target: 'http://127.0.0.1:8000', changeOrigin: true, rewrite: (path) => path.replace(/^\/schemes-api/, '') },
    },
  },
})
