/**
 * phase3-render-experiment.mjs  —  EXP-007
 *
 * Headless MapLibre rendering experiment.
 *
 * For each test case (synthetic fixture pairs + production GD tiles):
 *   1. Spin up a local HTTP server to serve .pbf tiles and MapLibre GL JS.
 *   2. Launch headless Chromium via Playwright.
 *   3. Load a minimal MapLibre map at 2048×2048 centred on the defect location.
 *   4. Screenshot the full map (defect tile) and the control tile (clean version).
 *   5. Crop a 256×256 region around the defect coordinate in both images.
 *   6. Compute per-pixel RGBA delta → max delta, mean delta, changed-pixel count.
 *   7. Save: full PNGs, cropped PNGs, diff data to analysis/phase3-rendering/.
 *
 * Usage:  node scripts/phase3-render-experiment.mjs
 *
 * Outputs:
 *   analysis/phase3-rendering/<case>/defect-full.png
 *   analysis/phase3-rendering/<case>/control-full.png
 *   analysis/phase3-rendering/<case>/defect-crop.png
 *   analysis/phase3-rendering/<case>/control-crop.png
 *   analysis/phase3-rendering/render-diffs-summary.json
 */

import { chromium }         from 'playwright';
import { createServer }     from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath }    from 'node:url';
import { PbfReader as Pbf } from 'pbf';
import { VectorTile }       from '@mapbox/vector-tile';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const OUT_DIR        = join(ROOT, 'analysis', 'phase3-rendering');
const SYNTHETIC_DIR  = join(ROOT, 'fixtures', 'phase2-synthetic');
const PROD_TILES_DIR = join(ROOT, 'tools', 'ofat-work', 'pl_s1_b64_z14_tiles');
const MANIFEST_PATH  = join(ROOT, 'analysis', 'phase3-pipeline', 'gd-tile-manifest.json');

mkdirSync(OUT_DIR, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Tile z/x/y → WGS84 centre */
function tileCentre(z, x, y) {
  const n   = Math.pow(2, z);
  const lng = ((x + 0.5) / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / n))) * 180) / Math.PI;
  return { lng, lat };
}

/** Tile pixel coord → WGS84 */
function tilePixelToLngLat(z, x, y, px, py, extent = 4096) {
  const n      = Math.pow(2, z);
  const tileW  = 360 / n;
  const west   = (x / n) * 360 - 180;
  const northR = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const southR = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
  const north  = (northR * 180) / Math.PI;
  const south  = (southR * 180) / Math.PI;
  const lng    = west  + (px / extent) * tileW;
  const lat    = north - (py / extent) * (north - south);
  return { lng, lat };
}

/**
 * Read a synthetic .pbf fixture, extract the first polygon feature's
 * first ring centroid in tile coordinates, return WGS84 using zoom=14
 * tile 0/0 as a proxy (synthetic tiles are not z/x/y positioned —
 * we render them at a fixed screen position and centre on Monaco).
 */
function syntheticFeatureCentre() {
  // For synthetic tiles rendered at a fixed location, use Monaco centre
  return { lng: 7.4128, lat: 43.7348 };
}

/**
 * For a production GD entry from the manifest, return the defect centre.
 */
function prodFeatureCentre(gd) {
  if (gd.featureBBox) {
    return { lng: gd.featureBBox.centerLng, lat: gd.featureBBox.centerLat };
  }
  return tileCentre(gd.z, gd.x, gd.y);
}

// ── Per-pixel diff ────────────────────────────────────────────────────────────

/**
 * Compute pixel diff between two PNG screenshot Buffers.
 * Playwright screenshots are PNG; we parse via raw RGBA from the canvas
 * by reading pixel data injected by the browser.
 *
 * Here we work with the raw PNG bytes returned by Playwright's
 * screenshot({ type: 'png' }) — we use a simple buffer comparison
 * approach since we don't have a native PNG decoder in this script.
 *
 * We instead have the browser itself produce a pixel-diff result
 * by running JS inside the page. See captureAndDiff().
 */

// ── Local tile server ─────────────────────────────────────────────────────────

// MapLibre assets served locally (downloaded to tools/)
const MAPLIBRE_JS  = readFileSync(join(ROOT, 'tools', 'maplibre-gl.js'),  'utf8');
const MAPLIBRE_CSS = readFileSync(join(ROOT, 'tools', 'maplibre-gl.css'), 'utf8');

