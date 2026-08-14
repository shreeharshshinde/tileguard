/**
 * @tileguard/cli — CLI-specific error types
 *
 * `CliUsageError` is the single error class for every exit-code-2 condition
 * that originates in this package. Exit code semantics:
 *
 * - **Exit 0** — Run passed (no error-severity diagnostics)
 * - **Exit 1** — Run failed (error-severity diagnostics found)
 * - **Exit 2** — Usage error (bad arguments, invalid config, operational failure)
 *
 * Errors from `@tileguard/config` (`ConfigNotFoundError`, `ConfigLoadError`,
 * `ConfigValidationError`) propagate unmodified — their messages are already
 * user-facing — and are caught at the same `bin.ts` catch site.
 */

/**
 * Thrown for any CLI usage or operational failure that should produce exit code 2.
 *
 * @remarks
 * This error class never escapes the CLI package boundary. It is caught at
 * the top-level `bin.ts` error handler, which prints the message to stderr
 * and exits with code 2.
 *
 * Typical causes:
 * - Unknown reporter name
 * - No sources found after glob expansion
 * - `init` refusing to overwrite without `--force`
 * - Invalid flag combinations
 *
 * @example
 * ```ts
 * throw new CliUsageError(
 *   'Unknown reporter "sarif". Available reporters: text, json'
 * );
 * ```
 */
export class CliUsageError extends Error {
  override readonly name = 'CliUsageError';
}
