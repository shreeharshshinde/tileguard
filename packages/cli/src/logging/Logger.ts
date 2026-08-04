/**
 * @tileguard/cli — Structured Logger
 *
 * Provides leveled logging with phase reporting for long-running commands.
 * All output goes to stderr to keep stdout clean for machine-readable results.
 *
 * Levels: quiet < normal < verbose < debug
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = 'quiet' | 'normal' | 'verbose' | 'debug';

export interface Logger {
  /** Errors — always shown unless quiet. */
  error(message: string): void;
  /** Warnings — shown at normal and above. */
  warn(message: string): void;
  /** Informational — shown at normal and above. */
  info(message: string): void;
  /** Verbose detail — only at verbose and above. */
  verbose(message: string): void;
  /** Debug internals — only at debug level. */
  debug(message: string): void;
  /** Phase progress reporting for long-running operations. */
  phase(label: string): void;
  /** Timing information for performance tracking. */
  timing(label: string, durationMs: number): void;
  /** Current log level. */
  readonly level: LogLevel;
}

// ---------------------------------------------------------------------------
// Level ordering
// ---------------------------------------------------------------------------

const LEVEL_RANK: Record<LogLevel, number> = {
  quiet: 0,
  normal: 1,
  verbose: 2,
  debug: 3,
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface CreateLoggerOptions {
  readonly level?: LogLevel;
  /** Override output for testing. Defaults to process.stderr.write. */
  readonly write?: (text: string) => void;
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const level = options.level ?? 'normal';
  const rank = LEVEL_RANK[level];
  const write = options.write ?? ((text: string) => process.stderr.write(text));

  function shouldLog(minLevel: LogLevel): boolean {
    return rank >= LEVEL_RANK[minLevel];
  }

  return {
    get level() {
      return level;
    },

    error(message: string): void {
      if (shouldLog('normal')) {
        write(`✗ ${message}\n`);
      }
    },

    warn(message: string): void {
      if (shouldLog('normal')) {
        write(`⚠ ${message}\n`);
      }
    },

    info(message: string): void {
      if (shouldLog('normal')) {
        write(`${message}\n`);
      }
    },

    verbose(message: string): void {
      if (shouldLog('verbose')) {
        write(`  ${message}\n`);
      }
    },

    debug(message: string): void {
      if (shouldLog('debug')) {
        write(`  [debug] ${message}\n`);
      }
    },

    phase(label: string): void {
      if (shouldLog('normal')) {
        write(`▸ ${label}\n`);
      }
    },

    timing(label: string, durationMs: number): void {
      if (shouldLog('verbose')) {
        write(`  ⏱ ${label}: ${durationMs.toFixed(1)}ms\n`);
      }
    },
  };
}