/**
 * Start an HTTP server that serves:
 *   /                              — HTML page
 *   /maplibre-gl.js                — MapLibre bundle (local)
 *   /maplibre-gl.css               — MapLibre CSS (local)
 *   /tiles/<z>/<x>/<y>.pbf        — tile data via tileResolver
 *
 * tileResolver(z, x, y) → Buffer | null
 */
function startServer(tileResolver, htmlPage, port = 7779) {
  const server = createServer((req, res) => {
    const url = req.url.split('?')[0];

    if (url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(htmlPage);
      return;
    }
    if (url === '/maplibre-gl.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(MAPLIBRE_JS);
      return;
    }
    if (url === '/maplibre-gl.css') {
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end(MAPLIBRE_CSS);
      return;
    }

    // /tiles/<z>/<x>/<y>.pbf
    const tileMatch = url.match(/^\/tiles\/(\d+)\/(\d+)\/(\d+)\.pbf$/);
    if (tileMatch) {
      const [, z, x, y] = tileMatch;
      const buf = tileResolver(parseInt(z), parseInt(x), parseInt(y));
      if (buf) {
        res.writeHead(200, {
          'Content-Type': 'application/x-protobuf',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(buf);
      } else {
        res.writeHead(204);
        res.end();
      }
      return;
    }

    res.writeHead(404);
    res.end();
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

// ── MapLibre HTML page ────────────────────────────────────────────────────────

function buildHtmlPage(lng, lat, zoom, tileZ, tileX, tileY) {
  // tileUrl uses the exact z/x/y we're serving — MapLibre will only request
  // tiles within its viewport. By setting minzoom=maxzoom=tileZ and centering
  // on the tile, it requests exactly the tiles we serve.
  const tileUrl = `http://127.0.0.1:__PORT__/tiles/{z}/{x}/{y}.pbf`;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; }
  html, body, #map { width: 2048px; height: 2048px; overflow: hidden; }
</style>
<link href="/maplibre-gl.css" rel="stylesheet" />
<script src="/maplibre-gl.js"></script>
</head>
<body>
<div id="map"></div>
<script>
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      tiles: {
        type: 'vector',
        tiles: ['http://127.0.0.1:__PORT__/tiles/{z}/{x}/{y}.pbf'],
        minzoom: ${tileZ},
        maxzoom: ${tileZ},
      },
    },
    layers: [
      { id: 'background', type: 'background',
        paint: { 'background-color': '#f8f4f0' } },
      { id: 'water', type: 'fill', source: 'tiles', 'source-layer': 'water',
        paint: { 'fill-color': '#a0c8f0', 'fill-opacity': 0.9 } },
      { id: 'landcover', type: 'fill', source: 'tiles', 'source-layer': 'landcover',
        paint: { 'fill-color': '#d4e8c2', 'fill-opacity': 0.6 } },
      { id: 'building', type: 'fill', source: 'tiles', 'source-layer': 'building',
        paint: { 'fill-color': '#d9c4b0', 'fill-outline-color': '#bba898' } },
      { id: 'transportation-fill', type: 'fill', source: 'tiles',
        'source-layer': 'transportation',
        paint: { 'fill-color': '#e06060', 'fill-opacity': 0.30 } },
      { id: 'transportation', type: 'line', source: 'tiles',
        'source-layer': 'transportation',
        paint: { 'line-color': '#cc2020', 'line-width': 2 } },
      { id: 'transportation_name', type: 'fill', source: 'tiles',
        'source-layer': 'transportation_name',
        paint: { 'fill-color': '#c040c0', 'fill-opacity': 0.35 } },
      { id: 'polygons', type: 'fill', source: 'tiles',
        'source-layer': 'polygons',
        paint: { 'fill-color': '#e06060', 'fill-opacity': 0.50 } },
      { id: 'test-fill', type: 'fill', source: 'tiles',
        'source-layer': 'test',
        paint: { 'fill-color': '#e06060', 'fill-opacity': 0.70 } },
      { id: 'test-outline', type: 'line', source: 'tiles',
        'source-layer': 'test',
        paint: { 'line-color': '#990000', 'line-width': 3 } },
    ],
  },
  center: [${lng}, ${lat}],
  zoom: ${zoom},
  interactive: false,
  fadeDuration: 0,
  attributionControl: false,
});

window.__mapReady = false;
map.on('idle', () => { window.__mapReady = true; });
// Fallback: mark ready after 8s regardless
setTimeout(() => { window.__mapReady = true; }, 8000);
</script>
</body>
</html>`;
}

// ── Canvas pixel-diff (runs inside browser) ───────────────────────────────────

const DIFF_JS = `
async function pixelDiff(imgA, imgB) {
  // imgA and imgB are dataURL strings
  function loadImg(src) {
    return new Promise(resolve => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.src = src;
    });
  }
  const [a, b] = await Promise.all([loadImg(imgA), loadImg(imgB)]);
  const w = a.naturalWidth, h = a.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(a, 0, 0);
  const dA = ctx.getImageData(0, 0, w, h).data;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(b, 0, 0);
  const dB = ctx.getImageData(0, 0, w, h).data;

  let totalDelta = 0, maxDelta = 0, changedPixels = 0;
  for (let i = 0; i < dA.length; i += 4) {
    const dr = Math.abs(dA[i]   - dB[i]);
    const dg = Math.abs(dA[i+1] - dB[i+1]);
    const db = Math.abs(dA[i+2] - dB[i+2]);
    const delta = (dr + dg + db) / 3;
    if (delta > 2) changedPixels++;
    totalDelta += delta;
    if (delta > maxDelta) maxDelta = delta;
  }
  const pixels = w * h;
  return { maxDelta, meanDelta: totalDelta / pixels, changedPixels, changedFraction: changedPixels / pixels };
}
`;

// ── Render one case ───────────────────────────────────────────────────────────

async function renderCase({
  caseId,
  label,
  defectTileBuffer,
  controlTileBuffer,
  tileZ, tileX, tileY,
  centreLng, centreLat,
  mapZoom,
  browser,
  port,
}) {
  const caseDir = join(OUT_DIR, caseId);
  mkdirSync(caseDir, { recursive: true });

  const results = {};

  for (const [variantIdx, variant] of ['defect', 'control'].entries()) {
    const tileBuf = variant === 'defect' ? defectTileBuffer : controlTileBuffer;
    if (!tileBuf) {
      results[variant] = null;
      continue;
    }

    const variantPort = port + variantIdx;

    // Serve the tile buffer for any request at tileZ — MapLibre requests
    // neighbouring tiles too; fill them all with the same data so the
    // viewport is fully covered and the defect geometry is visible.
    const tileResolver = (z, x, y) => z === tileZ ? tileBuf : null;

    // Build HTML with correct port injected
    const html = buildHtmlPage(centreLng, centreLat, mapZoom, tileZ, tileX, tileY)
      .replaceAll('__PORT__', String(variantPort));

    const server = await startServer(tileResolver, html, variantPort);
    const page   = await browser.newPage();
    page.on('console', m => {
      if (!m.text().includes('GL Driver') && !m.text().includes('GroupMarker'))
        process.stdout.write(`    [${variant}] ${m.type()}: ${m.text()}\n`);
    });
    page.on('pageerror', e => process.stdout.write(`    [${variant}] PAGEERR: ${e.message}\n`));
    await page.setViewportSize({ width: 2048, height: 2048 });
    await page.goto(`http://127.0.0.1:${variantPort}/`);

    // Wait for map idle (max 12s), fallback fires at 8s inside page
    await page.waitForFunction(() => window.__mapReady === true, { timeout: 12000 });
    await page.waitForTimeout(500); // extra settle for GPU raster

    const screenshotBuf = await page.screenshot({ type: 'png' });
    writeFileSync(join(caseDir, `${variant}-full.png`), screenshotBuf);

    // Crop 256×256 centred on (1024, 1024) — the map centre = defect centre
    const cropDataUrl = await page.evaluate(({ b64, cx, cy }) => {
      const img = new Image();
      return new Promise(resolve => {
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = 256; c.height = 256;
          c.getContext('2d').drawImage(img, cx - 128, cy - 128, 256, 256, 0, 0, 256, 256);
          resolve(c.toDataURL('image/png'));
        };
        img.src = 'data:image/png;base64,' + b64;
      });
    }, { b64: screenshotBuf.toString('base64'), cx: 1024, cy: 1024 });

    writeFileSync(
      join(caseDir, `${variant}-crop.png`),
      Buffer.from(cropDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'),
    );

    results[variant] = { cropDataUrl };

    await page.close();
    await new Promise(r => server.close(r));
  }

  // Pixel diff inside a bare browser page
  let diff = null;
  if (results.defect && results.control) {
    const page = await browser.newPage();
    await page.setContent('<!DOCTYPE html><html><body></body></html>');
    diff = await page.evaluate(
      ({ imgA, imgB, diffJs }) => {
        // eslint-disable-next-line no-new-func
        return new Function('imgA', 'imgB', `${diffJs}; return pixelDiff(imgA, imgB);`)(imgA, imgB);
      },
      { imgA: results.defect.cropDataUrl, imgB: results.control.cropDataUrl, diffJs: DIFF_JS },
    );
    await page.close();
  }

  return {
    caseId, label,
    tileZ, tileX, tileY,
    centreLng, centreLat, mapZoom,
    defectFullPng:  `${caseId}/defect-full.png`,
    controlFullPng: results.control ? `${caseId}/control-full.png` : null,
    defectCropPng:  `${caseId}/defect-crop.png`,
    controlCropPng: results.control ? `${caseId}/control-crop.png` : null,
    pixelDiff: diff,
    renderImpact: classifyImpact(diff),
  };
}

