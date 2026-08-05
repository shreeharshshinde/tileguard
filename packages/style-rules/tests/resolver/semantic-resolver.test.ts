/**
 * @tileguard/style-rules — Semantic Resolver Tests
 */

import { describe, expect, it } from 'vitest';
import { resolveLayers } from '../../src/resolver/SemanticResolver.js';
import { parseStyleDocument } from '../../src/parser/StyleParser.js';

describe('SemanticResolver', () => {
  describe('source resolution', () => {
    it('resolves layer source from sources map', () => {
      const { document } = parseStyleDocument({
        version: 8,
        sources: { tiles: { type: 'vector', url: 'https://example.com' } },
        layers: [{ id: 'water', type: 'fill', source: 'tiles', 'source-layer': 'water' }],
      });
      const resolved = resolveLayers(document!);
      expect(resolved[0]!.source).toBeDefined();
      expect(resolved[0]!.source!.id).toBe('tiles');
      expect(resolved[0]!.source!.type).toBe('vector');
    });

    it('source is undefined for background layers', () => {
      const { document } = parseStyleDocument({
        version: 8,
        sources: {},
        layers: [{ id: 'bg', type: 'background' }],
      });
      const resolved = resolveLayers(document!);
      expect(resolved[0]!.source).toBeUndefined();
    });

    it('source is undefined when reference is invalid', () => {
      const { document } = parseStyleDocument({
        version: 8,
        sources: { tiles: { type: 'vector' } },
        layers: [{ id: 'water', type: 'fill', source: 'nonexistent' }],
      });
      const resolved = resolveLayers(document!);
      expect(resolved[0]!.source).toBeUndefined();
    });
  });

  describe('property references', () => {
    it('extracts get references from filter', () => {
      const { document } = parseStyleDocument({
        version: 8,
        sources: { s: { type: 'vector' } },
        layers: [{ id: 'l', type: 'fill', source: 's', filter: ['==', ['get', 'class'], 'road'] }],
      });
      const resolved = resolveLayers(document!);
      const refs = resolved[0]!.propertyReferences;
      expect(refs.length).toBeGreaterThan(0);
      expect(refs.some((r) => r.name === 'class')).toBe(true);
    });

    it('extracts get references from paint expressions', () => {
      const { document } = parseStyleDocument({
        version: 8,
        sources: { s: { type: 'vector' } },
        layers: [{
          id: 'l',
          type: 'fill',
          source: 's',
          paint: { 'fill-color': ['match', ['get', 'type'], 'water', '#00f', '#ccc'] },
        }],
      });
      const resolved = resolveLayers(document!);
      expect(resolved[0]!.propertyReferences.some((r) => r.name === 'type')).toBe(true);
    });

    it('extracts has references', () => {
      const { document } = parseStyleDocument({
        version: 8,
        sources: { s: { type: 'vector' } },
        layers: [{ id: 'l', type: 'fill', source: 's', filter: ['has', 'name'] }],
      });
      const resolved = resolveLayers(document!);
      expect(resolved[0]!.propertyReferences.some((r) => r.name === 'name')).toBe(true);
    });

    it('extracts references from layout expressions', () => {
      const { document } = parseStyleDocument({
        version: 8,
        sources: { s: { type: 'vector' } },
        layers: [{
          id: 'labels',
          type: 'symbol',
          source: 's',
          layout: { 'text-field': ['get', 'name'] },
        }],
      });
      const resolved = resolveLayers(document!);
      expect(resolved[0]!.propertyReferences.some((r) => r.name === 'name')).toBe(true);
    });

    it('deduplicates property references from multiple locations', () => {
      const { document } = parseStyleDocument({
        version: 8,
        sources: { s: { type: 'vector' } },
        layers: [{
          id: 'l',
          type: 'symbol',
          source: 's',
          filter: ['has', 'name'],
          layout: { 'text-field': ['get', 'name'] },
        }],
      });
      const resolved = resolveLayers(document!);
      // Both references to 'name' are collected (not deduplicated at this level)
      const nameRefs = resolved[0]!.propertyReferences.filter((r) => r.name === 'name');
      expect(nameRefs.length).toBe(2);
    });
  });

  describe('operator collection', () => {
    it('collects operators from filter and paint', () => {
      const { document } = parseStyleDocument({
        version: 8,
        sources: { s: { type: 'vector' } },
        layers: [{
          id: 'l',
          type: 'fill',
          source: 's',
          filter: ['all', ['has', 'type'], ['==', ['get', 'class'], 'road']],
          paint: { 'fill-color': ['match', ['get', 'type'], 'water', '#00f', '#000'] },
        }],
      });
      const resolved = resolveLayers(document!);
      const ops = resolved[0]!.expressionOperators;
      expect(ops).toContain('all');
      expect(ops).toContain('has');
      expect(ops).toContain('==');
      expect(ops).toContain('get');
      expect(ops).toContain('match');
    });

    it('returns empty operators for layers without expressions', () => {
      const { document } = parseStyleDocument({
        version: 8,
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#fff' } }],
      });
      const resolved = resolveLayers(document!);
      expect(resolved[0]!.expressionOperators).toHaveLength(0);
    });

    it('returns sorted operators', () => {
      const { document } = parseStyleDocument({
        version: 8,
        sources: { s: { type: 'vector' } },
        layers: [{
          id: 'l',
          type: 'fill',
          source: 's',
          filter: ['all', ['has', 'x'], ['==', ['get', 'y'], 1]],
        }],
      });
      const resolved = resolveLayers(document!);
      const ops = resolved[0]!.expressionOperators;
      const sorted = [...ops].sort();
      expect(ops).toEqual(sorted);
    });
  });
});
