/**
 * @tileguard/style-rules — Style Validator Tests
 */

import { describe, expect, it } from 'vitest';
import { validateStyle } from '../../src/validator/StyleValidator.js';
import { parseStyleDocument } from '../../src/parser/StyleParser.js';
import { resolveLayers } from '../../src/resolver/SemanticResolver.js';

function validate(input: unknown) {
  const { document } = parseStyleDocument(input);
  const resolved = resolveLayers(document!);
  return validateStyle(document!, resolved);
}

describe('StyleValidator', () => {
  describe('version validation', () => {
    it('reports missing version', () => {
      const diags = validate({ sources: {}, layers: [] });
      expect(diags.some((d) => d.code === 'missing-version')).toBe(true);
    });

    it('reports invalid version', () => {
      const diags = validate({ version: 7, sources: {}, layers: [] });
      expect(diags.some((d) => d.code === 'invalid-version')).toBe(true);
    });

    it('passes for version 8', () => {
      const diags = validate({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background' }] });
      expect(diags.filter((d) => d.code === 'missing-version' || d.code === 'invalid-version')).toHaveLength(0);
    });
  });

  describe('source validation', () => {
    it('warns when no sources declared but layers need them', () => {
      const diags = validate({ version: 8, sources: {}, layers: [{ id: 'l', type: 'fill' }] });
      expect(diags.some((d) => d.code === 'no-sources')).toBe(true);
    });

    it('no warning when only background layers', () => {
      const diags = validate({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background' }] });
      expect(diags.some((d) => d.code === 'no-sources')).toBe(false);
    });
  });

  describe('layer validation', () => {
    it('warns when no layers declared', () => {
      const diags = validate({ version: 8, sources: {}, layers: [] });
      expect(diags.some((d) => d.code === 'no-layers')).toBe(true);
    });

    it('reports missing layer ID', () => {
      const diags = validate({ version: 8, sources: {}, layers: [{ type: 'background' }] });
      expect(diags.some((d) => d.code === 'missing-layer-id')).toBe(true);
    });

    it('reports duplicate layer IDs', () => {
      const diags = validate({
        version: 8,
        sources: {},
        layers: [
          { id: 'dup', type: 'background' },
          { id: 'dup', type: 'fill' },
        ],
      });
      expect(diags.some((d) => d.code === 'duplicate-layer-id')).toBe(true);
    });

    it('reports unknown layer type', () => {
      const diags = validate({
        version: 8,
        sources: {},
        layers: [{ id: 'l', type: 'not-a-type' }],
      });
      expect(diags.some((d) => d.code === 'unknown-layer-type')).toBe(true);
    });
  });

  describe('source reference validation', () => {
    it('reports unknown source reference', () => {
      const diags = validate({
        version: 8,
        sources: { existing: { type: 'vector' } },
        layers: [{ id: 'l', type: 'fill', source: 'missing' }],
      });
      expect(diags.some((d) => d.code === 'unknown-source-reference')).toBe(true);
    });

    it('reports missing source property for fill layers', () => {
      const diags = validate({
        version: 8,
        sources: { s: { type: 'vector' } },
        layers: [{ id: 'l', type: 'fill' }],
      });
      expect(diags.some((d) => d.code === 'missing-source-property')).toBe(true);
    });

    it('does not report missing source for background layers', () => {
      const diags = validate({
        version: 8,
        sources: {},
        layers: [{ id: 'bg', type: 'background' }],
      });
      expect(diags.some((d) => d.code === 'missing-source-property')).toBe(false);
    });
  });

  describe('source-layer validation', () => {
    it('warns about missing source-layer for vector sources', () => {
      const diags = validate({
        version: 8,
        sources: { tiles: { type: 'vector' } },
        layers: [{ id: 'l', type: 'fill', source: 'tiles' }],
      });
      expect(diags.some((d) => d.code === 'missing-source-layer')).toBe(true);
    });

    it('no warning when source-layer is present', () => {
      const diags = validate({
        version: 8,
        sources: { tiles: { type: 'vector' } },
        layers: [{ id: 'l', type: 'fill', source: 'tiles', 'source-layer': 'water' }],
      });
      expect(diags.some((d) => d.code === 'missing-source-layer')).toBe(false);
    });

    it('no warning for geojson sources without source-layer', () => {
      const diags = validate({
        version: 8,
        sources: { geo: { type: 'geojson', data: {} } },
        layers: [{ id: 'l', type: 'fill', source: 'geo' }],
      });
      expect(diags.some((d) => d.code === 'missing-source-layer')).toBe(false);
    });
  });

  describe('zoom range validation', () => {
    it('reports minzoom > maxzoom', () => {
      const diags = validate({
        version: 8,
        sources: {},
        layers: [{ id: 'l', type: 'background', minzoom: 15, maxzoom: 10 }],
      });
      expect(diags.some((d) => d.code === 'invalid-zoom-range')).toBe(true);
    });

    it('passes when minzoom == maxzoom', () => {
      const diags = validate({
        version: 8,
        sources: {},
        layers: [{ id: 'l', type: 'background', minzoom: 10, maxzoom: 10 }],
      });
      expect(diags.some((d) => d.code === 'invalid-zoom-range')).toBe(false);
    });

    it('passes when minzoom < maxzoom', () => {
      const diags = validate({
        version: 8,
        sources: {},
        layers: [{ id: 'l', type: 'background', minzoom: 5, maxzoom: 18 }],
      });
      expect(diags.some((d) => d.code === 'invalid-zoom-range')).toBe(false);
    });
  });

  describe('unused source detection', () => {
    it('reports unused sources', () => {
      const diags = validate({
        version: 8,
        sources: { used: { type: 'vector' }, unused: { type: 'geojson', data: {} } },
        layers: [{ id: 'l', type: 'fill', source: 'used', 'source-layer': 'x' }],
      });
      expect(diags.some((d) => d.code === 'unused-source' && d.message.includes('unused'))).toBe(true);
    });

    it('does not flag terrain source as unused', () => {
      const diags = validate({
        version: 8,
        terrain: { source: 'dem' },
        sources: { dem: { type: 'raster-dem' } },
        layers: [{ id: 'bg', type: 'background' }],
      });
      expect(diags.some((d) => d.code === 'unused-source' && d.message.includes('dem'))).toBe(false);
    });
  });

  describe('terrain validation', () => {
    it('reports terrain referencing unknown source', () => {
      const diags = validate({
        version: 8,
        terrain: { source: 'missing-dem' },
        sources: {},
        layers: [{ id: 'bg', type: 'background' }],
      });
      expect(diags.some((d) => d.code === 'terrain-unknown-source')).toBe(true);
    });
  });

  describe('valid style produces no errors', () => {
    it('complete valid style has no error diagnostics', () => {
      const diags = validate({
        version: 8,
        sources: { tiles: { type: 'vector', url: 'https://example.com' } },
        layers: [
          { id: 'bg', type: 'background' },
          { id: 'water', type: 'fill', source: 'tiles', 'source-layer': 'water' },
        ],
      });
      const errors = diags.filter((d) => d.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });
});
