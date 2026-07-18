/**
 * Step 1.2 — Signed Offset Distribution Analysis
 *
 * Prerequisites: Step 1.1 (decoder cross-validation) must have PASSED.
 *
 * This script:
 *   1. Caches 100 tiles per dataset (reuses fixtures/benchmark-cache/)
 *   2. Decodes each tile directly with decodeMvt() (bypassing the engine)
 *   3. For every coordinate outside [0, extent], records:
 *      - Signed offset and direction (below-zero vs above-extent)
 *      - Layer name, geometry type, feature properties
 *   4. Cross-provider identity verification: matches features across providers
 *      by property values (e.g., "name"), not just coincidental offset magnitude
 *   5. Outputs: analysis/offset-distribution.json, .csv, offset-histogram.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';
import { decodeMvt } from '../packages/tile-rules/dist/pbf-decoder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '..', 'fixtures', 'benchmark-cache');
const ANALYSIS_DIR = path.join(__dirname, '..', 'analysis');

// ─── Tile list (same 100 tiles as benchmark.mjs) ───────────────────────────
const TILES = [];
TILES.push({ z: 0, x: 0, y: 0 });
for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) TILES.push({ z: 1, x, y });
for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) TILES.push({ z: 2, x, y });
for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) TILES.push({ z: 3, x, y });
let z4count = 0;
for (let x = 0; x < 4; x++)
  for (let y = 0; y < 4; y++) {
    if (z4count < 15) {
      TILES.push({ z: 4, x, y });
      z4count++;
    }
  }

const DATASETS = [
  {
    name: 'OpenMapTiles',
    urlPattern: (z, x, y) => `https://demotiles.maplibre.org/tiles/${z}/${x}/${y}.pbf`,
  },
  {
    name: 'OpenFreeMap',
    urlPattern: (z, x, y) =>
      `https://tiles.openfreemap.org/planet/20260621_080001_pt/${z}/${x}/${y}.pbf`,
  },
  {
    name: 'CARTO Streets',
    urlPattern: (z, x, y) =>
      `https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/${z}/${x}/${y}.mvt`,
  },
];

const GEOMETRY_TYPE_NAMES = { 0: 'Unknown', 1: 'Point', 2: 'LineString', 3: 'Polygon' };

// ─── Caching ────────────────────────────────────────────────────────────────
function isGzipped(bytes) {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

async function ensureCached(dataset) {
  const dir = path.join(CACHE_DIR, dataset.name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let success = 0,
    fail = 0;
  for (const t of TILES) {
    const filename = `${t.z}-${t.x}-${t.y}.pbf`;
    const filepath = path.join(dir, filename);
    if (fs.existsSync(filepath) && fs.statSync(filepath).size > 0) {
      success++;
      continue;
    }

    const url = dataset.urlPattern(t.z, t.x, t.y);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength === 0) throw new Error('0 bytes');
      fs.writeFileSync(filepath, Buffer.from(buf));
      success++;
    } catch (err) {
      console.warn(`  FAILED: ${url} — ${err.message}`);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      fail++;
    }
  }
  console.log(`  Cache: ${success}/${TILES.length} tiles, ${fail} failed`);
  if (success / TILES.length < 0.9) {
    throw new Error(`Cache rate ${((success / TILES.length) * 100).toFixed(1)}% < 90% threshold`);
  }
  return { success, fail };
}

// ─── Signed offset computation ──────────────────────────────────────────────
function classifyAxis(value, extent) {
  if (value < 0) return { offset: value, direction: 'below-zero' };
  if (value > extent) return { offset: value - extent, direction: 'above-extent' };
  return { offset: 0, direction: 'in-range' };
}

function getSignedBucket(offset) {
  const abs = Math.abs(offset);
  const sign = offset < 0 ? '-' : '+';
  if (offset === 0) return '0 (in-range)';
  if (abs <= 64) return `${sign}1 to ${sign}64`;
  if (abs <= 128) return `${sign}65 to ${sign}128`;
  if (abs <= 256) return `${sign}129 to ${sign}256`;
  if (abs <= 512) return `${sign}257 to ${sign}512`;
  if (abs <= 1024) return `${sign}513 to ${sign}1024`;
  if (abs <= 4096) return `${sign}1025 to ${sign}4096`;
  return `${sign}>4096`;
}

// ─── Main analysis ──────────────────────────────────────────────────────────
async function main() {
  console.log('=== STEP 1.2: SIGNED OFFSET DISTRIBUTION ANALYSIS ===\n');
  if (!fs.existsSync(ANALYSIS_DIR)) fs.mkdirSync(ANALYSIS_DIR, { recursive: true });

  const allEntries = []; // Every out-of-range coordinate
  const crossProviderMap = {}; // tile → layer → featureIndex → { providers, properties }

  for (const dataset of DATASETS) {
    console.log(`Processing ${dataset.name}...`);
    await ensureCached(dataset);

    const dir = path.join(CACHE_DIR, dataset.name);
    let tilesProcessed = 0;

    for (const t of TILES) {
      const filename = `${t.z}-${t.x}-${t.y}.pbf`;
      const filepath = path.join(dir, filename);
      if (!fs.existsSync(filepath) || fs.statSync(filepath).size === 0) continue;

      let rawBytes = fs.readFileSync(filepath);
      if (isGzipped(rawBytes)) rawBytes = gunzipSync(rawBytes);

      const tile = decodeMvt(rawBytes);
      tilesProcessed++;

      for (const [layerName, layer] of Object.entries(tile.layers)) {
        for (let fi = 0; fi < layer.features.length; fi++) {
          const feature = layer.features[fi];
          const geomType = GEOMETRY_TYPE_NAMES[feature.type] || 'Unknown';

          // Get feature parts (normalize Point flat array)
          let parts;
          if (feature.type === 1) {
            parts = [feature.geometry];
          } else {
            parts = feature.geometry;
          }

          // Extract identifying properties for cross-provider matching
          const props = feature.properties || {};
          const identityProps = {};
          for (const key of ['name', 'name:en', 'class', 'subclass', 'rank']) {
            if (props[key] !== undefined && props[key] !== null) {
              identityProps[key] = props[key];
            }
          }

          for (let pi = 0; pi < parts.length; pi++) {
            const points = parts[pi];
            for (let ptIdx = 0; ptIdx < points.length; ptIdx++) {
              const point = points[ptIdx];
              const xClass = classifyAxis(point.x, layer.extent);
              const yClass = classifyAxis(point.y, layer.extent);

              if (xClass.direction !== 'in-range' || yClass.direction !== 'in-range') {
                const entry = {
                  dataset: dataset.name,
                  tile: filename.replace('.pbf', ''),
                  layer: layerName,
                  featureIndex: fi,
                  geometryType: geomType,
                  extent: layer.extent,
                  x: point.x,
                  y: point.y,
                  xOffset: xClass.offset,
                  yOffset: yClass.offset,
                  xDirection: xClass.direction,
                  yDirection: yClass.direction,
                  xBucket: getSignedBucket(xClass.offset),
                  yBucket: getSignedBucket(yClass.offset),
                  properties: identityProps,
                };
                allEntries.push(entry);

                // Track for cross-provider identity matching
                const tileKey = filename.replace('.pbf', '');
                const featureKey = `${layerName}:${fi}`;
                if (!crossProviderMap[tileKey]) crossProviderMap[tileKey] = {};
                if (!crossProviderMap[tileKey][featureKey]) {
                  crossProviderMap[tileKey][featureKey] = { providers: {}, properties: {} };
                }
                crossProviderMap[tileKey][featureKey].providers[dataset.name] = {
                  x: point.x,
                  y: point.y,
                  xOffset: xClass.offset,
                  yOffset: yClass.offset,
                  xDirection: xClass.direction,
                  yDirection: yClass.direction,
                };
                crossProviderMap[tileKey][featureKey].properties[dataset.name] = identityProps;
              }
            }
          }
        }
      }
    }

    console.log(`  Tiles processed: ${tilesProcessed}`);
    console.log(
      `  Out-of-range entries so far: ${allEntries.filter((e) => e.dataset === dataset.name).length}`,
    );
  }

  // ─── Compute aggregates ─────────────────────────────────────────────────
  const histogram = {};
  const layerBreakdown = {};
  const geomBreakdown = {};
  const directionBreakdown = { 'below-zero': 0, 'above-extent': 0 };
  const perDataset = {};

  for (const e of allEntries) {
    // X-axis histogram (most diagnostics are x-axis violations)
    if (e.xDirection !== 'in-range') {
      histogram[e.xBucket] = (histogram[e.xBucket] || 0) + 1;
      directionBreakdown[e.xDirection]++;
    }
    if (e.yDirection !== 'in-range') {
      histogram[e.yBucket] = (histogram[e.yBucket] || 0) + 1;
      directionBreakdown[e.yDirection]++;
    }

    layerBreakdown[e.layer] = (layerBreakdown[e.layer] || 0) + 1;
    geomBreakdown[e.geometryType] = (geomBreakdown[e.geometryType] || 0) + 1;

    if (!perDataset[e.dataset]) perDataset[e.dataset] = 0;
    perDataset[e.dataset]++;
  }

  // ─── Cross-provider identity verification ───────────────────────────────
  // Find features that appear in multiple providers on the same tile+layer+index
  // and verify identity via properties, not just coincidental offset
  const crossProviderMatches = [];
  for (const [tileKey, features] of Object.entries(crossProviderMap)) {
    for (const [featureKey, data] of Object.entries(features)) {
      const providerNames = Object.keys(data.providers);
      if (providerNames.length < 2) continue;

      // Check property-based identity
      const propSets = Object.entries(data.properties);
      const firstProps = propSets[0][1];
      const hasName = firstProps.name !== undefined;

      let identityConfirmed = false;
      let identityMethod = 'none';

      if (hasName) {
        // Verify all providers have the same 'name' property
        const names = propSets.map(([, p]) => p.name);
        identityConfirmed = names.every((n) => n === names[0]);
        identityMethod = identityConfirmed ? 'name-match' : 'name-mismatch';
      } else {
        // No name property — check class+subclass
        const classes = propSets.map(([, p]) => `${p.class || ''}:${p.subclass || ''}`);
        identityConfirmed = classes.every((c) => c === classes[0]);
        identityMethod = identityConfirmed ? 'class-match' : 'class-mismatch';
      }

      crossProviderMatches.push({
        tile: tileKey,
        feature: featureKey,
        providers: data.providers,
        properties: data.properties,
        identityConfirmed,
        identityMethod,
      });
    }
  }

  const confirmedSameFeature = crossProviderMatches.filter((m) => m.identityConfirmed);
  const unconfirmedSameFeature = crossProviderMatches.filter((m) => !m.identityConfirmed);

  // ─── Build report ───────────────────────────────────────────────────────
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalEntries: allEntries.length,
      perDataset,
      directionBreakdown,
    },
    histogram,
    layerBreakdown,
    geometryTypeBreakdown: geomBreakdown,
    crossProviderIdentity: {
      totalMatches: crossProviderMatches.length,
      confirmedSameFeature: confirmedSameFeature.length,
      unconfirmedSameFeature: unconfirmedSameFeature.length,
      samples: confirmedSameFeature.slice(0, 10),
    },
    entries: allEntries,
  };

  // ─── Write JSON ─────────────────────────────────────────────────────────
  fs.writeFileSync(
    path.join(ANALYSIS_DIR, 'offset-distribution.json'),
    JSON.stringify(report, null, 2),
  );

  // ─── Write CSV ──────────────────────────────────────────────────────────
  const csvHeader =
    'dataset,tile,layer,featureIndex,geometryType,extent,x,y,xOffset,yOffset,xDirection,yDirection,xBucket,yBucket,name,class\n';
  const csvRows = allEntries
    .map(
      (e) =>
        `${e.dataset},${e.tile},${e.layer},${e.featureIndex},${e.geometryType},${e.extent},${e.x},${e.y},${e.xOffset},${e.yOffset},${e.xDirection},${e.yDirection},"${e.xBucket}","${e.yBucket}","${e.properties.name || ''}","${e.properties.class || ''}"`,
    )
    .join('\n');
  fs.writeFileSync(path.join(ANALYSIS_DIR, 'offset-distribution.csv'), csvHeader + csvRows);

  // ─── Write Markdown histogram ───────────────────────────────────────────
  const sortedBuckets = Object.entries(histogram).sort((a, b) => {
    // Sort by numeric magnitude, negatives first
    const parseKey = (k) => {
      if (k === '0 (in-range)') return 0;
      const match = k.match(/([+-])(\d+|>?\d+)/);
      if (!match) return 0;
      const sign = match[1] === '-' ? -1 : 1;
      const val = match[2].startsWith('>') ? 99999 : parseInt(match[2]);
      return sign * val;
    };
    return parseKey(a[0]) - parseKey(b[0]);
  });

  let md = `# Offset Distribution Analysis\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n| :--- | :--- |\n`;
  md += `| Total out-of-range coordinates | ${allEntries.length} |\n`;
  for (const [ds, count] of Object.entries(perDataset)) {
    md += `| ${ds} | ${count} |\n`;
  }
  md += `| Direction: below-zero | ${directionBreakdown['below-zero']} |\n`;
  md += `| Direction: above-extent | ${directionBreakdown['above-extent']} |\n`;
  md += `\n---\n\n`;

  md += `## Signed Offset Histogram\n\n`;
  md += `| Bucket | Count |\n| :--- | ---: |\n`;
  for (const [bucket, count] of sortedBuckets) {
    md += `| ${bucket} | ${count} |\n`;
  }

  md += `\n---\n\n## Layer Breakdown\n\n`;
  md += `| Layer | Count |\n| :--- | ---: |\n`;
  const sortedLayers = Object.entries(layerBreakdown).sort((a, b) => b[1] - a[1]);
  for (const [layer, count] of sortedLayers) {
    md += `| ${layer} | ${count} |\n`;
  }

  md += `\n---\n\n## Geometry Type Breakdown\n\n`;
  md += `| Type | Count |\n| :--- | ---: |\n`;
  for (const [type, count] of Object.entries(geomBreakdown)) {
    md += `| ${type} | ${count} |\n`;
  }

  md += `\n---\n\n## Cross-Provider Identity Verification\n\n`;
  md += `Features appearing on the same tile/layer/index across multiple providers,\n`;
  md += `with identity verified via property values (name, class) rather than offset magnitude.\n\n`;
  md += `| Metric | Value |\n| :--- | ---: |\n`;
  md += `| Features appearing in ≥2 providers | ${crossProviderMatches.length} |\n`;
  md += `| Identity confirmed (property match) | ${confirmedSameFeature.length} |\n`;
  md += `| Identity unconfirmed | ${unconfirmedSameFeature.length} |\n`;

  if (confirmedSameFeature.length > 0) {
    md += `\n### Confirmed Same-Feature Examples\n\n`;
    md += `| Tile | Feature | Name | Providers & Offsets |\n| :--- | :--- | :--- | :--- |\n`;
    for (const m of confirmedSameFeature.slice(0, 15)) {
      const name = Object.values(m.properties)[0]?.name || '(no name)';
      const offsets = Object.entries(m.providers)
        .map(([p, v]) => `${p}: x=${v.xOffset} (${v.xDirection})`)
        .join('; ');
      md += `| ${m.tile} | ${m.feature} | ${name} | ${offsets} |\n`;
    }
  }

  fs.writeFileSync(path.join(ANALYSIS_DIR, 'offset-histogram.md'), md);

  // ─── Console summary ───────────────────────────────────────────────────
  console.log(`\n=== RESULTS ===`);
  console.log(`Total out-of-range coordinates: ${allEntries.length}`);
  console.log(`Per dataset:`, perDataset);
  console.log(`Direction breakdown:`, directionBreakdown);
  console.log(`\nLayer breakdown:`, layerBreakdown);
  console.log(`Geometry type breakdown:`, geomBreakdown);
  console.log(`\nCross-provider identity matches: ${crossProviderMatches.length}`);
  console.log(`  Confirmed (property-verified): ${confirmedSameFeature.length}`);
  console.log(`  Unconfirmed: ${unconfirmedSameFeature.length}`);
  console.log(`\nTop histogram buckets:`);
  for (const [bucket, count] of sortedBuckets.slice(0, 10)) {
    console.log(`  ${bucket}: ${count}`);
  }
  console.log(`\nArtifacts written to: ${ANALYSIS_DIR}/`);
}

main().catch((err) => {
  console.error('Offset distribution analysis failed:', err);
  process.exit(1);
});
