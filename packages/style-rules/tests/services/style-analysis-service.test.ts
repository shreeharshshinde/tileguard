/**
 * @tileguard/style-rules — Style Analysis Service Tests (Public API)
 */

import { describe, expect, it } from 'vitest';
import {
  analyzeStyle,
  getLayer,
  getSource,
  getStatistics,
  parseStyle,
  validateStyleAnalysis,
} from '../../src/services/StyleAnalysisEngine.js';

const VALID_STYLE = {
  version: 8,
  name: 'Test Style',
  sprite: 'https://example.com/sprite',
  glyphs: 'https://example.com/{fontstack}/{range}.pbf',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://example.com/tiles.json',
    },
    satellite: {
      type: 'raster',
      tileSize: 256,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#f0f0f0' },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      filter: ['==', ['get', 'class'], 'ocean'],
      paint: { 'fill-color': '#a0c8f0' },
    },
    {
      id: 'roads',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: [
        'all',
        ['has', 'class'],
        ['==', ['geometry-type'], 'LineString'],
      ],
      paint: {
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 20, 5],
      },
    },
    {
      id: 'labels',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      layout: { 'text-field': ['get', 'name'] },
    },
  ],
};

describe('StyleAnalysisService', () => {
  describe('parseStyle()', () => {
    it('parses a valid style object', () => {
      const { document, error } = parseStyle(VALID_STYLE);
      expect(error).toBeUndefined();
      expect(document).toBeDefined();
      expect(document!.version).toBe(8);
      expect(document!.name).toBe('Test Style');
    });

    it('parses a JSON string', () => {
      const { document, error } = parseStyle(JSON.stringify(VALID_STYLE));
      expect(error).toBeUndefined();
      expect(document).toBeDefined();
    });

    it('returns error for invalid JSON', () => {
      const { document, error } = parseStyle('{ broken json');
      expect(document).toBeUndefined();
      expect(error).toBeDefined();
    });

    it('returns error for non-object', () => {
      const { document, error } = parseStyle(42);
      expect(document).toBeUndefined();
      expect(error).toBeDefined();
    });
  });

  describe('analyzeStyle()', () => {
    it('returns a complete StyleAnalysis for valid style', () => {
      const { analysis, error } = analyzeStyle(VALID_STYLE);
      expect(error).toBeUndefined();
      expect(analysis).toBeDefined();
      expect(analysis!.valid).toBe(true);
      expect(analysis!.errorCount).toBe(0);
    });

    it('analysis contains parsed document', () => {
      const { analysis } = analyzeStyle(VALID_STYLE);
      expect(analysis!.document.version).toBe(8);
      expect(analysis!.document.name).toBe('Test Style');
    });

    it('analysis contains sources map', () => {
      const { analysis } = analyzeStyle(VALID_STYLE);
      expect(analysis!.sources.size).toBe(2);
      expect(analysis!.sources.has('openmaptiles')).toBe(true);
      expect(analysis!.sources.has('satellite')).toBe(true);
    });

    it('analysis contains resolved layers', () => {
      const { analysis } = analyzeStyle(VALID_STYLE);
      expect(analysis!.layers).toHaveLength(4);
      expect(analysis!.layers[1]!.source).toBeDefined();
      expect(analysis!.layers[1]!.source!.type).toBe('vector');
    });

    it('analysis contains statistics', () => {
      const { analysis } = analyzeStyle(VALID_STYLE);
      expect(analysis!.statistics.sourceCount).toBe(2);
      expect(analysis!.statistics.layerCount).toBe(4);
      expect(analysis!.statistics.expressionCount).toBeGreaterThan(0);
      expect(analysis!.statistics.filterCount).toBe(2);
      expect(analysis!.statistics.usesSprites).toBe(true);
      expect(analysis!.statistics.usesGlyphs).toBe(true);
    });

    it('reports errors for invalid style', () => {
      const { analysis } = analyzeStyle({
        version: 7,
        sources: {},
        layers: [],
      });
      expect(analysis!.valid).toBe(false);
      expect(analysis!.errorCount).toBeGreaterThan(0);
    });

    it('returns error for unparseable input', () => {
      const { analysis, error } = analyzeStyle(null);
      expect(analysis).toBeUndefined();
      expect(error).toBeDefined();
    });

    it('result is deterministic', () => {
      const r1 = analyzeStyle(VALID_STYLE);
      const r2 = analyzeStyle(VALID_STYLE);
      expect(r1.analysis!.statistics).toEqual(r2.analysis!.statistics);
      expect(r1.analysis!.diagnostics).toEqual(r2.analysis!.diagnostics);
    });
  });

  describe('validateStyleAnalysis()', () => {
    it('returns diagnostics for invalid style', () => {
      const result = validateStyleAnalysis({
        version: 7,
        sources: {},
        layers: [],
      });
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('returns empty diagnostics for valid style', () => {
      const result = validateStyleAnalysis(VALID_STYLE);
      const errors = result.diagnostics.filter((d) => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('returns error for unparseable input', () => {
      const result = validateStyleAnalysis('broken json {{');
      expect(result.document).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('getLayer()', () => {
    it('finds a layer by ID', () => {
      const { analysis } = analyzeStyle(VALID_STYLE);
      const layer = getLayer(analysis!, 'water');
      expect(layer).toBeDefined();
      expect(layer!.layer.id).toBe('water');
      expect(layer!.layer.type).toBe('fill');
    });

    it('returns undefined for unknown layer ID', () => {
      const { analysis } = analyzeStyle(VALID_STYLE);
      expect(getLayer(analysis!, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getSource()', () => {
    it('finds a source by ID', () => {
      const { analysis } = analyzeStyle(VALID_STYLE);
      const source = getSource(analysis!, 'openmaptiles');
      expect(source).toBeDefined();
      expect(source!.type).toBe('vector');
    });

    it('returns undefined for unknown source ID', () => {
      const { analysis } = analyzeStyle(VALID_STYLE);
      expect(getSource(analysis!, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getStatistics()', () => {
    it('computes statistics from a document', () => {
      const { document } = parseStyle(VALID_STYLE);
      const stats = getStatistics(document!);
      expect(stats.sourceCount).toBe(2);
      expect(stats.layerCount).toBe(4);
      expect(stats.sourcesByType.vector).toBe(1);
      expect(stats.sourcesByType.raster).toBe(1);
      expect(stats.layersByType.fill).toBe(1);
      expect(stats.layersByType.line).toBe(1);
      expect(stats.layersByType.symbol).toBe(1);
      expect(stats.layersByType.background).toBe(1);
    });

    it('counts expressions across layers', () => {
      const { document } = parseStyle(VALID_STYLE);
      const stats = getStatistics(document!);
      expect(stats.expressionCount).toBeGreaterThan(0);
    });

    it('counts data-driven layers', () => {
      const { document } = parseStyle(VALID_STYLE);
      const stats = getStatistics(document!);
      // water (filter), roads (filter + paint), labels (layout) are data-driven
      expect(stats.dataDrivenLayerCount).toBe(3);
    });

    it('collects unique property references', () => {
      const { document } = parseStyle(VALID_STYLE);
      const stats = getStatistics(document!);
      expect(stats.uniquePropertyReferences).toContain('class');
      expect(stats.uniquePropertyReferences).toContain('name');
    });

    it('reports sprite and glyph usage', () => {
      const { document } = parseStyle(VALID_STYLE);
      const stats = getStatistics(document!);
      expect(stats.usesSprites).toBe(true);
      expect(stats.usesGlyphs).toBe(true);
      expect(stats.usesTerrain).toBe(false);
    });
  });
});
