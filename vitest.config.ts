import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Default is node. Component tests opt in with a `@vitest-environment jsdom` docblock.
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    setupFiles: ['tests/setup/vitest.setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    reporters: ['default'],
    pool: 'forks',
  },
});
