import { defineConfig } from 'vite'

export default defineConfig({
  base: '/ground-station/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:5000',
        ws: true,
      },
    }
  }
})
