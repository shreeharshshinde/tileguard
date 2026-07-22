import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Vite configuration for @tileguard/inspector
 *
 * The Inspector is a standalone React 18 SPA (not a library). It uses Vite
 * for both development (hot module replacement) and production bundling.
 * Unit tests run via vitest using this same Vite pipeline.
 *
 * Workspace package aliases are resolved directly to source TypeScript files
 * so that the SPA always uses the latest in-tree code without a separate build
 * step. These aliases must mirror the `paths` entries in tsconfig.json.
 */
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Resolve workspace packages directly to source — no dist/ build required
      '@tileguard/core': resolve(__dirname, '../core/src/index.ts'),
      '@tileguard/shared': resolve(__dirname, '../shared/src/index.ts'),
      '@tileguard/tile-rules': resolve(__dirname, '../tile-rules/src/index.ts'),
      '@tileguard/style-rules': resolve(__dirname, '../style-rules/src/index.ts'),
      '@tileguard/reporters': resolve(__dirname, '../reporters/src/index.ts'),
    },
  },

  build: {
    // Output to dist/ (standard Vite default — used by the CLI server command)
    outDir: 'dist',
    // Clean the output directory before each build
    emptyOutDir: true,
    // Source maps in production for diagnostic tooling
    sourcemap: true,
    // Target modern browsers — Inspector is a developer tool, not a public site
    target: 'es2022',
  },

  test: {
    // vitest unit tests — include only the tests/ directory
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Node environment for fast, headless subsystem unit tests
    environment: 'node',
    passWithNoTests: true,
    globals: false,
  },
});
