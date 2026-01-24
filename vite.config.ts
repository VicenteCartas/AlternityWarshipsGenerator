import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Required for Electron to load assets correctly
  build: {
    outDir: 'dist',
  },
  server: {
    port: 4200,
    strictPort: true, // Fail if port is in use
  },
})
