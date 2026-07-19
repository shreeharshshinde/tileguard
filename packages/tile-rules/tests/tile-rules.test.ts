import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import type { Point } from '../src/index.js';
import { decodeMvt, tilePlugin } from '../src/index.js';

describe('@tileguard/tile-rules', () => {
  it('decodes MVT layer, feature, geometry, and properties', () => {
    const tile = decodeMvt(
      tileBuffer([
        layer('roads', [
          feature(
            2,
            [
              [
                { x: 0, y: 0 },
                { x: 10, y: 10 },
              ],
            ],
            {
              class: 'primary',
              name: 'Main',
            },
          ),
        ]),
      ]),
    );

    expect(Object.keys(tile.layers)).toEqual(['roads']);
    expect(tile.layers.roads?.features).toHaveLength(1);
    expect(tile.layers.roads?.features[0]?.properties).toEqual({
      class: 'primary',
      name: 'Main',
    });
  });

  it('passes a valid raw vector tile through the engine', async () => {
    const path = await writeTile([
      layer('roads', [
        feature(
          2,
          [
            [
              { x: 0, y: 0 },
              { x: 10, y: 10 },
            ],
          ],
          {
            class: 'primary',
            name: 'Main',
          },
        ),
      ]),
      layer('water', [
        feature(
          3,
          [
            [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
              { x: 10, y: 10 },
              { x: 0, y: 0 },
            ],
          ],
          {
            kind: 'lake',
          },
        ),
      ]),
    ]);
    const engine = createEngine({
      plugins: [tilePlugin],
      rules: {
        'tile/required-layers': ['error', { layers: ['roads', 'water'] }],
        'tile/required-properties': ['error', { layers: { roads: ['class', 'name'] } }],
        'tile/feature-count': ['error', { min: 2 }],
      },
    });

    const result = await engine.run([path]);

    expect(result.summary.pass).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.summary.artifactCount).toBe(1);
  });

  it('reports required layers, feature count, layer feature count, and required properties independently', async () => {
    const path = await writeTile([
      layer('roads', [
        feature(
          2,
          [
            [
              { x: 0, y: 0 },
              { x: 10, y: 10 },
            ],
          ],
          { class: 'primary' },
        ),
      ]),
    ]);
    const engine = createEngine({
      plugins: [tilePlugin],
      rules: {
        'tile/required-layers': ['error', { layers: ['buildings'] }],
        'tile/feature-count': ['error', { min: 2 }],
        'tile/layer-feature-count': ['error', { layers: { roads: { min: 2 } } }],
        'tile/required-properties': ['error', { layers: { roads: ['name'] } }],
      },
    });

    const result = await engine.run([path]);

    expect(new Set(result.diagnostics.map((diagnostic) => diagnostic.ruleId))).toEqual(
      new Set([
        'tile/required-layers',
        'tile/feature-count',
        'tile/layer-feature-count',
        'tile/required-properties',
      ]),
    );
    expect(result.summary.errors).toBe(4);
  });

  it('detects gzip-compressed tiles and granular geometry issues', async () => {
    const path = await writeTile(
      [
        layer('buildings', [
          feature(
            3,
            [
              [
                { x: 0, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
                { x: 10, y: 0 },
                { x: 0, y: 0 },
              ],
            ],
            { height: '12' },
          ),
        ]),
      ],
      { gzip: true },
    );
    const engine = createEngine({ plugins: [tilePlugin] });

    const result = await engine.run([path]);

    expect(result.diagnostics.map((diagnostic) => diagnostic.ruleId)).toContain(
      'tile/self-intersection',
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.ruleId)).toContain(
      'tile/zero-area-ring',
    );
  });

  it('reports coordinate range and degenerate geometry as separate rule IDs', async () => {
    const path = await writeTile([
      layer('roads', [
        feature(
          2,
          [
            [
              { x: -200, y: 0 },
              { x: -200, y: 0 },
            ],
          ],
          {},
        ),
      ]),
    ]);
    const engine = createEngine({ plugins: [tilePlugin] });

    const result = await engine.run([path]);

    expect(result.diagnostics.map((diagnostic) => diagnostic.ruleId)).toContain(
      'tile/coordinate-range',
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.ruleId)).toContain(
      'tile/degenerate-geometry',
    );
  });

  it('reports load-failed for invalid protobuf data', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tileguard-'));
    const path = join(dir, 'bad.pbf');
    await writeFile(path, Buffer.from([0xff, 0xff]));
    const engine = createEngine({ plugins: [tilePlugin] });

    const result = await engine.run([path]);

    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics[0]?.ruleId).toBe('artifact/load-failed');
  });
});

