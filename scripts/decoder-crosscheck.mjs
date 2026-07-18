/**
 * Step 1.1 — Decoder Cross-Validation (HARD GATE)
 *
 * Compares TileGuard's decodeMvt() against the reference @mapbox/vector-tile
 * decoder across five dimensions:
 *   1. Layer names
 *   2. Feature count per layer
 *   3. Geometry types per feature
 *   4. Coordinate sequences per feature
 *   5. Feature properties per feature
 *
 * If ANY divergence is found, downstream offset-distribution analysis
 * must not proceed — it would be measuring a decoder bug, not tile data.
 */

import { VectorTile } from '@mapbox/vector-tile';
import fs from 'fs';
import path from 'path';
import { PbfReader as Pbf } from 'pbf';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';
import { decodeMvt } from '../packages/tile-rules/dist/pbf-decoder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '..', 'fixtures', 'benchmark-cache');
const ANALYSIS_DIR = path.join(__dirname, '..', 'analysis');

// One tile per dataset at varied zoom levels
const TILES_TO_CHECK = [
  { dataset: 'OpenMapTiles', file: '1-0-0.pbf' },
  { dataset: 'OpenFreeMap', file: '1-0-0.pbf' },
  { dataset: 'CARTO Streets', file: '1-0-0.pbf' },
];

