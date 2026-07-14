/**
 * Integration tests for the `check` command.
 *
 * Spawns the CLI binary as a real subprocess via spawnSync/tsx to verify
 * behaviors that unit tests cannot reach: commander argument parsing,
 * actual process exit codes, stdout/stderr stream separation, and the
 * full config-discovery pipeline.
 *
 * All tests run against a temporary fixture directory that is created
 * fresh before each test and removed after.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const BIN_PATH = join(import.meta.dirname, '../../dist/bin.js');
const FIXTURE_DIR = join(import.meta.dirname, '../fixtures/integration-check');

describe('CLI Integration: check', () => {
  beforeEach(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
    mkdirSync(FIXTURE_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  function runCheck(args: string[], cwd = FIXTURE_DIR) {
    const result = spawnSync('node', [BIN_PATH, 'check', ...args], {
      cwd,
      encoding: 'utf8',
    });
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  }

  it('exits 2 when no sources match after expansion', () => {
    // A glob that matches nothing passes through commander (which requires
    // <sources...>) and reaches runCheck's own empty-sources check.
    // Note: running with zero args exits 1 via commander's missing-arg error
    // before runCheck is called — a different code path tested separately.
    const result = runCheck(['*.pbf']);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('No sources provided or matched');
  });

  it('exits 2 for an unknown --reporter value', () => {
    writeFileSync(join(FIXTURE_DIR, 'tile.pbf'), 'fake data');
    const result = runCheck(['tile.pbf', '--reporter', 'fake']);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Unknown reporter "fake"');
  });

  it('writes the startup banner to stderr — D9', () => {
    writeFileSync(join(FIXTURE_DIR, 'tile.pbf'), 'fake data');
    const result = runCheck(['tile.pbf']);
    expect(result.stderr).toContain('TileGuard — checking 1 source(s)');
  });

  it('stdout is purely valid JSON with --reporter json; banner stays on stderr — D9', () => {
    writeFileSync(join(FIXTURE_DIR, 'tile.pbf'), 'fake data');
    // Empty config: no plugins → no provider → artifact/no-provider (error)
    writeFileSync(join(FIXTURE_DIR, 'tileguard.config.json'), JSON.stringify({}));

    const result = runCheck(['tile.pbf', '--reporter', 'json']);

    // Banner must be on stderr, not contaminating the JSON stream
    expect(result.stderr).toContain('TileGuard — checking 1 source(s)');

    // Stdout must be parseable JSON with no extraneous output
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    const parsed = JSON.parse(result.stdout);
    expect(parsed.summary).toBeDefined();

    // No provider registered → artifact/no-provider (error severity) → exit 1
    expect(result.exitCode).toBe(1);
  });

  it('resolves "." to all known-extension files in the directory — D7', () => {
    writeFileSync(join(FIXTURE_DIR, 'tile1.pbf'), 'data');
    writeFileSync(join(FIXTURE_DIR, 'tile2.json'), '{}');
    // tileguard.config.json also has .json extension — picked up as a 3rd source.
    writeFileSync(join(FIXTURE_DIR, 'tileguard.config.json'), JSON.stringify({}));

    const result = runCheck(['.']);

    expect(result.exitCode).toBe(1);
    // 3 sources: tile1.pbf, tile2.json, tileguard.config.json
    expect(result.stderr).toContain('TileGuard — checking 3 source(s)');
  });

  it('exits 1 when the engine reports validation failures', () => {
    writeFileSync(join(FIXTURE_DIR, 'tile.pbf'), 'bad data');
    writeFileSync(join(FIXTURE_DIR, 'tileguard.config.json'), JSON.stringify({}));

    const result = runCheck(['tile.pbf']);

    expect(result.exitCode).toBe(1);
    // text reporter writes diagnostics to stdout
    expect(result.stdout).toContain('artifact/no-provider');
  });
});
