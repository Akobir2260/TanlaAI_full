import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // Detect if running on Vercel
  const isVercel = process.env.VERCEL === '1';

  return {
    base: isVercel ? '/' : (command === 'build' ? '/static/react/' : '/'),
    plugins: [
      react(),
      tailwindcss(),
    ],
    build: {
      outDir: isVercel ? 'dist' : '../backend/static/react',
      emptyOutDir: true,
    },
    server: {
      allowedHosts: true,
      proxy: {
        '/api/v1': 'http://localhost:8000',
        '/media': 'http://localhost:8000',
      },
    },
  }
})