function classifyImpact(diff) {
  if (!diff) return 'no-control';
  if (diff.maxDelta < 3)    return 'none';           // imperceptible
  if (diff.changedFraction < 0.001) return 'minimal'; // <0.1% pixels changed
  if (diff.changedFraction < 0.01)  return 'minor';   // <1%
  if (diff.changedFraction < 0.05)  return 'moderate'; // <5%
  return 'significant';
}

// ── Build test cases ──────────────────────────────────────────────────────────

function loadSyntheticCase(tpName, tnName) {
  const defect  = readFileSync(join(SYNTHETIC_DIR, `${tpName}.pbf`));
  const control = readFileSync(join(SYNTHETIC_DIR, `${tnName}.pbf`));
  return { defect, control };
}

function loadProdGD(gd) {
  const path = join(PROD_TILES_DIR, String(gd.z), String(gd.x), `${gd.y}.pbf`);
  return readFileSync(path);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

// Group production GDs by tile so we render each tile once
const gdByTile = {};
for (const gd of manifest) {
  const key = `${gd.z}/${gd.x}/${gd.y}`;
  if (!gdByTile[key]) gdByTile[key] = [];
  gdByTile[key].push(gd);
}

const SYNTHETIC_CASES = [
  { id: 'syn-butterfly',    tp: 'tp-butterfly',    tn: 'tn-convex-square',  label: 'Synthetic — butterfly self-crossing polygon' },
  { id: 'syn-hourglass',    tp: 'tp-hourglass',    tn: 'tn-convex-square',  label: 'Synthetic — hourglass polygon (figure-8 crossing)' },
  { id: 'syn-crossing-hole',tp: 'tp-crossing-hole', tn: 'tn-valid-buffer',   label: 'Synthetic — polygon with self-crossing interior hole' },
];

console.log('EXP-007 — Headless MapLibre Rendering Experiment');
console.log(`Synthetic cases: ${SYNTHETIC_CASES.length}`);
console.log(`Production GD tiles: ${Object.keys(gdByTile).length} tiles, ${manifest.length} defects\n`);

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--no-sandbox', '--disable-setuid-sandbox'],
});
const allResults = [];

