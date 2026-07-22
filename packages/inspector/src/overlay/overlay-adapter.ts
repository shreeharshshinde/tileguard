/**
 * @tileguard/inspector — Overlay Adapter & Strategy Registry
 *
 * Bridges the TileGuard diagnostic model and the Inspector's visual model.
 * Converts `Diagnostic` objects into `OverlayDescriptor` objects that the
 * Renderer can draw.
 *
 * Architecture:
 *   - OverlayStrategy — one implementation per rule ID
 *   - OverlayAdapter  — registry + dispatcher
 *
 * Implemented in Milestone 4.
 *
 * Default strategies (Milestone 4):
 *   tile/coordinate-range    → coordinate-range.ts
 *   tile/self-intersection   → self-intersection.ts
 *   tile/zero-area-ring      → zero-area-ring.ts
 *   tile/degenerate-geometry → degenerate-geometry.ts
 *   tile/unclosed-ring       → unclosed-ring.ts
 *   tile/no-empty            → no-empty.ts
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { OverlayDescriptor } from '../renderer/canvas-renderer.ts';

// ---------------------------------------------------------------------------
// Strategy Interface — implemented in Milestone 4
// ---------------------------------------------------------------------------

/**
 * OverlayStrategy — converts diagnostics from one rule into OverlayDescriptors.
 *
 * Each strategy is responsible for exactly one rule ID. A strategy must not
 * call the Renderer — it only produces descriptors.
 *
 * The `artifact` parameter gives direct access to the decoded geometry, which
 * is required by most strategies (e.g. to locate intersection coordinates,
 * compute bounding boxes, or resolve ring indices). It is always the same
 * immutable VectorTileArtifact that produced the diagnostic.
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
// Registry & Adapter — implemented in Milestone 4
// ---------------------------------------------------------------------------

/**
 * OverlayAdapter — registry of OverlayStrategy implementations.
 *
 * Dispatches each Diagnostic to the appropriate strategy, collecting all
 * OverlayDescriptors for a full diagnostic list in a single pass.
 *
 * Full implementation delivered in Milestone 4.
 */
export class OverlayAdapter {
  private readonly strategies = new Map<string, OverlayStrategy>();

  /**
   * Register a strategy for a rule ID.
   * A second registration for the same ruleId replaces the first.
   */
  register(strategy: OverlayStrategy): void {
    this.strategies.set(strategy.ruleId, strategy);
  }

  /**
   * Convert all diagnostics in the list to OverlayDescriptors.
   * Diagnostics for unregistered rules produce no descriptors (graceful degradation).
   *
   * @param diagnostics  The full list of diagnostics from the engine run.
   * @param artifact     The immutable decoded tile that was validated.
   *
   * Implemented in Milestone 4.
   */
  toDescriptors(_diagnostics: Diagnostic[], _artifact: VectorTileArtifact): OverlayDescriptor[] {
    throw new Error('OverlayAdapter.toDescriptors() — implemented in Milestone 4');
  }

  /** Return the strategy registered for a rule ID, or undefined. */
  getStrategy(ruleId: string): OverlayStrategy | undefined {
    return this.strategies.get(ruleId);
  }
}

/**
 * Create an OverlayAdapter pre-loaded with all default Phase-3 strategies.
 *
 * Strategies for individual rules are registered in Milestone 4.
 * Returns an empty adapter at Milestone 1 — no strategies are registered yet.
 */
export function createDefaultOverlayAdapter(): OverlayAdapter {
  return new OverlayAdapter();
}
