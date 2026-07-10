/**
 * @tileguard/core
 *
 * Framework contracts for the TileGuard quality analysis framework.
 *
 * This package defines the interfaces and types that all other TileGuard
 * packages depend on. It has zero runtime dependencies.
 *
 * Public surface:
 *
 *   Diagnostic model
 *     Diagnostic, DiagnosticDescriptor, Severity, ArtifactRef, Location
 *
 *   Artifact model
 *     Artifact, ArtifactProvider, ProviderOptions
 *
 *   Rule system
 *     Rule, RuleMeta, RuleContext
 *
 *   Reporter system
 *     Reporter, ReporterContext
 *
 *   Plugin system
 *     Plugin
 *
 *   Configuration system
 *     TileGuardConfig, ResolvedConfig, ResolvedRuleConfig, RuleConfig,
 *     GlobalOptions, Override, ResolvedOverride, ResolvedRuleOverride
 *
 *   Engine
 *     createEngine, Engine, EngineOptions, RunResult, RunSummary
 */

// Artifact model — artifact loading and decoding contracts
export type { Artifact, ArtifactProvider, ProviderOptions } from './artifact.js';
// Configuration system — user config shape and resolved internals
export type {
  GlobalOptions,
  Override,
  ResolvedConfig,
  ResolvedOverride,
  ResolvedRuleConfig,
  ResolvedRuleOverride,
  RuleConfig,
  TileGuardConfig,
} from './config.js';
// Diagnostic model — the universal contract between rules and reporters
export type {
  ArtifactRef,
  Diagnostic,
  DiagnosticDescriptor,
  Location,
  Severity,
} from './diagnostic.js';
export type { Engine, EngineOptions, RunResult, RunSummary } from './engine.js';
// Engine — the orchestration pipeline
export { createEngine } from './engine.js';
// Plugin system — bundles providers and rules
export type { Plugin } from './plugin.js';
// Reporter system — diagnostic output formatting
export type { Reporter, ReporterContext } from './reporter.js';
// Rule system — the primary extension mechanism
export type { Rule, RuleContext, RuleMeta } from './rule.js';