// Clean Planetiler z14 tiles with transportation content and 0 GDs
// (identified by phase3-find-gd-tiles.mjs scan)
const CLEAN_PL_TILES = {
  '14/8529/5974': join(PROD_TILES_DIR, '14', '8529', '5973.pbf'), // adjacent clean tile
  '14/8530/5973': join(PROD_TILES_DIR, '14', '8530', '5974.pbf'), // adjacent clean tile
};

// ── Synthetic cases ───────────────────────────────────────────────────────────
console.log('── Synthetic fixtures ──');
for (const sc of SYNTHETIC_CASES) {
  console.log(`  ${sc.label}`);
  const { defect, control } = loadSyntheticCase(sc.tp, sc.tn);

  // Synthetic tiles have no real z/x/y — serve them claiming a real Monaco
  // tile coordinate so MapLibre requests exactly one tile and renders it.
  const result = await renderCase({
    caseId:            sc.id,
    label:             sc.label,
    defectTileBuffer:  defect,
    controlTileBuffer: control,
    tileZ: 14, tileX: 8529, tileY: 5974,
    centreLng:  7.4128,
    centreLat:  43.7348,
    mapZoom:    14,
    browser,
    port: 7779,
  });

  console.log(`    → impact: ${result.renderImpact}  maxDelta: ${result.pixelDiff?.maxDelta?.toFixed(1) ?? 'N/A'}  changedPx: ${result.pixelDiff?.changedFraction !== undefined ? (result.pixelDiff.changedFraction * 100).toFixed(2) + '%' : 'N/A'}`);
  allResults.push(result);
}

