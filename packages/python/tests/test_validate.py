from __future__ import annotations

import gzip

from tileguard import validate_tile


def test_validates_decodable_tile_with_required_layers_and_properties(tmp_path):
    path = write_tile(tmp_path, [
        layer("roads", [
            feature(2, [[{"x": 0, "y": 0}, {"x": 10, "y": 10}]], {"class": "primary", "name": "Main"}),
            feature(2, [[{"x": 20, "y": 20}, {"x": 30, "y": 20}]], {"class": "secondary", "name": "Side"}),
        ]),
        layer("water", [
            feature(3, [[{"x": 0, "y": 0}, {"x": 10, "y": 0}, {"x": 10, "y": 10}, {"x": 0, "y": 0}]], {"kind": "lake"}),
        ]),
    ])

    result = validate_tile(str(path), required_layers=["roads", "water"], min_features=3, required_properties={"roads": ["class", "name"]})

    assert result.pass_ is True
    assert result.total_features == 3
    assert result.layers["roads"].feature_count == 2


def test_reports_missing_layers_thresholds_and_required_properties(tmp_path):
    path = write_tile(tmp_path, [
        layer("roads", [feature(2, [[{"x": 0, "y": 0}, {"x": 10, "y": 10}]], {"class": "primary"})]),
    ])

    result = validate_tile(str(path), required_layers=["buildings"], min_features=2, required_properties={"roads": ["name"]})

    assert result.pass_ is False
    assert [error["code"] for error in result.errors] == ["MISSING_LAYER", "MISSING_PROPERTY", "LOW_TOTAL_FEATURES"]


def test_detects_geometry_errors_and_decodes_gzip(tmp_path):
    path = write_tile(tmp_path, [
        layer("buildings", [
            feature(3, [[{"x": 0, "y": 0}, {"x": 10, "y": 10}, {"x": 0, "y": 10}, {"x": 10, "y": 0}, {"x": 0, "y": 0}]], {"height": "12"}),
        ]),
    ], compress=True)

    result = validate_tile(str(path))

    assert result.pass_ is False
    assert result.errors[0]["code"] == "GEOMETRY_INVALID"
    assert any(detail["code"] == "SELF_INTERSECTION" for detail in result.errors[0]["details"])


def test_returns_decode_errors_for_invalid_protobuf_data(tmp_path):
    path = tmp_path / "bad.pbf"
    path.write_bytes(b"\xff\xff")

    result = validate_tile(str(path))

    assert result.pass_ is False
    assert result.errors[0]["code"] == "DECODE_ERROR"


def write_tile(tmp_path, layers, compress=False):
    path = tmp_path / "tile.pbf"
    tile = message([field(3, 2, encoded_layer) for encoded_layer in layers])
    path.write_bytes(gzip.compress(tile) if compress else tile)
    return path


def layer(name, features):
    keys = list(dict.fromkeys(key for item in features for key in item["properties"]))
    values = list(dict.fromkeys(value for item in features for value in item["properties"].values()))
    return message([
        field(15, 0, 2),
        field(1, 2, name.encode()),
        *[field(2, 2, encode_feature(item, keys, values)) for item in features],
        *[field(3, 2, key.encode()) for key in keys],
        *[field(4, 2, message([field(1, 2, str(value).encode())])) for value in values],
        field(5, 0, 4096),
    ])


def feature(geom_type, geometry, properties):
    return {"type": geom_type, "geometry": geometry, "properties": properties}


def encode_feature(item, keys, values):
    tags = []
    for key, value in item["properties"].items():
        tags.extend([keys.index(key), values.index(value)])
    return message([
        field(2, 2, packed(tags)),
        field(3, 0, item["type"]),
        field(4, 2, packed(encode_geometry(item["geometry"]))),
    ])


def encode_geometry(parts):
    x = 0
    y = 0
    commands = []
    for points in parts:
        commands.append((1 << 3) | 1)
        commands.extend([zig_zag(points[0]["x"] - x), zig_zag(points[0]["y"] - y)])
        x = points[0]["x"]
        y = points[0]["y"]
        body = points[1:]
        closes = bool(body) and body[-1] == points[0]
        line_points = body[:-1] if closes else body
        if line_points:
            commands.append((len(line_points) << 3) | 2)
            for point in line_points:
                commands.extend([zig_zag(point["x"] - x), zig_zag(point["y"] - y)])
                x = point["x"]
                y = point["y"]
        if closes:
            commands.append((1 << 3) | 7)
    return commands


def message(fields):
    return b"".join(fields)


def field(number, wire, value):
    tag = varint((number << 3) | wire)
    if wire == 0:
        return tag + varint(value)
    return tag + varint(len(value)) + value


def packed(values):
    return b"".join(varint(value) for value in values)


def varint(value):
    bytes_ = []
    value &= 0xFFFFFFFF
    while value > 0x7F:
        bytes_.append((value & 0x7F) | 0x80)
        value >>= 7
    bytes_.append(value)
    return bytes(bytes_)


def zig_zag(value):
    return (value << 1) ^ (value >> 31)
