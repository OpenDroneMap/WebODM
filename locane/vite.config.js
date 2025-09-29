import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    proxy: {
      '/logout': {
        target: 'http://192.168.1.4:8000',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://192.168.1.4:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://192.168.1.4:8000',
        changeOrigin: true,
      }
    }
  },
    // Build settings - where to put the finished React app
  build: {
    outDir: 'dist',              // Put built files in 'dist' folder
    assetsDir: 'assets',         // Put CSS/JS files in 'assets' subfolder
    emptyOutDir: true,           // Clean the folder before building
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  
  base: command === 'serve' ? '/' : '/static/',
}))