// ── Production GD tiles ───────────────────────────────────────────────────────
console.log('\n── Production GD tiles (Planetiler z14) ──');
for (const [tileKey, gds] of Object.entries(gdByTile)) {
  const gd       = gds[0];
  const centre   = prodFeatureCentre(gd);
  const defectBuf = loadProdGD(gd);

  // Control: clean Planetiler tile (same layer schema, 0 GDs)
  const cleanPath  = CLEAN_PL_TILES[`${gd.z}/${gd.x}/${gd.y}`];
  const controlBuf = cleanPath && existsSync(cleanPath) ? readFileSync(cleanPath) : null;

  const caseId = `prod-${gd.z}-${gd.x}-${gd.y}`;
  const label  = `Production — Planetiler z${gd.z}/${gd.x}/${gd.y} (${gds.length} GD${gds.length > 1 ? 's' : ''}: ${gds.map(g => g.layer + '#' + g.featureIndex).join(', ')})`;

  console.log(`  ${label}`);
  if (!controlBuf) console.log(`    ⚠ no Tippecanoe control tile found for this z/x/y`);

  const result = await renderCase({
    caseId,
    label,
    defectTileBuffer:  defectBuf,
    controlTileBuffer: controlBuf,
    tileZ: gd.z, tileX: gd.x, tileY: gd.y,
    centreLng:  centre.lng,
    centreLat:  centre.lat,
    mapZoom:    16,  // zoom in on the specific defect coordinate
    browser,
    port: 7779,
  });

  console.log(`    → impact: ${result.renderImpact}  maxDelta: ${result.pixelDiff?.maxDelta?.toFixed(1) ?? 'N/A'}  changedPx: ${result.pixelDiff?.changedFraction !== undefined ? (result.pixelDiff.changedFraction * 100).toFixed(2) + '%' : 'N/A'}`);
  allResults.push(result);
}

await browser.close();

// ── Write summary ─────────────────────────────────────────────────────────────
const summary = {
  meta: {
    experiment:  'EXP-007',
    generated:   new Date().toISOString(),
    description: 'Headless MapLibre 2048×2048 render + 256×256 crop pixel-diff experiment',
    maplibreVersion: '4.7.1',
    playwrightVersion: '1.49.0',
    chromium: 'Headless Shell 131.0.6778.33',
    renderResolution: '2048×2048',
    cropSize: '256×256 centred on defect coordinate',
    impactThresholds: {
      none:       'maxDelta < 3',
      minimal:    'changedFraction < 0.001  (<0.1% pixels)',
      minor:      'changedFraction < 0.01   (<1%)',
      moderate:   'changedFraction < 0.05   (<5%)',
      significant:'changedFraction >= 0.05  (≥5%)',
    },
  },
  results: allResults.map(r => ({
    caseId:         r.caseId,
    label:          r.label,
    tile:           `z${r.tileZ}/${r.tileX}/${r.tileY}`,
    centre:         { lng: r.centreLng, lat: r.centreLat },
    mapZoom:        r.mapZoom,
    defectFullPng:  r.defectFullPng,
    controlFullPng: r.controlFullPng,
    defectCropPng:  r.defectCropPng,
    controlCropPng: r.controlCropPng,
    pixelDiff:      r.pixelDiff,
    renderImpact:   r.renderImpact,
  })),
  impactSummary: {
    none:        allResults.filter(r => r.renderImpact === 'none').length,
    minimal:     allResults.filter(r => r.renderImpact === 'minimal').length,
    minor:       allResults.filter(r => r.renderImpact === 'minor').length,
    moderate:    allResults.filter(r => r.renderImpact === 'moderate').length,
    significant: allResults.filter(r => r.renderImpact === 'significant').length,
    no_control:  allResults.filter(r => r.renderImpact === 'no-control').length,
  },
};

const summaryPath = join(OUT_DIR, 'render-diffs-summary.json');
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

console.log('\n════════════════════════════════════════════════');
console.log('  EXP-007 — Impact Summary');
console.log('════════════════════════════════════════════════');
for (const [k, v] of Object.entries(summary.impactSummary)) {
  if (v > 0) console.log(`  ${k.padEnd(12)}: ${v}`);
}
console.log(`\nOutput: ${OUT_DIR}/`);
console.log(`Summary: ${summaryPath}`);
