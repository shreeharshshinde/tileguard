import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '@tileguard/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { tilePlugin } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../..');

describe('Tile Fixtures Integration Tests', () => {
  const engine = createEngine({ plugins: [tilePlugin] });

  // Helper to ensure path exists and write
  const ensureAndWrite = async (path: string, data: Uint8Array) => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  };

  beforeAll(async () => {
    // Generate fixtures if they don't exist
    const goodTilePath = join(repoRoot, 'fixtures/good/valid-tile.pbf');
    if (!existsSync(goodTilePath)) {
      const goodTile = tileBuffer([
        layer('roads', [
          feature(
            2,
            [
              [
                { x: 0, y: 0 },
                { x: 10, y: 10 },
              ],
            ],
            { class: 'primary', name: 'Main' },
          ),
        ]),
      ]);
      await ensureAndWrite(goodTilePath, goodTile);
    }

    const coordsTilePath = join(repoRoot, 'fixtures/bad/invalid-tile-coords.pbf');
    if (!existsSync(coordsTilePath)) {
      const coordsTile = tileBuffer([
        layer('roads', [
          feature(
            2,
            [
              [
                { x: -5, y: 0 },
                { x: 5000, y: 10 },
              ],
            ],
            {},
          ),
        ]),
      ]);
      await ensureAndWrite(coordsTilePath, coordsTile);
    }

    const intersectTilePath = join(repoRoot, 'fixtures/bad/invalid-tile-self-intersection.pbf');
    if (!existsSync(intersectTilePath)) {
      const intersectTile = tileBuffer([
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
            {},
          ),
        ]),
      ]);
      await ensureAndWrite(intersectTilePath, intersectTile);
    }

    const degenerateTilePath = join(repoRoot, 'fixtures/bad/invalid-tile-degenerate.pbf');
    if (!existsSync(degenerateTilePath)) {
      const degenerateTile = tileBuffer([
        layer('roads', [
          feature(
            2,
            [
              [
                { x: 10, y: 10 },
                { x: 10, y: 10 },
              ],
            ],
            {},
          ),
        ]),
      ]);
      await ensureAndWrite(degenerateTilePath, degenerateTile);
    }
  });

  it('passes on valid-tile.pbf', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/good/valid-tile.pbf')]);
    expect(result.summary.pass).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('flags coordinate range errors on invalid-tile-coords.pbf', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/bad/invalid-tile-coords.pbf')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('tile/coordinate-range');
  });

  it('flags self-intersection errors on invalid-tile-self-intersection.pbf', async () => {
    const result = await engine.run([
      join(repoRoot, 'fixtures/bad/invalid-tile-self-intersection.pbf'),
    ]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('tile/self-intersection');
  });

  it('flags degenerate geometry errors on invalid-tile-degenerate.pbf', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/bad/invalid-tile-degenerate.pbf')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('tile/degenerate-geometry');
  });
});

// Ported protobuf helpers from tile-rules.test.ts for standalone fixture generation
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

interface Point {
  readonly x: number;
  readonly y: number;
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
