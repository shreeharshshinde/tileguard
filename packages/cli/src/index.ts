/**
 * @tileguard/cli — Public API
 *
 * Everything exported from this module is safe to import from tests,
 * editors, or any host context that is not a throwaway CLI script.
 *
 * Guarantee: nothing exported here calls `process.exit()`. The process
 * boundary lives exclusively in `bin.ts`.
 *
 * @example
 * import { runCheck } from 'tileguard';
 * const result = await runCheck(['./tiles/'], { reporter: 'json' });
 * console.log(result.exitCode); // 0 | 1 | 2
 */

// ── Command functions — pure, embeddable, never call process.exit() ───────
export { runCheck } from './commands/check.js';
export { runInit } from './commands/init.js';
export { runRulesDocs, runRulesExplain, runRulesList } from './commands/rules.js';
// ── Error classes ─────────────────────────────────────────────────────────
export { CliUsageError } from './errors.js';
export { toRunResult, toUsageResult } from './exit.js';
// ── Lower-level utilities — exported for testing and programmatic use ─────
export { expandSources } from './expand-sources.js';
export { mergeConfig } from './merge-config.js';
export { DEFAULT_REPORTER_ID, resolveReporterById } from './resolve-reporter.js';

// ── Types ─────────────────────────────────────────────────────────────────
export type { CheckFlags, CommandResult, InitFlags, RulesListFlags } from './types.js';
