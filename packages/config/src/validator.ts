/**
 * @tileguard/config — Schema Validation
 *
 * Validates a raw config object against the TileGuardConfig contract
 * from @tileguard/core. Collects all issues in a single pass — validation
 * never short-circuits on the first failure, so the user sees every
 * problem at once.
 *
 * Throws ConfigValidationError only when at least one issue has severity
 * 'error'. Warning-only results (e.g., unknown top-level keys) are
 * returned normally via ValidateConfigResult.warnings.
 */

import type { TileGuardConfig } from '@tileguard/core';
import type { ValidationIssue } from './errors.js';
import { ConfigValidationError } from './errors.js';

/**
 * The result of a successful validation (no error-severity issues).
 */
export interface ValidateConfigResult {
  /** The validated config object, cast to TileGuardConfig. */
  readonly config: TileGuardConfig;

  /** Warning-level issues that did not prevent validation. */
  readonly warnings: readonly ValidationIssue[];
}

export interface ValidateConfigOptions {
  /**
   * Whether the config was loaded from a .json file.
   * When true, the `plugins` field is disallowed — plugins must be imported
   * in code, and .json configs are data-only.
   */
  readonly isJson?: boolean;
}

const VALID_SEVERITIES = new Set(['error', 'warning', 'info']);
const KNOWN_TOP_LEVEL_KEYS = new Set(['plugins', 'rules', 'reporter', 'overrides', 'options']);

/** Check if a value is a plain object (not null, not an array). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is a valid RuleConfig entry.
 *
 * Valid forms:
 *   - 'off'
 *   - 'error' | 'warning' | 'info'
 *   - [Severity, unknown]
 */
export function isValidRuleConfig(value: unknown): boolean {
  if (value === 'off') return true;
  if (typeof value === 'string') return VALID_SEVERITIES.has(value);
  if (Array.isArray(value) && value.length === 2) {
    return typeof value[0] === 'string' && VALID_SEVERITIES.has(value[0]);
  }
  return false;
}

function validatePlugins(value: unknown, issues: ValidationIssue[], isJson: boolean): void {
  if (value === undefined) return;

  if (isJson) {
    issues.push({
      path: 'plugins',
      message:
        'plugins cannot be specified in tileguard.config.json. ' +
        'Use tileguard.config.ts or tileguard.config.js to import plugins.',
      received: value,
      severity: 'error',
    });
    return;
  }

  if (!Array.isArray(value)) {
    issues.push({
      path: 'plugins',
      message: 'must be an array of Plugin objects',
      received: value,
      severity: 'error',
    });
    return;
  }

  for (let i = 0; i < value.length; i++) {
    const plugin = value[i];
    if (!isPlainObject(plugin) || typeof plugin.id !== 'string') {
      issues.push({
        path: `plugins[${i}]`,
        message: 'must be a Plugin object with a string "id" property',
        received: plugin,
        severity: 'error',
      });
    }
  }
}

function validateRules(value: unknown, issues: ValidationIssue[]): void {
  if (value === undefined) return;

  if (!isPlainObject(value)) {
    issues.push({
      path: 'rules',
      message: 'must be an object mapping rule IDs to RuleConfig values',
      received: value,
      severity: 'error',
    });
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (!isValidRuleConfig(entry)) {
      issues.push({
        path: `rules['${key}']`,
        message: 'must be "error" | "warning" | "info" | "off" | [severity, options]',
        received: entry,
        severity: 'error',
      });
    }
  }
}

function validateReporter(value: unknown, issues: ValidationIssue[]): void {
  if (value === undefined) return;

  if (typeof value === 'string') return;

  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'string' &&
    isPlainObject(value[1])
  ) {
    return;
  }

  issues.push({
    path: 'reporter',
    message: 'must be a string or [string, object] tuple',
    received: value,
    severity: 'error',
  });
}

