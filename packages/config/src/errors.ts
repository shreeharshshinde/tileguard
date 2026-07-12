/**
 * @tileguard/config — Error Classes
 *
 * Three error types cover the configuration loading pipeline:
 *
 *   ConfigNotFoundError   — an explicit --config path was given but the
 *                           file does not exist.
 *   ConfigLoadError       — the file exists but cannot produce a config
 *                           object (execution throws, no default export,
 *                           non-object default, JSON parse failure).
 *   ConfigValidationError — the object loaded successfully but its shape
 *                           violates the TileGuardConfig contract.
 */

/**
 * A single problem found during configuration validation.
 *
 * Issues are collected in a single pass — validation never short-circuits,
 * so the user sees every problem at once.
 */
export interface ValidationIssue {
  /** Dot-path to the invalid field, e.g. `rules['tile/required-layers']` */
  readonly path: string;
  /** Human-readable description of what's wrong. */
  readonly message: string;
  /** The actual value that failed validation. */
  readonly received: unknown;
  /** Whether this issue blocks loading or is advisory. */
  readonly severity: 'error' | 'warning';
}

/**
 * Thrown when an explicit config path (e.g. `--config ./somewhere.ts`) does
 * not exist on disk. Never thrown during automatic discovery — discovery
 * simply returns `undefined` and the engine falls back to defaults.
 */
export class ConfigNotFoundError extends Error {
  override readonly name = 'ConfigNotFoundError';

  constructor(configPath: string) {
    super(
      `Configuration file not found: ${configPath}\n` +
        'Verify the path passed to --config exists.',
    );
  }
}

/**
 * Thrown when a config file exists but cannot produce a config object.
 *
 * Covers: execution throws, no default export, non-object default export,
 * JSON parse failure.
 */
export class ConfigLoadError extends Error {
  override readonly name = 'ConfigLoadError';
  readonly configPath: string;

  constructor(configPath: string, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to load configuration from ${configPath}: ${reason}`, { cause });
    this.configPath = configPath;
  }
}

/**
 * Thrown when a config object was loaded successfully but its shape violates
 * the TileGuardConfig contract. Contains every validation issue collected in
 * a single pass.
 *
 * Only thrown when at least one issue has severity `'error'`. Warning-only
 * results are returned normally via `ValidateConfigResult.warnings`.
 */
export class ConfigValidationError extends Error {
  override readonly name = 'ConfigValidationError';
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    const summary = issues
      .map((i) => `  ${i.severity === 'error' ? '✗' : '⚠'} ${i.path}: ${i.message}`)
      .join('\n');
    super(`Invalid TileGuard configuration:\n${summary}`);
    this.issues = issues;
  }
}
