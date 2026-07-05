/**
 * @tileguard/core — Plugin Contract
 *
 * A Plugin is the unit of extensibility in TileGuard. It bundles a set of
 * ArtifactProviders and Rules that belong to a single domain (e.g., vector
 * tiles, style specifications) and registers them with the engine.
 *
 * Plugins are the only way to introduce providers and rules into the engine.
 * The engine does not scan the file system or node_modules — everything must
 * be explicitly registered via the plugins array in the configuration.
 *
 * Domain packages (@tileguard/tile-rules, @tileguard/style-rules) each export
 * a single plugin object that wires together all providers and rules for that
 * domain. Users import the plugin and pass it to createEngine():
 *
 *   import { tilePlugin } from '@tileguard/tile-rules';
 *   import { stylePlugin } from '@tileguard/style-rules';
 *
 *   const engine = createEngine({
 *     plugins: [tilePlugin, stylePlugin],
 *     rules: { 'tile/required-layers': ['error', { layers: ['water'] }] },
 *   });
 *
 * See docs/architecture/04-rule-system.md (Registration and Discovery) for
 * the full specification.
 */

import type { ArtifactProvider } from './artifact.js';
import type { Rule } from './rule.js';

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * A Plugin bundles related providers and rules into a named, registerable
 * unit. Plugins are plain objects — no base classes, no decorators.
 *
 * Invariants:
 * - id must be unique across all plugins registered with an engine instance.
 *   Duplicate plugin IDs cause a configuration error.
 * - A plugin may supply providers, rules, or both. A plugin with neither is
 *   valid but produces no effect.
 * - Rule IDs contributed by different plugins must not collide. If two plugins
 *   register a rule with the same ID, the engine raises a configuration error.
 *
 * Example (minimal plugin for testing):
 *
 *   const mockPlugin: Plugin = {
 *     id: 'mock',
 *     providers: [mockProvider],
 *     rules: [alwaysPassRule, alwaysFailRule],
 *   };
 */
export interface Plugin {
  /**
   * Unique identifier for this plugin.
   *
   * Convention: matches the npm package name without the @tileguard/ scope.
   * Examples: "tile-rules", "style-rules", "render-rules"
   *
   * Custom plugins may use any identifier. Convention for community plugins:
   * "tileguard-plugin-{name}" or "{org}/tileguard-plugin-{name}".
   */
  readonly id: string;

  /**
   * Optional. Human-readable name for display in error messages and
   * help output.
   * Example: "TileGuard Tile Rules"
   */
  readonly name?: string;

  /**
   * Optional. Semantic version string for this plugin.
   * Used in SARIF reporter tool metadata and diagnostic reports.
   * Example: "0.2.0"
   */
  readonly version?: string;

  /**
   * Optional. Artifact providers contributed by this plugin.
   *
   * Providers are registered in order. When the engine resolves a source
   * string, it iterates all registered providers from all plugins in
   * registration order and uses the first one whose canHandle() returns true.
   */
  readonly providers?: readonly ArtifactProvider[];

  /**
   * Optional. Rules contributed by this plugin.
   *
   * All rules from all plugins are merged into a single rule registry at
   * engine startup. Rule IDs must be unique across the merged set.
   */
  readonly rules?: readonly Rule[];
}
