/**
 * Integration tests for @tileguard/config.
 *
 * Tests the full pipeline — discovery → loading → validation — against
 * real fixture directories. Each fixture directory contains a real config
 * file rather than mocked modules.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ConfigLoadError,
  ConfigNotFoundError,
  ConfigValidationError,
  loadConfig,
} from '../src/index.js';

const fixturesDir = join(fileURLToPath(import.meta.url), '..', 'fixtures');

describe('integration — happy paths', () => {
  it('loads a valid .ts config from a fixture directory', async () => {
    const result = await loadConfig({
      cwd: join(fixturesDir, 'valid-ts'),
    });

    expect(result.configPath).toContain('tileguard.config.ts');
    expect(result.config.reporter).toBe('text');
    expect(result.config.rules).toBeDefined();
    expect(result.config.rules!['tile/required-layers']).toBe('error');
    expect(result.config.rules!['tile/no-empty']).toBe('off');
    expect(result.warnings).toHaveLength(0);
  });

  it('loads a valid .json config from a fixture directory', async () => {
    const result = await loadConfig({
      cwd: join(fixturesDir, 'valid-json'),
    });

    expect(result.configPath).toContain('tileguard.config.json');
    expect(result.config.reporter).toBe('json');
    expect(result.config.rules).toBeDefined();
    expect(result.warnings).toHaveLength(0);
  });

  it('returns default config with no warnings when no config file exists', async () => {
    // Create an empty temp directory with no config files
    const emptyDir = mkdtempSync(join(tmpdir(), 'tileguard-no-config-'));
    try {
      const result = await loadConfig({ cwd: emptyDir });

      expect(result.config).toEqual({});
      expect(result.configPath).toBeUndefined();
      expect(result.warnings).toHaveLength(0);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});

describe('integration — negative paths', () => {
  it('throws ConfigNotFoundError when explicit configPath does not exist', async () => {
    await expect(
      loadConfig({ configPath: '/absolutely/does/not/exist/tileguard.config.ts' }),
    ).rejects.toThrow(ConfigNotFoundError);

    try {
      await loadConfig({ configPath: '/absolutely/does/not/exist/tileguard.config.ts' });
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigNotFoundError);
      expect((err as ConfigNotFoundError).message).toContain(
        '/absolutely/does/not/exist/tileguard.config.ts',
      );
    }
  });

  it('throws ConfigLoadError when config file throws during execution', async () => {
    await expect(loadConfig({ cwd: join(fixturesDir, 'throws') })).rejects.toThrow(ConfigLoadError);

    try {
      await loadConfig({ cwd: join(fixturesDir, 'throws') });
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigLoadError);
      const cle = err as ConfigLoadError;
      // The original error should be preserved as cause
      expect(cle.cause).toBeInstanceOf(Error);
      expect((cle.cause as Error).message).toContain('intentionally throws');
    }
  });

  it('throws ConfigValidationError with all issues collected for multi-error config', async () => {
    await expect(loadConfig({ cwd: join(fixturesDir, 'multi-error') })).rejects.toThrow(
      ConfigValidationError,
    );

    try {
      await loadConfig({ cwd: join(fixturesDir, 'multi-error') });
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      const cve = err as ConfigValidationError;
      // Must have collected all 4 field violations, not stopped at the first
      expect(cve.issues.length).toBeGreaterThanOrEqual(4);
      const paths = cve.issues.map((i) => i.path);
      expect(paths).toContain('plugins');
      expect(paths).toContain('rules');
      expect(paths).toContain('reporter');
      expect(paths).toContain('options');
    }
  });

  it('loads successfully with warnings for config with unknown keys only', async () => {
    const result = await loadConfig({
      cwd: join(fixturesDir, 'warnings-only'),
    });

    // Should NOT throw — no error-severity issues
    expect(result.config.reporter).toBe('json');
    expect(result.configPath).toContain('tileguard.config.mjs');

    // Should have 2 warnings: "repporter" and "unknownKey"
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings.every((w) => w.severity === 'warning')).toBe(true);
    const warningPaths = result.warnings.map((w) => w.path);
    expect(warningPaths).toContain('repporter');
    expect(warningPaths).toContain('unknownKey');
  });
});