function validateOverrides(value: unknown, issues: ValidationIssue[]): void {
  if (value === undefined) return;

  if (!Array.isArray(value)) {
    issues.push({
      path: 'overrides',
      message: 'must be an array of Override objects',
      received: value,
      severity: 'error',
    });
    return;
  }

  for (let i = 0; i < value.length; i++) {
    const override = value[i];

    if (!isPlainObject(override)) {
      issues.push({
        path: `overrides[${i}]`,
        message: 'must be an object with a "files" array',
        received: override,
        severity: 'error',
      });
      continue;
    }

    const files = override.files;
    if (!Array.isArray(files) || !files.every((f): f is string => typeof f === 'string')) {
      issues.push({
        path: `overrides[${i}].files`,
        message: 'must be an array of glob pattern strings',
        received: files,
        severity: 'error',
      });
    }

    const rules = override.rules;
    if (rules !== undefined) {
      if (!isPlainObject(rules)) {
        issues.push({
          path: `overrides[${i}].rules`,
          message: 'must be an object mapping rule IDs to RuleConfig values',
          received: rules,
          severity: 'error',
        });
      } else {
        for (const [key, entry] of Object.entries(rules)) {
          if (!isValidRuleConfig(entry)) {
            issues.push({
              path: `overrides[${i}].rules['${key}']`,
              message: 'must be "error" | "warning" | "info" | "off" | [severity, options]',
              received: entry,
              severity: 'error',
            });
          }
        }
      }
    }
  }
}

function validateOptions(value: unknown, issues: ValidationIssue[]): void {
  if (value === undefined) return;

  if (!isPlainObject(value)) {
    issues.push({
      path: 'options',
      message: 'must be an object',
      received: value,
      severity: 'error',
    });
    return;
  }

  const numericKeys = ['timeout', 'maxDetails', 'maxDiagnostics'] as const;
  for (const key of numericKeys) {
    const entry = value[key];
    if (entry !== undefined && typeof entry !== 'number') {
      issues.push({
        path: `options.${key}`,
        message: 'must be a number',
        received: entry,
        severity: 'error',
      });
    }
  }
}

function checkUnknownKeys(value: Record<string, unknown>, issues: ValidationIssue[]): void {
  for (const key of Object.keys(value)) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
      issues.push({
        path: key,
        message: `unknown configuration key "${key}"`,
        received: value[key],
        severity: 'warning',
      });
    }
  }
}

/**
 * Validates a raw value against the TileGuardConfig contract.
 *
 * Collects all issues in a single pass. Throws ConfigValidationError
 * only when at least one issue has severity 'error'. Warning-only
 * results are returned normally.
 *
 * Exception: an invalid top-level type (non-object) always produces exactly
 * one issue and throws immediately, since no further field-level inspection
 * is possible on a non-object value.
 *
 * @param value   - The raw value loaded from the config file.
 * @param options - Validation options (e.g., whether the source was JSON).
 * @returns The validated config and any warning-level issues.
 * @throws {ConfigValidationError} When at least one error-severity issue exists.
 */
export function validateConfig(
  value: unknown,
  options: ValidateConfigOptions = {},
): ValidateConfigResult {
  const issues: ValidationIssue[] = [];
  const isJson = options.isJson ?? false;

  // Step 1: Top-level shape — must be a plain object
  if (!isPlainObject(value)) {
    issues.push({
      path: '(root)',
      message: 'configuration must be a plain object',
      received: value,
      severity: 'error',
    });
    // Cannot inspect fields of a non-object; throw immediately
    throw new ConfigValidationError(issues);
  }

  // Steps 2–7: validate each known field, then check for unknowns
  validatePlugins(value.plugins, issues, isJson);
  validateRules(value.rules, issues);
  validateReporter(value.reporter, issues);
  validateOverrides(value.overrides, issues);
  validateOptions(value.options, issues);
  checkUnknownKeys(value, issues);

  // Throw only when at least one issue has severity 'error'.
  // Warning-only results are returned normally.
  const hasErrors = issues.some((i) => i.severity === 'error');
  if (hasErrors) {
    throw new ConfigValidationError(issues);
  }

  return {
    config: value as TileGuardConfig,
    warnings: issues,
  };
}
