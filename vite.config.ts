import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
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
    host: true, // 네트워크에서 접근 가능하게 함
    proxy: {
      // 로컬 개발용
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      // Railway 배포 서버용 (필요시 주석 해제)
      // '/api': {
      //   target: 'https://week3server-production.up.railway.app',
      //   changeOrigin: true,
      //   secure: false,
      // },
      // '/socket.io': {
      //   target: 'https://week3server-production.up.railway.app',
      //   ws: true,
      //   changeOrigin: true,
      //   secure: false,
      // },
    },
  },
})
