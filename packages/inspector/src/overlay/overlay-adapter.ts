/**
 * @tileguard/inspector — Overlay Adapter & Strategy Registry
 *
 * Bridges the TileGuard diagnostic model and the Inspector's visual model.
 * Converts `Diagnostic` objects into `OverlayDescriptor` objects that the
 * Renderer can draw.
 *
 * Architecture:
 *   - OverlayStrategy — one implementation per rule ID
 *   - OverlayAdapter  — encapsulated registry + dispatcher
 *
 * The strategy Map is encapsulated within the Adapter — no separate Registry
 * module exists, since no other subsystem needs independent access.
 *
 * Failure handling:
 *   - Unregistered ruleId → zero descriptors, no throw
 *   - Strategy throws → zero descriptors for that diagnostic, continue
 *   - Strategy returns non-array → treated as empty
 *   - Duplicate registration → throws (matches @tileguard/core convention)
 *
 * Default strategies (registered by createDefaultOverlayAdapter):
 *   tile/coordinate-range    → coordinate-range.ts
 *   tile/self-intersection   → self-intersection.ts
 *   tile/zero-area-ring      → zero-area-ring.ts
 *   tile/degenerate-geometry → degenerate-geometry.ts
 *   tile/unclosed-ring       → unclosed-ring.ts
 *   tile/no-empty            → no-empty.ts
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';

import { coordinateRangeStrategy } from './strategies/coordinate-range.js';
import { selfIntersectionStrategy } from './strategies/self-intersection.js';
import { zeroAreaRingStrategy } from './strategies/zero-area-ring.js';
import { degenerateGeometryStrategy } from './strategies/degenerate-geometry.js';
import { unclosedRingStrategy } from './strategies/unclosed-ring.js';
import { noEmptyStrategy } from './strategies/no-empty.js';

// ---------------------------------------------------------------------------
// OverlayDescriptor — owned by the Overlay subsystem
// ---------------------------------------------------------------------------

/** Describes a visual marker for a single diagnostic. */
export interface OverlayDescriptor {
  /** Type of marker to render. */
  readonly type: 'point-marker' | 'segment-highlight' | 'ring-highlight' | 'bbox-fill';
  /** Layer name to locate the feature. */
  readonly layerName: string;
  /** Feature index within that layer. */
  readonly featureIndex: number;
  /** Ring index (for polygons), segment indices, or vertex indices (type-dependent). */
  readonly target: number | [number, number] | number[];
  /** Visual emphasis level. */
  readonly severity: 'error' | 'warning' | 'info';
}

// ---------------------------------------------------------------------------
// Strategy Interface
// ---------------------------------------------------------------------------

/**
 * OverlayStrategy — converts diagnostics from one rule into OverlayDescriptors.
 *
 * Each strategy is responsible for exactly one rule ID. A strategy must not
 * call the Renderer — it only produces descriptors.
 *
 * Strategies may inspect the immutable VectorTileArtifact through the supplied
 * parameter, but must not perform independent geometry traversal or coordinate
 * transformation.
 */
export interface OverlayStrategy {
  /** Rule ID this strategy handles, e.g. "tile/self-intersection". */
  readonly ruleId: string;

  /**
   * Convert a single Diagnostic into one or more OverlayDescriptors.
   *
   * @param diagnostic  The diagnostic to convert.
   * @param artifact    The immutable decoded tile that produced the diagnostic.
   *                    Read-only — strategies must never mutate it.
   *
   * Returns an empty array if the diagnostic does not produce a visible overlay.
   */
  toDescriptors(diagnostic: Diagnostic, artifact: VectorTileArtifact): OverlayDescriptor[];
}

// ---------------------------------------------------------------------------
// Overlay Adapter
// ---------------------------------------------------------------------------

/**
 * OverlayAdapter — encapsulated strategy registry and diagnostic dispatcher.
 *
 * Dispatches each Diagnostic to the appropriate strategy, collecting all
 * OverlayDescriptors for a full diagnostic list in a single pass.
 *
 * The internal Map<string, OverlayStrategy> serves as the registry. No
 * separate OverlayRegistry module exists — the Adapter is the sole owner
 * of the strategy map.
 */
export class OverlayAdapter {
  private readonly strategies = new Map<string, OverlayStrategy>();

  /**
   * Register a strategy for a rule ID.
   *
   * Throws if a strategy is already registered for the given ruleId.
   * This matches @tileguard/core's resolveConfig() convention for duplicate
   * rule IDs — each rule may have exactly one overlay strategy.
   *
   * @param strategy  The strategy to register.
   */
  register(strategy: OverlayStrategy): void {
    if (this.strategies.has(strategy.ruleId)) {
      throw new Error(
        `OverlayStrategy for rule "${strategy.ruleId}" is already registered. ` +
        'Each rule may have exactly one overlay strategy.',
      );
    }
    this.strategies.set(strategy.ruleId, strategy);
  }

  /**
   * Convert all diagnostics in the list to OverlayDescriptors.
   *
   * For each diagnostic:
   *   1. Look up the strategy by diagnostic.ruleId
   *   2. If found: call strategy.toDescriptors(), collect results
   *   3. If not found: skip silently, zero descriptors
   *   4. If strategy throws: catch, zero descriptors for that diagnostic, continue
   *   5. If strategy returns non-array: treat as empty
   *
   * @param diagnostics  The full list of diagnostics from the engine run.
   * @param artifact     The immutable decoded tile that was validated.
   */
  toDescriptors(diagnostics: readonly Diagnostic[], artifact: VectorTileArtifact): OverlayDescriptor[] {
    const result: OverlayDescriptor[] = [];

    for (const diagnostic of diagnostics) {
      const strategy = this.strategies.get(diagnostic.ruleId);
      if (strategy === undefined) continue;

      try {
        const descriptors = strategy.toDescriptors(diagnostic, artifact);
        if (!Array.isArray(descriptors)) continue;
        for (const descriptor of descriptors) {
          result.push(descriptor);
        }
      } catch {
        // Isolate strategy failures. A single broken strategy must not
        // prevent overlays from other diagnostics from rendering.
        continue;
      }
    }

    return result;
  }

  /** Return the strategy registered for a rule ID, or undefined. */
  getStrategy(ruleId: string): OverlayStrategy | undefined {
    return this.strategies.get(ruleId);
  }

  /** Return all registered rule IDs. */
  getAllRuleIds(): readonly string[] {
    return [...this.strategies.keys()];
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an OverlayAdapter pre-loaded with all default built-in strategies.
 *
 * Each of the six Phase-1/2 validation rules is mapped to its corresponding
 * overlay strategy. Adding support for a 7th rule requires only writing a new
 * OverlayStrategy and calling adapter.register() — no Adapter source change.
 */
export function createDefaultOverlayAdapter(): OverlayAdapter {
  const adapter = new OverlayAdapter();
  adapter.register(coordinateRangeStrategy);
  adapter.register(selfIntersectionStrategy);
  adapter.register(zeroAreaRingStrategy);
  adapter.register(degenerateGeometryStrategy);
  adapter.register(unclosedRingStrategy);
  adapter.register(noEmptyStrategy);
  return adapter;
}
