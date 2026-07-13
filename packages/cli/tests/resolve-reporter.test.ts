/**
 * Unit tests for src/resolve-reporter.ts
 *
 * Covers the Map-based reporter registry: known IDs, the undefined-fallback
 * to the default, error shape for unknown IDs, and the dynamic key listing
 * that powers `--reporter` help text.
 */

import { describe, expect, it } from 'vitest';
import { CliUsageError } from '../src/errors.js';
import { DEFAULT_REPORTER_ID, resolveReporterById } from '../src/resolve-reporter.js';

describe('resolveReporterById', () => {
  it('resolves "text" to the text reporter', () => {
    const reporter = resolveReporterById('text');
    expect(reporter).toBeDefined();
    expect(reporter.id).toBe('text');
  });

  it('resolves "json" to the json reporter', () => {
    const reporter = resolveReporterById('json');
    expect(reporter).toBeDefined();
    expect(reporter.id).toBe('json');
  });

  it('falls back to the text reporter when id is undefined', () => {
    const reporter = resolveReporterById(undefined);
    expect(reporter.id).toBe('text');
  });

  it('throws CliUsageError for an unknown reporter ID', () => {
    expect(() => resolveReporterById('sarif')).toThrow(CliUsageError);
  });

  it('includes all available reporter IDs in the CliUsageError message', () => {
    // This verifies the Map's dynamic key listing — the error message is
    // generated from [...BUILTIN_REPORTERS.keys()], so it stays accurate
    // automatically as reporters are added.
    let caught: unknown;
    try {
      resolveReporterById('html');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(CliUsageError);
    const message = (caught as CliUsageError).message;
    expect(message).toContain('text');
    expect(message).toContain('json');
  });
});

describe('DEFAULT_REPORTER_ID', () => {
  it('is "text"', () => {
    expect(DEFAULT_REPORTER_ID).toBe('text');
  });
});
