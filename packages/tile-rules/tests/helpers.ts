/**
 * Shared test helpers for @tileguard/tile-rules per-rule tests.
 *
 * Provides a minimal in-memory MVT encoder so tests can construct exactly the
 * tile they need without touching the filesystem — except for the final
 * writeTile() call which the engine requires.
 */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

// ── Point ─────────────────────────────────────────────────────────────────────

export interface Pt {
  readonly x: number;
  readonly y: number;
}

// ── Layer / Feature descriptor ────────────────────────────────────────────────

export interface FeatureDesc {
  /** 1=Point, 2=LineString, 3=Polygon */
  readonly type: 1 | 2 | 3;
  /** Geometry as rings / point-list. A LineString or Point is a single ring. */
  readonly points: readonly (readonly Pt[])[];
  readonly props: Readonly<Record<string, string | number | boolean>>;
  readonly id?: number;
}

export interface LayerDesc {
  readonly name: string;
  readonly features: readonly FeatureDesc[];
  readonly extent?: number;
}

// ── Public helpers ────────────────────────────────────────────────────────────

/** Write a tile to a temp file and return its absolute path. */
export async function makeTile(
  layers: readonly LayerDesc[],
  options: { gzip?: boolean } = {},
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'tg-'));
  const path = join(dir, 'tile.pbf');
  const bytes = buildTile(layers);
  await writeFile(path, options.gzip ? gzipSync(bytes) : bytes);
  return path;
}

/** Build a raw MVT Uint8Array without writing to disk. */
export function buildTile(layers: readonly LayerDesc[]): Uint8Array {
  return concat(layers.map((l) => fieldLd(3, buildLayer(l))));
}

// ── MVT encoder ───────────────────────────────────────────────────────────────

function buildLayer(desc: LayerDesc): Uint8Array {
  const extent = desc.extent ?? 4096;
  const allProps = desc.features.flatMap((f) => Object.entries(f.props));
  const keys = [...new Set(allProps.map(([k]) => k))];
  const vals = [...new Set(allProps.map(([, v]) => String(v)))];

  const parts: Uint8Array[] = [
    fieldVarint(15, 2),
    fieldLd(1, str(desc.name)),
    fieldVarint(5, extent),
  ];

  for (const f of desc.features) {
    parts.push(fieldLd(2, buildFeature(f, keys, vals)));
  }
  for (const k of keys) parts.push(fieldLd(3, str(k)));
  for (const v of vals) parts.push(fieldLd(4, concat([fieldLd(1, str(v))])));

  return concat(parts);
}

function buildFeature(
  f: FeatureDesc,
  keys: readonly string[],
  vals: readonly string[],
): Uint8Array {
  const tags: number[] = [];
  for (const [k, v] of Object.entries(f.props)) {
    tags.push(keys.indexOf(k), vals.indexOf(String(v)));
  }

  const parts: Uint8Array[] = [
    fieldLd(2, packed(tags)),
    fieldVarint(3, f.type),
    fieldLd(4, packed(encodeGeometry(f.points))),
  ];

  if (f.id !== undefined) {
    parts.unshift(fieldVarint(1, f.id));
  }

  return concat(parts);
}

function encodeGeometry(rings: readonly (readonly Pt[])[]): number[] {
  let cx = 0;
  let cy = 0;
  const cmds: number[] = [];

  for (const pts of rings) {
    if (pts.length === 0) continue;
    const first = pts[0]!;

    // MoveTo first point
    cmds.push((1 << 3) | 1);
    cmds.push(zz(first.x - cx), zz(first.y - cy));
    cx = first.x;
    cy = first.y;

    // Detect whether the ring closes (last point == first point)
    const last = pts[pts.length - 1]!;
    const closes = pts.length > 1 && last.x === first.x && last.y === first.y;
    const body = closes ? pts.slice(1, -1) : pts.slice(1);

    if (body.length > 0) {
      cmds.push((body.length << 3) | 2);
      for (const p of body) {
        cmds.push(zz(p.x - cx), zz(p.y - cy));
        cx = p.x;
        cy = p.y;
      }
    }

    if (closes) cmds.push((1 << 3) | 7);
  }

  return cmds;
}

// ── Protobuf primitives ───────────────────────────────────────────────────────

function fieldVarint(fieldNum: number, value: number): Uint8Array {
  return concat([varint((fieldNum << 3) | 0), varint(value)]);
}

function fieldLd(fieldNum: number, data: Uint8Array): Uint8Array {
  return concat([varint((fieldNum << 3) | 2), varint(data.length), data]);
}

function packed(nums: readonly number[]): Uint8Array {
  return concat(nums.map(varint));
}

function str(s: string): Uint8Array {
  return Buffer.from(s, 'utf8');
}

function varint(value: number): Uint8Array {
  const bytes: number[] = [];
  let v = value >>> 0;
  while (v > 0x7f) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v);
  return Buffer.from(bytes);
}

function zz(n: number): number {
  return (n << 1) ^ (n >> 31);
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  return Buffer.concat(parts as Uint8Array[]);
}
