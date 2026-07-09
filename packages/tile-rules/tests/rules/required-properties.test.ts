import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { requiredPropertiesRule, tileProvider } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = { id: 'test', providers: [tileProvider], rules: [requiredPropertiesRule] };

describe('tile/required-properties', () => {
  it('pass — all features have required properties', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/required-properties': ['error', { layers: { roads: ['class', 'name'] } }] },
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
            props: { class: 'primary', name: 'Main St' },
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — feature missing required property produces diagnostic per missing property', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/required-properties': ['error', { layers: { roads: ['class', 'name'] } }] },
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
            props: { class: 'primary' },
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('tile/required-properties');
    expect(result.diagnostics[0]?.data?.property).toBe('name');
    expect(result.diagnostics[0]?.location?.layer).toBe('roads');
    expect(result.diagnostics[0]?.location?.featureIndex).toBe(0);
  });

  it('edge — layer not in tile is silently skipped', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/required-properties': ['error', { layers: { buildings: ['height'] } }] },
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
    expect(result.diagnostics).toHaveLength(0);
  });

  it('edge — legacy flat object config shape works', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/required-properties': ['error', { roads: ['class'] }] },
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
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.data?.property).toBe('class');
  });
});
