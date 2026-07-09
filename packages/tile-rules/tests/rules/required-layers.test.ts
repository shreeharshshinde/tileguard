import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { requiredLayersRule, tileProvider } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = { id: 'test', providers: [tileProvider], rules: [requiredLayersRule] };

describe('tile/required-layers', () => {
  it('pass — all required layers present produces no diagnostic', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/required-layers': ['error', { layers: ['roads', 'water'] }] },
    });
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
      {
        name: 'water',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 0 },
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

  it('fail — missing layer produces one diagnostic per missing layer', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/required-layers': ['error', { layers: ['buildings', 'water'] }] },
    });
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
    expect(result.diagnostics).toHaveLength(2);
    const ids = result.diagnostics.map((d) => d.data?.requiredLayer);
    expect(ids).toContain('buildings');
    expect(ids).toContain('water');
    expect(result.diagnostics[0]?.severity).toBe('error');
    expect(result.diagnostics[0]?.location?.layer).toBeTruthy();
  });

  it('edge — no layers configured produces no diagnostic', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/required-layers': ['error', { layers: [] }] },
    });
    // Must produce a non-zero-byte tile — empty layer list is valid, just unchecked
    const source = await makeTile([{ name: 'roads', features: [] }]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('edge — extra layers beyond required list are silently ignored', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/required-layers': ['error', { layers: ['roads'] }] },
    });
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
      { name: 'landuse', features: [] },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });
});
