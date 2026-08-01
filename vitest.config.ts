import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/shared/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/app/**',
        'src/shared/**',
        'src/modules/warships/services/**',
        'src/modules/warships/hooks/**',
        'src/modules/warships/components/**',
        'src/modules/battles/services/**',
        'src/modules/battles/components/**',
        'src/modules/travel/services/**',
        'src/modules/travel/components/**',
      ],
      exclude: [
        'src/modules/warships/data/**',
        'src/modules/battles/data/**',
        'src/shared/test/**',
      ],
      thresholds: {
        lines: 80,
        functions: 85,
      },
    },
  },
});
