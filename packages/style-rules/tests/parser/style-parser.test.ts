/**
 * @tileguard/style-rules — Style Parser Tests
 *
 * Tests for parseStyleDocument() covering all style objects,
 * source types, layer types, and edge cases.
 */

import { describe, expect, it } from 'vitest';
import { parseStyleDocument } from '../../src/parser/StyleParser.js';

describe('StyleParser', () => {
  describe('basic parsing', () => {
    it('parses a minimal valid style from a string', () => {
      const input = JSON.stringify({ version: 8, sources: {}, layers: [] });
      const { document, error } = parseStyleDocument(input);
      expect(error).toBeUndefined();
      expect(document).toBeDefined();
      expect(document!.version).toBe(8);
      expect(document!.sources.size).toBe(0);
      expect(document!.layers).toHaveLength(0);
    });

    it('parses a pre-parsed object', () => {
      const input = { version: 8, sources: {}, layers: [] };
      const { document, error } = parseStyleDocument(input);
      expect(error).toBeUndefined();
      expect(document).toBeDefined();
      expect(document!.version).toBe(8);
    });

    it('returns an error for invalid JSON string', () => {
      const { document, error } = parseStyleDocument('{ not valid json');
      expect(document).toBeUndefined();
      expect(error).toMatch(/Invalid JSON/);
    });

    it('returns an error for non-object input', () => {
      const { document, error } = parseStyleDocument([1, 2, 3]);
      expect(document).toBeUndefined();
      expect(error).toBe('Style document must be a JSON object.');
    });

    it('returns an error for null input', () => {
      const { document, error } = parseStyleDocument(null);
      expect(document).toBeUndefined();
      expect(error).toBe('Style document must be a JSON object.');
    });

    it('returns an error for number input', () => {
      const { document, error } = parseStyleDocument(42);
      expect(document).toBeUndefined();
      expect(error).toBe('Style document must be a JSON object.');
    });
  });

  describe('top-level fields', () => {
    it('parses version', () => {
      const { document } = parseStyleDocument({ version: 8 });
      expect(document!.version).toBe(8);
    });

    it('version is undefined when not a number', () => {
      const { document } = parseStyleDocument({ version: '8' });
      expect(document!.version).toBeUndefined();
    });

    it('parses name', () => {
      const { document } = parseStyleDocument({ name: 'My Style' });
      expect(document!.name).toBe('My Style');
    });

    it('parses sprite as string', () => {
      const { document } = parseStyleDocument({
        sprite: 'https://example.com/sprite',
      });
      expect(document!.sprite).toBe('https://example.com/sprite');
    });

    it('parses sprite as array of descriptors', () => {
      const { document } = parseStyleDocument({
        sprite: [{ id: 'default', url: 'https://example.com/sprite' }],
      });
      expect(Array.isArray(document!.sprite)).toBe(true);
    });

    it('parses glyphs', () => {
      const { document } = parseStyleDocument({
        glyphs: 'https://example.com/{fontstack}/{range}.pbf',
      });
      expect(document!.glyphs).toBe(
        'https://example.com/{fontstack}/{range}.pbf',
      );
    });

    it('parses metadata', () => {
      const { document } = parseStyleDocument({ metadata: { 'foo:bar': 42 } });
      expect(document!.metadata).toEqual({ 'foo:bar': 42 });
    });

    it('parses center', () => {
      const { document } = parseStyleDocument({ center: [10.5, 20.3] });
      expect(document!.center).toEqual([10.5, 20.3]);
    });

    it('parses zoom', () => {
      const { document } = parseStyleDocument({ zoom: 12 });
      expect(document!.zoom).toBe(12);
    });

    it('parses bearing', () => {
      const { document } = parseStyleDocument({ bearing: 45 });
      expect(document!.bearing).toBe(45);
    });

    it('parses pitch', () => {
      const { document } = parseStyleDocument({ pitch: 60 });
      expect(document!.pitch).toBe(60);
    });

    it('parses projection', () => {
      const { document } = parseStyleDocument({
        projection: { type: 'globe' },
      });
      expect(document!.projection).toEqual({ type: 'globe' });
    });

    it('parses terrain', () => {
      const { document } = parseStyleDocument({
        terrain: { source: 'dem', exaggeration: 1.5 },
      });
      expect(document!.terrain).toEqual({ source: 'dem', exaggeration: 1.5 });
    });

    it('parses fog', () => {
      const { document } = parseStyleDocument({
        fog: { color: '#fff', range: [0, 10] },
      });
      expect(document!.fog!.color).toBe('#fff');
      expect(document!.fog!.range).toEqual([0, 10]);
    });

    it('parses light', () => {
      const { document } = parseStyleDocument({
        light: { anchor: 'map', intensity: 0.5 },
      });
      expect(document!.light!.anchor).toBe('map');
      expect(document!.light!.intensity).toBe(0.5);
    });

    it('parses transition', () => {
      const { document } = parseStyleDocument({
        transition: { duration: 300, delay: 0 },
      });
      expect(document!.transition).toEqual({ duration: 300, delay: 0 });
    });

    it('parses imports', () => {
      const { document } = parseStyleDocument({
        imports: [{ id: 'basemap', url: 'https://example.com/basemap.json' }],
      });
      expect(document!.imports).toHaveLength(1);
      expect(document!.imports![0]!.id).toBe('basemap');
    });

    it('preserves raw JSON', () => {
      const { document } = parseStyleDocument({ version: 8, custom: 'field' });
      expect(document!.raw['custom']).toBe('field');
    });
  });

  describe('source parsing', () => {
    it('parses a vector source', () => {
      const { document } = parseStyleDocument({
        sources: {
          tiles: { type: 'vector', url: 'https://example.com/tiles.json' },
        },
      });
      const source = document!.sources.get('tiles');
      expect(source).toBeDefined();
      expect(source!.type).toBe('vector');
      expect(source!.id).toBe('tiles');
      if (source!.type === 'vector') {
        expect(source!.url).toBe('https://example.com/tiles.json');
      }
    });

    it('parses a geojson source', () => {
      const { document } = parseStyleDocument({
        sources: {
          points: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            cluster: true,
          },
        },
      });
      const source = document!.sources.get('points');
      expect(source!.type).toBe('geojson');
      if (source!.type === 'geojson') {
        expect(source!.cluster).toBe(true);
      }
    });

    it('parses a raster source', () => {
      const { document } = parseStyleDocument({
        sources: { satellite: { type: 'raster', tileSize: 256 } },
      });
      const source = document!.sources.get('satellite');
      expect(source!.type).toBe('raster');
      if (source!.type === 'raster') {
        expect(source!.tileSize).toBe(256);
      }
    });

    it('parses a raster-dem source', () => {
      const { document } = parseStyleDocument({
        sources: { dem: { type: 'raster-dem', encoding: 'terrarium' } },
      });
      const source = document!.sources.get('dem');
      expect(source!.type).toBe('raster-dem');
      if (source!.type === 'raster-dem') {
        expect(source!.encoding).toBe('terrarium');
      }
    });

    it('parses an image source', () => {
      const { document } = parseStyleDocument({
        sources: {
          img: {
            type: 'image',
            url: 'https://example.com/img.png',
            coordinates: [
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          },
        },
      });
      const source = document!.sources.get('img');
      expect(source!.type).toBe('image');
    });

    it('parses a video source', () => {
      const { document } = parseStyleDocument({
        sources: {
          vid: { type: 'video', urls: ['https://example.com/v.mp4'] },
        },
      });
      const source = document!.sources.get('vid');
      expect(source!.type).toBe('video');
    });

    it('parses source minzoom and maxzoom', () => {
      const { document } = parseStyleDocument({
        sources: { tiles: { type: 'vector', minzoom: 0, maxzoom: 14 } },
      });
      const source = document!.sources.get('tiles');
      expect(source!.minzoom).toBe(0);
      expect(source!.maxzoom).toBe(14);
    });

    it('skips sources without a type', () => {
      const { document } = parseStyleDocument({
        sources: { broken: { url: 'something' } },
      });
      expect(document!.sources.size).toBe(0);
    });

    it('handles empty sources object', () => {
      const { document } = parseStyleDocument({ sources: {} });
      expect(document!.sources.size).toBe(0);
    });

    it('handles non-object sources field', () => {
      const { document } = parseStyleDocument({ sources: 'not an object' });
      expect(document!.sources.size).toBe(0);
    });
  });

  describe('layer parsing', () => {
    it('parses a background layer', () => {
      const { document } = parseStyleDocument({
        layers: [
          {
            id: 'bg',
            type: 'background',
            paint: { 'background-color': '#fff' },
          },
        ],
      });
      const layer = document!.layers[0]!;
      expect(layer.id).toBe('bg');
      expect(layer.type).toBe('background');
      expect(layer.source).toBeUndefined();
      expect(layer.paint.get('background-color')!.raw).toBe('#fff');
    });

    it('parses a fill layer with source', () => {
      const { document } = parseStyleDocument({
        layers: [
          {
            id: 'water',
            type: 'fill',
            source: 'openmaptiles',
            'source-layer': 'water',
          },
        ],
      });
      const layer = document!.layers[0]!;
      expect(layer.source).toBe('openmaptiles');
      expect(layer.sourceLayer).toBe('water');
    });

    it('parses a layer with minzoom and maxzoom', () => {
      const { document } = parseStyleDocument({
        layers: [{ id: 'roads', type: 'line', minzoom: 5, maxzoom: 18 }],
      });
      const layer = document!.layers[0]!;
      expect(layer.minzoom).toBe(5);
      expect(layer.maxzoom).toBe(18);
    });

    it('parses layout properties', () => {
      const { document } = parseStyleDocument({
        layers: [
          {
            id: 'labels',
            type: 'symbol',
            layout: { 'text-field': '{name}', 'text-size': 14 },
          },
        ],
      });
      const layer = document!.layers[0]!;
      expect(layer.layout.get('text-field')!.raw).toBe('{name}');
      expect(layer.layout.get('text-size')!.raw).toBe(14);
    });

    it('parses paint properties with expressions', () => {
      const { document } = parseStyleDocument({
        layers: [
          {
            id: 'roads',
            type: 'line',
            paint: {
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 20, 5],
            },
          },
        ],
      });
      const layer = document!.layers[0]!;
      const lineWidth = layer.paint.get('line-width')!;
      expect(lineWidth.expression).toBeDefined();
      expect(lineWidth.expression!.operator).toBe('interpolate');
    });

    it('parses layer filter', () => {
      const { document } = parseStyleDocument({
        layers: [
          {
            id: 'roads',
            type: 'line',
            filter: ['==', ['get', 'class'], 'motorway'],
          },
        ],
      });
      const layer = document!.layers[0]!;
      expect(layer.filter).toBeDefined();
      expect(layer.filter!.expression).toBeDefined();
      expect(layer.filter!.expression!.operator).toBe('==');
    });

    it('parses layer metadata', () => {
      const { document } = parseStyleDocument({
        layers: [{ id: 'bg', type: 'background', metadata: { custom: true } }],
      });
      expect(document!.layers[0]!.metadata).toEqual({ custom: true });
    });

    it('assigns correct indices', () => {
      const { document } = parseStyleDocument({
        layers: [
          { id: 'a', type: 'background' },
          { id: 'b', type: 'fill' },
          { id: 'c', type: 'line' },
        ],
      });
      expect(document!.layers[0]!.index).toBe(0);
      expect(document!.layers[1]!.index).toBe(1);
      expect(document!.layers[2]!.index).toBe(2);
    });

    it('handles layer without id', () => {
      const { document } = parseStyleDocument({
        layers: [{ type: 'background' }],
      });
      expect(document!.layers[0]!.id).toBe('<unnamed-0>');
    });

    it('handles non-array layers field', () => {
      const { document } = parseStyleDocument({ layers: 'not an array' });
      expect(document!.layers).toHaveLength(0);
    });

    it('skips non-object layer entries', () => {
      const { document } = parseStyleDocument({ layers: ['not', 42, null] });
      expect(document!.layers).toHaveLength(0);
    });
  });
});
