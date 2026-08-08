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

export type {
  CliComparisonResult,
  CliRegressionResult,
  CliTileSnapshot,
} from './analysis/AnalysisAdapter.js';
// ── Analysis adapter ──────────────────────────────────────────────────────
export {
  analyzeRegression,
  compareTiles,
  loadTileSnapshot,
} from './analysis/AnalysisAdapter.js';
export { runAnalyze } from './commands/analyze.js';
// ── Command functions — pure, embeddable, never call process.exit() ───────
export { runCheck } from './commands/check.js';
export { runCompare } from './commands/compare.js';
export { runDoctor } from './commands/doctor.js';
export { runInit } from './commands/init.js';
export { runReport } from './commands/report.js';
export {
  runRulesDocs,
  runRulesExplain,
  runRulesList,
} from './commands/rules.js';
export { runStats } from './commands/stats.js';
export { getVersion, runVersion } from './commands/version.js';
export type {
  LoadYamlConfigOptions,
  LoadYamlConfigResult,
  TileguardYamlConfig,
} from './config/ConfigLoader.js';
export { getDefaultConfig, loadYamlConfig } from './config/ConfigLoader.js';
// ── Error classes ─────────────────────────────────────────────────────────
export { CliUsageError } from './errors.js';
export { toRunResult, toUsageResult } from './exit.js';
// ── Lower-level utilities — exported for testing and programmatic use ─────
export { expandSources } from './expand-sources.js';
export type {
  CreateLoggerOptions,
  Logger,
  LogLevel,
} from './logging/Logger.js';
// ── Infrastructure ────────────────────────────────────────────────────────
export { createLogger } from './logging/Logger.js';
export { mergeConfig } from './merge-config.js';
export type {
  OutputFormat,
  OutputFormatter,
} from './output/OutputFormatter.js';
export {
  createOutputFormatter,
  formatDelta,
  formatDuration,
} from './output/OutputFormatter.js';
export {
  DEFAULT_REPORTER_ID,
  resolveReporterById,
} from './resolve-reporter.js';
export type {
  CliCommandResult,
  CommandContext,
  CommandFn,
  ExitCode,
} from './runner/CommandRunner.js';
export { runCommand } from './runner/CommandRunner.js';

// ── Types ─────────────────────────────────────────────────────────────────
export type {
  CheckFlags,
  CommandResult,
  InitFlags,
  RulesListFlags,
} from './types.js';
