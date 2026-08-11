import type {
  GeometryType,
  GeometryTypeName,
  Point,
  TileValue,
  VectorTileContent,
  VectorTileFeature,
  VectorTileGeometry,
  VectorTileLayer,
} from './types.js';
import { DecodeError, type DecodeDiagnosticData } from './decode-error.js';

const GEOMETRY_TYPES: Record<number, GeometryTypeName> = {
  0: 'Unknown',
  1: 'Point',
  2: 'LineString',
  3: 'Polygon',
};

interface RawFeature {
  id?: number;
  type: GeometryType;
  geometryType: GeometryTypeName;
  tags: number[];
  geometryCommands: number[];
}

interface MutableLayer {
  name: string;
  version: number | null;
  extent: number;
  keys: string[];
  values: TileValue[];
  features: RawFeature[];
}

/**
 * Parsing context propagated through the decode pipeline.
 * Populated as decode progresses — fields may be undefined if
 * the failure occurs before that context is established.
 */
interface DecodeContext {
  layer?: string;
  featureIndex?: number;
}

/** Build a DecodeDiagnosticData object from context, only including defined fields. */
function contextData(ctx: DecodeContext, extra?: Partial<DecodeDiagnosticData>): DecodeDiagnosticData {
  const data: Record<string, unknown> = {};
  if (ctx.layer !== undefined) data.layer = ctx.layer;
  if (ctx.featureIndex !== undefined) data.featureIndex = ctx.featureIndex;
  if (extra !== undefined) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined) data[k] = v;
    }
  }
  return data as DecodeDiagnosticData;
}

/** Build a Location from context, only including defined fields. */
function contextLocation(ctx: DecodeContext): import('@tileguard/core').Location | undefined {
  if (ctx.layer === undefined && ctx.featureIndex === undefined) return undefined;
  const loc: Record<string, unknown> = {};
  if (ctx.layer !== undefined) loc.layer = ctx.layer;
  if (ctx.featureIndex !== undefined) loc.featureIndex = ctx.featureIndex;
  return loc as import('@tileguard/core').Location;
}

export class PbfReader {
  readonly data: Uint8Array;
  pos = 0;

  constructor(data: Uint8Array | ArrayBuffer) {
    this.data = data instanceof Uint8Array ? data : new Uint8Array(data);
  }

  get length(): number {
    return this.data.length;
  }

  eof(): boolean {
    return this.pos >= this.data.length;
  }

  readVarint(): number {
    const startPos = this.pos;
    let result = 0;
    let shift = 0;

    while (this.pos < this.data.length) {
      const byte = this.data[this.pos]!;
      this.pos += 1;

      if (shift < 28) {
        result += (byte & 0x7f) << shift;
      } else {
        result += (byte & 0x7f) * 2 ** shift;
      }

      if ((byte & 0x80) === 0) return result;

      shift += 7;
      if (shift > 63) {
        throw new DecodeError('Invalid varint: too many bytes', {
          byteOffset: startPos,
        });
      }
    }

    throw new DecodeError('Unexpected end of protobuf while reading varint', {
      byteOffset: startPos,
    });
  }

  readSVarint(): number {
    const value = this.readVarint();
    return (value >>> 1) ^ -(value & 1);
  }

  readFloat(): number {
    this.ensure(4);
    const view = new DataView(
      this.data.buffer,
      this.data.byteOffset + this.pos,
      4,
    );
    const value = view.getFloat32(0, true);
    this.pos += 4;
    return value;
  }

  readDouble(): number {
    this.ensure(8);
    const view = new DataView(
      this.data.buffer,
      this.data.byteOffset + this.pos,
      8,
    );
    const value = view.getFloat64(0, true);
    this.pos += 8;
    return value;
  }

  readBytes(): Uint8Array {
    const length = this.readVarint();
    this.ensure(length);
    const value = this.data.subarray(this.pos, this.pos + length);
    this.pos += length;
    return value;
  }

  readString(): string {
    return new TextDecoder('utf8').decode(this.readBytes());
  }

