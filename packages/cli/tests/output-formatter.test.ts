import { describe, expect, it } from 'vitest';
import {
  createOutputFormatter,
  formatDelta,
  formatDuration,
} from '../src/output/OutputFormatter.js';

describe('formatDelta', () => {
  it('returns +N for positive numbers', () => {
    expect(formatDelta(5)).toBe('+5');
    expect(formatDelta(100)).toBe('+100');
  });

  it('returns -N for negative numbers', () => {
    expect(formatDelta(-3)).toBe('-3');
    expect(formatDelta(-42)).toBe('-42');
  });

  it('returns "0" for zero', () => {
    expect(formatDelta(0)).toBe('0');
  });
});

describe('formatDuration', () => {
  it('returns Nms for durations under 1000ms', () => {
    expect(formatDuration(50)).toBe('50ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('rounds millisecond values', () => {
    expect(formatDuration(50.7)).toBe('51ms');
    expect(formatDuration(0.4)).toBe('0ms');
  });

  it('returns N.NNs for durations at or over 1000ms', () => {
    expect(formatDuration(1000)).toBe('1.00s');
    expect(formatDuration(2500)).toBe('2.50s');
    expect(formatDuration(12345)).toBe('12.35s');
  });
});

describe('createOutputFormatter — text', () => {
  const formatter = createOutputFormatter('text');

  it('summary produces title and formatted entries', () => {
    const result = formatter.summary('Stats', [
      ['Features', 42],
      ['Layers', 3],
    ]);
    expect(result).toContain('Stats');
    expect(result).toContain('Features');
    expect(result).toContain('42');
    expect(result).toContain('Layers');
    expect(result).toContain('3');
  });

  it('summary aligns entries by key length', () => {
    const result = formatter.summary('Test', [
      ['Short', 1],
      ['Much Longer Key', 2],
    ]);
    const lines = result
      .split('\n')
      .filter((l) => l.includes('Short') || l.includes('Much'));
    const shortLine = lines.find((l) => l.includes('Short'))!;
    const longLine = lines.find((l) => l.includes('Much'))!;
    expect(shortLine.indexOf('1')).toBeGreaterThanOrEqual(
      longLine.indexOf('2') - 1,
    );
  });

  it('table produces aligned columns with separator', () => {
    const result = formatter.table(
      ['Name', 'Count'],
      [
        ['roads', '50'],
        ['water', '120'],
      ],
    );
    expect(result).toContain('Name');
    expect(result).toContain('Count');
    expect(result).toContain('roads');
    expect(result).toContain('50');
    expect(result).toContain('water');
    expect(result).toContain('120');
    expect(result).toContain('─');
  });

  it('heading uses ═ underline', () => {
    const result = formatter.heading('Results');
    expect(result).toContain('Results');
    expect(result).toContain('═'.repeat('Results'.length));
  });

  it('separator produces a line of ─', () => {
    const result = formatter.separator();
    expect(result).toMatch(/─+/);
  });

  it('status includes label and value', () => {
    const result = formatter.status('Total', 99);
    expect(result).toContain('Total');
    expect(result).toContain('99');
  });

  it('envelope joins sections', () => {
    const result = formatter.envelope(['section1', 'section2']);
    expect(result).toContain('section1');
    expect(result).toContain('section2');
  });
});

describe('createOutputFormatter — json', () => {
  it('envelope produces valid JSON', () => {
    const formatter = createOutputFormatter('json');
    formatter.summary('Metrics', [['features', 42]]);
    const output = formatter.envelope([]);
    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('Metrics');
    expect(parsed.Metrics.features).toBe(42);
  });

  it('status accumulates into JSON output', () => {
    const formatter = createOutputFormatter('json');
    formatter.status('total', 100);
    formatter.status('errors', 2);
    const output = formatter.envelope([]);
    const parsed = JSON.parse(output);
    expect(parsed.total).toBe(100);
    expect(parsed.errors).toBe(2);
  });

  it('summary, heading, separator return empty strings', () => {
    const formatter = createOutputFormatter('json');
    expect(formatter.heading('test')).toBe('');
    expect(formatter.separator()).toBe('');
    expect(formatter.table(['a'], [['b']])).toBe('');
  });
});

describe('createOutputFormatter factory', () => {
  it('returns text formatter for "text" format', () => {
    const formatter = createOutputFormatter('text');
    expect(formatter.separator()).toContain('─');
  });

  it('returns json formatter for "json" format', () => {
    const formatter = createOutputFormatter('json');
    expect(formatter.separator()).toBe('');
  });

  it('returns text formatter for "markdown" format', () => {
    const formatter = createOutputFormatter('markdown');
    expect(formatter.separator()).toContain('─');
  });

  it('returns text formatter for "html" format', () => {
    const formatter = createOutputFormatter('html');
    expect(formatter.separator()).toContain('─');
  });
});
