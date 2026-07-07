/**
 * @tileguard/core — Rule Contract
 *
 * A Rule is the primary extension mechanism of TileGuard. Each rule
 * encapsulates exactly one validation concern and is implemented as a
 * plain object — no base classes, no decorators, no magic.
 *
 * Rules are registered with the engine via Plugins and are invoked once
 * per artifact whose type matches the rule's artifactTypes list.
 *
 * See docs/architecture/04-rule-system.md for the full specification.
 */

import type { Artifact } from './artifact.js';
import type { DiagnosticDescriptor, Severity } from './diagnostic.js';

// ---------------------------------------------------------------------------
// RuleMeta
// ---------------------------------------------------------------------------

/**
 * Metadata about a rule. Used in documentation, help output, reporter
 * enrichment, and preset generation.
 */
export interface RuleMeta {
  /**
   * Human-readable description of what this rule checks.
   *
   * Should be a complete sentence.
   * Example: "Ensures that all required layers are present in the tile."
   */
  readonly description: string;

  /**
   * Default severity when the user does not configure an override.
   *
   * Recommended rules default to 'error'; informational rules may default
   * to 'warning' or 'info'.
   */
  readonly defaultSeverity: Severity;

  /**
   * Optional. URL to the rule's documentation page.
   *
   * The engine automatically attaches this as `docsUrl` on every diagnostic
   * produced by this rule. Rules must not set docsUrl on their diagnostics
   * directly.
   */
  readonly docsUrl?: string;

  /**
   * Whether this rule is recommended for inclusion in default configs.
   *
   * Rules with recommended: true are included in the built-in "recommended"
   * preset. Non-recommended rules default to 'off' unless explicitly
   * configured by the user.
   */
  readonly recommended?: boolean;

  /**
   * Whether this rule can provide auto-fix suggestions.
   *
   * Reserved for future use. Currently informational only.
   */
  readonly hasSuggestions?: boolean;

  /**
   * Semantic version string when this rule was introduced.
   * Example: "0.2.0"
   */
  readonly since?: string;
}

// ---------------------------------------------------------------------------
// RuleContext
// ---------------------------------------------------------------------------

/**
 * The context object passed to a rule's create() function.
 *
 * This is the rule's entire world. Rules must not access anything outside
 * this context: no console output, no file I/O, no shared mutable state.
 *
 * The generic parameter C is the shape of the rule's options object.
 * If the rule has no options, C defaults to unknown.
 */
export interface RuleContext<C = unknown> {
  /**
   * The artifact being validated.
   *
   * Typed as the base Artifact<string, unknown> to allow Core to remain
   * domain-agnostic. Rules should cast to their specific artifact type
   * using the `artifactTypes` field as the discriminant.
   *
   * Invariant: content is fully decoded and read-only. Rules must not
   * mutate content.
   */
  readonly artifact: Readonly<Artifact>;

  /**
   * The rule's configuration options, as provided by the user's config
   * file and validated against the rule's schema (if any).
   *
   * undefined when the user has not provided options for this rule.
   */
  readonly options: Readonly<C> | undefined;

  /**
   * Emits a diagnostic from this rule.
   *
   * The engine automatically fills in ruleId, severity, artifact, and
   * docsUrl. The rule provides message, location, suggestion, and data.
   *
   * This is the ONLY way a rule should produce output. Calling
   * console.log, process.stdout.write, or any other I/O method is
   * prohibited in rule implementations.
   */
  report(descriptor: DiagnosticDescriptor): void;
}

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

/**
 * A Rule is a plain object that declares its identity, metadata, and
 * validation logic. Rules are not classes — they are values conforming
 * to this interface.
 *
 * The generic parameter C is the shape of the rule's options object. If
 * the rule has no configurable options, omit C (it defaults to unknown).
 *
 * Example (minimal):
 *
 *   export const myRule: Rule = {
 *     id: 'tile/my-check',
 *     meta: { description: '...', defaultSeverity: 'error', recommended: true },
 *     artifactTypes: ['VectorTile'],
 *     create(context) {
 *       // validate context.artifact.content and call context.report()
 *     },
 *   };
 *
 * Example (with options):
 *
 *   interface MyOptions { threshold: number }
 *   export const myRule: Rule<MyOptions> = { ... };
 */
export interface Rule<C = unknown> {
  /**
   * Unique identifier in namespaced format: "category/rule-name".
   *
   * - category: tile | style | render | artifact | engine | project
   * - rule-name: kebab-case, descriptive verb phrase
   *
   * Examples: "tile/required-layers", "style/known-source"
   *
   * Invariant: IDs must be unique across all registered rules. Duplicate
   * IDs within the same engine instance cause a configuration error.
   */
  readonly id: string;

  /**
   * Metadata about this rule.
   *
   * Used for documentation generation, preset building, and diagnostic
   * enrichment (docsUrl, severity defaults).
   */
  readonly meta: RuleMeta;

  /**
   * The artifact type discriminants this rule handles.
   *
   * The engine skips this rule for artifacts whose type is not in this list.
   * Using specific types (rather than a catch-all) ensures rules are only
   * invoked on artifacts they can meaningfully validate.
   *
   * Examples:
   *   artifactTypes: ['VectorTile']
   *   artifactTypes: ['StyleSpecification']
   *   artifactTypes: ['VectorTile', 'StyleSpecification']  // rare
   */
  readonly artifactTypes: readonly string[];

  /**
   * Optional. A JSON Schema object describing valid option shapes for this
   * rule. The engine validates the user's rule options against this schema
   * before invoking create(). Invalid options produce a configuration error,
   * not a runtime crash.
   *
   * Should follow JSON Schema draft-07 or later.
   */
  readonly schema?: Record<string, unknown>;

  /**
   * The validation function.
   *
   * Called once per artifact whose type matches artifactTypes, if the rule
   * is enabled in the current configuration. Receives a RuleContext and
   * produces diagnostics by calling context.report().
   *
   * Requirements:
   * - Must be pure: no side effects, no I/O, no shared mutable state.
   * - May be async (return Promise<void>) for rules that need async checks.
   * - Must call context.report() for each problem found.
   * - Must not throw for expected failure modes (use context.report()).
   * - May throw for programmer errors (null content, unexpected type).
   */
  create(context: RuleContext<C>): void | Promise<void>;
}
