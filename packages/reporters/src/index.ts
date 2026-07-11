/**
 * @tileguard/reporters — Built-in output reporters
 *
 * This package provides the default reporters shipped with TileGuard:
 *
 *   textReporter  — Human-readable colored terminal output (default)
 *   jsonReporter  — Structured JSON output for CI and programmatic consumption
 *
 * Both reporters conform to the Reporter interface from @tileguard/core.
 * They are plain objects with a report() method that receives the complete
 * diagnostic list and run context.
 *
 * Future reporters (SARIF, GitHub Annotations) will be added here.
 *
 * @packageDocumentation
 */

export type {
  JsonReporterOptions,
  JsonReporterOutput,
  SerializedDiagnostic,
  WriteFn as JsonWriteFn,
} from './json-reporter.js';
// JSON reporter — structured output for CI and tools
export { createJsonReporter, jsonReporter } from './json-reporter.js';
export type { TextReporterOptions, WriteFn as TextWriteFn } from './text-reporter.js';
// Text reporter — the default, human-readable terminal output
export { createTextReporter, textReporter } from './text-reporter.js';
