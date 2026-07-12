/**
 * Tests for @tileguard/config file loader.
 *
 * Uses real fixture files to verify each format loads correctly and
 * each failure mode produces the right error class.
 */

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ConfigLoadError } from '../src/errors.js';
import { loadConfigFile } from '../src/loader.js';

const fixturesDir = join(fileURLToPath(import.meta.url), '..', 'fixtures');

describe('loadConfigFile — JSON', () => {
  it('loads a valid .json file and returns isJson: true', async () => {
    const result = await loadConfigFile(join(fixturesDir, 'valid.json'));
    expect(result.isJson).toBe(true);
    expect(result.raw).toEqual({
      rules: {
        'tile/required-layers': 'error',
        'tile/no-empty': 'off',
      },
      reporter: 'json',
    });
  });
});

describe('loadConfigFile — JS/MJS', () => {
  it('loads a valid .mjs file and returns isJson: false', async () => {
    const result = await loadConfigFile(join(fixturesDir, 'valid.mjs'));
    expect(result.isJson).toBe(false);
    expect(result.raw.reporter).toBe('text');
    expect(result.raw.rules).toBeDefined();
  });
});

describe('loadConfigFile — TypeScript', () => {
  it('loads a valid .ts file via jiti and returns isJson: false', async () => {
    const result = await loadConfigFile(join(fixturesDir, 'valid.ts'));
    expect(result.isJson).toBe(false);
    expect(result.raw.reporter).toBe('text');
    expect(result.raw.rules).toBeDefined();
  });
});

describe('loadConfigFile — error paths', () => {
  it('throws ConfigLoadError when the file throws during execution', async () => {
    await expect(loadConfigFile(join(fixturesDir, 'throws.mjs'))).rejects.toThrow(ConfigLoadError);

    try {
      await loadConfigFile(join(fixturesDir, 'throws.mjs'));
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigLoadError);
      const cle = err as ConfigLoadError;
      expect(cle.cause).toBeInstanceOf(Error);
      expect(cle.message).toContain('throws.mjs');
    }
  });

  it('throws ConfigLoadError when the module has no default export (ESM .mjs)', async () => {
    await expect(loadConfigFile(join(fixturesDir, 'no-default.mjs'))).rejects.toThrow(
      ConfigLoadError,
    );
  });

  it('throws ConfigLoadError when the module has no default export (TS .ts)', async () => {
    await expect(loadConfigFile(join(fixturesDir, 'no-default.ts'))).rejects.toThrow(
      ConfigLoadError,
    );
  });

  it('throws ConfigLoadError when the module has no default export (JS .js)', async () => {
    await expect(loadConfigFile(join(fixturesDir, 'no-default.js'))).rejects.toThrow(
      ConfigLoadError,
    );
  });

  it('throws ConfigLoadError when the default export is a string (ESM .mjs)', async () => {
    await expect(loadConfigFile(join(fixturesDir, 'non-object-default.mjs'))).rejects.toThrow(
      ConfigLoadError,
    );
  });

  it('throws ConfigLoadError when JSON is malformed (invalid.json)', async () => {
    await expect(loadConfigFile(join(fixturesDir, 'invalid.json'))).rejects.toThrow(
      ConfigLoadError,
    );
  });

  it('throws ConfigLoadError for unsupported file extensions', async () => {
    const yamlPath = join(fixturesDir, 'settings.yaml');
    await expect(loadConfigFile(yamlPath)).rejects.toThrow(ConfigLoadError);
    try {
      await loadConfigFile(yamlPath);
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigLoadError);
      expect((err as ConfigLoadError).message).toContain(
        'Unsupported config file extension ".yaml"',
      );
    }
  });

  it('throws ConfigLoadError for a nonexistent JSON file', async () => {
    await expect(loadConfigFile(join(fixturesDir, 'does-not-exist.json'))).rejects.toThrow(
      ConfigLoadError,
    );
  });

  it('preserves the configPath on the error', async () => {
    const badPath = join(fixturesDir, 'does-not-exist.json');
    try {
      await loadConfigFile(badPath);
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigLoadError);
      expect((err as ConfigLoadError).configPath).toBe(badPath);
    }
  });
});

describe('loadConfigFile — isJson flag', () => {
  it('returns isJson: true only for .json files', async () => {
    const json = await loadConfigFile(join(fixturesDir, 'valid.json'));
    expect(json.isJson).toBe(true);

    const mjs = await loadConfigFile(join(fixturesDir, 'valid.mjs'));
    expect(mjs.isJson).toBe(false);

    const ts = await loadConfigFile(join(fixturesDir, 'valid.ts'));
    expect(ts.isJson).toBe(false);
  });
});
