/**
 * Generate synthetic validation fixtures for the coordinate-range rule.
 *
 * Run: node --experimental-strip-types scripts/generate-synthetic-fixtures.mts
 *
 * Produces synthetic tiles under fixtures/synthetic/ that encode specific
 * coordinate patterns for validation.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

interface Pt { x: number; y: number; }
interface FeatureDesc {
  type: 1 | 2 | 3;
  points: Pt[][];
  props: Record<string, string | number | boolean>;
  id?: number;
}
interface LayerDesc {
  name: string;
  features: FeatureDesc[];
  extent?: number;
}

function varint(value: number): Uint8Array {
  const bytes: number[] = [];
  let v = value >>> 0;
  while (v > 0x7f) { bytes.push((v & 0x7f) | 0x80); v >>>= 7; }
  bytes.push(v);
  return Buffer.from(bytes);
}

function zz(n: number): number { return (n << 1) ^ (n >> 31); }

function concat(parts: Uint8Array[]): Uint8Array { return Buffer.concat(parts); }

function fieldVarint(f: number, v: number): Uint8Array {
  return concat([varint((f << 3) | 0), varint(v)]);
}

function fieldLd(f: number, data: Uint8Array): Uint8Array {
  return concat([varint((f << 3) | 2), varint(data.length), data]);
}

function packed(nums: number[]): Uint8Array { return concat(nums.map(varint)); }

function str(s: string): Uint8Array { return Buffer.from(s, 'utf8'); }

function encodeGeometry(rings: Pt[][]): number[] {
  let cx = 0, cy = 0;
  const cmds: number[] = [];
  for (const pts of rings) {
    if (pts.length === 0) continue;
    const first = pts[0]!;
    cmds.push((1 << 3) | 1);
    cmds.push(zz(first.x - cx), zz(first.y - cy));
    cx = first.x; cy = first.y;
    const last = pts[pts.length - 1]!;
    const closes = pts.length > 1 && last.x === first.x && last.y === first.y;
    const body = closes ? pts.slice(1, -1) : pts.slice(1);
    if (body.length > 0) {
      cmds.push((body.length << 3) | 2);
      for (const p of body) {
        cmds.push(zz(p.x - cx), zz(p.y - cy));
        cx = p.x; cy = p.y;
      }
    }
    if (closes) cmds.push((1 << 3) | 7);
  }
  return cmds;
}

function buildFeature(f: FeatureDesc, keys: string[], vals: string[]): Uint8Array {
  const tags: number[] = [];
  for (const [k, v] of Object.entries(f.props)) {
    tags.push(keys.indexOf(k), vals.indexOf(String(v)));
  }
  const parts: Uint8Array[] = [
    fieldLd(2, packed(tags)),
    fieldVarint(3, f.type),
    fieldLd(4, packed(encodeGeometry(f.points))),
  ];
  if (f.id !== undefined) parts.unshift(fieldVarint(1, f.id));
  return concat(parts);
}

function buildLayer(desc: LayerDesc): Uint8Array {
  const extent = desc.extent ?? 4096;
  const allProps = desc.features.flatMap(f => Object.entries(f.props));
  const keys = [...new Set(allProps.map(([k]) => k))];
  const vals = [...new Set(allProps.map(([, v]) => String(v)))];
  const parts: Uint8Array[] = [
    fieldVarint(15, 2), fieldLd(1, str(desc.name)), fieldVarint(5, extent),
  ];
  for (const f of desc.features) parts.push(fieldLd(2, buildFeature(f, keys, vals)));
  for (const k of keys) parts.push(fieldLd(3, str(k)));
  for (const v of vals) parts.push(fieldLd(4, concat([fieldLd(1, str(v))])));
  return concat(parts);
}

function buildTile(layers: LayerDesc[]): Uint8Array {
  return concat(layers.map(l => fieldLd(3, buildLayer(l))));
}

// ── Generate fixtures ─────────────────────────────────────────────────────

const outDir = join(import.meta.dirname!, '..', 'fixtures', 'synthetic');
mkdirSync(outDir, { recursive: true });

function writePbf(name: string, layers: LayerDesc[]) {
  const path = join(outDir, name);
  writeFileSync(path, buildTile(layers));
  console.log(`  ✓ ${name} (${buildTile(layers).length} bytes)`);
}

console.log('Generating synthetic validation fixtures:\n');

// 1. Place layer +228 offset
writePbf('coordinate-place-228.pbf', [
  {
    name: 'place',
    features: [{
      type: 1,
      points: [[{ x: 4324, y: 2742 }]],  // x = extent + 228
      props: { name: 'Test City', class: 'city' },
    }],
  },
]);

// 2. water_name label duplication
writePbf('coordinate-water-name.pbf', [
  {
    name: 'water_name',
    features: [{
      type: 1,
      points: [[{ x: -3868, y: 2742 }]],  // large negative offset
      props: { name: 'Test Lake', class: 'lake' },
    }],
  },
]);

// 3. countries layer at exactly 80-unit clipping ceiling
writePbf('coordinate-countries-80.pbf', [
  {
    name: 'countries',
    features: [{
      type: 3,
      points: [[
        { x: -80, y: -80 },
        { x: 4176, y: -80 },
        { x: 4176, y: 4176 },
        { x: -80, y: 4176 },
        { x: -80, y: -80 },
      ]],
      props: { name: 'Test Country' },
    }],
  },
]);

// 4. boundary layer at exactly 64-unit clipping ceiling
writePbf('coordinate-boundary-64.pbf', [
  {
    name: 'boundary',
    features: [{
      type: 2,
      points: [[
        { x: -64, y: 100 },
        { x: 4160, y: 3000 },
      ]],
      props: { admin_level: '2' },
    }],
  },
]);

// 5. Synthetic corrupt POI (the false-negative guard fixture)
writePbf('coordinate-poi-corrupt.pbf', [
  {
    name: 'poi',
    features: [{
      type: 1,
      points: [[{ x: 50000, y: 100 }]],  // wildly out of range
      props: { name: 'Corrupt POI', class: 'restaurant' },
    }],
  },
]);

console.log('\nDone. All fixtures written to fixtures/synthetic/');
