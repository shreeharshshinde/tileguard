/**
 * @tileguard/inspector — Selection & Hover Overlay Producer
 *
 * Converts ephemeral UI interaction state (hovered feature, selected feature)
 * into `OverlayDescriptor` objects for the Canvas 2D Renderer.
 *
 * Architecture & Boundaries:
 *   - Structurally independent from OverlayAdapter — does not depend on
 *     diagnostics, rule definitions, or strategy registries.
 *   - Pure function of UI state — holds no internal state, performs no I/O.
 *   - Uses existing frozen OverlayDescriptor severity tokens:
 *       selection → 'info'
 *       hover     → 'warning'
 *
 * Note on severity reuse:
 *   Selection uses 'info' and hover uses 'warning' as a temporary implementation
 *   choice driven by the frozen OverlayDescriptor contract. Future milestones
 *   may introduce dedicated interaction styling without modifying renderer
 *   architecture.
 */

import type { FeatureRef } from '../store/inspector-store.js';
import type { OverlayDescriptor } from './overlay-adapter.js';

// Re-export FeatureRef for overlay callers
export type { FeatureRef };

// ---------------------------------------------------------------------------
// Producer Interface
// ---------------------------------------------------------------------------

/**
 * SelectionProducer — transforms UI selection/hover state into OverlayDescriptors.
 *
 * Generates at most 2 descriptors per call (one selection, one hover).
 */
export interface SelectionProducer {
  /**
   * Convert current selection and hover state into OverlayDescriptors.
   *
   * @param selection Current selected feature pointer (or null fields).
   * @param hover     Current hovered feature pointer (or null fields).
   */
  toOverlays(selection: FeatureRef, hover: FeatureRef): OverlayDescriptor[];
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class SelectionProducerImpl implements SelectionProducer {
  toOverlays(selection: FeatureRef, hover: FeatureRef): OverlayDescriptor[] {
    const overlays: OverlayDescriptor[] = [];

    // Selected feature overlay (severity: 'info')
    if (selection.layerName !== null && selection.featureIndex !== null) {
      overlays.push({
        type: 'bbox-fill',
        layerName: selection.layerName,
        featureIndex: selection.featureIndex,
        target: 0,
        severity: 'info',
      });
    }

    // Hovered feature overlay (severity: 'warning')
    if (hover.layerName !== null && hover.featureIndex !== null) {
      overlays.push({
        type: 'bbox-fill',
        layerName: hover.layerName,
        featureIndex: hover.featureIndex,
        target: 0,
        severity: 'warning',
      });
    }

    return overlays;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new SelectionProducer instance.
 */
export function createSelectionProducer(): SelectionProducer {
  return new SelectionProducerImpl();
}
