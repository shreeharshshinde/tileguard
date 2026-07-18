/**
 * Unit tests for src/merge-config.ts
 *
 * Verifies Decision D4: CLI flags always override config-file values.
 * Also verifies immutability (original config is never mutated) and that
 * config-file-only fields (plugins, rules, overrides) are preserved untouched.
 */

import type { TileGuardConfig } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { mergeConfig } from '../src/merge-config.js';

describe('mergeConfig', () => {
  it('returns config unchanged when no CLI flags are provided', () => {
    const fileConfig: TileGuardConfig = {
      reporter: 'json',
      options: { maxDiagnostics: 500 },
    };

    const result = mergeConfig(fileConfig, {});

    expect(result.reporter).toBe('json');
    expect(result.options?.maxDiagnostics).toBe(500);
  });

  it('CLI --reporter overrides config.reporter', () => {
    const fileConfig: TileGuardConfig = { reporter: 'text' };
    const result = mergeConfig(fileConfig, { reporter: 'json' });
    expect(result.reporter).toBe('json');
  });

  it('CLI --max-diagnostics overrides config.options.maxDiagnostics', () => {
    const fileConfig: TileGuardConfig = { options: { maxDiagnostics: 500 } };
    const result = mergeConfig(fileConfig, { maxDiagnostics: 100 });
    expect(result.options?.maxDiagnostics).toBe(100);
  });

  it('preserves other options fields when merging maxDiagnostics', () => {
    const fileConfig: TileGuardConfig = {
      options: { timeout: 5000, maxDiagnostics: 500 },
    };

    const result = mergeConfig(fileConfig, { maxDiagnostics: 100 });

    // timeout must survive the merge
    expect(result.options?.timeout).toBe(5000);
    expect(result.options?.maxDiagnostics).toBe(100);
  });

  it('does not mutate the original config object', () => {
    const fileConfig: TileGuardConfig = { reporter: 'text' };

    mergeConfig(fileConfig, { reporter: 'json' });

    expect(fileConfig.reporter).toBe('text');
  });

  it('handles both inputs being empty objects', () => {
    const result = mergeConfig({}, {});
    expect(result).toEqual({});
  });

  it('preserves config-file-only fields (plugins, rules, overrides)', () => {
    const fileConfig: TileGuardConfig = {
      rules: { 'tile/no-empty': 'error' },
    };

    const result = mergeConfig(fileConfig, { reporter: 'json' });

    expect(result.rules).toEqual({ 'tile/no-empty': 'error' });
    expect(result.reporter).toBe('json');
  });
});
