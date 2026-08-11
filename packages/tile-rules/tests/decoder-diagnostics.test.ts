/**
 * @tileguard/tile-rules — Decoder Diagnostics Tests
 *
 * Tests for all structured decoder error paths:
 *   - Truncated PBF (unexpected end)
 *   - Invalid varint (too many bytes)
 *   - Unsupported wire type
 *   - Invalid key index (string-table bounds)
 *   - Invalid value index (string-table bounds)
 *   - Geometry command stream errors
 *   - Context propagation (layer, featureIndex)
 *   - JSON serialization of diagnostic data
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { DecodeError, decodeMvt, PbfReader, tilePlugin } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers: MVT protobuf encoding utilities
// ---------------------------------------------------------------------------

function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  bytes.push(value & 0x7f);
  return bytes;
}

function encodeTag(field: number, wireType: number): number[] {
  return encodeVarint((field << 3) | wireType);
}

function encodeLengthDelimited(field: number, data: Uint8Array): number[] {
  return [...encodeTag(field, 2), ...encodeVarint(data.length), ...data];
}

function encodeString(field: number, value: string): number[] {
  const encoded = new TextEncoder().encode(value);
  return encodeLengthDelimited(field, encoded);
}

function encodeVarintField(field: number, value: number): number[] {
  return [...encodeTag(field, 0), ...encodeVarint(value)];
}

/** Builds a minimal valid MVT layer with the specified name and features. */
function buildLayer(
  name: string,
  keys: string[],
  values: Array<{ stringValue?: string; intValue?: number }>,
  features: Array<{
    type?: number;
    tags?: number[];
    geometry?: number[];
  }>,
): Uint8Array {
  const parts: number[] = [];

  // Field 1: name
  parts.push(...encodeString(1, name));

  // Field 3: keys
  for (const key of keys) {
    parts.push(...encodeString(3, key));
  }

  // Field 4: values
  for (const val of values) {
    let valueBytes: number[] = [];
    if (val.stringValue !== undefined) {
      valueBytes = encodeString(1, val.stringValue);
    } else if (val.intValue !== undefined) {
      valueBytes = encodeVarintField(4, val.intValue);
    }
    parts.push(...encodeLengthDelimited(4, new Uint8Array(valueBytes)));
  }

  // Field 2: features
  for (const feat of features) {
    const featureBytes: number[] = [];
    if (feat.type !== undefined) {
      featureBytes.push(...encodeVarintField(3, feat.type));
    }
    if (feat.tags !== undefined && feat.tags.length > 0) {
      const tagBytes: number[] = [];
      for (const t of feat.tags) tagBytes.push(...encodeVarint(t));
      featureBytes.push(...encodeLengthDelimited(2, new Uint8Array(tagBytes)));
    }
    if (feat.geometry !== undefined && feat.geometry.length > 0) {
      const geomBytes: number[] = [];
      for (const g of feat.geometry) geomBytes.push(...encodeVarint(g));
      featureBytes.push(...encodeLengthDelimited(4, new Uint8Array(geomBytes)));
    }
    parts.push(...encodeLengthDelimited(2, new Uint8Array(featureBytes)));
  }

  // Field 5: extent
  parts.push(...encodeVarintField(5, 4096));

  // Field 15: version
  parts.push(...encodeVarintField(15, 2));

  return new Uint8Array(parts);
}

/** Wraps layer bytes into a top-level MVT tile. */
function buildTile(layers: Uint8Array[]): Uint8Array {
  const parts: number[] = [];
  for (const layer of layers) {
    parts.push(...encodeLengthDelimited(3, layer));
  }
  return new Uint8Array(parts);
}

/** Writes bytes to a temp .pbf file and returns the path. */
async function writePbf(data: Uint8Array): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'tileguard-decode-'));
  const path = join(dir, 'test.pbf');
  await writeFile(path, data);
  return path;
}

// ---------------------------------------------------------------------------
// Unit tests: PbfReader errors
// ---------------------------------------------------------------------------

