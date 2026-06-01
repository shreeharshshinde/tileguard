const GEOM_TYPES = {
  0: 'Unknown',
  1: 'Point',
  2: 'LineString',
  3: 'Polygon'
};

export class PbfReader {
  constructor(buffer) {
    this.buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    this.pos = 0;
    this.length = this.buf.length;
  }

  eof() {
    return this.pos >= this.length;
  }

  readVarint() {
    let result = 0;
    let shift = 0;
    while (this.pos < this.length) {
      const byte = this.buf[this.pos++];
      if (shift < 28) {
        result += (byte & 0x7f) << shift;
      } else {
        result += (byte & 0x7f) * 2 ** shift;
      }
      if ((byte & 0x80) === 0) return result;
      shift += 7;
      if (shift > 63) throw new Error('Invalid varint: too many bytes');
    }
    throw new Error('Unexpected end of protobuf while reading varint');
  }

  readSVarint() {
    const n = this.readVarint();
    return (n >>> 1) ^ -(n & 1);
  }

  readDouble() {
    this.ensure(8);
    const value = this.buf.readDoubleLE(this.pos);
    this.pos += 8;
    return value;
  }

  readFloat() {
    this.ensure(4);
    const value = this.buf.readFloatLE(this.pos);
    this.pos += 4;
    return value;
  }

  readBytes() {
    const len = this.readVarint();
    this.ensure(len);
    const value = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return value;
  }

  readString() {
    return this.readBytes().toString('utf8');
  }

  skip(wireType) {
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
      const len = this.readVarint();
      this.ensure(len);
      this.pos += len;
      return;
    }
    if (wireType === 5) {
      this.ensure(4);
      this.pos += 4;
      return;
    }
    throw new Error(`Unsupported protobuf wire type ${wireType}`);
  }

  ensure(len) {
    if (this.pos + len > this.length) {
      throw new Error('Unexpected end of protobuf');
    }
  }
}

export function decodeMvt(buffer) {
  const reader = new PbfReader(buffer);
  const layers = {};

  while (!reader.eof()) {
    const tag = reader.readVarint();
    const field = tag >> 3;
    const wire = tag & 7;

    if (field === 3 && wire === 2) {
      const layer = decodeLayer(reader.readBytes());
      if (layer.name) layers[layer.name] = layer;
    } else {
      reader.skip(wire);
    }
  }

  return { layers };
}

function decodeLayer(bytes) {
  const reader = new PbfReader(bytes);
  const layer = {
    name: '',
    version: null,
    extent: 4096,
    keys: [],
    values: [],
    features: []
  };

  while (!reader.eof()) {
    const tag = reader.readVarint();
    const field = tag >> 3;
    const wire = tag & 7;

    if (field === 15 && wire === 0) layer.version = reader.readVarint();
    else if (field === 1 && wire === 2) layer.name = reader.readString();
    else if (field === 2 && wire === 2) layer.features.push(decodeFeature(reader.readBytes(), layer));
    else if (field === 3 && wire === 2) layer.keys.push(reader.readString());
    else if (field === 4 && wire === 2) layer.values.push(decodeValue(reader.readBytes()));
    else if (field === 5 && wire === 0) layer.extent = reader.readVarint();
    else reader.skip(wire);
  }

  for (const feature of layer.features) {
    feature.properties = hydrateProperties(feature.tags, layer.keys, layer.values);
    feature.geometry = decodeGeometry(feature.geometryCommands, feature.type);
    delete feature.tags;
    delete feature.geometryCommands;
  }

  return layer;
}

function decodeFeature(bytes) {
  const reader = new PbfReader(bytes);
  const feature = {
    id: undefined,
    type: 0,
    geometryType: 'Unknown',
    tags: [],
    geometryCommands: []
  };

  while (!reader.eof()) {
    const tag = reader.readVarint();
    const field = tag >> 3;
    const wire = tag & 7;

    if (field === 1 && wire === 0) feature.id = reader.readVarint();
    else if (field === 2 && wire === 2) feature.tags = readPackedVarints(reader.readBytes());
    else if (field === 3 && wire === 0) {
      feature.type = reader.readVarint();
      feature.geometryType = GEOM_TYPES[feature.type] || 'Unknown';
    } else if (field === 4 && wire === 2) feature.geometryCommands = readPackedVarints(reader.readBytes());
    else reader.skip(wire);
  }

  return feature;
}

function decodeValue(bytes) {
  const reader = new PbfReader(bytes);
  let value = null;

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

function hydrateProperties(tags, keys, values) {
  const props = {};
  for (let i = 0; i < tags.length; i += 2) {
    const key = keys[tags[i]];
    if (key !== undefined) props[key] = values[tags[i + 1]];
  }
  return props;
}

function readPackedVarints(bytes) {
  const reader = new PbfReader(bytes);
  const values = [];
  while (!reader.eof()) values.push(reader.readVarint());
  return values;
}

function decodeGeometry(commands, type) {
  let x = 0;
  let y = 0;
  let i = 0;
  let current = [];
  const parts = [];

  while (i < commands.length) {
    const commandInteger = commands[i++];
    const command = commandInteger & 0x7;
    const count = commandInteger >> 3;

    if (command === 1 || command === 2) {
      if (command === 1 && current.length) {
        parts.push(current);
        current = [];
      }
      for (let c = 0; c < count; c++) {
        x += zigZagDecode(commands[i++]);
        y += zigZagDecode(commands[i++]);
        current.push({ x, y });
      }
    } else if (command === 7) {
      for (let c = 0; c < count; c++) {
        if (current.length) current.push({ ...current[0] });
      }
    } else {
      throw new Error(`Unsupported geometry command ${command}`);
    }
  }

  if (current.length) parts.push(current);
  if (type === 1) return parts.flat();
  return parts;
}

function zigZagDecode(n) {
  return (n >>> 1) ^ -(n & 1);
}
