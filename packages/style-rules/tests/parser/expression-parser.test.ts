/**
 * @tileguard/style-rules — Expression Parser Tests
 */

import { describe, expect, it } from 'vitest';
import {
  isExpressionArray,
  parseExpression,
} from '../../src/parser/ExpressionParser.js';

describe('ExpressionParser', () => {
  describe('isExpressionArray', () => {
    it('returns true for ["get", "name"]', () => {
      expect(isExpressionArray(['get', 'name'])).toBe(true);
    });

    it('returns true for single-operator ["zoom"]', () => {
      expect(isExpressionArray(['zoom'])).toBe(true);
    });

    it('returns false for empty array', () => {
      expect(isExpressionArray([])).toBe(false);
    });

    it('returns false for non-string first element', () => {
      expect(isExpressionArray([42, 'foo'])).toBe(false);
    });

    it('returns false for non-array', () => {
      expect(isExpressionArray('get')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isExpressionArray(null)).toBe(false);
    });
  });

  describe('parseExpression', () => {
    it('returns undefined for non-expression values', () => {
      expect(parseExpression('hello')).toBeUndefined();
      expect(parseExpression(42)).toBeUndefined();
      expect(parseExpression(null)).toBeUndefined();
      expect(parseExpression({})).toBeUndefined();
    });

    it('parses ["get", "name"]', () => {
      const expr = parseExpression(['get', 'name']);
      expect(expr).toBeDefined();
      expect(expr!.operator).toBe('get');
      expect(expr!.args).toHaveLength(1);
      expect(expr!.args[0]!.operator).toBe('literal_value');
    });

    it('parses ["has", "highway"]', () => {
      const expr = parseExpression(['has', 'highway']);
      expect(expr!.operator).toBe('has');
      expect(expr!.args).toHaveLength(1);
    });

    it('parses ["==", ["get", "type"], "road"]', () => {
      const expr = parseExpression(['==', ['get', 'type'], 'road']);
      expect(expr!.operator).toBe('==');
      expect(expr!.args).toHaveLength(2);
      expect(expr!.args[0]!.operator).toBe('get');
      expect(expr!.args[1]!.operator).toBe('literal_value');
    });

    it('parses ["all", ...conditions]', () => {
      const expr = parseExpression([
        'all',
        ['has', 'name'],
        ['==', ['get', 'class'], 'primary'],
      ]);
      expect(expr!.operator).toBe('all');
      expect(expr!.args).toHaveLength(2);
      expect(expr!.args[0]!.operator).toBe('has');
      expect(expr!.args[1]!.operator).toBe('==');
    });

    it('parses ["match", ["get", "type"], "road", "#ff0", "#000"]', () => {
      const expr = parseExpression([
        'match',
        ['get', 'type'],
        'road',
        '#ff0',
        '#000',
      ]);
      expect(expr!.operator).toBe('match');
      expect(expr!.args).toHaveLength(4);
    });

    it('parses ["interpolate", ["linear"], ["zoom"], 10, 1, 20, 5]', () => {
      const expr = parseExpression([
        'interpolate',
        ['linear'],
        ['zoom'],
        10,
        1,
        20,
        5,
      ]);
      expect(expr!.operator).toBe('interpolate');
      expect(expr!.args[0]!.operator).toBe('unknown'); // "linear" is not a known operator but it's an array starting with a string
    });

    it('parses ["step", ["zoom"], 1, 10, 2, 15, 4]', () => {
      const expr = parseExpression(['step', ['zoom'], 1, 10, 2, 15, 4]);
      expect(expr!.operator).toBe('step');
    });

    it('parses ["case", condition, result, fallback]', () => {
      const expr = parseExpression(['case', ['has', 'name'], true, false]);
      expect(expr!.operator).toBe('case');
      expect(expr!.args).toHaveLength(3);
    });

    it('parses ["coalesce", ["get", "name_en"], ["get", "name"]]', () => {
      const expr = parseExpression([
        'coalesce',
        ['get', 'name_en'],
        ['get', 'name'],
      ]);
      expect(expr!.operator).toBe('coalesce');
      expect(expr!.args).toHaveLength(2);
    });

    it('parses ["concat", "Hello ", ["get", "name"]]', () => {
      const expr = parseExpression(['concat', 'Hello ', ['get', 'name']]);
      expect(expr!.operator).toBe('concat');
      expect(expr!.args).toHaveLength(2);
    });

    it('parses ["literal", [1, 2, 3]]', () => {
      const expr = parseExpression(['literal', [1, 2, 3]]);
      expect(expr!.operator).toBe('literal');
      // [1, 2, 3] starts with a number so it's a literal_value, not an expression
      expect(expr!.args[0]!.operator).toBe('literal_value');
    });

    it('parses ["zoom"]', () => {
      const expr = parseExpression(['zoom']);
      expect(expr!.operator).toBe('zoom');
      expect(expr!.args).toHaveLength(0);
    });

    it('parses ["geometry-type"]', () => {
      const expr = parseExpression(['geometry-type']);
      expect(expr!.operator).toBe('geometry-type');
    });

    it('parses ["id"]', () => {
      const expr = parseExpression(['id']);
      expect(expr!.operator).toBe('id');
    });

    it('parses math operators', () => {
      const expr = parseExpression(['+', 1, 2]);
      expect(expr!.operator).toBe('+');
      expect(expr!.args).toHaveLength(2);
    });

    it('parses ["to-number", ["get", "pop"]]', () => {
      const expr = parseExpression(['to-number', ['get', 'pop']]);
      expect(expr!.operator).toBe('to-number');
    });

    it('marks unknown operators', () => {
      const expr = parseExpression(['nonexistent-op', 'arg1']);
      expect(expr!.operator).toBe('unknown');
    });

    it('preserves raw reference', () => {
      const raw = ['get', 'name'];
      const expr = parseExpression(raw);
      expect(expr!.raw).toBe(raw);
    });

    it('deeply nests sub-expressions', () => {
      const expr = parseExpression([
        'all',
        ['==', ['get', 'type'], 'road'],
        ['>', ['get', 'importance'], 3],
      ]);
      expect(expr!.operator).toBe('all');
      const first = expr!.args[0]!;
      expect(first.operator).toBe('==');
    });
  });
});
