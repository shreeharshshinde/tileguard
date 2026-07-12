/**
 * Tests for @tileguard/config schema validation.
 *
 * Tests are organized by validation rule, following the sub-step
 * order from the build plan. Each check is tested independently.
 */

import { describe, expect, it } from 'vitest';
import { ConfigValidationError } from '../src/errors.js';
import { isValidRuleConfig, validateConfig } from '../src/validator.js';

describe('isValidRuleConfig', () => {
  it('accepts "off"', () => expect(isValidRuleConfig('off')).toBe(true));
  it('accepts "error"', () => expect(isValidRuleConfig('error')).toBe(true));
  it('accepts "warning"', () => expect(isValidRuleConfig('warning')).toBe(true));
  it('accepts "info"', () => expect(isValidRuleConfig('info')).toBe(true));
  it('accepts ["error", options]', () =>
    expect(isValidRuleConfig(['error', { layers: ['water'] }])).toBe(true));
  it('accepts ["warning", options]', () => expect(isValidRuleConfig(['warning', {}])).toBe(true));
  it('rejects a number', () => expect(isValidRuleConfig(42)).toBe(false));
  it('rejects "fatal"', () => expect(isValidRuleConfig('fatal')).toBe(false));
  it('rejects a boolean', () => expect(isValidRuleConfig(true)).toBe(false));
  it('rejects an empty array', () => expect(isValidRuleConfig([])).toBe(false));
  it('rejects a 3-element tuple', () =>
    expect(isValidRuleConfig(['error', {}, 'extra'])).toBe(false));
  it('rejects a tuple with invalid severity', () =>
    expect(isValidRuleConfig(['fatal', {}])).toBe(false));
});

describe('validateConfig — top-level shape', () => {
  it('accepts a minimal empty config', () => {
    const result = validateConfig({});
    expect(result.config).toEqual({});
    expect(result.warnings).toHaveLength(0);
  });

  it('throws on null', () => {
    expect(() => validateConfig(null)).toThrow(ConfigValidationError);
  });

  it('throws on an array', () => {
    expect(() => validateConfig([])).toThrow(ConfigValidationError);
  });

  it('throws on a string', () => {
    expect(() => validateConfig('hello')).toThrow(ConfigValidationError);
  });

  it('throws on a number', () => {
    expect(() => validateConfig(42)).toThrow(ConfigValidationError);
  });

  it('throws on undefined', () => {
    expect(() => validateConfig(undefined)).toThrow(ConfigValidationError);
  });

  it('includes "(root)" in the path for non-object values', () => {
    try {
      validateConfig(null);
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      const ve = err as ConfigValidationError;
      expect(ve.issues[0]!.path).toBe('(root)');
    }
  });
});

describe('validateConfig — plugins', () => {
  it('accepts valid plugins array', () => {
    const result = validateConfig({
      plugins: [{ id: 'style-rules', name: 'Style', providers: [], rules: [] }],
    });
    expect(result.warnings).toHaveLength(0);
  });

  it('rejects non-array plugins', () => {
    expect(() => validateConfig({ plugins: 'style-rules' })).toThrow(ConfigValidationError);
  });

  it('rejects plugin without string id', () => {
    expect(() => validateConfig({ plugins: [{ name: 'bad' }] })).toThrow(ConfigValidationError);
  });

  it('rejects plugins in JSON configs', () => {
    expect(() => validateConfig({ plugins: [{ id: 'style-rules' }] }, { isJson: true })).toThrow(
      ConfigValidationError,
    );
    try {
      validateConfig({ plugins: [{ id: 'style-rules' }] }, { isJson: true });
    } catch (err) {
      const ve = err as ConfigValidationError;
      expect(ve.issues[0]!.message).toContain('tileguard.config.json');
    }
  });

  it('allows omitting plugins entirely', () => {
    const result = validateConfig({});
    expect(result.warnings).toHaveLength(0);
  });
});

describe('validateConfig — rules', () => {
  it('accepts valid rule entries', () => {
    const result = validateConfig({
      rules: {
        'tile/required-layers': 'error',
        'tile/no-empty': 'off',
        'tile/feature-count': ['warning', { min: 1 }],
      },
    });
    expect(result.warnings).toHaveLength(0);
  });

  it('rejects non-object rules', () => {
    expect(() => validateConfig({ rules: 'all' })).toThrow(ConfigValidationError);
  });

  it('rejects an array as rules', () => {
    expect(() => validateConfig({ rules: ['error'] })).toThrow(ConfigValidationError);
  });

  it('rejects invalid rule config value (number)', () => {
    try {
      validateConfig({ rules: { 'tile/foo': 42 } });
    } catch (err) {
      const ve = err as ConfigValidationError;
      expect(ve.issues[0]!.path).toBe("rules['tile/foo']");
      expect(ve.issues[0]!.received).toBe(42);
    }
  });

  it('rejects invalid severity string', () => {
    expect(() => validateConfig({ rules: { 'tile/bar': 'fatal' } })).toThrow(ConfigValidationError);
  });
});

