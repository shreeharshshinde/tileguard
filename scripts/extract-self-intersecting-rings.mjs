/**
 * extract-self-intersecting-rings.mjs
 *
 * Phase 2 Step 2 — Root Cause Investigation
 *
 * For every flagged ring in the 294-tile benchmark corpus, extracts:
 *   - dataset, tile filename, layer name, feature index, part (ring) index
 *   - geometry type (LineString=2, Polygon=3)
 *   - vertex count (full ring including closing vertex for polygons)
 *   - the intersecting segment pair indices (first, second)
 *   - the four endpoint coordinates of the two intersecting segments
 *   - the intersection point (exact for proper crossings; approximate for collinear cases)
 *   - the distance from the intersection point to the nearest tile boundary (0 or 4096 edge)
 *   - whether the intersection is collinear (orientation = 0 for both segment pairs)
 *   - whether intersection point equals a vertex of either segment (touch-at-vertex pattern)
 *   - the full ring vertex list (for shape inspection)
 *
 * Output: analysis/self-intersection-rings.json (one record per flagged ring)
 *         analysis/self-intersection-rings.csv  (flattened, without vertex list)
 *
 * Usage: node scripts/extract-self-intersecting-rings.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader as Pbf } from 'pbf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', 'fixtures', 'benchmark-cache');
const OUT_DIR = path.join(__dirname, '..', 'analysis');

const TILE_EXTENT = 4096;
const DATASETS = ['OpenMapTiles', 'OpenFreeMap', 'CARTO Streets'];

// ---------------------------------------------------------------------------
// Geometry primitives (mirror of geometry.ts — pure JS for script use)
// ---------------------------------------------------------------------------

function orientation(a, b, c) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (value === 0) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a, b, c) {
  return (
    b.x <= Math.max(a.x, c.x) &&
    b.x >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) &&
    b.y >= Math.min(a.y, c.y)
  );
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return { type: 'proper' };
  if (o1 === 0 && onSegment(a, c, b)) return { type: 'collinear', touchPoint: c };
  if (o2 === 0 && onSegment(a, d, b)) return { type: 'collinear', touchPoint: d };
  if (o3 === 0 && onSegment(c, a, d)) return { type: 'collinear', touchPoint: a };
  if (o4 === 0 && onSegment(c, b, d)) return { type: 'collinear', touchPoint: b };
  return null;
}

/**
 * For a proper crossing, compute the intersection point via parametric line intersection.
 * Returns null if lines are parallel (shouldn't happen after segmentsIntersect says 'proper').
 */
function computeProperIntersection(a, b, c, d) {
  const denom = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (denom === 0) return null;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denom;
  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };
}

function distToNearestBoundary(pt, extent) {
  return Math.min(pt.x, pt.y, extent - pt.x, extent - pt.y);
}

function pointEquals(p, q) {
  return p.x === q.x && p.y === q.y;
}

function isOnBoundary(pt, extent) {
  return pt.x === 0 || pt.y === 0 || pt.x === extent || pt.y === extent;
}

