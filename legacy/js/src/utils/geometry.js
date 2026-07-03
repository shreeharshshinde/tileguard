export function validateFeatureGeometry(feature, extent = 4096) {
  const errors = [];
  const geometries = Array.isArray(feature.geometry) ? feature.geometry : [];
  const type = feature.type;

  if (!geometries.length) {
    errors.push({ code: 'EMPTY_GEOMETRY', message: 'Feature has no geometry commands' });
    return errors;
  }

  const parts = type === 1 ? [geometries] : geometries;
  for (let partIndex = 0; partIndex < parts.length; partIndex++) {
    const points = parts[partIndex];
    validateCoordinateRange(points, extent, errors, partIndex);

    if (type === 2) validateLine(points, errors, partIndex);
    if (type === 3) validateRing(points, errors, partIndex);
  }

  if (type === 2 || type === 3) {
    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      validateSelfIntersections(parts[partIndex], type === 3, errors, partIndex);
    }
  }

  return errors;
}

function validateCoordinateRange(points, extent, errors, partIndex) {
  for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
    const point = points[pointIndex];
    if (point.x < 0 || point.x > extent || point.y < 0 || point.y > extent) {
      errors.push({
        code: 'OUT_OF_RANGE',
        message: `Coordinate (${point.x}, ${point.y}) is outside tile extent 0-${extent}`,
        partIndex,
        pointIndex
      });
    }
  }
}

function validateLine(points, errors, partIndex) {
  if (uniquePointCount(points) < 2) {
    errors.push({
      code: 'DEGENERATE_LINE',
      message: 'LineString has fewer than 2 unique points',
      partIndex
    });
  }
}

function validateRing(points, errors, partIndex) {
  if (points.length < 4 || uniquePointCount(points) < 3) {
    errors.push({
      code: 'DEGENERATE_POLYGON',
      message: 'Polygon ring has fewer than 3 unique vertices',
      partIndex
    });
  }

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || first.x !== last.x || first.y !== last.y) {
    errors.push({
      code: 'UNCLOSED_RING',
      message: 'Polygon ring is not closed',
      partIndex
    });
  }

  if (Math.abs(signedArea(points)) === 0) {
    errors.push({
      code: 'ZERO_AREA_RING',
      message: 'Polygon ring has zero signed area',
      partIndex
    });
  }
}

function validateSelfIntersections(points, closed, errors, partIndex) {
  const segmentCount = points.length - 1;
  for (let i = 0; i < segmentCount; i++) {
    for (let j = i + 1; j < segmentCount; j++) {
      if (Math.abs(i - j) <= 1) continue;
      if (closed && i === 0 && j === segmentCount - 1) continue;

      if (segmentsIntersect(points[i], points[i + 1], points[j], points[j + 1])) {
        errors.push({
          code: 'SELF_INTERSECTION',
          message: `Segments ${i} and ${j} intersect`,
          partIndex,
          segments: [i, j]
        });
        return;
      }
    }
  }
}

function uniquePointCount(points) {
  return new Set(points.map((p) => `${p.x},${p.y}`)).size;
}

function signedArea(points) {
  let area = 0;
  for (let i = 0; i < points.length - 1; i++) {
    area += points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
  }
  return area / 2;
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;
  return false;
}

function orientation(a, b, c) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (value === 0) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a, b, c) {
  return b.x <= Math.max(a.x, c.x) && b.x >= Math.min(a.x, c.x)
    && b.y <= Math.max(a.y, c.y) && b.y >= Math.min(a.y, c.y);
}
