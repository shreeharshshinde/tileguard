/**
 * @tileguard/cli — Shared type definitions
 *
 * Defines the `CommandResult` contract and the flag shapes for each command.
 * These types sit at the boundary between `bin.ts` (the process lifecycle
 * layer) and the pure command functions (`runCheck`, `runInit`, `runRulesList`).
 *
 * See Decision D3 in the CLI implementation plan.
 */

import type { Diagnostic, RunSummary } from '@tileguard/core';

// ---------------------------------------------------------------------------
// CommandResult
// ---------------------------------------------------------------------------

/**
 * The universal return type for all command functions.
 *
 * Command functions compute this object; `bin.ts` acts on it by calling
 * `process.exit(result.exitCode)`. Nothing else in the package terminates
 * the process.
 *
 * Exit code semantics:
 *   0 — success (check passed, init created file, rules list succeeded)
 *   1 — validation failure (check found one or more error-severity diagnostics)
 *   2 — usage or operational failure (bad flag, config error, no sources matched)
 */
export interface CommandResult {
  /** Exit code the process should use. */
  readonly exitCode: 0 | 1 | 2;

  /**
   * Optional user-facing message to be written to stderr by `bin.ts`.
   *
   * Command functions set this field instead of writing to stderr directly,
   * keeping every command implementation free of I/O side-effects. `bin.ts`
   * is the single location responsible for presenting messages to the terminal.
   *
   * Examples: error descriptions from `toUsageResult`, success notices from
   * `runInit`, informational headers from `runRulesList`.
   */
  readonly message?: string;

  /**
   * Output payload to be written to stdout by `bin.ts`.
   *
   * Used by commands whose primary output is a text or structured listing
   * (e.g. `rules list`). Keeping this in the result object rather than
   * writing it directly from the command function allows callers — IDEs,
   * REST services, programmatic APIs — to consume the output without
   * capturing console streams.
   */
  readonly output?: string;

  /**
   * Diagnostics produced by the run.
   * Present only for the `check` command.
   */
  readonly diagnostics?: readonly Diagnostic[];

  /**
   * Summary statistics for the run.
   * Present only for the `check` command.
   */
  readonly summary?: RunSummary;
}

// ---------------------------------------------------------------------------
// Command flag types
// ---------------------------------------------------------------------------

/** Flags accepted by the `check` command. */
export interface CheckFlags {
  /** Explicit config file path. Auto-discovered via upward traversal if omitted. */
  config?: string;

  /** Reporter ID string (e.g. `'text'`, `'json'`). Defaults to `'text'`. */
  reporter?: string;

  /** Maximum total diagnostics to collect across the entire run. */
  maxDiagnostics?: number;
}

/** Flags accepted by the `init` command. */
export interface InitFlags {
  /**
   * When `true`, overwrite an existing `tileguard.config.ts` without refusing.
   * Without this flag, `init` returns exit code 2 if the file already exists.
   */
  force?: boolean;
}

/** Flags accepted by the `rules list` command. */
export interface RulesListFlags {
  /** Explicit config file path. Auto-discovered if omitted. */
  config?: string;

  /** Output format. Defaults to `'text'`. */
  format?: 'text' | 'json';
}
