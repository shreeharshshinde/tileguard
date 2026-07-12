/**
 * Tests for @tileguard/config error classes.
 *
 * Verifies message formatting, cause chaining, and issue preservation
 * for all three error types.
 */

import { describe, expect, it } from 'vitest';
import type { ValidationIssue } from '../src/errors.js';
import { ConfigLoadError, ConfigNotFoundError, ConfigValidationError } from '../src/errors.js';

describe('ConfigNotFoundError', () => {
  it('includes the config path in the message', () => {
    const err = new ConfigNotFoundError('/project/tileguard.config.ts');
    expect(err.message).toContain('/project/tileguard.config.ts');
  });

  it('includes guidance about --config flag', () => {
    const err = new ConfigNotFoundError('./somewhere.ts');
    expect(err.message).toContain('--config');
  });

  it('has the correct name', () => {
    const err = new ConfigNotFoundError('/path');
    expect(err.name).toBe('ConfigNotFoundError');
  });

  it('is an instance of Error', () => {
    const err = new ConfigNotFoundError('/path');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('ConfigLoadError', () => {
  it('includes the config path in the message', () => {
    const err = new ConfigLoadError('/project/tileguard.config.ts', new Error('boom'));
    expect(err.message).toContain('/project/tileguard.config.ts');
  });

  it('includes the cause message when cause is an Error', () => {
    const cause = new Error('syntax error at line 5');
    const err = new ConfigLoadError('/config.ts', cause);
    expect(err.message).toContain('syntax error at line 5');
  });

  it('handles a cause Error with an empty message', () => {
    const cause = new Error();
    const err = new ConfigLoadError('/config.ts', cause);
    expect(err.message).toContain('/config.ts');
    expect(err.message).not.toContain('undefined');
    // Ensure it doesn't crash and has some descriptive fallback or at least the prefix
    expect(err.message).toBe('Failed to load configuration from /config.ts: ');
  });

  it('stringifies non-Error cause values', () => {
    const err = new ConfigLoadError('/config.ts', 'raw string error');
    expect(err.message).toContain('raw string error');
  });

  it('preserves the configPath property', () => {
    const err = new ConfigLoadError('/project/tileguard.config.ts', new Error('x'));
    expect(err.configPath).toBe('/project/tileguard.config.ts');
  });

  it('sets .cause to the original thrown value', () => {
    const original = new TypeError('not a function');
    const err = new ConfigLoadError('/config.ts', original);
    expect(err.cause).toBe(original);
  });

  it('sets .cause even when cause is not an Error', () => {
    const err = new ConfigLoadError('/config.ts', 42);
    expect(err.cause).toBe(42);
  });

  it('has the correct name', () => {
    const err = new ConfigLoadError('/path', new Error('x'));
    expect(err.name).toBe('ConfigLoadError');
  });

  it('is an instance of Error', () => {
    const err = new ConfigLoadError('/path', new Error('x'));
    expect(err).toBeInstanceOf(Error);
  });
});

describe('ConfigValidationError', () => {
  const errorIssue: ValidationIssue = {
    path: "rules['tile/required-layers']",
    message: 'must be "error" | "warning" | "info" | "off" | [severity, options]',
    received: 42,
    severity: 'error',
  };

  const warningIssue: ValidationIssue = {
    path: 'repporter',
    message: 'unknown configuration key; did you mean "reporter"?',
    received: 'json',
    severity: 'warning',
  };

  it('includes "Invalid TileGuard configuration" in the message', () => {
    const err = new ConfigValidationError([errorIssue]);
    expect(err.message).toContain('Invalid TileGuard configuration');
  });

  it('formats error-severity issues with ✗ prefix', () => {
    const err = new ConfigValidationError([errorIssue]);
    expect(err.message).toContain('✗');
    expect(err.message).toContain("rules['tile/required-layers']");
  });

  it('formats warning-severity issues with ⚠ prefix', () => {
    const err = new ConfigValidationError([warningIssue]);
    expect(err.message).toContain('⚠');
    expect(err.message).toContain('repporter');
  });

  it('correctly interleaves ✗ and ⚠ for mixed-severity issues', () => {
    const err = new ConfigValidationError([errorIssue, warningIssue]);
    const lines = err.message.split('\n');
    // Line 0: "Invalid TileGuard configuration:"
    // Line 1: "  ✗ rules[...]..."
    // Line 2: "  ⚠ repporter..."
    expect(lines[1]).toContain('✗');
    expect(lines[1]).toContain("rules['tile/required-layers']");
    expect(lines[2]).toContain('⚠');
    expect(lines[2]).toContain('repporter');
  });

  it('preserves the issues array exactly as passed in', () => {
    const issues = [errorIssue, warningIssue];
    const err = new ConfigValidationError(issues);
    expect(err.issues).toEqual(issues);
    expect(err.issues).toHaveLength(2);
    expect(err.issues[0]).toBe(errorIssue);
    expect(err.issues[1]).toBe(warningIssue);
  });

  it('handles a single issue', () => {
    const err = new ConfigValidationError([errorIssue]);
    expect(err.issues).toHaveLength(1);
    expect(err.message.split('\n')).toHaveLength(2);
  });

  it('handles many issues', () => {
    const many: ValidationIssue[] = Array.from({ length: 10 }, (_, i) => ({
      path: `field${i}`,
      message: `problem ${i}`,
      received: i,
      severity: i % 2 === 0 ? ('error' as const) : ('warning' as const),
    }));
    const err = new ConfigValidationError(many);
    expect(err.issues).toHaveLength(10);
    // 1 header line + 10 issue lines
    expect(err.message.split('\n')).toHaveLength(11);
  });

  it('has the correct name', () => {
    const err = new ConfigValidationError([errorIssue]);
    expect(err.name).toBe('ConfigValidationError');
  });

  it('is an instance of Error', () => {
    const err = new ConfigValidationError([errorIssue]);
    expect(err).toBeInstanceOf(Error);
  });
});
