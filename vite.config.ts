import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Required for Electron to load assets correctly
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@warships': path.resolve(__dirname, 'src/modules/warships'),
      '@battles': path.resolve(__dirname, 'src/modules/battles'),
      '@travel': path.resolve(__dirname, 'src/modules/travel'),
      '@characters': path.resolve(__dirname, 'src/modules/characters'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 1537,
    strictPort: true, // Fail if port is in use
  },
})
