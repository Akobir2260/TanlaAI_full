 source /home/akobir/Desktop/tanlaAI/.venv/bin/activate
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => {
  return {
    base: command === 'build' ? '/static/react/' : '/',
    plugins: [react(), tailwindcss()],
    build: {
      outDir: '../backend/static/react',
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
