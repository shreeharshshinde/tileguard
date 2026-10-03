/**
 * phase3-find-gd-tiles.mjs
 *
 * Scans pl_s1_b64_z14_tiles/, runs TileGuard on every tile, and collects
 * the exact z/x/y coordinates, layer names, feature indices, and tile-space
 * bounding boxes for all Genuine Defect (self-intersection) diagnostics.
 *
 * Output: analysis/phase3-pipeline/gd-tile-manifest.json
 *
 * Usage: node scripts/phase3-find-gd-tiles.mjs
 */

import { createEngine }     from '../packages/core/dist/index.js';
import { tilePlugin }       from '../packages/tile-rules/dist/index.js';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname }    from 'node:path';
import { fileURLToPath }    from 'node:url';
import { PbfReader as Pbf } from 'pbf';
import { VectorTile }       from '@mapbox/vector-tile';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const TILES_DIR = join(ROOT, 'tools', 'ofat-work', 'pl_s1_b64_z14_tiles');
const OUT_DIR   = join(ROOT, 'analysis', 'phase3-pipeline');
mkdirSync(OUT_DIR, { recursive: true });

// TileGuard engine — only geometry rules, same as pipeline
const engine = createEngine({
  plugins: [tilePlugin],
  rules: {
    'tile/self-intersection':   'error',
    'tile/coordinate-range':    'off',
    'tile/winding-order':       'off',
    'tile/unclosed-ring':       'off',
    'tile/zero-area-ring':      'off',
    'tile/hole-containment':    'off',
    'tile/degenerate-geometry': 'off',
    'tile/no-empty':            'off',
    'tile/required-layers':     'off',
    'tile/required-properties': 'off',
    'tile/feature-count':       'off',
    'tile/layer-feature-count': 'off',
    'perf/tile-size':           'off',
    'perf/vertex-budget':       'off',
    'perf/feature-density':     'off',
    'perf/layer-size':          'off',
  },
});

/** Recursively collect all .pbf files */
function collectPbfs(dir) {
  const pbfs = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) pbfs.push(...collectPbfs(full));
    else if (name.endsWith('.pbf')) pbfs.push(full);
  }
  return pbfs;
}

/**
 * Given a tile path like .../14/8535/5988.pbf, extract z/x/y.
 * Directory layout: <zoom>/<x>/<y>.pbf
 */
function parseTileCoords(path) {
  const parts = path.split('/');
  const y = parseInt(parts[parts.length - 1].replace('.pbf', ''), 10);
  const x = parseInt(parts[parts.length - 2], 10);
  const z = parseInt(parts[parts.length - 3], 10);
  return { z, x, y };
}

/**
 * Tile extent → WGS84 bounding box.
 * Standard Web Mercator tile bounds.
 */
function tileBBox(z, x, y) {
  const n = Math.pow(2, z);
  const west  = (x / n) * 360 - 180;
  const east  = ((x + 1) / n) * 360 - 180;
  const northRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const southRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
  return {
    west,
    east,
    north: (northRad * 180) / Math.PI,
    south: (southRad * 180) / Math.PI,
  };
}

/**
 * For a given feature in a tile, compute the tile-space bounding box
 * of all its geometry rings, then convert to WGS84.
 */
function featureBBoxWGS84(z, x, y, layerName, featureIndex) {
  const buf  = readFileSync(join(TILES_DIR, String(z), String(x), `${y}.pbf`));
  const tile = new VectorTile(new Pbf(buf));
  const layer = tile.layers[layerName];
  if (!layer) return null;

  const feature = layer.feature(featureIndex);
  const geom    = feature.loadGeometry(); // array of rings, each ring = [{x,y}]
  const extent  = layer.extent ?? 4096;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of geom) {
    for (const pt of ring) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  // Convert tile pixel coords to WGS84
  const tileBb = tileBBox(z, x, y);
  const tileW  = tileBb.east  - tileBb.west;
  const tileH  = tileBb.north - tileBb.south;

  return {
    west:  tileBb.west  + (minX / extent) * tileW,
    east:  tileBb.west  + (maxX / extent) * tileW,
    north: tileBb.north - (minY / extent) * tileH,
    south: tileBb.north - (maxY / extent) * tileH,
    centerLng: tileBb.west + ((minX + maxX) / 2 / extent) * tileW,
    centerLat: tileBb.north - ((minY + maxY) / 2 / extent) * tileH,
    tilePixels: { minX, minY, maxX, maxY, extent },
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const pbfs   = collectPbfs(TILES_DIR);
const gdTiles = [];

console.log(`Scanning ${pbfs.length} tiles for Genuine Defects…`);

for (const pbf of pbfs) {
  let result;
  try {
    result = await engine.run([pbf]);
  } catch {
    continue;
  }

  const gds = result.diagnostics.filter(d => d.ruleId === 'tile/self-intersection');
  if (gds.length === 0) continue;

  const { z, x, y } = parseTileCoords(pbf);
  const tileBb = tileBBox(z, x, y);

  for (const diag of gds) {
    const layer        = diag.location?.layer        ?? 'unknown';
    const featureIndex = diag.location?.featureIndex ?? 0;
    const featureBb    = featureBBoxWGS84(z, x, y, layer, featureIndex);

    gdTiles.push({
      path: pbf,
      z, x, y,
      tileBBox: tileBb,
      layer,
      featureIndex,
      message:   diag.message,
      featureBBox: featureBb,
    });

    console.log(`  GD found: z${z}/${x}/${y}  layer=${layer}  featureIdx=${featureIndex}`);
    if (featureBb) {
      console.log(`    center: ${featureBb.centerLat.toFixed(6)}, ${featureBb.centerLng.toFixed(6)}`);
    }
  }
}

console.log(`\nTotal GDs found: ${gdTiles.length}`);

const outPath = join(OUT_DIR, 'gd-tile-manifest.json');
writeFileSync(outPath, JSON.stringify(gdTiles, null, 2));
console.log(`Manifest: ${outPath}`);
