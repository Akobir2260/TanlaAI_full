import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => {
  const isVercel = process.env.VERCEL === '1';
  const isRender = process.env.RENDER === 'true';
  const useDistDir = isVercel || isRender;

  return {
    base: useDistDir ? '/' : (command === 'build' ? '/static/react/' : '/'),
    plugins: [
      react(),
      tailwindcss(),
    ],
    build: {
      outDir: useDistDir ? 'dist' : '../backend/static/react',
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
