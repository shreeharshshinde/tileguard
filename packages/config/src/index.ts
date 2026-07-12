/**
 * @tileguard/config
 *
 * Configuration loading, schema validation, and preset resolution
 * for TileGuard.
 *
 * This package handles the responsibilities that sit *before* the engine:
 *   1. File discovery — searching upward from CWD for a config file
 *   2. File loading — dynamically importing .ts/.js/.mjs/.json configs
 *   3. Schema validation — verifying the object conforms to TileGuardConfig
 *   4. Error reporting — clear, actionable messages for invalid configs
 *
 * The engine in @tileguard/core handles config *resolution* (merging
 * defaults, compiling overrides, building rule indices). This package
 * never duplicates that logic.
 *
 * Public surface:
 *   loadConfig()       — primary API, used by the CLI
 *   findConfigFile()   — lower-level discovery, used for tooling
 *   validateConfig()   — lower-level validation, used for testing
 *
 * Error classes:
 *   ConfigNotFoundError    — explicit --config path doesn't exist
 *   ConfigLoadError        — file exists but can't produce a config object
 *   ConfigValidationError  — object loaded but shape is invalid
 *
 * See docs/architecture/06-configuration.md for the full specification.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TileGuardConfig } from '@tileguard/core';
import type { ValidationIssue } from './errors.js';
import { ConfigNotFoundError } from './errors.js';
import { findConfigFile } from './finder.js';
import { loadConfigFile } from './loader.js';
import { validateConfig } from './validator.js';

export type { ValidationIssue } from './errors.js';
export {
  ConfigLoadError,
  ConfigNotFoundError,
  ConfigValidationError,
} from './errors.js';
export { CONFIG_FILENAMES, findConfigFile } from './finder.js';
export type { ValidateConfigOptions, ValidateConfigResult } from './validator.js';
export { isValidRuleConfig, validateConfig } from './validator.js';

/**
 * Options for the primary loadConfig() API.
 */
export interface LoadConfigOptions {
  /**
   * Starting directory for config file search.
   * Defaults to `process.cwd()`.
   */
  readonly cwd?: string;

  /**
   * Explicit config file path. When provided, skips automatic discovery.
   * Throws ConfigNotFoundError if the path does not exist.
   */
  readonly configPath?: string;
}

/**
 * The result of loading and validating a config file.
 *
 * Intentionally separate from the internal ValidateConfigResult — the
 * public API includes the resolved file path, which is CLI-facing context
 * that validation alone does not produce.
 */
export interface LoadConfigResult {
  /** The validated TileGuardConfig object. */
  readonly config: TileGuardConfig;

  /**
   * Absolute path to the config file that was loaded.
   * `undefined` when no config file was found and defaults are used.
   */
  readonly configPath: string | undefined;

  /**
   * Warning-level validation issues (e.g., unknown top-level keys).
   * Empty array when no warnings exist.
   */
  readonly warnings: readonly ValidationIssue[];
}

/**
 * Loads, validates, and returns the TileGuard configuration for a project.
 *
 * This is the primary entry point used by the CLI. It:
 *   1. Discovers or resolves the config file path
 *   2. Loads the file contents via the appropriate loader
 *   3. Validates the loaded object against TileGuardConfig
 *   4. Returns the validated config, file path, and any warnings
 *
 * When no config file is found (and no explicit path was given), returns
 * an empty config object — the engine will use all defaults.
 *
 * @param options - Discovery and loading options.
 * @returns The validated configuration and metadata.
 *
 * @throws {ConfigNotFoundError} When `options.configPath` is given and
 *         the file does not exist.
 * @throws {ConfigLoadError} When the file exists but cannot produce a
 *         config object.
 * @throws {ConfigValidationError} When the loaded object has at least
 *         one error-severity schema violation.
 */
export async function loadConfig(options: LoadConfigOptions = {}): Promise<LoadConfigResult> {
  const { cwd = process.cwd(), configPath: explicitPath } = options;

  let configPath: string | undefined;

  if (explicitPath !== undefined) {
    const resolved = resolve(explicitPath);
    if (!existsSync(resolved)) {
      throw new ConfigNotFoundError(resolved);
    }
    configPath = resolved;
  } else {
    configPath = findConfigFile(cwd);
  }

  // No config file found — return defaults (empty config, no warnings)
  if (configPath === undefined) {
    return { config: {}, configPath: undefined, warnings: [] };
  }

  // Load the file
  const { raw, isJson } = await loadConfigFile(configPath);

  // Validate the loaded object (throws on error-severity issues)
  const { config, warnings } = validateConfig(raw, { isJson });

  return { config, configPath, warnings };
}
