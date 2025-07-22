import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'https://week3server-production.up.railway.app',
        changeOrigin: true,
        secure: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(`🚀 Proxy Request: ${req.method} ${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(`✅ Proxy Response: ${req.method} ${req.url} - ${proxyRes.statusCode}`);
          });
        }
      }
    }
  },
})
