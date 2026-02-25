import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/services/**', 'src/hooks/**', 'src/components/**'],
      exclude: ['src/data/**', 'src/test/**'],
      thresholds: {
        lines: 80,
        functions: 85,
      },
    },
  },
});
