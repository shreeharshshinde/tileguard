/**
 * Integration tests for the `init` command.
 *
 * Spawns the CLI binary as a real subprocess to verify file creation
 * behavior, the --force refusal/overwrite semantics, and that the
 * scaffolded config file contains the expected content.
 *
 * These tests also serve as the integration-level verification for the
 * Proposal 1 and Proposal 2 architectural refinements: `runInit` no longer
 * writes to any stream directly — it returns a `CommandResult` with
 * `result.message`, and `bin.ts` routes that message to stderr via its
 * `present()` helper. The assertions below confirm that stream routing
 * works end-to-end through the real binary.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const BIN_PATH = join(import.meta.dirname, '../../dist/bin.js');
const FIXTURE_DIR = join(import.meta.dirname, '../fixtures/integration-init');

describe('CLI Integration: init', () => {
  beforeEach(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
    mkdirSync(FIXTURE_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  function runInit(args: string[] = []) {
    const result = spawnSync('node', [BIN_PATH, 'init', ...args], {
      cwd: FIXTURE_DIR,
      encoding: 'utf8',
    });
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  }

  it('creates tileguard.config.ts and exits 0', () => {
    const result = runInit();

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Created tileguard.config.ts');

    const configPath = join(FIXTURE_DIR, 'tileguard.config.ts');
    expect(existsSync(configPath)).toBe(true);

    const content = readFileSync(configPath, 'utf8');
    expect(content).toContain("import type { TileGuardConfig } from '@tileguard/core'");
    expect(content).toContain('export default config');
  });

  it('routes the success message to stderr, not stdout — Proposal 2 stream routing', () => {
    // runInit returns { message: 'Created tileguard.config.ts' }.
    // bin.ts present() writes result.message to stderr; stdout must be empty.
    const result = runInit();

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Created tileguard.config.ts');
    expect(result.stdout).toBe('');
  });

  it('exits 2 and preserves the existing file when run without --force', () => {
    const configPath = join(FIXTURE_DIR, 'tileguard.config.ts');
    writeFileSync(configPath, 'existing content');

    const result = runInit();

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Configuration file already exists');
    // File must not be touched
    expect(readFileSync(configPath, 'utf8')).toBe('existing content');
  });

  it('overwrites an existing config when --force is given and exits 0', () => {
    const configPath = join(FIXTURE_DIR, 'tileguard.config.ts');
    writeFileSync(configPath, 'existing content');

    const result = runInit(['--force']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Created tileguard.config.ts');

    const content = readFileSync(configPath, 'utf8');
    expect(content).not.toBe('existing content');
    expect(content).toContain("import type { TileGuardConfig } from '@tileguard/core'");
  });
});
