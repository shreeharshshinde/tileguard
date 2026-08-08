/**
 * @tileguard/cli — Command Runner
 *
 * Orchestrates command execution with:
 *   - Structured logging
 *   - Phase progress reporting
 *   - Timing
 *   - Consistent error handling → exit codes
 *
 * Commands register as thin functions; the runner handles lifecycle.
 */

import type { TileguardYamlConfig } from '../config/ConfigLoader.js';
import type { Logger } from '../logging/Logger.js';

// ---------------------------------------------------------------------------
// Exit codes (expanded from 0/1/2 to 0/1/2/3)
// ---------------------------------------------------------------------------

/**
 * Exit code semantics:
 *   0 — No issues (success)
 *   1 — Warnings exceeded threshold or non-critical findings
 *   2 — Errors detected (regressions found, validation failures)
 *   3 — Internal failure (crash, config error, missing files)
 */
export type ExitCode = 0 | 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Command Result (expanded)
// ---------------------------------------------------------------------------

export interface CliCommandResult {
  readonly exitCode: ExitCode;
  /** Message for stderr (status, errors). */
  readonly message?: string;
  /** Primary output for stdout (data payload). */
  readonly output?: string;
  /** Duration of the command execution in ms. */
  readonly durationMs?: number;
}

// ---------------------------------------------------------------------------
// Command context passed to every command function
// ---------------------------------------------------------------------------

export interface CommandContext {
  readonly logger: Logger;
  readonly config: TileguardYamlConfig;
  readonly cwd: string;
}

// ---------------------------------------------------------------------------
// Command function signature
// ---------------------------------------------------------------------------

export type CommandFn<TArgs = unknown> = (
  args: TArgs,
  ctx: CommandContext,
) => Promise<CliCommandResult>;

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface RunCommandOptions<TArgs> {
  readonly name: string;
  readonly args: TArgs;
  readonly ctx: CommandContext;
  readonly fn: CommandFn<TArgs>;
}

/**
 * Executes a command function with timing, logging, and error handling.
 * Never throws — always returns a CliCommandResult.
 */
export async function runCommand<TArgs>(
  options: RunCommandOptions<TArgs>,
): Promise<CliCommandResult> {
  const { name, args, ctx, fn } = options;
  const { logger } = ctx;

  logger.debug(`Running command: ${name}`);
  const start = performance.now();

  try {
    const result = await fn(args, ctx);
    const durationMs = performance.now() - start;

    logger.timing(name, durationMs);

    return { ...result, durationMs };
  } catch (err) {
    const durationMs = performance.now() - start;
    const message =
      err instanceof Error ? err.message : 'Unknown internal error';

    logger.error(`${name} failed: ${message}`);

    if (err instanceof Error && err.stack && ctx.logger.level === 'debug') {
      logger.debug(err.stack);
    }

    return {
      exitCode: 3,
      message: `[tileguard] Internal error: ${message}`,
      durationMs,
    };
  }
}
