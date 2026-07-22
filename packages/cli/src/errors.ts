/**
 * @tileguard/cli — CLI-specific error types
 *
 * `CliUsageError` is the single error class for every code-2 condition that
 * originates in this package: unknown reporter, no sources after expansion,
 * `init` refusing to overwrite without `--force`, and so on.
 *
 * Errors from `@tileguard/config` (`ConfigNotFoundError`, `ConfigLoadError`,
 * `ConfigValidationError`) propagate unmodified — their messages are already
 * user-facing — and are caught at the same `bin.ts` catch site.
 *
 * See Decision D8 in the CLI implementation plan.
 */

/**
 * Thrown for any CLI usage or operational failure that should produce exit
 * code 2. Never extends beyond this package boundary.
 *
 * @example
 * throw new CliUsageError('Unknown reporter "sarif". Available reporters: text, json');
 */
export class CliUsageError extends Error {
  override readonly name = 'CliUsageError';
}
