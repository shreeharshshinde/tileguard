/**
 * @tileguard/inspector — OverlayAdapter Unit Tests
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { describe, expect, it, vi } from 'vitest';
import {
  createDefaultOverlayAdapter,
  OverlayAdapter,
  type OverlayDescriptor,
  type OverlayStrategy,
} from '../src/overlay/overlay-adapter.js';

const mockArtifact = {
  type: 'VectorTile',
  source: 'test.pbf',
  content: {
    layers: {
      roads: {
        name: 'roads',
        extent: 4096,
        version: 2,
        features: [],
      },
    },
  },
} as unknown as VectorTileArtifact;

function makeDiagnostic(ruleId: string, layer = 'roads', featureIndex = 0): Diagnostic {
  return {
    ruleId,
    severity: 'error',
    message: `Test issue for ${ruleId}`,
    artifact: { type: 'VectorTile', source: 'test.pbf' },
    location: { layer, featureIndex },
  };
}

describe('OverlayAdapter', () => {
  it('returns empty array for empty diagnostics input', () => {
    const adapter = new OverlayAdapter();
    expect(adapter.toDescriptors([], mockArtifact)).toEqual([]);
  });

  it('ignores diagnostics for unregistered rule IDs without throwing', () => {
    const adapter = new OverlayAdapter();
    const result = adapter.toDescriptors([makeDiagnostic('unknown/rule')], mockArtifact);
    expect(result).toEqual([]);
  });

  it('dispatches diagnostic to registered strategy', () => {
    const adapter = new OverlayAdapter();
    const expectedOverlay: OverlayDescriptor = {
      type: 'point-marker',
      layerName: 'roads',
      featureIndex: 0,
      target: 0,
      severity: 'error',
    };

    const strategy: OverlayStrategy = {
      ruleId: 'test/rule',
      toDescriptors: vi.fn().mockReturnValue([expectedOverlay]),
    };

    adapter.register(strategy);

    const diagnostic = makeDiagnostic('test/rule');
    const result = adapter.toDescriptors([diagnostic], mockArtifact);

    expect(strategy.toDescriptors).toHaveBeenCalledWith(diagnostic, mockArtifact);
    expect(result).toEqual([expectedOverlay]);
  });

  it('throws on duplicate ruleId registration', () => {
    const adapter = new OverlayAdapter();
    const strategy: OverlayStrategy = { ruleId: 'test/rule', toDescriptors: () => [] };

    adapter.register(strategy);
    expect(() => adapter.register(strategy)).toThrow(
      'OverlayStrategy for rule "test/rule" is already registered.',
    );
  });

  it('isolates strategy failures so a throwing strategy does not stop execution', () => {
    const adapter = new OverlayAdapter();

    const throwingStrategy: OverlayStrategy = {
      ruleId: 'bad/rule',
      toDescriptors: () => {
        throw new Error('Strategy exploded');
      },
    };

    const goodOverlay: OverlayDescriptor = {
      type: 'bbox-fill',
      layerName: 'roads',
      featureIndex: 1,
      target: 0,
      severity: 'warning',
    };

    const workingStrategy: OverlayStrategy = {
      ruleId: 'good/rule',
      toDescriptors: () => [goodOverlay],
    };

    adapter.register(throwingStrategy);
    adapter.register(workingStrategy);

    const result = adapter.toDescriptors(
      [makeDiagnostic('bad/rule'), makeDiagnostic('good/rule', 'roads', 1)],
      mockArtifact,
    );

    expect(result).toEqual([goodOverlay]);
  });

  it('handles non-array strategy return values gracefully', () => {
    const adapter = new OverlayAdapter();
    const malformedStrategy: OverlayStrategy = {
      ruleId: 'malformed/rule',
      toDescriptors: () => null as unknown as OverlayDescriptor[],
    };

    adapter.register(malformedStrategy);
    const result = adapter.toDescriptors([makeDiagnostic('malformed/rule')], mockArtifact);
    expect(result).toEqual([]);
  });

  it('returns all registered rule IDs via getAllRuleIds()', () => {
    const adapter = createDefaultOverlayAdapter();
    const ruleIds = adapter.getAllRuleIds();

    expect(ruleIds).toEqual([
      'tile/coordinate-range',
      'tile/self-intersection',
      'tile/zero-area-ring',
      'tile/degenerate-geometry',
      'tile/unclosed-ring',
      'tile/no-empty',
    ]);
  });

  it('pre-registers all 6 default strategies in createDefaultOverlayAdapter()', () => {
    const adapter = createDefaultOverlayAdapter();
    expect(adapter.getAllRuleIds()).toHaveLength(6);
    expect(adapter.getStrategy('tile/self-intersection')).toBeDefined();
    expect(adapter.getStrategy('tile/coordinate-range')).toBeDefined();
  });
});