  skip(wireType: number): void {
    if (wireType === 0) {
      this.readVarint();
      return;
    }
    if (wireType === 1) {
      this.ensure(8);
      this.pos += 8;
      return;
    }
    if (wireType === 2) {
      const length = this.readVarint();
      this.ensure(length);
      this.pos += length;
      return;
    }
    if (wireType === 5) {
      this.ensure(4);
      this.pos += 4;
      return;
    }
    throw new DecodeError(
      `Unsupported protobuf wire type ${wireType}`,
      { byteOffset: this.pos, wireType },
    );
  }

  ensure(length: number): void {
    if (this.pos + length > this.data.length) {
      throw new DecodeError('Unexpected end of protobuf', {
        byteOffset: this.pos,
      });
    }
  }
}

export function decodeMvt(data: Uint8Array | ArrayBuffer): VectorTileContent {
  const reader = new PbfReader(data);
  const layers: Record<string, VectorTileLayer> = {};

  while (!reader.eof()) {
    const tagPos = reader.pos;
    const tag = reader.readVarint();
    const field = tag >> 3;
    const wire = tag & 7;

    if (field === 3 && wire === 2) {
      const layerBytes = reader.readBytes();
      try {
        const layer = decodeLayer(layerBytes);
        if (layer.name.length > 0) {
          layers[layer.name] = layer;
        }
      } catch (err) {
        if (err instanceof DecodeError && err.diagnosticData.layer === undefined) {
          // Re-throw with byte offset relative to top-level stream if no layer context yet
          throw new DecodeError(err.message, {
            ...err.diagnosticData,
            byteOffset: err.diagnosticData.byteOffset !== undefined
              ? tagPos + err.diagnosticData.byteOffset
              : tagPos,
          }, err.location);
        }
        throw err;
      }
    } else {
      reader.skip(wire);
    }
  }

  return { layers };
}

function decodeLayer(data: Uint8Array): VectorTileLayer {
  const reader = new PbfReader(data);
  const layer: MutableLayer = {
    name: '',
    version: null,
    extent: 4096,
    keys: [],
    values: [],
    features: [],
  };

  while (!reader.eof()) {
    const tag = reader.readVarint();
    const field = tag >> 3;
    const wire = tag & 7;

    if (field === 15 && wire === 0) {
      layer.version = reader.readVarint();
    } else if (field === 1 && wire === 2) {
      layer.name = reader.readString();
    } else if (field === 2 && wire === 2) {
      layer.features.push(decodeFeature(reader.readBytes()));
    } else if (field === 3 && wire === 2) {
      layer.keys.push(reader.readString());
    } else if (field === 4 && wire === 2) {
      layer.values.push(decodeValue(reader.readBytes()));
    } else if (field === 5 && wire === 0) {
      layer.extent = reader.readVarint();
    } else {
      reader.skip(wire);
    }
  }

  const ctx: DecodeContext = { layer: layer.name };

  const features = layer.features.map(
    (feature, featureIndex): VectorTileFeature => {
      ctx.featureIndex = featureIndex;
      const idPart = feature.id === undefined ? {} : { id: feature.id };
      return {
        ...idPart,
        type: feature.type,
        geometryType: feature.geometryType,
        properties: hydrateProperties(
          feature.tags,
          layer.keys,
          layer.values,
          ctx,
        ),
        geometry: decodeGeometry(feature.geometryCommands, feature.type, ctx),
      };
    },
  );

  return {
    name: layer.name,
    version: layer.version,
    extent: layer.extent,
    keys: layer.keys,
    values: layer.values,
    features,
  };
}

function decodeFeature(data: Uint8Array): RawFeature {
  const reader = new PbfReader(data);
  const feature: RawFeature = {
    type: 0,
    geometryType: 'Unknown',
    tags: [],
    geometryCommands: [],
  };

  while (!reader.eof()) {
    const tag = reader.readVarint();
    const field = tag >> 3;
    const wire = tag & 7;

    if (field === 1 && wire === 0) {
      feature.id = reader.readVarint();
    } else if (field === 2 && wire === 2) {
      feature.tags = readPackedVarints(reader.readBytes());
    } else if (field === 3 && wire === 0) {
      const type = reader.readVarint();
      feature.type = normalizeGeometryType(type);
      feature.geometryType = GEOMETRY_TYPES[feature.type] ?? 'Unknown';
    } else if (field === 4 && wire === 2) {
      feature.geometryCommands = readPackedVarints(reader.readBytes());
    } else {
      reader.skip(wire);
    }
  }

  return feature;
}

