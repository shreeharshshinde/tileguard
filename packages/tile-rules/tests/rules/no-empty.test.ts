import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { noEmptyRule, tileProvider } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = { id: 'test', providers: [tileProvider], rules: [noEmptyRule] };

describe('tile/no-empty', () => {
  it('pass — tile with at least one feature produces no diagnostic', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 10 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.summary.pass).toBe(true);
  });

  it('fail — tile with layers but zero features reports tile/no-empty as a warning', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // A layer with no features produces a valid but empty tile (non-zero bytes)
    const source = await makeTile([{ name: 'roads', features: [] }]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('tile/no-empty');
    expect(result.diagnostics[0]?.severity).toBe('warning');
    expect(result.diagnostics[0]?.message).toBe('Tile contains 0 features.');
  });

  it('edge — allowEmpty option suppresses the diagnostic', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/no-empty': ['warning', { allowEmpty: true }] },
    });
    const source = await makeTile([{ name: 'roads', features: [] }]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('edge — tile with multiple empty layers still counts as 0 features', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      { name: 'roads', features: [] },
      { name: 'water', features: [] },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('tile/no-empty');
    expect(result.diagnostics[0]?.data?.layers).toEqual(['roads', 'water']);
  });
});
