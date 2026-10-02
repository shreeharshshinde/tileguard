/**
 * Task 3.1 — EXP-011: Controlled Pipeline OFAT Experiment
 *
 * Runs a One-Factor-At-A-Time parameter sweep across two tile compilers
 * (Tippecanoe and Planetiler) on the same Monaco OSM source.
 *
 * OFAT factors (one varied at a time, others held at baseline):
 *   - Simplification tolerance : 0, 1, 2, 4  (pixels at target zoom)
 *   - Buffer size               : 0, 64, 80   (MVT tile units)
 *   - Target zoom               : z8, z12, z14
 *
 * Baseline configuration: simplification=1, buffer=64, zoom=z12
 *
 * Input:
 *   tools/source-data/monaco.osm.pbf         (Planetiler)
 *   tools/source-data/monaco-polygons.geojson (Tippecanoe)
 *   tools/planetiler.jar
 *
 * Output:
 *   analysis/phase3-pipeline/controlled-pipeline-results.json
 *
 * Usage: node scripts/phase3-ofat-pipeline.mjs
 */

import { createEngine }  from '../packages/core/dist/index.js';
import { tilePlugin }    from '../packages/tile-rules/dist/index.js';
import {
  mkdirSync, writeFileSync, readdirSync, statSync, rmSync, existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ── Paths ─────────────────────────────────────────────────────────────────────
const OSM_PBF   = join(ROOT, 'tools', 'source-data', 'monaco.osm.pbf');
const GEOJSON   = join(ROOT, 'tools', 'source-data', 'monaco-polygons.geojson');
const PJAR      = join(ROOT, 'tools', 'planetiler.jar');
const WORK_DIR  = join(ROOT, 'tools', 'ofat-work');   // temp tiles go here
const OUT_DIR   = join(ROOT, 'analysis', 'phase3-pipeline');

mkdirSync(WORK_DIR, { recursive: true });
mkdirSync(OUT_DIR,  { recursive: true });

// ── TileGuard engine — same rule set as EXP-008 ───────────────────────────────
const engine = createEngine({
  plugins: [tilePlugin],
  rules: {
    'tile/coordinate-range':    ['error', { buffer: 80, excludeLayers: ['place', 'water_name', 'centroids', 'poi_label', 'place_label', 'transit_stop_label'] }],
    'tile/self-intersection':   'error',
    'tile/winding-order':       'error',
    'tile/unclosed-ring':       'error',
    'tile/zero-area-ring':      'error',
    'tile/hole-containment':    'error',
    'tile/degenerate-geometry': 'error',
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

// ── 4-way taxonomy classifier (same logic as EXP-008) ────────────────────────
function classify(ruleId) {
  switch (ruleId) {
    case 'tile/coordinate-range':    return 'Spec-Permitted Convention';
    case 'tile/hole-containment':    return 'Spec-Permitted Convention';
    case 'tile/winding-order':       return 'Quantization Artifact';
    case 'tile/zero-area-ring':      return 'Quantization Artifact';
    case 'tile/degenerate-geometry': return 'Quantization Artifact';
    case 'tile/self-intersection':   return 'Genuine Defect';
    case 'tile/unclosed-ring':       return 'Genuine Defect';
    default:                         return 'Genuine Defect';
  }
}

// ── OFAT experiment design ────────────────────────────────────────────────────
const BASELINE = { simplification: 1, buffer: 64, zoom: 12 };

const OFAT_RUNS = [
  // ── Vary simplification (buffer=64, zoom=12) ──
  { factor: 'simplification', value: 0,  simplification: 0,  buffer: 64, zoom: 12 },
  { factor: 'simplification', value: 1,  simplification: 1,  buffer: 64, zoom: 12 }, // baseline
  { factor: 'simplification', value: 2,  simplification: 2,  buffer: 64, zoom: 12 },
  { factor: 'simplification', value: 4,  simplification: 4,  buffer: 64, zoom: 12 },

  // ── Vary buffer (simplification=1, zoom=12) ──
  { factor: 'buffer',         value: 0,  simplification: 1,  buffer: 0,  zoom: 12 },
  { factor: 'buffer',         value: 64, simplification: 1,  buffer: 64, zoom: 12 }, // baseline (dup — re-used)
  { factor: 'buffer',         value: 80, simplification: 1,  buffer: 80, zoom: 12 },

  // ── Vary zoom (simplification=1, buffer=64) ──
  { factor: 'zoom',           value: 8,  simplification: 1,  buffer: 64, zoom: 8  },
  { factor: 'zoom',           value: 12, simplification: 1,  buffer: 64, zoom: 12 }, // baseline (dup)
  { factor: 'zoom',           value: 14, simplification: 1,  buffer: 64, zoom: 14 },
];

// Deduplicate runs with identical (simplification, buffer, zoom) — run once, attribute to both
const seen = new Map(); // key → run entry
for (const run of OFAT_RUNS) {
  const key = `s${run.simplification}_b${run.buffer}_z${run.zoom}`;
  if (!seen.has(key)) seen.set(key, { ...run, aliases: [{ factor: run.factor, value: run.value }] });
  else seen.get(key).aliases.push({ factor: run.factor, value: run.value });
}
const UNIQUE_RUNS = [...seen.values()];

console.log(`EXP-011 — OFAT Pipeline Experiment`);
console.log(`Unique parameter combinations: ${UNIQUE_RUNS.length}`);
console.log(`Compilers: Tippecanoe, Planetiler\n`);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract all .pbf tiles from an mbtiles file into a temp directory */
function extractMbtiles(mbtiles, outDir) {
  mkdirSync(outDir, { recursive: true });
  // Use tile-join (ships with tippecanoe) to explode mbtiles → individual pbf files
  // tile-join --no-tile-size-limit --no-tile-compression -e <dir> <mbtiles>
  const r = spawnSync('tile-join', [
    '--no-tile-size-limit',
    '--no-tile-compression',
    '-e', outDir,
    mbtiles,
  ], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('tile-join error:', r.stderr);
    throw new Error(`tile-join failed on ${mbtiles}`);
  }
}

/** Recursively collect all .pbf files under a directory */
function collectPbfs(dir) {
  const pbfs = [];
  function walk(d) {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.pbf')) pbfs.push(full);
    }
  }
  walk(dir);
  return pbfs;
}

/** Run TileGuard on a directory of .pbf tiles, return taxonomy tallies */
async function auditTiles(pbfDir) {
  const pbfs  = collectPbfs(pbfDir);
  const tally = { 'Checker Error': 0, 'Quantization Artifact': 0, 'Spec-Permitted Convention': 0, 'Genuine Defect': 0 };
  const byRule = {};
  let tileCount = 0;
  let errCount  = 0;

  for (const pbf of pbfs) {
    let result;
    try {
      result = await engine.run([pbf]);
    } catch {
      errCount++;
      continue;
    }
    tileCount++;
    for (const diag of result.diagnostics) {
      const tax = classify(diag.ruleId);
      tally[tax]++;
      byRule[diag.ruleId] = byRule[diag.ruleId] ?? {};
      byRule[diag.ruleId][tax] = (byRule[diag.ruleId][tax] ?? 0) + 1;
    }
  }

  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  return {
    tileCount,
    tileErrors: errCount,
    total,
    tally,
    byRule,
    diagPerTile:    tileCount > 0 ? +(total / tileCount).toFixed(3) : 0,
    genuinePerTile: tileCount > 0 ? +(tally['Genuine Defect'] / tileCount).toFixed(3) : 0,
  };
}

// ── Run Tippecanoe OFAT ───────────────────────────────────────────────────────
async function runTippecanoe(run) {
  const tag      = `tc_s${run.simplification}_b${run.buffer}_z${run.zoom}`;
  const mbtiles  = join(WORK_DIR, `${tag}.mbtiles`);
  const tilesDir = join(WORK_DIR, `${tag}_tiles`);

  if (existsSync(tilesDir)) {
    console.log(`  [Tippecanoe] ${tag} — cached, skipping compile`);
  } else {
    // --simplification: Douglas-Peucker in tile pixels (must be > 0)
    // simplification=0 means "no simplification" → use --no-line-simplification flag instead
    // --buffer: tile buffer in tile units (tippecanoe extent=4096)
    // --no-feature-limit / --no-tile-size-limit: don't drop features for small Monaco
    const args = [
      '--layer=polygons',
      `--buffer=${run.buffer}`,
      `--minimum-zoom=${run.zoom}`,
      `--maximum-zoom=${run.zoom}`,
      '--no-feature-limit',
      '--no-tile-size-limit',
      '--force',
      '-o', mbtiles,
      GEOJSON,
    ];
    if (run.simplification === 0) {
      args.push('--no-line-simplification');
    } else {
      args.push(`--simplification=${run.simplification}`);
    }
    console.log(`  [Tippecanoe] ${tag} — compiling…`);
    const r = spawnSync('tippecanoe', args, { encoding: 'utf8' });
    if (r.status !== 0) {
      console.error(`  tippecanoe failed: ${r.stderr?.slice(0, 300)}`);
      return null;
    }
    extractMbtiles(mbtiles, tilesDir);
  }

  const audit = await auditTiles(tilesDir);
  console.log(`  [Tippecanoe] ${tag} — ${audit.tileCount} tiles, ${audit.total} diags (${audit.tally['Genuine Defect']} GD)`);
  return audit;
}

// ── Run Planetiler OFAT ───────────────────────────────────────────────────────
async function runPlanetiler(run) {
  const tag      = `pl_s${run.simplification}_b${run.buffer}_z${run.zoom}`;
  const mbtiles  = join(WORK_DIR, `${tag}.mbtiles`);
  const tilesDir = join(WORK_DIR, `${tag}_tiles`);

  if (existsSync(tilesDir)) {
    console.log(`  [Planetiler] ${tag} — cached, skipping compile`);
  } else {
    // --download: fetch auxiliary datasets (lake_centerlines, water_polygons, natural_earth)
    //   on first run only; they are cached in data/sources/ for subsequent runs.
    // --simplify_tolerance: tile pixel tolerance (use 0.001 instead of 0 to avoid divide-by-zero)
    // --enable-native-access: suppress JVM restricted-method warnings (Java 25+)
    const args = [
      `--enable-native-access=ALL-UNNAMED`,
      `-Xmx2g`,
      `-jar`, PJAR,
      `--area=monaco`,
      `--osm_path=${OSM_PBF}`,
      `--output=${mbtiles}`,
      `--minzoom=${run.zoom}`,
      `--maxzoom=${run.zoom}`,
      `--simplify_tolerance=${run.simplification === 0 ? 0.001 : run.simplification}`,
      `--simplify_tolerance_at_max_zoom=${run.simplification === 0 ? 0.001 : run.simplification}`,
      `--force=true`,
      `--download`,
    ];
    console.log(`  [Planetiler] ${tag} — compiling…`);
    const r = spawnSync('java', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    if (r.status !== 0) {
      // Filter out known JVM noise lines before checking for real errors
      const realError = (r.stderr ?? '')
        .split('\n')
        .filter(l => !l.includes('WARNING:') && !l.includes('restricted method') && l.trim())
        .join('\n');
      if (realError) {
        console.error(`  Planetiler failed:\n${realError.slice(0, 500)}`);
        return null;
      }
    }
    if (!existsSync(mbtiles)) {
      console.error(`  Planetiler produced no output for ${tag}`);
      return null;
    }
    extractMbtiles(mbtiles, tilesDir);
  }

  const audit = await auditTiles(tilesDir);
  console.log(`  [Planetiler] ${tag} — ${audit.tileCount} tiles, ${audit.total} diags (${audit.tally['Genuine Defect']} GD)`);
  return audit;
}

// ── Main loop ─────────────────────────────────────────────────────────────────
const results = [];

for (const run of UNIQUE_RUNS) {
  const label = `s${run.simplification}_b${run.buffer}_z${run.zoom}`;
  console.log(`\n── Run: ${label} (factor: ${run.aliases.map(a => `${a.factor}=${a.value}`).join(', ')}) ──`);

  const [tcResult, plResult] = await Promise.all([
    runTippecanoe(run),
    runPlanetiler(run),
  ]);

  results.push({
    run: {
      simplification: run.simplification,
      buffer:         run.buffer,
      zoom:           run.zoom,
      aliases:        run.aliases,
      isBaseline:     run.simplification === BASELINE.simplification
                      && run.buffer === BASELINE.buffer
                      && run.zoom   === BASELINE.zoom,
    },
    tippecanoe: tcResult,
    planetiler: plResult,
  });
}

// ── Attribution matrix ────────────────────────────────────────────────────────
// For each OFAT factor, compute the delta in Genuine Defects vs baseline
function buildAttributionMatrix(results) {
  const baseline = results.find(r => r.run.isBaseline);
  if (!baseline) return {};

  const matrix = {};
  for (const factor of ['simplification', 'buffer', 'zoom']) {
    matrix[factor] = {};
    const runs = results.filter(r => r.run.aliases.some(a => a.factor === factor));
    for (const r of runs) {
      const alias = r.run.aliases.find(a => a.factor === factor);
      const val   = alias?.value ?? r.run[factor];
      matrix[factor][val] = {
        tippecanoe_gd:       r.tippecanoe?.tally?.['Genuine Defect'] ?? null,
        tippecanoe_gd_delta: r.tippecanoe && baseline.tippecanoe
          ? r.tippecanoe.tally['Genuine Defect'] - baseline.tippecanoe.tally['Genuine Defect']
          : null,
        planetiler_gd:       r.planetiler?.tally?.['Genuine Defect'] ?? null,
        planetiler_gd_delta: r.planetiler && baseline.planetiler
          ? r.planetiler.tally['Genuine Defect'] - baseline.planetiler.tally['Genuine Defect']
          : null,
      };
    }
  }
  return matrix;
}

const attributionMatrix = buildAttributionMatrix(results);

// ── Print summary ─────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log('  EXP-011 — Attribution Matrix (Genuine Defects)');
console.log('════════════════════════════════════════════════════════════════');

for (const [factor, values] of Object.entries(attributionMatrix)) {
  console.log(`\n  Factor: ${factor}`);
  console.log(`  ${'Value'.padEnd(8)} ${'TC GD'.padStart(8)} ${'TC Δ'.padStart(8)} ${'PL GD'.padStart(8)} ${'PL Δ'.padStart(8)}`);
  console.log('  ' + '─'.repeat(44));
  for (const [val, v] of Object.entries(values)) {
    console.log(
      `  ${String(val).padEnd(8)} ${String(v.tippecanoe_gd ?? 'N/A').padStart(8)} ${String(v.tippecanoe_gd_delta ?? 'N/A').padStart(8)} ${String(v.planetiler_gd ?? 'N/A').padStart(8)} ${String(v.planetiler_gd_delta ?? 'N/A').padStart(8)}`
    );
  }
}

console.log('\n════════════════════════════════════════════════════════════════\n');

// ── Write output ──────────────────────────────────────────────────────────────
const output = {
  meta: {
    task:        '3.1',
    experiment:  'EXP-011',
    description: 'Controlled pipeline OFAT experiment — defect origin attribution across compilers and parameters',
    generated:   new Date().toISOString(),
    gapsClosed:  ['C4'],
    source: {
      osm_pbf:   OSM_PBF,
      geojson:   GEOJSON,
      area:      'Monaco',
      features:  2357,
      validity:  '2357/2357 valid (Shapely isValid)',
    },
    baseline:    BASELINE,
    compilers: {
      tippecanoe: execSync('tippecanoe --version 2>&1').toString().trim(),
      planetiler: 'tools/planetiler.jar (version from jar manifest)',
    },
    ofat_factors: {
      simplification: [0, 1, 2, 4],
      buffer:         [0, 64, 80],
      zoom:           [8, 12, 14],
    },
    rulesEnabled: [
      'tile/coordinate-range (buffer=80)',
      'tile/self-intersection',
      'tile/winding-order',
      'tile/unclosed-ring',
      'tile/zero-area-ring',
      'tile/hole-containment',
      'tile/degenerate-geometry',
    ],
  },
  attributionMatrix,
  runs: results,
};

const outPath = join(OUT_DIR, 'controlled-pipeline-results.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Output: ${outPath}`);
