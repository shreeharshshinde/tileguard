import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Explicit include pattern — avoids accidental test discovery outside tests/
    include: ['tests/**/*.test.ts'],

    // Node environment: CLI package has no browser globals
    environment: 'node',

    // Pool: forks prevents state leaking between test files (critical for
    // integration tests that spawn subprocesses and change process.cwd())
    pool: 'forks',

    // Give subprocess-based integration tests room to breathe.
    // Unit tests complete in milliseconds; the 15s budget is for the slowest
    // integration test (tsx + loadConfig cold start).
    testTimeout: 15000,
  },
});