function isGzipped(bytes) {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

/**
 * Decode a tile using the reference @mapbox/vector-tile library.
 * Returns a normalized structure comparable to TileGuard's output.
 */
function decodeWithReference(bytes) {
  const tile = new VectorTile(new Pbf(bytes));
  const layers = {};

  for (const layerName of Object.keys(tile.layers)) {
    const refLayer = tile.layers[layerName];
    const features = [];

    for (let i = 0; i < refLayer.length; i++) {
      const feature = refLayer.feature(i);

      // Extract coordinates using loadGeometry() — returns array of arrays of {x,y}
      const geometry = feature.loadGeometry();
      const coords = [];
      for (const ring of geometry) {
        const points = [];
        for (const point of ring) {
          points.push({ x: point.x, y: point.y });
        }
        coords.push(points);
      }

      // Extract properties
      const properties = feature.properties || {};

      features.push({
        type: feature.type,
        coords,
        properties,
      });
    }

    layers[layerName] = {
      name: layerName,
      extent: refLayer.extent,
      featureCount: refLayer.length,
      features,
    };
  }

  return layers;
}

/**
 * Decode a tile using TileGuard's decodeMvt().
 * Returns a normalized structure comparable to the reference output.
 */
function decodeWithTileGuard(bytes) {
  const tile = decodeMvt(bytes);
  const layers = {};

  for (const [layerName, layer] of Object.entries(tile.layers)) {
    const features = [];

    for (const feature of layer.features) {
      // Normalize geometry to array of arrays of {x,y}
      // NOTE: For Point features (type 1), TileGuard's decodeGeometry() returns
      // a flat array [p1, p2, ...] (via parts.flat() on line 346 of pbf-decoder.ts),
      // while @mapbox/vector-tile returns [[p1], [p2], ...] (each point in its own sub-array).
      // Both represent the same coordinate data — this is a known structural normalization
      // difference, not a coordinate decoding bug. We normalize both to the same structure
      // (each point in its own sub-array) for comparison.
      let coords;
      if (feature.type === 1) {
        // Point: geometry is flat array of {x,y} — wrap each point in its own sub-array
        // to match reference decoder's [[p1], [p2], ...] format
        coords = feature.geometry.map((p) => [{ x: p.x, y: p.y }]);
      } else {
        // LineString/Polygon: geometry is array of arrays of {x,y}
        coords = feature.geometry.map((ring) => ring.map((p) => ({ x: p.x, y: p.y })));
      }

      features.push({
        type: feature.type,
        coords,
        properties: feature.properties || {},
      });
    }

    layers[layerName] = {
      name: layerName,
      extent: layer.extent,
      featureCount: layer.features.length,
      features,
    };
  }

  return layers;
}

function compareDecoders(tgLayers, refLayers, tileId) {
  const divergences = [];

  // Dimension 1: Layer names
  const tgLayerNames = Object.keys(tgLayers).sort();
  const refLayerNames = Object.keys(refLayers).sort();

  if (JSON.stringify(tgLayerNames) !== JSON.stringify(refLayerNames)) {
    divergences.push({
      dimension: 'layer_names',
      tile: tileId,
      expected: refLayerNames,
      actual: tgLayerNames,
      message: `Layer name mismatch: reference has [${refLayerNames.join(', ')}], TileGuard has [${tgLayerNames.join(', ')}]`,
    });
    // Can't compare further if layers differ
    return divergences;
  }

  for (const layerName of refLayerNames) {
    const refLayer = refLayers[layerName];
    const tgLayer = tgLayers[layerName];

    // Dimension 2: Feature count
    if (refLayer.featureCount !== tgLayer.featureCount) {
      divergences.push({
        dimension: 'feature_count',
        tile: tileId,
        layer: layerName,
        expected: refLayer.featureCount,
        actual: tgLayer.featureCount,
        message: `Feature count mismatch in layer "${layerName}": reference=${refLayer.featureCount}, TileGuard=${tgLayer.featureCount}`,
      });
      continue; // Can't compare features if counts differ
    }

    for (let fi = 0; fi < refLayer.features.length; fi++) {
      const refFeature = refLayer.features[fi];
      const tgFeature = tgLayer.features[fi];

      // Dimension 3: Geometry type
      if (refFeature.type !== tgFeature.type) {
        divergences.push({
          dimension: 'geometry_type',
          tile: tileId,
          layer: layerName,
          featureIndex: fi,
          expected: refFeature.type,
          actual: tgFeature.type,
          message: `Geometry type mismatch in "${layerName}" feature ${fi}: reference=${refFeature.type}, TileGuard=${tgFeature.type}`,
        });
        continue;
      }

      // Dimension 4: Coordinate sequences
      const refCoordStr = JSON.stringify(refFeature.coords);
      const tgCoordStr = JSON.stringify(tgFeature.coords);

      if (refCoordStr !== tgCoordStr) {
        // Find first differing point for a useful error message
        let diffDetail = '';
        for (let ri = 0; ri < Math.max(refFeature.coords.length, tgFeature.coords.length); ri++) {
          const refRing = refFeature.coords[ri] || [];
          const tgRing = tgFeature.coords[ri] || [];
          if (refRing.length !== tgRing.length) {
            diffDetail = `ring ${ri} length: ref=${refRing.length}, tg=${tgRing.length}`;
            break;
          }
          for (let pi = 0; pi < refRing.length; pi++) {
            if (refRing[pi].x !== tgRing[pi].x || refRing[pi].y !== tgRing[pi].y) {
              diffDetail = `ring ${ri} point ${pi}: ref=(${refRing[pi].x},${refRing[pi].y}), tg=(${tgRing[pi].x},${tgRing[pi].y})`;
              break;
            }
          }
          if (diffDetail) break;
        }

        divergences.push({
          dimension: 'coordinate_sequence',
          tile: tileId,
          layer: layerName,
          featureIndex: fi,
          detail: diffDetail,
          message: `Coordinate mismatch in "${layerName}" feature ${fi}: ${diffDetail}`,
        });
      }

      // Dimension 5: Feature properties
      const refPropStr = JSON.stringify(
        refFeature.properties,
        Object.keys(refFeature.properties).sort(),
      );
      const tgPropStr = JSON.stringify(
        tgFeature.properties,
        Object.keys(tgFeature.properties).sort(),
      );

      if (refPropStr !== tgPropStr) {
        const refKeys = Object.keys(refFeature.properties).sort();
        const tgKeys = Object.keys(tgFeature.properties).sort();
        let diffDetail = '';

        if (JSON.stringify(refKeys) !== JSON.stringify(tgKeys)) {
          diffDetail = `key sets differ: ref=[${refKeys.join(',')}], tg=[${tgKeys.join(',')}]`;
        } else {
          for (const key of refKeys) {
            if (refFeature.properties[key] !== tgFeature.properties[key]) {
              diffDetail = `key "${key}": ref=${JSON.stringify(refFeature.properties[key])}, tg=${JSON.stringify(tgFeature.properties[key])}`;
              break;
            }
          }
        }

        divergences.push({
          dimension: 'feature_properties',
          tile: tileId,
          layer: layerName,
          featureIndex: fi,
          detail: diffDetail,
          message: `Property mismatch in "${layerName}" feature ${fi}: ${diffDetail}`,
        });
      }
    }
  }

  return divergences;
}

async function main() {
  console.log('=== STEP 1.1: DECODER CROSS-VALIDATION (HARD GATE) ===\n');

  if (!fs.existsSync(ANALYSIS_DIR)) {
    fs.mkdirSync(ANALYSIS_DIR, { recursive: true });
  }

  const allDivergences = [];
  let totalLayers = 0;
  let totalFeatures = 0;

  for (const { dataset, file } of TILES_TO_CHECK) {
    const filepath = path.join(CACHE_DIR, dataset, file);
    if (!fs.existsSync(filepath)) {
      console.error(`MISSING: ${filepath} — cannot cross-validate`);
      process.exit(1);
    }

    const tileId = `${dataset}/${file}`;
    console.log(`Checking ${tileId}...`);

    let rawBytes = fs.readFileSync(filepath);
    if (isGzipped(rawBytes)) {
      rawBytes = gunzipSync(rawBytes);
    }

    const refLayers = decodeWithReference(rawBytes);
    const tgLayers = decodeWithTileGuard(rawBytes);

    const layerCount = Object.keys(refLayers).length;
    const featureCount = Object.values(refLayers).reduce((sum, l) => sum + l.featureCount, 0);
    totalLayers += layerCount;
    totalFeatures += featureCount;

    console.log(`  Layers: ${layerCount}, Features: ${featureCount}`);

    const divergences = compareDecoders(tgLayers, refLayers, tileId);
    if (divergences.length > 0) {
      console.log(`  ❌ ${divergences.length} DIVERGENCE(S) FOUND`);
      for (const d of divergences) {
        console.log(`     [${d.dimension}] ${d.message}`);
      }
    } else {
      console.log(`  ✅ All 5 dimensions match`);
    }

    allDivergences.push(...divergences);
  }

  // Write results
  const report = {
    timestamp: new Date().toISOString(),
    tilesChecked: TILES_TO_CHECK.length,
    totalLayers,
    totalFeatures,
    totalDivergences: allDivergences.length,
    verdict: allDivergences.length === 0 ? 'PASS' : 'FAIL',
    divergences: allDivergences,
  };

  const outputPath = path.join(ANALYSIS_DIR, 'decoder-crosscheck.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to: ${outputPath}`);

  console.log('\n=== VERDICT ===');
  if (allDivergences.length === 0) {
    console.log(
      `✅ PASS — TileGuard decoder matches reference across ${totalFeatures} features in ${totalLayers} layers.`,
    );
    console.log('   Hypothesis C (decoder bug) is ELIMINATED.');
    console.log('   Offset distribution analysis (Step 1.2) may proceed.');
  } else {
    console.log(`❌ FAIL — ${allDivergences.length} divergence(s) found.`);
    console.log('   HARD STOP: Fix the decoder before proceeding with any downstream analysis.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Decoder cross-validation failed:', err);
  process.exit(1);
});
