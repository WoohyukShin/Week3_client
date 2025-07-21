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
    proxy: {
      // 로컬 개발용 (주석 해제 시 사용)
      // '/api': {
      //   target: 'http://localhost:3001',
      //   changeOrigin: true,
      //   secure: false,
      // },
      // '/socket.io': {
      //   target: 'http://localhost:3001',
      //   ws: true,
      //   changeOrigin: true,
      //   secure: false,
      // },
      // Railway 배포 서버용 (아래 target을 실제 배포 주소로 맞추세요)
      '/api': {
        target: 'https://week3server-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://week3server-production.up.railway.app',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
