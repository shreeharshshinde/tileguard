from __future__ import annotations


def validate_feature_geometry(feature: dict, extent: int = 4096) -> list[dict]:
    errors: list[dict] = []
    geometry = feature.get("geometry") or []
    geom_type = feature.get("type")
    if not geometry:
        return [{"code": "EMPTY_GEOMETRY", "message": "Feature has no geometry commands"}]

    parts = [geometry] if geom_type == 1 else geometry
    for part_index, points in enumerate(parts):
        _validate_coordinate_range(points, extent, errors, part_index)
        if geom_type == 2:
            _validate_line(points, errors, part_index)
        elif geom_type == 3:
            _validate_ring(points, errors, part_index)

    if geom_type in (2, 3):
        for part_index, points in enumerate(parts):
            _validate_self_intersections(points, geom_type == 3, errors, part_index)

    return errors


def _validate_coordinate_range(points: list[dict], extent: int, errors: list[dict], part_index: int) -> None:
    for point_index, point in enumerate(points):
        if point["x"] < 0 or point["x"] > extent or point["y"] < 0 or point["y"] > extent:
            errors.append({
                "code": "OUT_OF_RANGE",
                "message": f"Coordinate ({point['x']}, {point['y']}) is outside tile extent 0-{extent}",
                "part_index": part_index,
                "point_index": point_index,
            })


def _validate_line(points: list[dict], errors: list[dict], part_index: int) -> None:
    if _unique_point_count(points) < 2:
        errors.append({"code": "DEGENERATE_LINE", "message": "LineString has fewer than 2 unique points", "part_index": part_index})


def _validate_ring(points: list[dict], errors: list[dict], part_index: int) -> None:
    if len(points) < 4 or _unique_point_count(points) < 3:
        errors.append({"code": "DEGENERATE_POLYGON", "message": "Polygon ring has fewer than 3 unique vertices", "part_index": part_index})
    if not points or points[0] != points[-1]:
        errors.append({"code": "UNCLOSED_RING", "message": "Polygon ring is not closed", "part_index": part_index})
    if abs(_signed_area(points)) == 0:
        errors.append({"code": "ZERO_AREA_RING", "message": "Polygon ring has zero signed area", "part_index": part_index})


def _validate_self_intersections(points: list[dict], closed: bool, errors: list[dict], part_index: int) -> None:
    segment_count = len(points) - 1
    for first in range(segment_count):
        for second in range(first + 1, segment_count):
            if abs(first - second) <= 1:
                continue
            if closed and first == 0 and second == segment_count - 1:
                continue
            if _segments_intersect(points[first], points[first + 1], points[second], points[second + 1]):
                errors.append({
                    "code": "SELF_INTERSECTION",
                    "message": f"Segments {first} and {second} intersect",
                    "part_index": part_index,
                    "segments": [first, second],
                })
                return


def _unique_point_count(points: list[dict]) -> int:
    return len({(point["x"], point["y"]) for point in points})


def _signed_area(points: list[dict]) -> float:
    area = 0.0
    for index in range(len(points) - 1):
        area += points[index]["x"] * points[index + 1]["y"] - points[index + 1]["x"] * points[index]["y"]
    return area / 2


def _segments_intersect(a: dict, b: dict, c: dict, d: dict) -> bool:
    o1 = _orientation(a, b, c)
    o2 = _orientation(a, b, d)
    o3 = _orientation(c, d, a)
    o4 = _orientation(c, d, b)
    if o1 != o2 and o3 != o4:
        return True
    if o1 == 0 and _on_segment(a, c, b):
        return True
    if o2 == 0 and _on_segment(a, d, b):
        return True
    if o3 == 0 and _on_segment(c, a, d):
        return True
    return o4 == 0 and _on_segment(c, b, d)


def _orientation(a: dict, b: dict, c: dict) -> int:
    value = (b["y"] - a["y"]) * (c["x"] - b["x"]) - (b["x"] - a["x"]) * (c["y"] - b["y"])
    if value == 0:
        return 0
    return 1 if value > 0 else 2


def _on_segment(a: dict, b: dict, c: dict) -> bool:
    return min(a["x"], c["x"]) <= b["x"] <= max(a["x"], c["x"]) and min(a["y"], c["y"]) <= b["y"] <= max(a["y"], c["y"])