describe('PbfReader — structured decode errors', () => {
  it('throws DecodeError with byteOffset on varint overflow', () => {
    // 10 continuation bytes = varint too long
    const data = new Uint8Array(11).fill(0x80);
    const reader = new PbfReader(data);

    expect(() => reader.readVarint()).toThrow(DecodeError);
    try {
      reader.pos = 0;
      reader.readVarint();
    } catch (err) {
      const e = err as DecodeError;
      expect(e.diagnosticData.byteOffset).toBe(0);
      expect(e.message).toContain('too many bytes');
    }
  });

  it('throws DecodeError with byteOffset on unexpected EOF', () => {
    const data = new Uint8Array([0x80]); // continuation bit set, no following byte
    const reader = new PbfReader(data);

    expect(() => reader.readVarint()).toThrow(DecodeError);
    try {
      reader.pos = 0;
      reader.readVarint();
    } catch (err) {
      const e = err as DecodeError;
      expect(e.diagnosticData.byteOffset).toBe(0);
      expect(e.message).toContain('Unexpected end');
    }
  });

  it('throws DecodeError on unsupported wire type', () => {
    const reader = new PbfReader(new Uint8Array([0x00]));
    reader.pos = 0;

    expect(() => reader.skip(3)).toThrow(DecodeError);
    try {
      reader.pos = 0;
      reader.skip(3);
    } catch (err) {
      const e = err as DecodeError;
      expect(e.diagnosticData.wireType).toBe(3);
      expect(e.diagnosticData.byteOffset).toBe(0);
    }
  });

  it('throws DecodeError with byteOffset on ensure() failure', () => {
    const reader = new PbfReader(new Uint8Array([0x01, 0x02]));
    reader.pos = 1;

    expect(() => reader.ensure(5)).toThrow(DecodeError);
    try {
      reader.pos = 1;
      reader.ensure(5);
    } catch (err) {
      const e = err as DecodeError;
      expect(e.diagnosticData.byteOffset).toBe(1);
      expect(e.message).toContain('Unexpected end');
    }
  });
});

// ---------------------------------------------------------------------------
// Unit tests: decodeMvt — string-table bounds validation
// ---------------------------------------------------------------------------