describe('validateConfig — reporter', () => {
  it('accepts a string reporter', () => {
    const result = validateConfig({ reporter: 'json' });
    expect(result.warnings).toHaveLength(0);
  });

  it('accepts a [string, object] tuple reporter', () => {
    const result = validateConfig({ reporter: ['sarif', { output: './out.sarif' }] });
    expect(result.warnings).toHaveLength(0);
  });

  it('rejects a number reporter', () => {
    expect(() => validateConfig({ reporter: 42 })).toThrow(ConfigValidationError);
  });

  it('rejects a tuple with non-object second element', () => {
    expect(() => validateConfig({ reporter: ['json', 'invalid'] })).toThrow(ConfigValidationError);
  });
});

describe('validateConfig — overrides', () => {
  it('accepts valid overrides', () => {
    const result = validateConfig({
      overrides: [{ files: ['fixtures/**'], rules: { 'tile/no-empty': 'off' } }],
    });
    expect(result.warnings).toHaveLength(0);
  });

  it('rejects non-array overrides', () => {
    expect(() => validateConfig({ overrides: 'bad' })).toThrow(ConfigValidationError);
  });

  it('rejects override without files array', () => {
    expect(() => validateConfig({ overrides: [{ rules: {} }] })).toThrow(ConfigValidationError);
  });

  it('rejects override with non-string files', () => {
    expect(() => validateConfig({ overrides: [{ files: [42] }] })).toThrow(ConfigValidationError);
  });

  it('rejects invalid rule config inside override rules', () => {
    try {
      validateConfig({
        overrides: [{ files: ['**'], rules: { 'tile/foo': true } }],
      });
    } catch (err) {
      const ve = err as ConfigValidationError;
      expect(ve.issues[0]!.path).toContain("overrides[0].rules['tile/foo']");
    }
  });

  it('rejects non-object override entry', () => {
    expect(() => validateConfig({ overrides: ['bad'] })).toThrow(ConfigValidationError);
  });
});

describe('validateConfig — options', () => {
  it('accepts valid numeric options', () => {
    const result = validateConfig({
      options: { timeout: 5000, maxDetails: 50, maxDiagnostics: 500 },
    });
    expect(result.warnings).toHaveLength(0);
  });

  it('accepts partial options', () => {
    const result = validateConfig({ options: { timeout: 10000 } });
    expect(result.warnings).toHaveLength(0);
  });

  it('rejects non-object options', () => {
    expect(() => validateConfig({ options: 'fast' })).toThrow(ConfigValidationError);
  });

  it('reports specific path for invalid timeout type', () => {
    try {
      validateConfig({ options: { timeout: 'fast' } });
    } catch (err) {
      const ve = err as ConfigValidationError;
      expect(ve.issues[0]!.path).toBe('options.timeout');
      expect(ve.issues[0]!.received).toBe('fast');
    }
  });

  it('reports specific path for invalid maxDetails type', () => {
    try {
      validateConfig({ options: { maxDetails: true } });
    } catch (err) {
      const ve = err as ConfigValidationError;
      expect(ve.issues[0]!.path).toBe('options.maxDetails');
    }
  });
});

describe('validateConfig — unknown keys', () => {
  it('returns a warning for an unknown key without throwing', () => {
    const result = validateConfig({ repporter: 'json' });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.severity).toBe('warning');
    expect(result.warnings[0]!.path).toBe('repporter');
    expect(result.warnings[0]!.message).toContain('unknown');
  });

  it('returns multiple warnings for multiple unknown keys', () => {
    const result = validateConfig({ foo: 1, bar: 2 });
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings.every((w) => w.severity === 'warning')).toBe(true);
  });

  it('returns warnings alongside a valid config', () => {
    const result = validateConfig({
      reporter: 'json',
      repporter: 'typo',
    });
    expect(result.config.reporter).toBe('json');
    expect(result.warnings).toHaveLength(1);
  });
});

describe('validateConfig — multi-issue collection', () => {
  it('collects multiple error-severity issues across different fields in one pass', () => {
    // Deliberately adversarial: 4 simultaneous violations
    try {
      validateConfig({
        plugins: 'not-an-array',
        rules: 42,
        reporter: true,
        options: 'fast',
      });
    } catch (err) {
      const ve = err as ConfigValidationError;
      // Must have collected all 4, not stopped at the first
      expect(ve.issues.length).toBeGreaterThanOrEqual(4);
      const paths = ve.issues.map((i) => i.path);
      expect(paths).toContain('plugins');
      expect(paths).toContain('rules');
      expect(paths).toContain('reporter');
      expect(paths).toContain('options');
    }
  });

  it('includes both errors and warnings in the thrown error', () => {
    try {
      validateConfig({
        rules: 42, // error
        typo_key: 'value', // warning
      });
    } catch (err) {
      const ve = err as ConfigValidationError;
      const severities = ve.issues.map((i) => i.severity);
      expect(severities).toContain('error');
      expect(severities).toContain('warning');
    }
  });

  it('accepts a fully populated valid config without throwing', () => {
    const result = validateConfig({
      plugins: [{ id: 'tile-rules', providers: [], rules: [] }],
      rules: {
        'tile/required-layers': ['error', { layers: ['water'] }],
        'tile/no-empty': 'off',
      },
      reporter: 'text',
      overrides: [{ files: ['fixtures/**'], rules: { 'tile/no-empty': 'warning' } }],
      options: { timeout: 5000 },
    });
    expect(result.warnings).toHaveLength(0);
  });
});
