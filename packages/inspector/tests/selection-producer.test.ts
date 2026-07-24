/**
 * @tileguard/inspector — SelectionProducer Unit Tests
 */

import { describe, expect, it } from 'vitest';
import { createSelectionProducer } from '../src/overlay/selection-producer.js';

describe('SelectionProducer', () => {
  it('returns empty array when selection and hover are null', () => {
    const producer = createSelectionProducer();
    const overlays = producer.toOverlays(
      { layerName: null, featureIndex: null },
      { layerName: null, featureIndex: null },
    );
    expect(overlays).toEqual([]);
  });

  it('produces single bbox-fill descriptor with severity info for active selection', () => {
    const producer = createSelectionProducer();
    const overlays = producer.toOverlays(
      { layerName: 'buildings', featureIndex: 4 },
      { layerName: null, featureIndex: null },
    );

    expect(overlays).toEqual([
      {
        type: 'bbox-fill',
        layerName: 'buildings',
        featureIndex: 4,
        target: 0,
        severity: 'info',
      },
    ]);
  });

  it('produces single bbox-fill descriptor with severity warning for active hover', () => {
    const producer = createSelectionProducer();
    const overlays = producer.toOverlays(
      { layerName: null, featureIndex: null },
      { layerName: 'roads', featureIndex: 12 },
    );

    expect(overlays).toEqual([
      {
        type: 'bbox-fill',
        layerName: 'roads',
        featureIndex: 12,
        target: 0,
        severity: 'warning',
      },
    ]);
  });

  it('produces two distinct descriptors when both selection and hover are active', () => {
    const producer = createSelectionProducer();
    const overlays = producer.toOverlays(
      { layerName: 'buildings', featureIndex: 4 },
      { layerName: 'roads', featureIndex: 12 },
    );

    expect(overlays).toHaveLength(2);
    expect(overlays[0]).toEqual({
      type: 'bbox-fill',
      layerName: 'buildings',
      featureIndex: 4,
      target: 0,
      severity: 'info',
    });
    expect(overlays[1]).toEqual({
      type: 'bbox-fill',
      layerName: 'roads',
      featureIndex: 12,
      target: 0,
      severity: 'warning',
    });
  });
});