describe('decodeMvt — string-table bounds validation', () => {
  it('throws DecodeError when key index exceeds keys table', () => {
    const layer = buildLayer(
      'roads',
      ['name'], // 1 key (index 0)
      [{ stringValue: 'hello' }], // 1 value (index 0)
      [{ type: 1, tags: [5, 0], geometry: [9, 4, 4] }], // key index 5 out of bounds
    );
    const tile = buildTile([layer]);

    expect(() => decodeMvt(tile)).toThrow(DecodeError);
    try {
      decodeMvt(tile);
    } catch (err) {
      const e = err as DecodeError;
      expect(e.diagnosticData.table).toBe('keys');
      expect(e.diagnosticData.requestedIndex).toBe(5);
      expect(e.diagnosticData.tableLength).toBe(1);
      expect(e.diagnosticData.layer).toBe('roads');
      expect(e.diagnosticData.featureIndex).toBe(0);
      expect(e.location?.layer).toBe('roads');
      expect(e.location?.featureIndex).toBe(0);
    }
  });

  it('throws DecodeError when value index exceeds values table', () => {
    const layer = buildLayer(
      'buildings',
      ['height'], // 1 key
      [{ intValue: 10 }], // 1 value (index 0)
      [{ type: 3, tags: [0, 99], geometry: [9, 4, 4, 18, 0, 20, 20, 0, 15] }], // value index 99
    );
    const tile = buildTile([layer]);

    expect(() => decodeMvt(tile)).toThrow(DecodeError);
    try {
      decodeMvt(tile);
    } catch (err) {
      const e = err as DecodeError;
      expect(e.diagnosticData.table).toBe('values');
      expect(e.diagnosticData.requestedIndex).toBe(99);
      expect(e.diagnosticData.tableLength).toBe(1);
      expect(e.diagnosticData.layer).toBe('buildings');
      expect(e.diagnosticData.featureIndex).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Unit tests: decodeMvt — truncated data
// ---------------------------------------------------------------------------

describe('decodeMvt — truncated data', () => {
  it('throws DecodeError on truncated tile', () => {
    // Build a valid tile then truncate it
    const layer = buildLayer('water', [], [], []);
    const tile = buildTile([layer]);
    const truncated = tile.slice(0, Math.floor(tile.length / 2));

    expect(() => decodeMvt(truncated)).toThrow(DecodeError);
    try {
      decodeMvt(truncated);
    } catch (err) {
      const e = err as DecodeError;
      expect(e.diagnosticData.byteOffset).toBeDefined();
      expect(typeof e.diagnosticData.byteOffset).toBe('number');
    }
  });
});

// ---------------------------------------------------------------------------
// Integration tests: Engine produces structured diagnostics
// ---------------------------------------------------------------------------

describe('Engine — decoder diagnostic integration', () => {
  it('emits artifact/decode-failed with structured data for invalid PBF', async () => {
    // Varint overflow: 10 continuation bytes
    const data = new Uint8Array(10).fill(0x80);
    const path = await writePbf(data);

    const engine = createEngine({ plugins: [tilePlugin] });
    const result = await engine.run([path]);

    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);

    const diag = result.diagnostics[0]!;
    expect(diag.ruleId).toBe('artifact/decode-failed');
    expect(diag.severity).toBe('error');
    expect(diag.data).toBeDefined();
    expect(typeof diag.data!.byteOffset).toBe('number');
  });

  it('emits artifact/decode-failed with string-table context', async () => {
    const layer = buildLayer(
      'places',
      ['name'],
      [{ stringValue: 'Tokyo' }],
      [{ type: 1, tags: [0, 50], geometry: [9, 4, 4] }], // value 50 out of bounds
    );
    const tile = buildTile([layer]);
    const path = await writePbf(tile);

    const engine = createEngine({ plugins: [tilePlugin] });
    const result = await engine.run([path]);

    const diag = result.diagnostics[0]!;
    expect(diag.ruleId).toBe('artifact/decode-failed');
    expect(diag.data).toBeDefined();
    expect(diag.data!.table).toBe('values');
    expect(diag.data!.requestedIndex).toBe(50);
    expect(diag.data!.tableLength).toBe(1);
    expect(diag.data!.layer).toBe('places');
    expect(diag.data!.featureIndex).toBe(0);
    // Location should also carry layer/feature info
    expect(diag.location?.layer).toBe('places');
    expect(diag.location?.featureIndex).toBe(0);
  });

  it('emits artifact/load-failed (not decode-failed) for empty file', async () => {
    const path = await writePbf(new Uint8Array(0));

    const engine = createEngine({ plugins: [tilePlugin] });
    const result = await engine.run([path]);

    const diag = result.diagnostics[0]!;
    // Empty file throws a plain Error ('Tile source returned 0 bytes'),
    // not a DecodeError, so it should remain artifact/load-failed
    expect(diag.ruleId).toBe('artifact/load-failed');
    expect(diag.data).toBeUndefined();
  });

  it('diagnostics are JSON-serializable', async () => {
    const layer = buildLayer(
      'roads',
      ['class'],
      [{ stringValue: 'highway' }],
      [{ type: 2, tags: [10, 0], geometry: [9, 4, 4, 10, 10, 10] }], // key index 10
    );
    const tile = buildTile([layer]);
    const path = await writePbf(tile);

    const engine = createEngine({ plugins: [tilePlugin] });
    const result = await engine.run([path]);

    const diag = result.diagnostics[0]!;
    // Must not throw
    const json = JSON.stringify(diag);
    const parsed = JSON.parse(json);
    expect(parsed.ruleId).toBe('artifact/decode-failed');
    expect(parsed.data.table).toBe('keys');
    expect(parsed.data.requestedIndex).toBe(10);
    expect(parsed.data.tableLength).toBe(1);
  });
});
