import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      // ✅ AFEGEIX AQUESTA LÍNIA MÀGICA:
      'server-only': path.resolve(__dirname, './tests/mocks/empty.ts'),
    },
  },
});