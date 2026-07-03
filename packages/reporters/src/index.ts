// @tileguard/reporters — Built-in output reporters
//
// Will export:
//   textReporter   — human-readable terminal output (default)
//   jsonReporter   — structured JSON output for CI integration
//   sarifReporter  — SARIF format for IDE and GitHub Code Scanning integration
//
// Reporters to be extracted from legacy/js/src/reporter.js:
//   text format  → textReporter
//   json format  → jsonReporter
//   sarif format → sarifReporter (new)
//
// Implementation pending — see docs/engineering/MIGRATION_PLAN.md
