import { gzipSync } from 'node:zlib';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTile } from '../src/validate.js';

test('validates a decodable tile with required layers and properties', async () => {
  const path = await writeTile([
    layer('roads', [
      feature(2, [[{ x: 0, y: 0 }, { x: 10, y: 10 }]], { class: 'primary', name: 'Main' }),
      feature(2, [[{ x: 20, y: 20 }, { x: 30, y: 20 }]], { class: 'secondary', name: 'Side' })
    ]),
    layer('water', [
      feature(3, [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 0 }]], { kind: 'lake' })
    ])
  ]);

  const result = await validateTile(path, {
    requiredLayers: ['roads', 'water'],
    minFeatures: 3,
    requiredProperties: { roads: ['class', 'name'] }
  });

  assert.equal(result.pass, true);
  assert.equal(result.totalFeatures, 3);
  assert.equal(result.layers.roads.featureCount, 2);
});

test('reports missing layers, feature thresholds, and required properties', async () => {
  const path = await writeTile([
    layer('roads', [feature(2, [[{ x: 0, y: 0 }, { x: 10, y: 10 }]], { class: 'primary' })])
  ]);

  const result = await validateTile(path, {
    requiredLayers: ['buildings'],
    minFeatures: 2,
    requiredProperties: { roads: ['name'] }
  });

  assert.equal(result.pass, false);
  assert.deepEqual(result.errors.map((error) => error.code), ['MISSING_LAYER', 'MISSING_PROPERTY', 'LOW_TOTAL_FEATURES']);
});

test('detects geometry errors and decodes gzip-compressed tiles', async () => {
  const path = await writeTile([
    layer('buildings', [
      feature(3, [[{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 0 }]], { height: '12' })
    ])
  ], { gzip: true });

  const result = await validateTile(path);

  assert.equal(result.pass, false);
  assert.equal(result.errors[0].code, 'GEOMETRY_INVALID');
  assert.ok(result.errors[0].details.some((detail) => detail.code === 'SELF_INTERSECTION'));
});

test('returns decode errors for invalid protobuf data', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tileguard-'));
  const path = join(dir, 'bad.pbf');
  await writeFile(path, Buffer.from([0xff, 0xff]));

  const result = await validateTile(path);

  assert.equal(result.pass, false);
  assert.equal(result.errors[0].code, 'DECODE_ERROR');
});

async function writeTile(layers, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'tileguard-'));
  const path = join(dir, 'tile.pbf');
  const tile = message(layers.map((encodedLayer) => field(3, 2, encodedLayer)));
  await writeFile(path, options.gzip ? gzipSync(tile) : tile);
  return path;
}

function layer(name, features) {
  const keys = [...new Set(features.flatMap((item) => Object.keys(item.properties)))];
  const values = [...new Set(features.flatMap((item) => Object.values(item.properties)))];
  return message([
    field(15, 0, 2),
    field(1, 2, Buffer.from(name)),
    ...features.map((item) => field(2, 2, encodeFeature(item, keys, values))),
    ...keys.map((key) => field(3, 2, Buffer.from(key))),
    ...values.map((value) => field(4, 2, message([field(1, 2, Buffer.from(String(value)))]))),
    field(5, 0, 4096)
  ]);
}

function feature(type, geometry, properties = {}) {
  return { type, geometry, properties };
}

function encodeFeature(item, keys, values) {
  const tags = [];
  for (const [key, value] of Object.entries(item.properties)) {
    tags.push(keys.indexOf(key), values.indexOf(value));
  }
  return message([
    field(2, 2, packed(tags)),
    field(3, 0, item.type),
    field(4, 2, packed(encodeGeometry(item.geometry)))
  ]);
}

function encodeGeometry(parts) {
  let x = 0;
  let y = 0;
  const commands = [];
  for (const points of parts) {
    commands.push((1 << 3) | 1);
    commands.push(zigZag(points[0].x - x), zigZag(points[0].y - y));
    x = points[0].x;
    y = points[0].y;
    const body = points.slice(1);
    const closes = body.length && body[body.length - 1].x === points[0].x && body[body.length - 1].y === points[0].y;
    const linePoints = closes ? body.slice(0, -1) : body;
    if (linePoints.length) {
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

function message(fields) {
  return Buffer.concat(fields);
}

function field(number, wire, value) {
  const tag = varint((number << 3) | wire);
  if (wire === 0) return Buffer.concat([tag, varint(value)]);
  return Buffer.concat([tag, varint(value.length), value]);
}

function packed(values) {
  return Buffer.concat(values.map(varint));
}

function varint(value) {
  const bytes = [];
  let n = value >>> 0;
  while (n > 0x7f) {
    bytes.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  bytes.push(n);
  return Buffer.from(bytes);
}

function zigZag(value) {
  return (value << 1) ^ (value >> 31);
}
