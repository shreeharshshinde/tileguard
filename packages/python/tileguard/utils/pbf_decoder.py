from __future__ import annotations

from dataclasses import dataclass
from typing import Any

GEOM_TYPES = {0: "Unknown", 1: "Point", 2: "LineString", 3: "Polygon"}


@dataclass
class PbfReader:
    data: bytes
    pos: int = 0

    @property
    def eof(self) -> bool:
        return self.pos >= len(self.data)

    def read_varint(self) -> int:
        result = 0
        shift = 0
        while self.pos < len(self.data):
            byte = self.data[self.pos]
            self.pos += 1
            result |= (byte & 0x7F) << shift
            if not byte & 0x80:
                return result
            shift += 7
            if shift > 63:
                raise ValueError("Invalid varint: too many bytes")
        raise ValueError("Unexpected end of protobuf while reading varint")

    def read_svarint(self) -> int:
        value = self.read_varint()
        return (value >> 1) ^ -(value & 1)

    def read_bytes(self) -> bytes:
        size = self.read_varint()
        self.ensure(size)
        value = self.data[self.pos:self.pos + size]
        self.pos += size
        return value

    def read_string(self) -> str:
        return self.read_bytes().decode("utf-8")

    def read_float(self) -> float:
        import struct
        self.ensure(4)
        value = struct.unpack_from("<f", self.data, self.pos)[0]
        self.pos += 4
        return value

    def read_double(self) -> float:
        import struct
        self.ensure(8)
        value = struct.unpack_from("<d", self.data, self.pos)[0]
        self.pos += 8
        return value

    def skip(self, wire_type: int) -> None:
        if wire_type == 0:
            self.read_varint()
        elif wire_type == 1:
            self.ensure(8)
            self.pos += 8
        elif wire_type == 2:
            size = self.read_varint()
            self.ensure(size)
            self.pos += size
        elif wire_type == 5:
            self.ensure(4)
            self.pos += 4
        else:
            raise ValueError(f"Unsupported protobuf wire type {wire_type}")

    def ensure(self, size: int) -> None:
        if self.pos + size > len(self.data):
            raise ValueError("Unexpected end of protobuf")


def decode_mvt(data: bytes) -> dict[str, Any]:
    reader = PbfReader(data)
    layers: dict[str, Any] = {}
    while not reader.eof:
        tag = reader.read_varint()
        field = tag >> 3
        wire = tag & 7
        if field == 3 and wire == 2:
            layer = _decode_layer(reader.read_bytes())
            if layer["name"]:
                layers[layer["name"]] = layer
        else:
            reader.skip(wire)
    return {"layers": layers}


def _decode_layer(data: bytes) -> dict[str, Any]:
    reader = PbfReader(data)
    layer = {"name": "", "version": None, "extent": 4096, "keys": [], "values": [], "features": []}
    while not reader.eof:
        tag = reader.read_varint()
        field = tag >> 3
        wire = tag & 7
        if field == 15 and wire == 0:
            layer["version"] = reader.read_varint()
        elif field == 1 and wire == 2:
            layer["name"] = reader.read_string()
        elif field == 2 and wire == 2:
            layer["features"].append(_decode_feature(reader.read_bytes()))
        elif field == 3 and wire == 2:
            layer["keys"].append(reader.read_string())
        elif field == 4 and wire == 2:
            layer["values"].append(_decode_value(reader.read_bytes()))
        elif field == 5 and wire == 0:
            layer["extent"] = reader.read_varint()
        else:
            reader.skip(wire)

    for feature in layer["features"]:
        feature["properties"] = _hydrate_properties(feature.pop("tags"), layer["keys"], layer["values"])
        feature["geometry"] = _decode_geometry(feature.pop("geometry_commands"), feature["type"])
    return layer


def _decode_feature(data: bytes) -> dict[str, Any]:
    reader = PbfReader(data)
    feature = {"id": None, "type": 0, "geometry_type": "Unknown", "tags": [], "geometry_commands": []}
    while not reader.eof:
        tag = reader.read_varint()
        field = tag >> 3
        wire = tag & 7
        if field == 1 and wire == 0:
            feature["id"] = reader.read_varint()
        elif field == 2 and wire == 2:
            feature["tags"] = _read_packed_varints(reader.read_bytes())
        elif field == 3 and wire == 0:
            feature["type"] = reader.read_varint()
            feature["geometry_type"] = GEOM_TYPES.get(feature["type"], "Unknown")
        elif field == 4 and wire == 2:
            feature["geometry_commands"] = _read_packed_varints(reader.read_bytes())
        else:
            reader.skip(wire)
    return feature


def _decode_value(data: bytes) -> Any:
    reader = PbfReader(data)
    value = None
    while not reader.eof:
        tag = reader.read_varint()
        field = tag >> 3
        wire = tag & 7
        if field == 1 and wire == 2:
            value = reader.read_string()
        elif field == 2 and wire == 5:
            value = reader.read_float()
        elif field == 3 and wire == 1:
            value = reader.read_double()
        elif field == 4 and wire == 0:
            value = reader.read_svarint()
        elif field == 5 and wire == 0:
            value = reader.read_varint()
        elif field == 6 and wire == 0:
            value = reader.read_svarint()
        elif field == 7 and wire == 0:
            value = bool(reader.read_varint())
        else:
            reader.skip(wire)
    return value


def _hydrate_properties(tags: list[int], keys: list[str], values: list[Any]) -> dict[str, Any]:
    props = {}
    for index in range(0, len(tags), 2):
        key_index = tags[index]
        value_index = tags[index + 1]
        if key_index < len(keys) and value_index < len(values):
            props[keys[key_index]] = values[value_index]
    return props


def _read_packed_varints(data: bytes) -> list[int]:
    reader = PbfReader(data)
    values = []
    while not reader.eof:
        values.append(reader.read_varint())
    return values


def _decode_geometry(commands: list[int], geom_type: int) -> list[Any]:
    x = 0
    y = 0
    index = 0
    current = []
    parts = []
    while index < len(commands):
        command_integer = commands[index]
        index += 1
        command = command_integer & 0x7
        count = command_integer >> 3
        if command in (1, 2):
            if command == 1 and current:
                parts.append(current)
                current = []
            for _ in range(count):
                x += _zig_zag_decode(commands[index])
                y += _zig_zag_decode(commands[index + 1])
                index += 2
                current.append({"x": x, "y": y})
        elif command == 7:
            for _ in range(count):
                if current:
                    current.append(dict(current[0]))
        else:
            raise ValueError(f"Unsupported geometry command {command}")
    if current:
        parts.append(current)
    if geom_type == 1:
        return [point for part in parts for point in part]
    return parts


def _zig_zag_decode(value: int) -> int:
    return (value >> 1) ^ -(value & 1)
