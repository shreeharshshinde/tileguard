/**
 * @tileguard/inspector — Overlay Subsystem Barrel
 *
 * Public entry point for diagnostic overlay generation and UI selection markers.
 */

export type {
  OverlayDescriptor,
  OverlayStrategy,
} from './overlay-adapter.js';
export {
  createDefaultOverlayAdapter,
  OverlayAdapter,
} from './overlay-adapter.js';

export type {
  FeatureRef,
  SelectionProducer,
} from './selection-producer.js';
export { createSelectionProducer } from './selection-producer.js';
