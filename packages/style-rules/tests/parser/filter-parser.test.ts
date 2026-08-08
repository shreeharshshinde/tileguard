/**
 * @tileguard/style-rules — Filter Parser Tests
 */

import { describe, expect, it } from 'vitest';
import { parseFilter } from '../../src/parser/FilterParser.js';

describe('FilterParser', () => {
  describe('expression-based filters', () => {
    it('parses ["==", ["get", "type"], "road"]', () => {
      const expr = parseFilter(['==', ['get', 'type'], 'road']);
      expect(expr).toBeDefined();
      expect(expr!.operator).toBe('==');
    });

    it('parses ["all", ["has", "name"], ["!=", ["get", "class"], "minor"]]', () => {
      const expr = parseFilter([
        'all',
        ['has', 'name'],
        ['!=', ['get', 'class'], 'minor'],
      ]);
      expect(expr!.operator).toBe('all');
      expect(expr!.args).toHaveLength(2);
    });

    it('parses ["any", condition1, condition2]', () => {
      const expr = parseFilter([
        'any',
        ['==', ['get', 'type'], 'a'],
        ['==', ['get', 'type'], 'b'],
      ]);
      expect(expr!.operator).toBe('any');
    });

    it('parses ["!", ["has", "name"]]', () => {
      const expr = parseFilter(['!', ['has', 'name']]);
      expect(expr!.operator).toBe('!');
    });
  });

  describe('legacy filters', () => {
    it('converts legacy comparison ["==", "type", "road"]', () => {
      const expr = parseFilter(['==', 'type', 'road']);
      expect(expr).toBeDefined();
      expect(expr!.operator).toBe('==');
      // First arg should be a get expression
      expect(expr!.args[0]!.operator).toBe('get');
    });

    it('converts legacy ["!=", "class", "minor"]', () => {
      const expr = parseFilter(['!=', 'class', 'minor']);
      expect(expr!.operator).toBe('!=');
    });

    it('converts legacy ["<", "zoom_level", 10]', () => {
      const expr = parseFilter(['<', 'zoom_level', 10]);
      expect(expr!.operator).toBe('<');
    });

    it('converts legacy [">=", "population", 1000000]', () => {
      const expr = parseFilter(['>=', 'population', 1000000]);
      expect(expr!.operator).toBe('>=');
    });

    it('converts legacy $type to geometry-type', () => {
      const expr = parseFilter(['==', '$type', 'LineString']);
      expect(expr!.operator).toBe('==');
      expect(expr!.args[0]!.operator).toBe('geometry-type');
    });

    it('converts legacy $id to id', () => {
      const expr = parseFilter(['==', '$id', 123]);
      expect(expr!.args[0]!.operator).toBe('id');
    });

    it('converts legacy ["has", "name"]', () => {
      const expr = parseFilter(['has', 'name']);
      expect(expr!.operator).toBe('has');
    });

    it('converts legacy ["!has", "name"]', () => {
      const expr = parseFilter(['!has', 'name']);
      expect(expr!.operator).toBe('!');
      expect(expr!.args[0]!.operator).toBe('has');
    });

    it('converts legacy ["in", "type", "road", "path"]', () => {
      const expr = parseFilter(['in', 'type', 'road', 'path']);
      expect(expr!.operator).toBe('match');
    });

    it('converts legacy ["!in", "class", "minor"]', () => {
      const expr = parseFilter(['!in', 'class', 'minor']);
      expect(expr!.operator).toBe('!');
      expect(expr!.args[0]!.operator).toBe('match');
    });

    it('converts legacy ["none", ...filters]', () => {
      const expr = parseFilter(['none', ['==', 'type', 'road']]);
      expect(expr!.operator).toBe('!');
      expect(expr!.args[0]!.operator).toBe('any');
    });

    it('converts legacy ["all", ["==", "type", "road"], ["has", "name"]]', () => {
      const expr = parseFilter([
        'all',
        ['==', 'type', 'road'],
        ['has', 'name'],
      ]);
      expect(expr!.operator).toBe('all');
      expect(expr!.args).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('returns undefined for empty array', () => {
      expect(parseFilter([])).toBeUndefined();
    });

    it('returns undefined for non-array', () => {
      expect(parseFilter('not a filter')).toBeUndefined();
      expect(parseFilter(42)).toBeUndefined();
      expect(parseFilter(null)).toBeUndefined();
    });

    it('returns undefined for array with non-string operator', () => {
      expect(parseFilter([42, 'foo'])).toBeUndefined();
    });
  });
});