function findFirstSelfIntersection(points, closed) {
  const segmentCount = points.length - 1;
  for (let first = 0; first < segmentCount; first++) {
    for (let second = first + 1; second < segmentCount; second++) {
      if (Math.abs(first - second) <= 1) continue;
      if (closed && first === 0 && second === segmentCount - 1) continue;

      const a = points[first];
      const b = points[first + 1];
      const c = points[second];
      const d = points[second + 1];

      const hit = segmentsIntersect(a, b, c, d);
      if (hit) {
        return { first, second, a, b, c, d, hit };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Feature geometry extraction (mirrors getFeatureParts from types.ts)
// ---------------------------------------------------------------------------

function getFeatureParts(feature) {
  // @mapbox/vector-tile loadGeometry() returns array of rings/lines
  try {
    const geom = feature.loadGeometry();
    return geom;
  } catch (_) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main extraction loop
// ---------------------------------------------------------------------------

const records = [];

for (const dataset of DATASETS) {
  const dir = path.join(CACHE_DIR, dataset);
  if (!fs.existsSync(dir)) {
    console.warn(`Cache directory missing: ${dir}`);
    continue;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.pbf'));
  console.log(`${dataset}: processing ${files.length} tiles...`);

  for (const filename of files) {
    const filepath = path.join(dir, filename);
    const stat = fs.statSync(filepath);
    if (stat.size === 0) continue;

    let tile;
    try {
      const buf = fs.readFileSync(filepath);
      tile = new VectorTile(new Pbf(buf));
    } catch (e) {
      console.warn(`  Skipping ${filename}: ${e.message}`);
      continue;
    }

    // Parse z/x/y from filename e.g. "3-2-1.pbf"
    const [zStr, xStr, yStr] = filename.replace('.pbf', '').split('-');
    const tileZ = Number(zStr);
    const tileX = Number(xStr);
    const tileY = Number(yStr);

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      const extent = layer.extent ?? TILE_EXTENT;

      for (let featureIndex = 0; featureIndex < layer.length; featureIndex++) {
        const feature = layer.feature(featureIndex);

        // Only LineString (2) and Polygon (3)
        if (feature.type !== 2 && feature.type !== 3) continue;

        const parts = getFeatureParts(feature);
        const isClosed = feature.type === 3;

        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
          const points = parts[partIndex];
          if (!points || points.length < 4) continue;

          const hit = findFirstSelfIntersection(points, isClosed);
          if (!hit) continue;

          const { first, second, a, b, c, d, hit: intersectionResult } = hit;

          // Determine intersection point
          let ixPt;
          let isCollinear = false;
          let isTouchAtVertex = false;

          if (intersectionResult.type === 'collinear') {
            isCollinear = true;
            ixPt = intersectionResult.touchPoint;
            isTouchAtVertex = true;
          } else {
            // proper crossing
            ixPt = computeProperIntersection(a, b, c, d) ?? a; // fallback
            // Check if the intersection point is exactly a vertex endpoint
            isTouchAtVertex =
              pointEquals(ixPt, a) ||
              pointEquals(ixPt, b) ||
              pointEquals(ixPt, c) ||
              pointEquals(ixPt, d);
          }

          const distBoundary = distToNearestBoundary(ixPt, extent);

          // Additional checks on segment endpoints
          const segEndpointsOnBoundary = [a, b, c, d].filter((p) => isOnBoundary(p, extent)).length;

          // Check for duplicate vertices in the ring (a common clipping artifact)
          const vertexSet = new Set(points.map((p) => `${p.x},${p.y}`));
          const hasDuplicateVertices = vertexSet.size < points.length;

          // Check if the two intersecting segments share an endpoint (touch-at-shared-vertex)
          const sharedVertex =
            pointEquals(b, c) || pointEquals(b, d) || pointEquals(a, c) || pointEquals(a, d);

          records.push({
            dataset,
            tile: filename,
            tileZ,
            tileX,
            tileY,
            layer: layerName,
            featureIndex,
            partIndex,
            geometryType: feature.type === 2 ? 'LineString' : 'Polygon',
            vertexCount: points.length,
            extent,

            // Intersection location
            segFirst: first,
            segSecond: second,
            seg1_ax: a.x,
            seg1_ay: a.y,
            seg1_bx: b.x,
            seg1_by: b.y,
            seg2_cx: c.x,
            seg2_cy: c.y,
            seg2_dx: d.x,
            seg2_dy: d.y,

            ixX: Math.round(ixPt.x * 1000) / 1000,
            ixY: Math.round(ixPt.y * 1000) / 1000,
            distToNearestBoundary: Math.round(distBoundary * 1000) / 1000,

            // Classification hints
            isCollinear,
            isTouchAtVertex,
            sharedVertex, // Two segments share an endpoint — classic figure-8 / pinch point
            segEndpointsOnBoundary, // How many of the 4 endpoints sit exactly on a tile edge

            hasDuplicateVertices, // Ring has at least one repeated vertex
            duplicateVertexCount: points.length - vertexSet.size,

            // Full ring vertices for shape inspection (array of {x,y})
            vertices: points.map((p) => ({ x: p.x, y: p.y })),
          });
        }
      }
    }
  }
}

console.log(`\nExtracted ${records.length} flagged rings total.`);

// ---------------------------------------------------------------------------
// Write JSON (full, with vertices)
// ---------------------------------------------------------------------------
const jsonPath = path.join(OUT_DIR, 'self-intersection-rings.json');
fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2));
console.log(`JSON written: ${jsonPath}`);

// ---------------------------------------------------------------------------
// Write CSV (without vertices — flat for spreadsheet / Python analysis)
// ---------------------------------------------------------------------------
const csvHeaders = [
  'dataset',
  'tile',
  'tileZ',
  'tileX',
  'tileY',
  'layer',
  'featureIndex',
  'partIndex',
  'geometryType',
  'vertexCount',
  'extent',
  'segFirst',
  'segSecond',
  'seg1_ax',
  'seg1_ay',
  'seg1_bx',
  'seg1_by',
  'seg2_cx',
  'seg2_cy',
  'seg2_dx',
  'seg2_dy',
  'ixX',
  'ixY',
  'distToNearestBoundary',
  'isCollinear',
  'isTouchAtVertex',
  'sharedVertex',
  'segEndpointsOnBoundary',
  'hasDuplicateVertices',
  'duplicateVertexCount',
];

const csvLines = [csvHeaders.join(',')];
for (const r of records) {
  csvLines.push(csvHeaders.map((h) => JSON.stringify(r[h] ?? '')).join(','));
}

const csvPath = path.join(OUT_DIR, 'self-intersection-rings.csv');
fs.writeFileSync(csvPath, csvLines.join('\n'));
console.log(`CSV written: ${csvPath}`);

// ---------------------------------------------------------------------------
// Quick summary
// ---------------------------------------------------------------------------
const byDataset = {};
const byLayer = {};
const byGeomType = {};
let collinearCount = 0;
let touchAtVertexCount = 0;
let sharedVertexCount = 0;
let nearBoundaryCount = 0; // dist <= 10
let duplicateVertexRings = 0;

for (const r of records) {
  byDataset[r.dataset] = (byDataset[r.dataset] || 0) + 1;
  byLayer[r.layer] = (byLayer[r.layer] || 0) + 1;
  byGeomType[r.geometryType] = (byGeomType[r.geometryType] || 0) + 1;
  if (r.isCollinear) collinearCount++;
  if (r.isTouchAtVertex) touchAtVertexCount++;
  if (r.sharedVertex) sharedVertexCount++;
  if (r.distToNearestBoundary <= 10) nearBoundaryCount++;
  if (r.hasDuplicateVertices) duplicateVertexRings++;
}

console.log('\n=== SUMMARY ===');
console.log('By dataset:', JSON.stringify(byDataset));
console.log('By geometry type:', JSON.stringify(byGeomType));
console.log('Collinear intersections:', collinearCount);
console.log('Touch-at-vertex (collinear or exact endpoint):', touchAtVertexCount);
console.log('Shared endpoint between intersecting segments:', sharedVertexCount);
console.log('Rings with duplicate vertices:', duplicateVertexRings);
console.log('Near-boundary intersections (dist <= 10):', nearBoundaryCount);
console.log('\nTop 20 layers:');
const layersSorted = Object.entries(byLayer)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);
for (const [l, c] of layersSorted) console.log(`  ${l}: ${c}`);