function decodeValue(data: Uint8Array): TileValue {
  const reader = new PbfReader(data);
  let value: TileValue = null;

  while (!reader.eof()) {
    const tag = reader.readVarint();
    const field = tag >> 3;
    const wire = tag & 7;

    if (field === 1 && wire === 2) value = reader.readString();
    else if (field === 2 && wire === 5) value = reader.readFloat();
    else if (field === 3 && wire === 1) value = reader.readDouble();
    else if (field === 4 && wire === 0) value = reader.readSVarint();
    else if (field === 5 && wire === 0) value = reader.readVarint();
    else if (field === 6 && wire === 0) value = reader.readSVarint();
    else if (field === 7 && wire === 0) value = Boolean(reader.readVarint());
    else reader.skip(wire);
  }

  return value;
}

function hydrateProperties(
  tags: readonly number[],
  keys: readonly string[],
  values: readonly TileValue[],
  ctx: DecodeContext,
): Record<string, TileValue> {
  const properties: Record<string, TileValue> = {};

  for (let index = 0; index < tags.length; index += 2) {
    const keyIndex = tags[index];
    const valueIndex = tags[index + 1];
    if (keyIndex === undefined || valueIndex === undefined) continue;

    // String-table bounds validation
    if (keyIndex >= keys.length) {
      throw new DecodeError(
        `String-table key index ${keyIndex} is out of bounds`,
        contextData(ctx, {
          table: 'keys',
          requestedIndex: keyIndex,
          tableLength: keys.length,
        }),
        contextLocation(ctx),
      );
    }

    if (valueIndex >= values.length) {
      throw new DecodeError(
        `String-table value index ${valueIndex} is out of bounds`,
        contextData(ctx, {
          table: 'values',
          requestedIndex: valueIndex,
          tableLength: values.length,
        }),
        contextLocation(ctx),
      );
    }

    const key = keys[keyIndex]!;
    const value = values[valueIndex] ?? null;
    properties[key] = value;
  }

  return properties;
}

function readPackedVarints(data: Uint8Array): number[] {
  const reader = new PbfReader(data);
  const values: number[] = [];
  while (!reader.eof()) values.push(reader.readVarint());
  return values;
}

function decodeGeometry(
  commands: readonly number[],
  type: GeometryType,
  ctx: DecodeContext,
): VectorTileGeometry {
  let x = 0;
  let y = 0;
  let index = 0;
  let current: Point[] = [];
  const parts: Point[][] = [];

  while (index < commands.length) {
    const commandInteger = commands[index];
    if (commandInteger === undefined) {
      throw new DecodeError(
        'Unexpected end of geometry command stream',
        contextData(ctx),
        contextLocation(ctx),
      );
    }
    index += 1;

    const command = commandInteger & 0x7;
    const count = commandInteger >> 3;

    if (command === 1 || command === 2) {
      if (command === 1 && current.length > 0) {
        parts.push(current);
        current = [];
      }

      for (let commandIndex = 0; commandIndex < count; commandIndex += 1) {
        const dx = commands[index];
        const dy = commands[index + 1];
        if (dx === undefined || dy === undefined) {
          throw new DecodeError(
            'Unexpected end of geometry coordinate stream',
            contextData(ctx),
            contextLocation(ctx),
          );
        }
        index += 2;

        x += zigZagDecode(dx);
        y += zigZagDecode(dy);
        current.push({ x, y });
      }
    } else if (command === 7) {
      for (let commandIndex = 0; commandIndex < count; commandIndex += 1) {
        const first = current[0];
        if (first !== undefined) current.push({ ...first });
      }
    } else {
      throw new DecodeError(
        `Unsupported geometry command ${command}`,
        contextData(ctx),
        contextLocation(ctx),
      );
    }
  }

  if (current.length > 0) parts.push(current);
  if (type === 1) return parts.flat();
  return parts;
}

function zigZagDecode(value: number): number {
  return (value >>> 1) ^ -(value & 1);
}

function normalizeGeometryType(value: number): GeometryType {
  return value === 1 || value === 2 || value === 3 ? value : 0;
}
