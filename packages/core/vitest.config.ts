import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Run in Node environment (no browser globals needed)
    environment: 'node',
  },
});
