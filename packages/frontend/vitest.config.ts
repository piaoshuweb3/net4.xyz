import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/test/**/*.test.{ts,tsx}', 'src/test/**/*.spec.{ts,tsx}'],
    exclude: ['src/test/e2e/**'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/test/**']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@net4xyz/shared': path.resolve(__dirname, '../shared/src')
    }
  }
});