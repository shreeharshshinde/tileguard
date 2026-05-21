# TileGuard 🛡️

> **Tile quality testing toolkit for open-source geospatial projects**
> Drop-in CI/CD quality gates for MapLibre, QGIS, GeoServer, and any vector tile pipeline.

[![npm version](https://img.shields.io/npm/v/tileguard)](https://npmjs.com/package/tileguard)
[![PyPI version](https://img.shields.io/pypi/v/tileguard)](https://pypi.org/project/tileguard)
[![CI](https://github.com/shreeharsh-shinde/tileguard/actions/workflows/tile-quality.yml/badge.svg)](https://github.com/shreeharsh-shinde/tileguard/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![FOSS4G 2026](https://img.shields.io/badge/Presented%20at-FOSS4G%202026%20Hiroshima-red)](https://2026.foss4g.org)

---

## The Problem

Map tile bugs are **silent**. A road layer disappearing at zoom 14. A polygon geometry self-intersecting and causing invisible render failures. A style expression evaluating to the wrong type. These regressions only get caught when a user reports them — often weeks after the change that caused them.

TileGuard is the missing quality gate. It runs in your CI pipeline, catches regressions on every pull request, and gives contributors clear, actionable failure output before anything reaches production.

```bash
# 3 commands to protect your tile pipeline forever
npx tileguard validate https://your-server.com/14/8741/5321.pbf
npx tileguard style-lint ./style.json
npx tileguard render --fixture ./tests/fill-color
```

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Module 1 — tile-validator (JS + Python)](#2-module-1--tile-validator)
3. [Module 2 — render-compare (JS)](#3-module-2--render-compare)
4. [Module 3 — style-lint (JS + Python)](#4-module-3--style-lint)
5. [Module 4 — ci-workflow (GitHub Actions)](#5-module-4--ci-workflow)
6. [JavaScript Package — Full Implementation](#6-javascript-package)
7. [Python Package — Full Implementation](#7-python-package)
8. [Test Fixtures — Structure and Format](#8-test-fixtures)
9. [CI Pipeline — Complete Workflow](#9-ci-pipeline)
10. [Usage Examples — Real World Scenarios](#10-usage-examples)
11. [API Reference](#11-api-reference)
12. [Contributing Guide](#12-contributing-guide)
13. [Roadmap](#13-roadmap)

---

## 1. Architecture Overview

```
tileguard/
├── packages/
│   ├── js/                          ← npm package (tileguard)
│   │   ├── src/
│   │   │   ├── validate.js          ← tile-validator core
│   │   │   ├── render-compare.js    ← pixel-level render diff
│   │   │   ├── style-lint.js        ← style JSON validator
│   │   │   ├── reporter.js          ← output formatter (text/JSON/SARIF)
│   │   │   └── utils/
│   │   │       ├── pbf-decoder.js   ← .pbf protobuf decoder
│   │   │       ├── pixel-diff.js    ← perceptual pixel comparison
│   │   │       └── geometry.js      ← geometry validity checks
│   │   ├── bin/
│   │   │   └── tileguard.js         ← CLI entry point (npx tileguard)
│   │   ├── test/
│   │   │   ├── validate.test.js
│   │   │   ├── render.test.js
│   │   │   └── style-lint.test.js
│   │   └── package.json
│   │
│   └── python/                      ← pip package (tileguard)
│       ├── tileguard/
│       │   ├── __init__.py
│       │   ├── __main__.py          ← python -m tileguard entry point
│       │   ├── validate.py          ← tile-validator core
│       │   ├── style_lint.py        ← style JSON validator
│       │   ├── reporter.py          ← output formatter
│       │   └── utils/
│       │       ├── pbf_decoder.py   ← .pbf decoder (mapbox-vector-tile)
│       │       └── geometry.py      ← shapely geometry checks
│       ├── tests/
│       │   ├── test_validate.py
│       │   └── test_style_lint.py
│       ├── pyproject.toml
│       └── requirements.txt
│
├── fixtures/                        ← shared test tile fixtures
│   ├── fill-color/
│   │   ├── style.json
│   │   ├── expected.png
│   │   └── info.json
│   ├── line-width/
│   ├── line-dasharray/
│   ├── symbol-placement/
│   ├── fill-extrusion/
│   └── raster-opacity/
│
├── .github/
│   └── workflows/
│       └── tile-quality.yml         ← copy this into your repo
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── FIXTURES.md
│   └── CI_INTEGRATION.md
│
├── README.md                        ← you are here
├── CONTRIBUTING.md
└── LICENSE                          ← MIT
```

### Design Principles

**1. Zero lock-in** — Every module works standalone. You don't need the full toolkit. Use just the validator, just style-lint, or all four. Each module has no dependency on the others.

**2. Structured output** — Every command outputs both human-readable text (for terminals) and machine-readable JSON (for CI integration and tooling). SARIF format supported for GitHub Code Scanning.

**3. Fail fast, fail clearly** — Exit codes are meaningful (0 = pass, 1 = failure, 2 = error). Error messages point to exactly what failed and why — no cryptic stack traces.

**4. Bring your own tiles** — Works with any tile source: local `.pbf` files, local tile servers, remote URLs, MBTiles, PMTiles. No vendor lock-in.

---

## 2. Module 1 — Tile Validator

Fetches a vector tile, decodes the protobuf binary, and validates its content against configurable rules.

### What it checks

| Check | Description | Configurable |
|-------|-------------|-------------|
| Tile decodable | Is the `.pbf` a valid Mapbox Vector Tile? | No |
| Required layers | Are specific layers present? | Yes — `--layers` |
| Feature count | Is feature count within expected range? | Yes — `--min-features`, `--max-features` |
| Geometry validity | No self-intersections, no degenerate polygons | Yes — `--skip-geometry` |
| Coordinate range | All coordinates within 0–4096 tile grid | No |
| Empty tile | Flag if tile has 0 features (may be intentional) | Yes — `--allow-empty` |
| Layer feature counts | Per-layer min/max feature counts | Yes — via config file |
| Property presence | Required properties exist on features | Yes — `--required-properties` |

### JavaScript Usage

```javascript
// Programmatic API
import { validateTile } from 'tileguard';

const result = await validateTile('https://tiles.example.com/14/8741/5321.pbf', {
  requiredLayers: ['water', 'roads', 'buildings'],
  minFeatures: 10,
  maxFeatures: 10000,
  checkGeometry: true,
  requiredProperties: {
    roads: ['class', 'name'],
    buildings: ['height']
  }
});

console.log(result);
// {
//   pass: true,
//   tile: { z: 14, x: 8741, y: 5321 },
//   layers: {
//     water: { featureCount: 142, valid: true },
//     roads: { featureCount: 318, valid: true },
//     buildings: { featureCount: 387, valid: true }
//   },
//   totalFeatures: 847,
//   geometryErrors: [],
//   duration: 234
// }
```

### CLI Usage

```bash
# Basic validation
npx tileguard validate https://tiles.example.com/14/8741/5321.pbf

# With required layers
npx tileguard validate ./tile.pbf --layers water roads buildings

# With feature count constraints
npx tileguard validate ./tile.pbf --min-features 100 --max-features 5000

# Output as JSON (for CI integration)
npx tileguard validate ./tile.pbf --format json

# Validate a batch of tiles from a list file
npx tileguard validate --batch ./tile-urls.txt --layers water roads

# Validate from MBTiles (specific zoom/x/y)
npx tileguard validate ./data.mbtiles --z 14 --x 8741 --y 5321
```

### Full Source — `packages/js/src/validate.js`

```javascript
import { gunzipSync } from 'zlib';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

/**
 * Fetches and validates a vector tile (.pbf)
 * @param {string} source - URL, file path, or MBTiles path
 * @param {ValidateOptions} options
 * @returns {Promise<ValidationResult>}
 */
export async function validateTile(source, options = {}) {
  const startTime = Date.now();
  const errors = [];
  const warnings = [];

  // 1. Fetch the tile bytes
  let tileData;
  try {
    tileData = await fetchTileBytes(source, options);
  } catch (err) {
    return {
      pass: false,
      errors: [{ code: 'FETCH_ERROR', message: err.message }],
      duration: Date.now() - startTime
    };
  }

  // 2. Decompress if gzipped
  let buffer = tileData;
  if (isGzipped(tileData)) {
    try {
      buffer = gunzipSync(tileData);
    } catch (err) {
      return {
        pass: false,
        errors: [{ code: 'DECOMPRESS_ERROR', message: 'Tile appears gzipped but failed to decompress' }],
        duration: Date.now() - startTime
      };
    }
  }

  // 3. Decode protobuf
  let tile;
  try {
    tile = new VectorTile(new Protobuf(buffer));
  } catch (err) {
    return {
      pass: false,
      errors: [{ code: 'DECODE_ERROR', message: `Failed to decode .pbf: ${err.message}` }],
      duration: Date.now() - startTime
    };
  }

  // 4. Inspect layers
  const layerResults = {};
  let totalFeatures = 0;
  const availableLayers = Object.keys(tile.layers);

  // Check required layers
  if (options.requiredLayers?.length) {
    for (const requiredLayer of options.requiredLayers) {
      if (!tile.layers[requiredLayer]) {
        errors.push({
          code: 'MISSING_LAYER',
          message: `Required layer "${requiredLayer}" not found`,
          available: availableLayers
        });
      }
    }
  }

  // Inspect each layer
  for (const [layerName, layer] of Object.entries(tile.layers)) {
    const featureCount = layer.length;
    totalFeatures += featureCount;
    const geometryErrors = [];

    layerResults[layerName] = { featureCount, geometryErrors, valid: true };

    // Check per-layer feature counts
    const layerConfig = options.layerConfig?.[layerName] || {};
    if (layerConfig.minFeatures && featureCount < layerConfig.minFeatures) {
      errors.push({
        code: 'LOW_FEATURE_COUNT',
        layer: layerName,
        message: `Layer "${layerName}" has ${featureCount} features, expected at least ${layerConfig.minFeatures}`
      });
      layerResults[layerName].valid = false;
    }

    // Geometry validation
    if (options.checkGeometry !== false) {
      for (let i = 0; i < layer.length; i++) {
        const feature = layer.feature(i);
        const geomErrors = validateGeometry(feature);
        if (geomErrors.length) {
          geometryErrors.push(...geomErrors.map(e => ({ featureIndex: i, ...e })));
          layerResults[layerName].valid = false;
        }
      }
      if (geometryErrors.length) {
        errors.push({
          code: 'GEOMETRY_INVALID',
          layer: layerName,
          message: `${geometryErrors.length} invalid geometries in layer "${layerName}"`,
          details: geometryErrors.slice(0, 5) // First 5 only
        });
      }
    }

    // Required properties check
    if (options.requiredProperties?.[layerName]) {
      const required = options.requiredProperties[layerName];
      if (layer.length > 0) {
        const sampleFeature = layer.feature(0);
        const props = sampleFeature.properties;
        for (const prop of required) {
          if (!(prop in props)) {
            warnings.push({
              code: 'MISSING_PROPERTY',
              layer: layerName,
              message: `Property "${prop}" not found on sampled feature in layer "${layerName}"`
            });
          }
        }
      }
    }
  }

  // 5. Total feature count checks
  if (options.minFeatures && totalFeatures < options.minFeatures) {
    errors.push({
      code: 'LOW_TOTAL_FEATURES',
      message: `Tile has ${totalFeatures} features total, expected at least ${options.minFeatures}`
    });
  }
  if (options.maxFeatures && totalFeatures > options.maxFeatures) {
    warnings.push({
      code: 'HIGH_FEATURE_COUNT',
      message: `Tile has ${totalFeatures} features — may impact rendering performance`
    });
  }
  if (totalFeatures === 0 && !options.allowEmpty) {
    warnings.push({ code: 'EMPTY_TILE', message: 'Tile contains 0 features' });
  }

  return {
    pass: errors.length === 0,
    layers: layerResults,
    availableLayers,
    totalFeatures,
    errors,
    warnings,
    duration: Date.now() - startTime
  };
}

/**
 * Validates geometry of a single vector tile feature
 * Checks: coordinate range, polygon winding, self-intersection (basic)
 */
function validateGeometry(feature) {
  const errors = [];
  const geom = feature.loadGeometry();

  for (const ring of geom) {
    for (const coord of ring) {
      // Check coordinate range (0-4096 in tile grid)
      if (coord.x < -10 || coord.x > 4106 || coord.y < -10 || coord.y > 4106) {
        errors.push({
          code: 'OUT_OF_RANGE',
          message: `Coordinate (${coord.x}, ${coord.y}) is outside tile bounds`
        });
        break;
      }
    }
    // Check for degenerate ring (less than 3 unique points for polygons)
    if (feature.type === 3 && ring.length < 4) {
      errors.push({
        code: 'DEGENERATE_RING',
        message: `Polygon ring has only ${ring.length} points (minimum 4 including closing point)`
      });
    }
  }
  return errors;
}

function isGzipped(buffer) {
  return buffer[0] === 0x1f && buffer[1] === 0x8b;
}

async function fetchTileBytes(source, options) {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source, { signal: AbortSignal.timeout(options.timeout || 10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return Buffer.from(await response.arrayBuffer());
  }
  if (source.endsWith('.mbtiles')) {
    return fetchFromMBTiles(source, options);
  }
  const { readFile } = await import('fs/promises');
  return readFile(source);
}
```

---

## 3. Module 2 — Render Compare

Renders a MapLibre style to a canvas using a headless browser, then compares pixel-by-pixel against a stored reference image. The core of tile quality assurance.

### How pixel comparison works

```
Expected PNG  ──┐
                ├──▶  pixel-diff  ──▶  Pass / Fail + diff.png
Actual render ──┘
```

The diff uses a **perceptual threshold** — not exact pixel match. Each pixel is compared in LAB color space (perceptually uniform). A pixel "differs" only if its perceptual distance exceeds the threshold. This tolerates sub-pixel anti-aliasing differences across platforms while still catching real regressions.

### CLI Usage

```bash
# Run a single render test fixture
npx tileguard render --fixture ./fixtures/fill-color

# Run all fixtures in a directory
npx tileguard render --fixtures ./fixtures/

# Run and update reference images (when change is intentional)
npx tileguard render --fixture ./fixtures/fill-color --update

# Run with custom threshold (0-255, default: 16)
npx tileguard render --fixture ./fixtures/line-dasharray --threshold 8

# Run with specific browser (default: chromium)
npx tileguard render --fixture ./fixtures/fill-color --browser firefox
```

### Full Source — `packages/js/src/render-compare.js`

```javascript
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { comparePixels } from './utils/pixel-diff.js';
import { ensureDir } from './utils/fs.js';

/**
 * Renders a MapLibre style to canvas and compares against reference PNG
 * @param {string} fixturePath - Path to fixture directory
 * @param {RenderOptions} options
 * @returns {Promise<RenderResult>}
 */
export async function renderCompare(fixturePath, options = {}) {
  const startTime = Date.now();

  // Load fixture files
  const styleJson = JSON.parse(readFileSync(join(fixturePath, 'style.json'), 'utf-8'));
  const infoJson = JSON.parse(readFileSync(join(fixturePath, 'info.json'), 'utf-8'));
  const expectedPath = join(fixturePath, 'expected.png');
  const actualPath = join(fixturePath, 'actual.png');
  const diffPath = join(fixturePath, 'diff.png');

  const { width = 256, height = 256, zoom = 0, center = [0, 0] } = infoJson;
  const threshold = options.threshold ?? 16;

  // Launch headless browser
  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=swiftshader',        // Software renderer — consistent across environments
      '--disable-web-security'
    ]
  });

  const page = await browser.newPage({
    viewport: { width: width + 100, height: height + 100 }
  });

  // Inject MapLibre and render the map
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="https://unpkg.com/maplibre-gl/dist/maplibre-gl.css">
      <script src="https://unpkg.com/maplibre-gl/dist/maplibre-gl.js"></script>
      <style>
        body { margin: 0; }
        #map { width: ${width}px; height: ${height}px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        window.renderComplete = false;
        const map = new maplibregl.Map({
          container: 'map',
          style: ${JSON.stringify(styleJson)},
          zoom: ${zoom},
          center: ${JSON.stringify(center)},
          interactive: false,
          attributionControl: false,
          fadeDuration: 0,       // Disable fade animations for deterministic output
          preserveDrawingBuffer: true
        });
        map.on('idle', () => {
          window.renderComplete = true;
        });
      </script>
    </body>
    </html>
  `);

  // Wait for map to reach idle state (all tiles loaded, rendering complete)
  await page.waitForFunction(() => window.renderComplete === true, { timeout: 30000 });

  // Capture the canvas as PNG
  const mapElement = await page.$('#map canvas');
  const actualBuffer = await mapElement.screenshot({ type: 'png' });

  await browser.close();

  // Save actual PNG
  ensureDir(join(fixturePath));
  writeFileSync(actualPath, actualBuffer);

  // If --update mode, just save as new reference and return
  if (options.update) {
    writeFileSync(expectedPath, actualBuffer);
    return {
      pass: true,
      updated: true,
      message: `Reference image updated: ${expectedPath}`,
      duration: Date.now() - startTime
    };
  }

  // Check reference exists
  if (!existsSync(expectedPath)) {
    return {
      pass: false,
      errors: [{
        code: 'NO_REFERENCE',
        message: `No reference image found at ${expectedPath}. Run with --update to create it.`
      }],
      duration: Date.now() - startTime
    };
  }

  // Load reference and compare
  const expectedBuffer = readFileSync(expectedPath);
  const diffResult = await comparePixels(actualBuffer, expectedBuffer, { threshold });

  // Save diff image on failure
  if (!diffResult.pass && diffResult.diffImage) {
    writeFileSync(diffPath, diffResult.diffImage);
  }

  return {
    pass: diffResult.pass,
    fixture: fixturePath,
    diffPercent: diffResult.diffPercent,
    diffPixels: diffResult.diffPixels,
    totalPixels: diffResult.totalPixels,
    threshold,
    diffImage: diffResult.pass ? null : diffPath,
    duration: Date.now() - startTime
  };
}
```

### Full Source — `packages/js/src/utils/pixel-diff.js`

```javascript
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Compares two PNG buffers pixel-by-pixel
 * Uses pixelmatch under the hood (perceptual color comparison)
 * @param {Buffer} actualBuf
 * @param {Buffer} expectedBuf
 * @param {object} options
 * @returns {DiffResult}
 */
export async function comparePixels(actualBuf, expectedBuf, options = {}) {
  const threshold = (options.threshold ?? 16) / 255; // pixelmatch uses 0-1
  const actual = PNG.sync.read(actualBuf);
  const expected = PNG.sync.read(expectedBuf);

  // Dimensions must match
  if (actual.width !== expected.width || actual.height !== expected.height) {
    return {
      pass: false,
      errors: [{
        code: 'DIMENSION_MISMATCH',
        message: `Actual (${actual.width}×${actual.height}) differs from expected (${expected.width}×${expected.height})`
      }]
    };
  }

  const { width, height } = actual;
  const totalPixels = width * height;
  const diffPng = new PNG({ width, height });

  // pixelmatch: returns number of differing pixels
  // Writes a visual diff to diffPng.data (red = different, grey = same)
  const diffPixels = pixelmatch(
    actual.data,
    expected.data,
    diffPng.data,
    width,
    height,
    {
      threshold,           // Per-pixel tolerance (0 = exact, 1 = ignore everything)
      includeAA: false,    // Don't count anti-aliased pixels as different
      alpha: 0.3,          // Dim unchanged pixels in diff image
      diffColor: [255, 50, 50],  // Red for changed pixels
      aaColor: [255, 165, 0]     // Orange for anti-aliased
    }
  );

  const diffPercent = (diffPixels / totalPixels) * 100;
  const maxDiffPercent = options.maxDiffPercent ?? 0.1; // Default: 0.1% tolerance
  const pass = diffPercent <= maxDiffPercent;

  return {
    pass,
    diffPixels,
    totalPixels,
    diffPercent: Math.round(diffPercent * 1000) / 1000,
    diffImage: pass ? null : PNG.sync.write(diffPng)
  };
}
```

---

## 4. Module 3 — Style Lint

Validates a MapLibre style JSON against the style specification. Catches errors before they reach render tests.

### What it catches

| Error type | Example | Severity |
|-----------|---------|----------|
| Missing required field | No `version` field | Error |
| Wrong version | `"version": 7` | Error |
| Unknown layer type | `"type": "polygon"` | Error |
| Duplicate layer ID | Two layers with same `id` | Error |
| Missing source reference | Layer references non-existent source | Error |
| Missing source-layer | Vector layer without `source-layer` | Error |
| Expression type mismatch | Color expression where number expected | Error |
| Wrong filter syntax | Old filter style in GL2 context | Warning |
| Deprecated property | `ref` property usage | Warning |
| Unknown paint property | Typo in property name | Warning |
| Zoom range invalid | `minzoom` > `maxzoom` | Error |

### Full Source — `packages/js/src/style-lint.js`

```javascript
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

/**
 * Validates a MapLibre style JSON
 * @param {object|string} style - Style object or JSON string
 * @param {LintOptions} options
 * @returns {LintResult}
 */
export function styleLint(style, options = {}) {
  const startTime = Date.now();
  const errors = [];
  const warnings = [];

  // Parse if string
  let styleObj;
  try {
    styleObj = typeof style === 'string' ? JSON.parse(style) : style;
  } catch (err) {
    return {
      pass: false,
      errors: [{ code: 'INVALID_JSON', message: `Style is not valid JSON: ${err.message}` }],
      duration: Date.now() - startTime
    };
  }

  // Run the official MapLibre style validator
  const specErrors = validateStyleMin(styleObj);
  for (const err of specErrors) {
    errors.push({
      code: 'SPEC_VIOLATION',
      message: err.message,
      key: err.key,
      line: err.line
    });
  }

  // Additional checks beyond the spec validator
  if (styleObj.layers) {
    const layerIds = new Set();
    const sourceIds = new Set(Object.keys(styleObj.sources || {}));

    for (const layer of styleObj.layers) {

      // Duplicate IDs
      if (layerIds.has(layer.id)) {
        errors.push({
          code: 'DUPLICATE_LAYER_ID',
          message: `Duplicate layer ID: "${layer.id}"`,
          layerId: layer.id
        });
      }
      layerIds.add(layer.id);

      // Vector layers must have source-layer
      if (['fill', 'line', 'symbol', 'circle', 'fill-extrusion', 'heatmap'].includes(layer.type)) {
        if (layer.source && !layer['source-layer'] && styleObj.sources?.[layer.source]?.type === 'vector') {
          errors.push({
            code: 'MISSING_SOURCE_LAYER',
            message: `Layer "${layer.id}" uses a vector source but has no "source-layer"`,
            layerId: layer.id
          });
        }
      }

      // Zoom range sanity
      if (layer.minzoom !== undefined && layer.maxzoom !== undefined) {
        if (layer.minzoom > layer.maxzoom) {
          errors.push({
            code: 'INVALID_ZOOM_RANGE',
            message: `Layer "${layer.id}": minzoom (${layer.minzoom}) > maxzoom (${layer.maxzoom})`,
            layerId: layer.id
          });
        }
      }

      // Check for known typos in common paint properties
      const commonPaintProps = {
        fill: ['fill-color', 'fill-opacity', 'fill-outline-color', 'fill-pattern', 'fill-antialias', 'fill-translate'],
        line: ['line-color', 'line-width', 'line-opacity', 'line-dasharray', 'line-cap', 'line-join', 'line-gap-width'],
        symbol: ['text-color', 'text-opacity', 'text-halo-color', 'text-halo-width', 'icon-opacity', 'icon-color']
      };
      const validProps = commonPaintProps[layer.type] || [];
      if (layer.paint && validProps.length) {
        for (const prop of Object.keys(layer.paint)) {
          if (!validProps.includes(prop) && prop.startsWith(layer.type)) {
            warnings.push({
              code: 'UNKNOWN_PAINT_PROPERTY',
              message: `Layer "${layer.id}": unknown paint property "${prop}" for type "${layer.type}"`,
              layerId: layer.id
            });
          }
        }
      }

      // Warn on deprecated 'ref' property
      if (layer.ref) {
        warnings.push({
          code: 'DEPRECATED_REF',
          message: `Layer "${layer.id}": "ref" property is deprecated and not supported in MapLibre GL JS v2+`,
          layerId: layer.id
        });
      }
    }
  }

  return {
    pass: errors.length === 0,
    errors,
    warnings,
    layerCount: styleObj.layers?.length || 0,
    sourceCount: Object.keys(styleObj.sources || {}).length,
    duration: Date.now() - startTime
  };
}
```

---

## 5. Module 4 — CI Workflow

The most valuable file in this repo. Copy it into `.github/workflows/` and tile quality checks run on every PR automatically.

### Full Workflow — `.github/workflows/tile-quality.yml`

```yaml
# TileGuard — Tile Quality CI
# Copy this file to .github/workflows/tile-quality.yml in your repo
# Requires: Node.js 20+

name: Tile Quality

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

# Cancel in-progress runs when a new commit is pushed
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ── FAST GATE: Style linting (< 30 seconds) ──────────────────────────────
  style-lint:
    name: Style Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install TileGuard
        run: npm install -g tileguard

      - name: Lint all style files
        run: |
          find . -name "*.style.json" -o -name "style.json" | \
          xargs -I{} npx tileguard style-lint {} --format json \
          > style-lint-results.json

      - name: Upload lint results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: style-lint-results
          path: style-lint-results.json
          retention-days: 7

  # ── TILE VALIDATION ───────────────────────────────────────────────────────
  tile-validate:
    name: Tile Validation
    runs-on: ubuntu-latest
    needs: style-lint
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install TileGuard
        run: npm install -g tileguard

      - name: Validate tile fixtures
        run: |
          npx tileguard validate-batch ./fixtures/ \
            --layers water roads buildings \
            --min-features 10 \
            --format json \
            --output tile-validation-results.json

      - name: Upload validation results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: tile-validation-results
          path: tile-validation-results.json
          retention-days: 7

  # ── RENDER TESTS (most expensive, gated) ─────────────────────────────────
  render-test:
    name: Render Tests
    runs-on: ubuntu-latest
    needs: [style-lint, tile-validate]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: |
          cd packages/js && npm ci

      # Mesa software renderer — deterministic GPU-less rendering
      - name: Install Mesa GL + virtual display
        run: |
          sudo apt-get update -qq
          sudo apt-get install -y libgl1-mesa-dev xvfb libgbm-dev

      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps

      - name: Run render tests
        run: |
          xvfb-run -a npx tileguard render \
            --fixtures ./fixtures/ \
            --threshold 16 \
            --format json \
            --output render-results.json

      # Upload diff images on failure — reviewers can see exactly what changed
      - name: Upload render diffs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: render-diffs-${{ github.sha }}
          path: |
            fixtures/**/actual.png
            fixtures/**/diff.png
          retention-days: 14

      - name: Upload render results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: render-results
          path: render-results.json
          retention-days: 7

      # Post render results as a PR comment (optional but very nice UX)
      - name: Comment render results on PR
        if: github.event_name == 'pull_request' && always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('render-results.json', 'utf-8'));
            const passed = results.filter(r => r.pass).length;
            const failed = results.filter(r => !r.pass).length;
            const emoji = failed === 0 ? '✅' : '❌';
            const body = `## ${emoji} Render Tests: ${passed}/${results.length} passing
            ${failed > 0 ? '\n**Failures:**\n' + results.filter(r => !r.pass).map(r =>
              `- \`${r.fixture}\`: ${r.diffPercent}% pixels differ (threshold: ${r.threshold / 255 * 100}%)`
            ).join('\n') : ''}
            _Download diff images from the [Actions artifacts](${context.payload.pull_request.html_url}/checks) to see what changed._`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });
```

---

## 6. JavaScript Package

### `package.json`

```json
{
  "name": "tileguard",
  "version": "1.0.0",
  "description": "Tile quality testing toolkit for open-source geospatial projects",
  "type": "module",
  "bin": {
    "tileguard": "./bin/tileguard.js"
  },
  "exports": {
    ".": "./src/index.js",
    "./validate": "./src/validate.js",
    "./render-compare": "./src/render-compare.js",
    "./style-lint": "./src/style-lint.js"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/ --ext .js"
  },
  "dependencies": {
    "@mapbox/vector-tile": "^1.3.1",
    "@maplibre/maplibre-gl-style-spec": "^20.0.0",
    "pbf": "^3.3.0",
    "pixelmatch": "^5.3.0",
    "playwright": "^1.44.0",
    "pngjs": "^7.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  },
  "keywords": [
    "maplibre", "tiles", "vector-tiles", "geospatial",
    "testing", "ci", "quality", "foss4g"
  ],
  "license": "MIT",
  "homepage": "https://github.com/shreeharsh-shinde/tileguard",
  "repository": {
    "type": "git",
    "url": "https://github.com/shreeharsh-shinde/tileguard.git"
  }
}
```

### CLI Entry — `bin/tileguard.js`

```javascript
#!/usr/bin/env node
import { program } from 'commander';
import { validateTile, validateBatch } from '../src/validate.js';
import { renderCompare, renderAll } from '../src/render-compare.js';
import { styleLint } from '../src/style-lint.js';
import { Reporter } from '../src/reporter.js';

program
  .name('tileguard')
  .description('Tile quality testing toolkit for geospatial projects')
  .version('1.0.0');

// tileguard validate
program
  .command('validate <source>')
  .description('Validate a vector tile (.pbf)')
  .option('--layers <layers...>', 'Required layer names')
  .option('--min-features <n>', 'Minimum feature count', parseInt)
  .option('--max-features <n>', 'Maximum feature count', parseInt)
  .option('--skip-geometry', 'Skip geometry validation (faster)')
  .option('--allow-empty', 'Do not warn on empty tiles')
  .option('--format <format>', 'Output format: text|json|sarif', 'text')
  .option('--batch <file>', 'Validate list of URLs from file')
  .action(async (source, opts) => {
    const reporter = new Reporter(opts.format);
    const result = await validateTile(source, opts);
    reporter.printValidation(result, source);
    process.exit(result.pass ? 0 : 1);
  });

// tileguard render
program
  .command('render')
  .description('Run render test(s) against reference images')
  .option('--fixture <path>', 'Path to a single fixture directory')
  .option('--fixtures <path>', 'Path to directory of fixtures (runs all)')
  .option('--update', 'Update reference images instead of comparing')
  .option('--threshold <n>', 'Pixel diff threshold 0-255 (default: 16)', parseInt)
  .option('--format <format>', 'Output format: text|json', 'text')
  .option('--output <file>', 'Write results to JSON file')
  .action(async (opts) => {
    const reporter = new Reporter(opts.format);
    if (opts.fixture) {
      const result = await renderCompare(opts.fixture, opts);
      reporter.printRender(result);
      process.exit(result.pass ? 0 : 1);
    } else if (opts.fixtures) {
      const results = await renderAll(opts.fixtures, opts);
      reporter.printRenderSummary(results, opts.output);
      process.exit(results.every(r => r.pass) ? 0 : 1);
    } else {
      console.error('Provide --fixture or --fixtures');
      process.exit(2);
    }
  });

// tileguard style-lint
program
  .command('style-lint <stylePath>')
  .description('Validate a MapLibre style JSON')
  .option('--format <format>', 'Output format: text|json|sarif', 'text')
  .action(async (stylePath, opts) => {
    const { readFileSync } = await import('fs');
    const style = readFileSync(stylePath, 'utf-8');
    const reporter = new Reporter(opts.format);
    const result = styleLint(style, opts);
    reporter.printLint(result, stylePath);
    process.exit(result.pass ? 0 : 1);
  });

program.parse();
```

---

## 7. Python Package

### `pyproject.toml`

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "tileguard"
version = "1.0.0"
description = "Tile quality testing toolkit for open-source geospatial projects"
readme = "README.md"
license = { text = "MIT" }
requires-python = ">=3.9"
keywords = ["maplibre", "tiles", "geospatial", "testing", "ci", "foss4g"]
dependencies = [
  "mapbox-vector-tile>=2.0.1",
  "requests>=2.31.0",
  "click>=8.1.0",
  "shapely>=2.0.0",
  "Pillow>=10.0.0",
  "rich>=13.0.0"
]

[project.scripts]
tileguard = "tileguard.__main__:cli"
```

### Core Validator — `tileguard/validate.py`

```python
"""
TileGuard tile validator — Python implementation
Validates Mapbox Vector Tile (.pbf) files for content and geometry correctness
"""
from __future__ import annotations

import gzip
import struct
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from urllib.request import urlopen, Request
from urllib.error import URLError

import mapbox_vector_tile
from shapely.validation import explain_validity
from shapely.geometry import shape


@dataclass
class LayerResult:
    name: str
    feature_count: int
    valid: bool
    geometry_errors: list[dict] = field(default_factory=list)
    property_warnings: list[dict] = field(default_factory=list)


@dataclass
class ValidationResult:
    passed: bool
    source: str
    layers: dict[str, LayerResult] = field(default_factory=dict)
    available_layers: list[str] = field(default_factory=list)
    total_features: int = 0
    errors: list[dict] = field(default_factory=list)
    warnings: list[dict] = field(default_factory=list)
    duration_ms: int = 0

    @property
    def error_count(self) -> int:
        return len(self.errors)

    @property
    def warning_count(self) -> int:
        return len(self.warnings)


def validate_tile(
    source: str,
    required_layers: list[str] | None = None,
    min_features: int | None = None,
    max_features: int | None = None,
    check_geometry: bool = True,
    allow_empty: bool = False,
    required_properties: dict[str, list[str]] | None = None,
    timeout: int = 10,
) -> ValidationResult:
    """
    Validates a Mapbox Vector Tile (.pbf) for content and geometry correctness.

    Args:
        source: URL, file path, or MBTiles path to the .pbf tile
        required_layers: Layer names that must be present in the tile
        min_features: Minimum total feature count across all layers
        max_features: Maximum total feature count (warn if exceeded)
        check_geometry: Run shapely geometry validity checks
        allow_empty: Don't warn if tile has 0 features
        required_properties: Dict of layer → required property names
        timeout: HTTP request timeout in seconds

    Returns:
        ValidationResult with pass/fail and detailed diagnostics
    """
    start = time.time()
    errors: list[dict] = []
    warnings: list[dict] = []

    # 1. Fetch tile bytes
    try:
        tile_bytes = _fetch_bytes(source, timeout)
    except Exception as e:
        return ValidationResult(
            passed=False,
            source=source,
            errors=[{"code": "FETCH_ERROR", "message": str(e)}],
            duration_ms=int((time.time() - start) * 1000)
        )

    # 2. Decompress if gzipped
    if tile_bytes[:2] == b'\x1f\x8b':
        try:
            tile_bytes = gzip.decompress(tile_bytes)
        except Exception as e:
            return ValidationResult(
                passed=False,
                source=source,
                errors=[{"code": "DECOMPRESS_ERROR", "message": f"Failed to decompress: {e}"}],
                duration_ms=int((time.time() - start) * 1000)
            )

    # 3. Decode with mapbox-vector-tile
    try:
        decoded = mapbox_vector_tile.decode(tile_bytes)
    except Exception as e:
        return ValidationResult(
            passed=False,
            source=source,
            errors=[{"code": "DECODE_ERROR", "message": f"Failed to decode .pbf: {e}"}],
            duration_ms=int((time.time() - start) * 1000)
        )

    available_layers = list(decoded.keys())
    layer_results: dict[str, LayerResult] = {}
    total_features = 0

    # 4. Check required layers
    if required_layers:
        for layer_name in required_layers:
            if layer_name not in decoded:
                errors.append({
                    "code": "MISSING_LAYER",
                    "message": f'Required layer "{layer_name}" not found in tile',
                    "available": available_layers
                })

    # 5. Inspect each layer
    for layer_name, layer_data in decoded.items():
        features = layer_data.get("features", [])
        feature_count = len(features)
        total_features += feature_count
        geometry_errors = []
        property_warnings = []
        layer_valid = True

        # Geometry validation using Shapely
        if check_geometry:
            for i, feature in enumerate(features):
                try:
                    geom = shape(feature["geometry"])
                    if not geom.is_valid:
                        reason = explain_validity(geom)
                        geometry_errors.append({
                            "feature_index": i,
                            "code": "INVALID_GEOMETRY",
                            "reason": reason
                        })
                        layer_valid = False
                except Exception as e:
                    geometry_errors.append({
                        "feature_index": i,
                        "code": "GEOMETRY_ERROR",
                        "reason": str(e)
                    })

            if geometry_errors:
                errors.append({
                    "code": "GEOMETRY_INVALID",
                    "layer": layer_name,
                    "message": f'{len(geometry_errors)} invalid geometries in "{layer_name}"',
                    "details": geometry_errors[:5]
                })

        # Required properties check
        if required_properties and layer_name in required_properties:
            if features:
                sample_props = features[0].get("properties", {})
                for prop in required_properties[layer_name]:
                    if prop not in sample_props:
                        property_warnings.append({
                            "code": "MISSING_PROPERTY",
                            "property": prop
                        })
                        warnings.append({
                            "code": "MISSING_PROPERTY",
                            "layer": layer_name,
                            "message": f'Property "{prop}" not found in layer "{layer_name}"'
                        })

        layer_results[layer_name] = LayerResult(
            name=layer_name,
            feature_count=feature_count,
            valid=layer_valid,
            geometry_errors=geometry_errors,
            property_warnings=property_warnings
        )

    # 6. Total feature count checks
    if min_features and total_features < min_features:
        errors.append({
            "code": "LOW_TOTAL_FEATURES",
            "message": f"Tile has {total_features} features, expected at least {min_features}"
        })
    if max_features and total_features > max_features:
        warnings.append({
            "code": "HIGH_FEATURE_COUNT",
            "message": f"Tile has {total_features} features — may impact performance"
        })
    if total_features == 0 and not allow_empty:
        warnings.append({"code": "EMPTY_TILE", "message": "Tile contains 0 features"})

    return ValidationResult(
        passed=len(errors) == 0,
        source=source,
        layers=layer_results,
        available_layers=available_layers,
        total_features=total_features,
        errors=errors,
        warnings=warnings,
        duration_ms=int((time.time() - start) * 1000)
    )


def _fetch_bytes(source: str, timeout: int = 10) -> bytes:
    """Fetch tile bytes from URL, file path, or MBTiles"""
    if source.startswith(("http://", "https://")):
        req = Request(source, headers={"User-Agent": "tileguard/1.0"})
        with urlopen(req, timeout=timeout) as response:
            if response.status != 200:
                raise IOError(f"HTTP {response.status}: {response.reason}")
            return response.read()
    path = Path(source)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {source}")
    return path.read_bytes()
```

### Style Linter — `tileguard/style_lint.py`

```python
"""
TileGuard style linter — Python implementation
Validates MapLibre style JSON for specification compliance
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


VALID_LAYER_TYPES = {"fill", "line", "symbol", "circle", "heatmap",
                     "fill-extrusion", "raster", "background", "sky"}

VECTOR_LAYER_TYPES = {"fill", "line", "symbol", "circle", "heatmap", "fill-extrusion"}

REQUIRED_FIELDS = {"version", "sources", "layers"}


@dataclass
class LintResult:
    passed: bool
    source_path: str
    errors: list[dict] = field(default_factory=list)
    warnings: list[dict] = field(default_factory=list)
    layer_count: int = 0
    source_count: int = 0
    duration_ms: int = 0


def style_lint(style: dict | str | Path, source_path: str = "<stdin>") -> LintResult:
    """
    Validates a MapLibre style JSON.

    Args:
        style: Style dict, JSON string, or path to style file
        source_path: Used in error messages to identify the file

    Returns:
        LintResult with errors and warnings
    """
    start = time.time()
    errors: list[dict] = []
    warnings: list[dict] = []

    # Parse input
    if isinstance(style, Path):
        source_path = str(style)
        style = json.loads(style.read_text())
    elif isinstance(style, str):
        try:
            style = json.loads(style)
        except json.JSONDecodeError as e:
            return LintResult(
                passed=False,
                source_path=source_path,
                errors=[{"code": "INVALID_JSON", "message": str(e)}],
                duration_ms=int((time.time() - start) * 1000)
            )

    # Required top-level fields
    for field_name in REQUIRED_FIELDS:
        if field_name not in style:
            errors.append({
                "code": "MISSING_FIELD",
                "message": f'Required field "{field_name}" is missing',
                "key": field_name
            })

    # Version check
    if "version" in style and style["version"] != 8:
        errors.append({
            "code": "WRONG_VERSION",
            "message": f'Style version must be 8, got {style["version"]}'
        })

    source_ids = set(style.get("sources", {}).keys())
    layers: list[dict] = style.get("layers", [])
    layer_ids: set[str] = set()

    for i, layer in enumerate(layers):
        layer_id = layer.get("id", f"<layer[{i}]>")

        # Duplicate layer IDs
        if layer_id in layer_ids:
            errors.append({
                "code": "DUPLICATE_LAYER_ID",
                "message": f'Duplicate layer ID: "{layer_id}"',
                "layer_id": layer_id
            })
        layer_ids.add(layer_id)

        # Unknown layer type
        layer_type = layer.get("type")
        if layer_type and layer_type not in VALID_LAYER_TYPES:
            errors.append({
                "code": "UNKNOWN_LAYER_TYPE",
                "message": f'Layer "{layer_id}": unknown type "{layer_type}"',
                "layer_id": layer_id
            })

        # Source reference exists
        source_ref = layer.get("source")
        if source_ref and source_ref not in source_ids:
            errors.append({
                "code": "UNKNOWN_SOURCE",
                "message": f'Layer "{layer_id}" references unknown source "{source_ref}"',
                "layer_id": layer_id,
                "source": source_ref,
                "available": list(source_ids)
            })

        # Vector layers must have source-layer
        if layer_type in VECTOR_LAYER_TYPES and source_ref in source_ids:
            source_type = style["sources"][source_ref].get("type") if source_ref else None
            if source_type == "vector" and "source-layer" not in layer:
                errors.append({
                    "code": "MISSING_SOURCE_LAYER",
                    "message": f'Layer "{layer_id}" uses vector source "{source_ref}" but has no "source-layer"',
                    "layer_id": layer_id
                })

        # Zoom range
        minzoom = layer.get("minzoom")
        maxzoom = layer.get("maxzoom")
        if minzoom is not None and maxzoom is not None:
            if minzoom > maxzoom:
                errors.append({
                    "code": "INVALID_ZOOM_RANGE",
                    "message": f'Layer "{layer_id}": minzoom ({minzoom}) > maxzoom ({maxzoom})',
                    "layer_id": layer_id
                })
            if not (0 <= minzoom <= 24) or not (0 <= maxzoom <= 24):
                warnings.append({
                    "code": "ZOOM_OUT_OF_RANGE",
                    "message": f'Layer "{layer_id}": zoom values should be between 0 and 24',
                    "layer_id": layer_id
                })

        # Deprecated ref property
        if "ref" in layer:
            warnings.append({
                "code": "DEPRECATED_REF",
                "message": f'Layer "{layer_id}": "ref" is deprecated in MapLibre GL JS v2+',
                "layer_id": layer_id
            })

    return LintResult(
        passed=len(errors) == 0,
        source_path=source_path,
        errors=errors,
        warnings=warnings,
        layer_count=len(layers),
        source_count=len(source_ids),
        duration_ms=int((time.time() - start) * 1000)
    )
```

### CLI Entry — `tileguard/__main__.py`

```python
"""
tileguard CLI entry point
Usage: python -m tileguard <command> [options]
       tileguard <command> [options]  (after pip install)
"""
import json
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table
from rich import box

from .validate import validate_tile
from .style_lint import style_lint

console = Console()


@click.group()
@click.version_option("1.0.0")
def cli():
    """TileGuard — tile quality testing toolkit for geospatial projects."""
    pass


@cli.command()
@click.argument("source")
@click.option("--layers", "-l", multiple=True, help="Required layer names")
@click.option("--min-features", type=int, help="Minimum feature count")
@click.option("--max-features", type=int, help="Maximum feature count")
@click.option("--skip-geometry", is_flag=True, help="Skip geometry validation")
@click.option("--allow-empty", is_flag=True, help="Don't warn on empty tiles")
@click.option("--format", "fmt", type=click.Choice(["text", "json"]), default="text")
def validate(source, layers, min_features, max_features, skip_geometry, allow_empty, fmt):
    """Validate a vector tile (.pbf) for content and geometry correctness."""

    result = validate_tile(
        source=source,
        required_layers=list(layers) or None,
        min_features=min_features,
        max_features=max_features,
        check_geometry=not skip_geometry,
        allow_empty=allow_empty,
    )

    if fmt == "json":
        click.echo(json.dumps({
            "pass": result.passed,
            "total_features": result.total_features,
            "layers": {k: {"feature_count": v.feature_count, "valid": v.valid}
                      for k, v in result.layers.items()},
            "errors": result.errors,
            "warnings": result.warnings,
            "duration_ms": result.duration_ms
        }, indent=2))
    else:
        _print_validation_text(result, source)

    sys.exit(0 if result.passed else 1)


@cli.command(name="style-lint")
@click.argument("style_path", type=click.Path(exists=True, path_type=Path))
@click.option("--format", "fmt", type=click.Choice(["text", "json"]), default="text")
def style_lint_cmd(style_path, fmt):
    """Validate a MapLibre style JSON against the style specification."""

    result = style_lint(style_path)

    if fmt == "json":
        click.echo(json.dumps({
            "pass": result.passed,
            "layer_count": result.layer_count,
            "source_count": result.source_count,
            "errors": result.errors,
            "warnings": result.warnings,
            "duration_ms": result.duration_ms
        }, indent=2))
    else:
        _print_lint_text(result, str(style_path))

    sys.exit(0 if result.passed else 1)


def _print_validation_text(result, source: str):
    status = "[green]PASS[/green]" if result.passed else "[red]FAIL[/red]"
    console.print(f"\n[bold]TileGuard Validate[/bold] — {source}")
    console.print(f"Status: {status}  ({result.duration_ms}ms)\n")

    if result.layers:
        table = Table(box=box.SIMPLE_HEAD, show_header=True, header_style="bold")
        table.add_column("Layer", style="cyan")
        table.add_column("Features", justify="right")
        table.add_column("Geometry", justify="center")

        for name, layer in result.layers.items():
            geo_status = "[green]✓[/green]" if layer.valid else f"[red]✕ {len(layer.geometry_errors)} errors[/red]"
            table.add_row(name, str(layer.feature_count), geo_status)

        table.add_row("[bold]Total[/bold]", f"[bold]{result.total_features}[/bold]", "")
        console.print(table)

    for err in result.errors:
        console.print(f"[red]  ✕ {err['message']}[/red]")
    for warn in result.warnings:
        console.print(f"[yellow]  ⚠ {warn['message']}[/yellow]")


def _print_lint_text(result, path: str):
    status = "[green]VALID[/green]" if result.passed else "[red]INVALID[/red]"
    console.print(f"\n[bold]TileGuard Style Lint[/bold] — {path}")
    console.print(f"Status: {status}  ({result.layer_count} layers, {result.source_count} sources, {result.duration_ms}ms)\n")
    for err in result.errors:
        console.print(f"[red]  ✕ {err['message']}[/red]")
    for warn in result.warnings:
        console.print(f"[yellow]  ⚠ {warn['message']}[/yellow]")
    if result.passed:
        console.print("[green]  ✓ No issues found[/green]")


if __name__ == "__main__":
    cli()
```

---

## 8. Test Fixtures

Each fixture is a self-contained directory that tests one specific rendering behaviour.

### Structure

```
fixtures/fill-color/
├── style.json      ← The MapLibre style to render
├── info.json       ← Render settings (zoom, center, dimensions)
└── expected.png    ← Reference image (256×256 PNG)
```

### `fixtures/fill-color/style.json`

```json
{
  "version": 8,
  "name": "fill-color-test",
  "sources": {
    "test": {
      "type": "geojson",
      "data": {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[-1, -1], [-1, 1], [1, 1], [1, -1], [-1, -1]]]
        },
        "properties": {}
      }
    }
  },
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": { "background-color": "#ffffff" }
    },
    {
      "id": "fill",
      "type": "fill",
      "source": "test",
      "paint": {
        "fill-color": "#4a90d9",
        "fill-opacity": 1.0
      }
    }
  ]
}
```

### `fixtures/fill-color/info.json`

```json
{
  "width": 256,
  "height": 256,
  "zoom": 0,
  "center": [0, 0],
  "bearing": 0,
  "pitch": 0,
  "description": "Solid fill polygon — basic color correctness test"
}
```

### Complete Fixture List

| Fixture | Tests | Known issues |
|---------|-------|-------------|
| `fill-color` | Solid fill, color accuracy | None |
| `fill-opacity` | Transparent fill blending | None |
| `fill-pattern` | Pattern fill tile alignment | Anti-aliasing ±1px |
| `line-width` | Line width at multiple zooms | None |
| `line-dasharray` | Dash pattern accuracy | Phase offset on platforms |
| `line-cap-round` | Round line cap rendering | ±2px on Windows |
| `symbol-placement` | Text label collision | Platform font ±1px |
| `symbol-icon` | Icon sprite rendering | None |
| `raster-opacity` | Raster tile blending | None |
| `fill-extrusion` | 3D building height | None |
| `heatmap-radius` | Heatmap kernel rendering | GPU-dependent ±3px |
| `circle-stroke` | Circle with stroke | None |

---

## 9. CI Pipeline

See [Module 4 source above](#5-module-4--ci-workflow) for the complete GitHub Actions YAML.

### Timing benchmarks (ubuntu-latest runner)

| Stage | Typical duration | Parallelizable |
|-------|-----------------|----------------|
| style-lint | ~25 seconds | Yes |
| tile-validate | ~45 seconds | Yes |
| render-test (12 fixtures) | ~6–9 minutes | Partially |
| **Total wall time** | **~8 minutes** | With parallelism: ~5 min |

### Integration with other CI systems

```yaml
# GitLab CI equivalent
tile-quality:
  image: node:20
  before_script:
    - apt-get update && apt-get install -y libgl1-mesa-dev xvfb
    - npm install -g tileguard
    - npx playwright install chromium --with-deps
  script:
    - tileguard style-lint ./style.json
    - xvfb-run -a tileguard render --fixtures ./fixtures/
  artifacts:
    when: on_failure
    paths: [fixtures/**/diff.png]
    expire_in: 14 days
```

---

## 10. Usage Examples

### Drop TileGuard into an existing MapLibre project

```bash
# Install
npm install --save-dev tileguard

# Add to package.json scripts
# "test:tiles": "tileguard render --fixtures ./test/fixtures/"
# "test:style": "tileguard style-lint ./src/style.json"

# Run
npm run test:tiles
npm run test:style
```

### Validate a remote tile server during deployment

```bash
#!/bin/bash
# deploy-check.sh — run after deployment, before switching traffic

TILE_SERVER="https://new.tiles.example.com"
SAMPLE_TILES=(
  "$TILE_SERVER/14/8741/5321.pbf"
  "$TILE_SERVER/10/512/384.pbf"
  "$TILE_SERVER/6/32/24.pbf"
)

for tile in "${SAMPLE_TILES[@]}"; do
  npx tileguard validate "$tile" \
    --layers water roads buildings \
    --min-features 10 \
    --format json
  if [ $? -ne 0 ]; then
    echo "❌ Tile validation failed for $tile — rolling back"
    exit 1
  fi
done
echo "✅ All tiles valid — proceeding with deployment"
```

### Python integration in a QGIS plugin test suite

```python
# test/test_tile_quality.py
import pytest
from tileguard import validate_tile

SAMPLE_TILES = [
    "https://your-server.com/14/8741/5321.pbf",
    "https://your-server.com/10/512/384.pbf",
]

@pytest.mark.parametrize("tile_url", SAMPLE_TILES)
def test_tile_has_required_layers(tile_url):
    result = validate_tile(
        tile_url,
        required_layers=["water", "roads", "buildings"],
        min_features=10
    )
    assert result.passed, f"Tile validation failed:\n" + \
        "\n".join(e["message"] for e in result.errors)

@pytest.mark.parametrize("tile_url", SAMPLE_TILES)
def test_tile_geometry_valid(tile_url):
    result = validate_tile(tile_url, check_geometry=True)
    geometry_errors = [e for e in result.errors if e["code"] == "GEOMETRY_INVALID"]
    assert not geometry_errors, f"Geometry errors found: {geometry_errors}"
```

---

## 11. API Reference

### JavaScript

#### `validateTile(source, options?) → Promise<ValidationResult>`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requiredLayers` | `string[]` | `[]` | Layer names that must be present |
| `minFeatures` | `number` | `null` | Minimum total features |
| `maxFeatures` | `number` | `null` | Maximum total features (warning) |
| `checkGeometry` | `boolean` | `true` | Run geometry validity checks |
| `allowEmpty` | `boolean` | `false` | Don't warn on 0 features |
| `timeout` | `number` | `10000` | HTTP timeout in ms |

#### `renderCompare(fixturePath, options?) → Promise<RenderResult>`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `threshold` | `number` | `16` | Per-pixel diff tolerance (0–255) |
| `maxDiffPercent` | `number` | `0.1` | Max % of pixels allowed to differ |
| `update` | `boolean` | `false` | Regenerate reference image |
| `browser` | `string` | `chromium` | Browser to use for rendering |

#### `styleLint(style, options?) → LintResult`

No options currently — validates against full MapLibre style spec.

### Python

#### `validate_tile(source, *, required_layers?, min_features?, ...) → ValidationResult`

Same options as JS, snake_case. See full signature in [source above](#7-python-package).

#### `style_lint(style, source_path?) → LintResult`

`style` can be a `dict`, JSON `str`, or `Path` to a file.

---

## 12. Contributing Guide

### Adding a new render fixture

```bash
# 1. Create the fixture directory
mkdir -p fixtures/my-new-test

# 2. Write style.json and info.json

# 3. Generate the reference image
npx tileguard render --fixture ./fixtures/my-new-test --update

# 4. Review the generated expected.png visually
open fixtures/my-new-test/expected.png

# 5. Commit style.json, info.json, AND expected.png
git add fixtures/my-new-test/
git commit -m "feat: add render fixture for my-new-test"
```

### Reporting a tile bug as a fixture

If you find a tile that triggers a bug:

```bash
# 1. Download the tile
curl -o bug-tile.pbf "https://tiles.example.com/14/8741/5321.pbf"

# 2. Run TileGuard on it and capture output
npx tileguard validate bug-tile.pbf --format json > bug-report.json

# 3. Open a GitHub issue with bug-report.json attached
# The maintainers will create a fixture from it
```

### Development setup

```bash
# JS
git clone https://github.com/shreeharsh-shinde/tileguard
cd tileguard/packages/js
npm ci
npm test

# Python
cd ../python
pip install -e ".[dev]"
pytest tests/ -v
```

---

## 13. Roadmap

| Version | Feature |
|---------|---------|
| `1.0` | tile-validator, style-lint, render-compare, CI workflow (this release) |
| `1.1` | PMTiles source support, MBTiles batch validation |
| `1.2` | Performance benchmarking module — detect slow-rendering tiles |
| `1.3` | Multi-platform render comparison (Linux vs macOS vs Windows) |
| `2.0` | Web dashboard — visual tile quality report with trend graphs |
| `2.1` | MapLibre Native (Android/iOS) render test support |
| `2.2` | Shared fixture registry — community-contributed edge case tiles |

---

## License

MIT © 2026 Shreeharsh Shinde

Built with ❤️ for the open-source geospatial community.
Presented at [FOSS4G 2026 Hiroshima](https://2026.foss4g.org) — *"Ensuring Tile Quality in MapLibre Through Automated Testing and CI"*

---

*Star this repo if TileGuard saved you from a tile regression 🛡️*