async function writeTile(
  layers: readonly Uint8Array[],
  options: { readonly gzip?: boolean } = {},
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'tileguard-'));
  const path = join(dir, 'tile.pbf');
  const tile = tileBuffer(layers);
  await writeFile(path, options.gzip === true ? gzipSync(tile) : tile);
  return path;
}

function tileBuffer(layers: readonly Uint8Array[]): Uint8Array {
  return message(layers.map((encodedLayer) => field(3, 2, encodedLayer)));
}

function layer(name: string, features: readonly EncodedFeature[]): Uint8Array {
  const keys = [...new Set(features.flatMap((item) => Object.keys(item.properties)))];
  const values = [...new Set(features.flatMap((item) => Object.values(item.properties)))];
  return message([
    field(15, 0, 2),
    field(1, 2, Buffer.from(name)),
    ...features.map((item) => field(2, 2, encodeFeature(item, keys, values))),
    ...keys.map((key) => field(3, 2, Buffer.from(key))),
    ...values.map((value) => field(4, 2, message([field(1, 2, Buffer.from(String(value)))]))),
    field(5, 0, 4096),
  ]);
}

interface EncodedFeature {
  readonly type: number;
  readonly geometry: readonly (readonly Point[])[];
  readonly properties: Readonly<Record<string, string>>;
}

function feature(
  type: number,
  geometry: readonly (readonly Point[])[],
  properties: Readonly<Record<string, string>>,
): EncodedFeature {
  return { type, geometry, properties };
}

function encodeFeature(
  item: EncodedFeature,
  keys: readonly string[],
  values: readonly string[],
): Uint8Array {
  const tags: number[] = [];
  for (const [key, value] of Object.entries(item.properties)) {
    tags.push(keys.indexOf(key), values.indexOf(value));
  }
  return message([
    field(2, 2, packed(tags)),
    field(3, 0, item.type),
    field(4, 2, packed(encodeGeometry(item.geometry))),
  ]);
}

function encodeGeometry(parts: readonly (readonly Point[])[]): number[] {
  let x = 0;
  let y = 0;
  const commands: number[] = [];

  for (const points of parts) {
    const first = points[0];
    if (first === undefined) continue;

    commands.push((1 << 3) | 1);
    commands.push(zigZag(first.x - x), zigZag(first.y - y));
    x = first.x;
    y = first.y;

    const body = points.slice(1);
    const last = body[body.length - 1];
    const closes = last !== undefined && last.x === first.x && last.y === first.y;
    const linePoints = closes ? body.slice(0, -1) : body;

    if (linePoints.length > 0) {
      commands.push((linePoints.length << 3) | 2);
      for (const point of linePoints) {
        commands.push(zigZag(point.x - x), zigZag(point.y - y));
        x = point.x;
        y = point.y;
      }
    }

    if (closes) commands.push((1 << 3) | 7);
  }

  return commands;
}

function message(fields: readonly Uint8Array[]): Uint8Array {
  return Buffer.concat(fields);
}

function field(number: number, wire: number, value: number | Uint8Array): Uint8Array {
  const tag = varint((number << 3) | wire);
  if (wire === 0 && typeof value === 'number') {
    return Buffer.concat([tag, varint(value)]);
  }
  if (typeof value === 'number') {
    throw new Error('Length-delimited protobuf field value must be bytes.');
  }
  return Buffer.concat([tag, varint(value.length), value]);
}

function packed(values: readonly number[]): Uint8Array {
  return Buffer.concat(values.map(varint));
}

function varint(value: number): Uint8Array {
  const bytes: number[] = [];
  let current = value >>> 0;
  while (current > 0x7f) {
    bytes.push((current & 0x7f) | 0x80);
    current >>>= 7;
  }
  bytes.push(current);
  return Buffer.from(bytes);
}

function zigZag(value: number): number {
  return (value << 1) ^ (value >> 31);
}
