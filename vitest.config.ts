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
    /**
     * Concurrency is capped because a database test is not a cheap test.
     *
     * Several suites start PGlite, which is a whole Postgres compiled to
     * WebAssembly and costs real memory. Left unbounded, vitest spawns a worker
     * per file and enough of them start a database at once to exhaust the machine.
     * Workers then die with SIGABRT, which surfaces as unrelated tests "failing"
     * and sends you looking at the wrong code. Four keeps the suite well inside
     * both this machine and a CI runner, and costs a few seconds.
     */
    maxWorkers: 4,
  },
});
