# TileGuard Audit

**Frozen:** September 2026  
**Purpose:** Exact inventory of what TileGuard does, what was actually measured, and what evidence already exists.  
**Rule:** Only numbers that have been measured appear in tables. No estimates.

---

## Part 1 — What TileGuard Does

TileGuard is a rule-based validation framework. The pipeline is:

```
Artifact (tile .pbf or style .json)
         ↓
Provider (loads and decodes the artifact)
         ↓
Rules (each rule checks one concern)
         ↓
Diagnostics (structured: ruleId, severity, message, location, suggestion)
         ↓
Reporter (text or JSON output)
```

Rules never print. Reporters never validate. Adding a rule does not touch reporting. Adding a reporter does not touch validation.

---

### 1.1 Tile Rules

There are 12 tile validation rules in `packages/tile-rules/src/rules/`.

---

#### `tile/self-intersection`

**What it checks:** Non-adjacent segments of a LineString or Polygon geometry that cross each other.

**Why the rule exists:** A self-intersecting geometry violates OGC Simple Features §6.1.2.1. Consequences include incorrect area calculations, unpredictable polygon fill (winding rule ambiguity), failures in downstream spatial operations (clipping, buffering, union), and rejection by strict consumers. MapLibre wraps earcut in a try/catch, so incorrect geometry typically causes silent rendering errors rather than crashes.

**Input:** VectorTile artifact. LineString (type 2) and Polygon (type 3) features. Point features (type 1) are skipped.

**Algorithm:**

```
Feature geometry (LineString or Polygon)
         ↓
Guard 1: skip rings with < 4 vertices (no non-adjacent pair possible)
         ↓
Guard 2: for closed LineStrings (first == last), skip the (0, N-1) pair
         at the closure vertex (adjacent by definition)
         ↓
Guard 3: pre-scan O(N) for duplicate vertices (integer-grid quantization
         artifacts); skip segment pairs whose only contact is a duplicate
         ↓
Guard 4: axis-aligned bounding box pre-check per pair — reject pairs with
         disjoint AABBs before calling orientation test (~99.97% of pairs
         eliminated on production tiles)
         ↓
Orientation test: exact integer cross-product arithmetic
  orientation(a,b,c) = sign of (b.y-a.y)(c.x-b.x) - (b.x-a.x)(c.y-b.y)
  Two segments cross when endpoints straddle each other's line
         ↓
Diagnostic
```

**Output:** `Geometry in layer "L", feature "F" has intersecting segments "i" and "j".`

**Severity:** error (recommended: true, since v0.3.0)

**Example failure:**
```
Bowtie polygon: (0,0)→(10,10)→(0,10)→(10,0)→(0,0)
Segment 0 (0,0→10,10) crosses segment 2 (0,10→10,0) at (5,5)
```

**Production finding:** Feature 733 in `transportation` layer, `fixtures/real-tiles/tokyo.pbf` (OpenMapTiles z14). Part 5, segments 1 and 4. Tile renders correctly in MapLibre.

---

#### `tile/winding-order`

**What it checks:** Whether polygon rings follow the MVT winding order convention.

**Why the rule exists:** MVT requires outer rings clockwise (CW), inner rings (holes) counter-clockwise (CCW). This allows earcut triangulation to distinguish outer boundaries from holes without additional metadata. When winding is wrong: outer rings rendered as holes → polygon disappears; holes rendered as outer rings → inverted fill. MapLibre wraps earcut in try/catch, so these are typically silent visual errors — no crash, no warning, wrong rendering.

**Input:** VectorTile artifact. Polygon (type 3) features only.

**Algorithm:**

```
Polygon feature
         ↓
For each ring:
  Compute signed area using shoelace formula:
  area = Σ(x_i * y_{i+1} - x_{i+1} * y_i) / 2
         ↓
  Ring 0 (outer): negative area = CW = correct
                  positive area = CCW = WINDING_ERROR
  Ring 1+ (holes): positive area = CCW = correct
                   negative area = CW = WINDING_ERROR
         ↓
Diagnostic
```

**Output:** `Outer ring in layer "L", feature F has incorrect winding order.` / `Hole ring N in layer "L", feature F has incorrect winding order.`

**Severity:** error (recommended: true, since v0.4.0)

**Example failure:**
```
Outer ring (0,0)→(0,10)→(10,10)→(10,0)→(0,0): CCW (positive area) → flagged
Correct:    (0,0)→(10,0)→(10,10)→(0,10)→(0,0): CW  (negative area) → passes
```

---

#### `tile/unclosed-ring`

**What it checks:** Whether the first and last vertex of a polygon ring are the same coordinate.

**Why the rule exists:** The MVT specification requires polygon ring closure. Unclosed rings produce ambiguous topology. Some tile generators omit the closing vertex as an optimization; this rule flags that as non-conformant. PostGIS, Turf.js, and other strict consumers reject unclosed rings.

**Input:** VectorTile artifact. Polygon (type 3) features only. LineStrings are explicitly not checked — they are allowed to be open.

**Algorithm:**

```
Polygon feature
         ↓
For each ring:
  first = points[0]
  last  = points[points.length - 1]
         ↓
  if first.x !== last.x OR first.y !== last.y → UNCLOSED_RING
  (exact integer comparison, no tolerance)
         ↓
Diagnostic
```

**Output:** `Polygon ring in layer "L", feature "F" is not closed.`

**Severity:** error (recommended: true, since v0.3.0)

**Example failure:**
```
Ring (0,0)→(10,0)→(10,10)→(0,10): last (0,10) ≠ first (0,0) → flagged
Ring (0,0)→(10,0)→(10,10)→(0,0): last (0,0) = first (0,0) → passes
```

---

#### `tile/zero-area-ring`

**What it checks:** Whether a polygon ring encloses zero (or below-threshold) area.

**Why the rule exists:** A zero-area ring is degenerate — all vertices are collinear, or the ring collapsed to a point or line. Such rings are invisible when rendered, waste tile bytes, may cause division-by-zero in centroid or label-placement algorithms, and cause numerically unstable earcut triangulation (near-zero slivers). Bowtie polygons whose positive and negative halves cancel also produce zero area.

**Input:** VectorTile artifact. Polygon (type 3) features only.

**Algorithm:**

```
Polygon ring
         ↓
Shoelace formula (same as winding-order, exact integer arithmetic):
area = Σ(x_i * y_{i+1} - x_{i+1} * y_i) / 2
         ↓
if |area| === 0 → ZERO_AREA_RING
if minArea option set AND |area| < minArea → ZERO_AREA_RING (sliver mode)
         ↓
Diagnostic
```

**Output:** `Polygon ring in layer "L", feature "F" has zero area.`

**Severity:** error (recommended: true, since v0.3.0)

**Example failure:**
```
Collinear ring (0,0)→(10,0)→(20,0)→(0,0): area = 0 → flagged
Triangle (0,0)→(10,0)→(10,10)→(0,0): area = 50 → passes
```

---

#### `tile/hole-containment`

**What it checks:** Whether hole rings (inner rings) lie outside the outer ring boundary.

**Why the rule exists:** Earcut's triangulation assumes all holes are contained within the outer ring. When a hole is outside the shell: earcut's linked-list ear-clipping corrupts, producing overlapping or missing triangles; the mesh has visual gaps, z-fighting, or renders regions that should be empty. Caused by aggressive Douglas-Peucker simplification pushing hole vertices outside a simplified outer ring, or by integer quantization at tile boundaries.

**Input:** VectorTile artifact. Polygon (type 3) features with 2 or more rings (outer + at least one hole).

**Algorithm:**

```
Polygon feature with ≥ 2 rings
         ↓
For each hole ring (ring index 1, 2, ...):
  For each vertex of the hole ring:
    Ray-casting test against the outer ring:
      Cast horizontal ray from vertex
      Count intersections with outer ring edges
      Odd count → inside (correct)
      Even count → outside → HOLE_OUTSIDE_RING
    Vertices exactly on boundary → considered valid
         ↓
Diagnostic
```

**Output:** `Hole ring N in layer "L", feature F has vertices outside the outer ring.`

**Severity:** error (recommended: true, since v0.4.0)

**Example failure:**
```
Outer ring: square (0,0)→(10,0)→(10,10)→(0,10)→(0,0)
Hole ring: square (15,15)→(20,15)→(20,20)→(15,20)→(15,15)
Hole entirely outside outer → flagged
```

---

#### `tile/degenerate-geometry`

**What it checks:** Whether geometries have enough unique vertices to form a valid shape for their declared type.

**Why the rule exists:** Degenerate geometries lack sufficient distinct coordinates to render or process correctly. They result from aggressive simplification collapsing vertices, integer quantization snapping distinct coordinates to the same grid point, or upstream data errors.

**Input:** VectorTile artifact. LineString (type 2) and Polygon (type 3) features. Point (type 1) never checked.

**Algorithm:**

```
Feature geometry
         ↓
LineString:
  uniquePointCount = count distinct "x,y" strings in points
  if uniquePointCount < 2 → DEGENERATE_LINE
         ↓
Polygon ring:
  if points.length < 4 → DEGENERATE_POLYGON (too few raw points)
  uniquePointCount = count distinct "x,y" strings in ring
  if uniquePointCount < 3 → DEGENERATE_POLYGON (insufficient unique vertices)
         ↓
Any feature:
  if no parts (empty geometry) → EMPTY_GEOMETRY
         ↓
Diagnostic
```

**Output:** `LineString has fewer than 2 unique points. Layer "L", feature "F".` / `Polygon ring has fewer than 3 unique vertices. Layer "L", feature "F".`

**Severity:** error (recommended: true, since v0.3.0)

**Example failure:**
```
LineString (5,5)→(5,5): 1 unique point → DEGENERATE_LINE
Polygon (0,0)→(10,0)→(0,0): 2 unique vertices → DEGENERATE_POLYGON
```

---

#### `tile/coordinate-range`

**What it checks:** Whether coordinates fall outside the valid tile extent plus a configurable buffer.

**Why the rule exists:** MVT coordinates exist on a tile-local integer grid (default extent 4096). Coordinates beyond any reasonable clipping buffer indicate projection errors, clipping failures, or data assigned to the wrong tile.

**Two sources of legitimate out-of-range coordinates are accounted for by the defaults:**
1. Geometry clipping buffers (tile compilers extend geometry 64–80 units beyond tile edges to prevent rendering seams)
2. Cross-tile label duplication (label layers duplicate point features at their geographic center across tile boundaries)

**Phase 1 finding:** 148,268 diagnostics on the z0–z4 corpus were 100% from these two intentional behaviors. Evidence-based defaults introduced in v0.5.1.

**Input:** VectorTile artifact. All feature types.

**Algorithm:**

```
For each layer:
  ↓
  Skip if layer is in excludeLayers
  (default: place, water_name, centroids, poi, housenumber,
   transportation_name, mountain_peak, park, aerodrome_label)
  ↓
  For each feature:
    ↓
    If skipCrossTileFeatures=true AND all coordinates are outside
    [-buffer, extent+buffer]: skip (cross-tile duplication)
    ↓
    For each coordinate (x, y):
      if x < -buffer OR x > extent+buffer
      OR y < -buffer OR y > extent+buffer → OUT_OF_RANGE
    ↓
    Diagnostic
```

**Default parameters:** buffer=80, excludeLayers=[9 known label layers], skipCrossTileFeatures=true

**Output:** `Coordinate "x,y" in layer "L" is outside allowed range [-80, 4176] (extent: 4096, buffer: 80).`

**Severity:** error (recommended: true, since v0.3.0)

**Example failure:**
```
Coordinate (-200, 500) in "roads" layer with default buffer:
  -200 < -80 → OUT_OF_RANGE → flagged

Coordinate (-60, 500) in "roads" layer:
  -60 > -80 → within buffer → passes
```

---

#### `tile/required-layers`

**What it checks:** Whether all layers listed in configuration are present in the tile.

**Why the rule exists:** CI quality gate — ensures tiles contain the layers a pipeline or application expects.

**Input:** VectorTile artifact. Configuration provides `layers: string[]`.

**Algorithm:**

```
For each required layer name in config:
  if tile.layers[layerName] === undefined → report
```

**Output:** `Required layer "L" is not present in the tile.`

**Severity:** error (configurable). Research relevance: LOW.

---

#### `tile/required-properties`

**What it checks:** Whether features in specified layers contain all declared required properties.

**Why the rule exists:** CI quality gate — ensures feature properties expected by applications are present.

**Input:** VectorTile artifact. Configuration provides `{layerName: [propertyName, ...]}`.

**Algorithm:**

```
For each configured layer (skip if layer absent from tile):
  For each feature:
    For each required property:
      if !Object.hasOwn(feature.properties, property) → report
```

**Output:** `Feature "F" in layer "L" is missing required property "P".`

**Severity:** error (configurable). Research relevance: LOW.

---

#### `tile/feature-count`

**What it checks:** Whether total feature count across all layers is within configured bounds.

**Algorithm:** Count all features; compare against optional `min` and/or `max`.

**Output:** `Tile has "N" features total, expected at least/at most "M".`

**Severity:** error (configurable). Research relevance: LOW.

---

#### `tile/layer-feature-count`

**What it checks:** Whether per-layer feature counts are within configured bounds.

**Algorithm:** For each configured layer, count features; compare against optional `min` and/or `max`.

**Output:** `Layer "L" has "N" features, expected at least/at most "M".`

**Severity:** error (configurable). Research relevance: LOW.

---

#### `tile/no-empty`

**What it checks:** Whether a tile contains zero features.

**Algorithm:** Count all features across all layers. If count === 0 and `allowEmpty !== true` → report.

**Output:** `Tile contains 0 features.`

**Severity:** warning (recommended: true, since v0.3.0). Research relevance: LOW.

---

### 1.2 Style Rules

Nine rules in `packages/style-rules/src/`. All check structural correctness of MapLibre GL style JSON. Research relevance for geometry/rendering: LOW. All pass on `demo/tokyo/style/style.json` (verified).

| Rule | What it checks | Algorithm |
|:-----|:--------------|:----------|
| `style/valid-json` | File is valid JSON | JSON.parse(); catch error |
| `style/version` | Version field equals 8 | `style.version === 8` |
| `style/sources-present` | Top-level `sources` is an object | `isRecord(style.sources)` |
| `style/layers-present` | Top-level `layers` is an array | `Array.isArray(style.layers)` |
| `style/layer-id-required` | Every layer has a non-empty `id` | `typeof id === 'string' && id.length > 0` |
| `style/unique-layer-id` | No two layers share an `id` | Track first-seen in Map; report duplicates |
| `style/known-source` | Layer `source` references a declared source | `sourceIds.has(layer.source)` |
| `style/zoom-range` | `minzoom` does not exceed `maxzoom` | `minzoom <= maxzoom` (only if both present) |
| `style/no-deprecated-ref` | No use of deprecated `ref` property | `!Object.hasOwn(layer, 'ref')` |

---

## Part 2 — What Has Actually Been Tested

### 2.1 Production tile benchmark (v0.5.0, initial)

Run: `scripts/benchmark.mjs`  
Date: 2026-07-18T05:00:26Z  
Source: `analysis/tileguard_benchmark_results.md`  
Notes: Pre-Phase-1, pre-Phase-2. Diagnostics are aggregate across all rules. No per-rule breakdown in this run.

| Dataset | Provider | Tiles | Rules active | Failures (all rules) | Runtime (ms) | Avg ms/tile | Throughput (tiles/s) |
|:--------|:---------|------:|:------------|---------------------:|-------------:|------------:|---------------------:|
| z0–z4 | OpenMapTiles | 94 | all defaults | 173 | 1,992 | 21.19 | 47.18 |
| z0–z4 | OpenFreeMap | 100 | all defaults | 223 | 2,022 | 20.22 | 49.46 |
| z0–z4 | CARTO Streets | 100 | all defaults | 223 | 1,478 | 14.78 | 67.65 |

---

### 2.2 Phase 1 benchmark (v0.5.1, after coordinate-range fix)

Run: `scripts/benchmark.mjs` (Step 4)  
Date: 2026-07-19T14:01Z  
Source: `analysis/phase1-coordinate-range/step4-benchmark-after.jsonl` (5 runs)  
Notes: coordinate-range now uses buffer=80, excludeLayers defaults. Diagnostics are aggregate (no per-rule split in these files). 5 runs; medians shown.

| Dataset | Tiles | Failures | Runtime ms (median) | Throughput tiles/s (median) |
|:--------|------:|---------:|--------------------:|-----------------------------:|
| OpenMapTiles | 94 | 173 | 1,769 | 53.1 |
| OpenFreeMap | 100 | 223 | 1,195 | 83.7 |
| CARTO Streets | 100 | 223 | 1,117 | 89.5 |

---

### 2.3 Phase 2 benchmark (v0.5.2, after self-intersection fix) — 5 runs, per-rule breakdown

Run: `scripts/benchmark.mjs` (Step 5)  
Date: 2026-07-21T13:35Z  
Source: `analysis/phase2-self-intersection/step5-benchmark-after.jsonl`  
Notes: **Only `tile/self-intersection` and `tile/coordinate-range` are active in this benchmark.** All other rules (winding-order, unclosed-ring, zero-area-ring, hole-containment, degenerate-geometry, etc.) were not included. Per-rule counts are exact from JSON.

**Mode: "after" (v0.5.2 fixes applied) — 5 runs**

| Dataset | Tiles | tile/self-intersection | tile/coordinate-range | Total | Runtime ms (mean) | Throughput tiles/s (mean) |
|:--------|------:|----------------------:|----------------------:|------:|------------------:|--------------------------:|
| OpenMapTiles | 94 | 154 | 0 | 154 | 744.68 | 126.29 |
| OpenFreeMap | 100 | 8 | 0 | 8 | 815.15 | 122.68 |
| CARTO Streets | 100 | 8 | 0 | 8 | 534.25 | 187.24 |
| **Total** | **294** | **170** | **0** | **170** | | |

**Mode: "legacy" (v0.5.0 defaults, no fixes) — 5 runs**

| Dataset | Tiles | tile/self-intersection | tile/coordinate-range | Total | Runtime ms (mean) | Throughput tiles/s (mean) |
|:--------|------:|----------------------:|----------------------:|------:|------------------:|--------------------------:|
| OpenMapTiles | 94 | 154 | 7,409 | 7,563 | 761.79 | 123.52 |
| OpenFreeMap | 100 | 8 | 7,904 | 7,912 | 852.23 | 117.42 |
| CARTO Streets | 100 | 8 | 7,964 | 7,972 | 551.66 | 181.49 |
| **Total** | **294** | **170** | **23,277** | **23,447** | | |

**Mode: "disabled" (self-intersection disabled, v0.5.1 coordinate-range) — 5 runs**

| Dataset | Tiles | tile/self-intersection | tile/coordinate-range | Total | Runtime ms (mean) |
|:--------|------:|----------------------:|----------------------:|------:|------------------:|
| OpenMapTiles | 94 | 154 | 0 | 154 | 754.87 |
| OpenFreeMap | 100 | 8 | 0 | 8 | 842.07 |
| CARTO Streets | 100 | 8 | 0 | 8 | 543.27 |

**What the disabled vs after comparison shows:** The marginal cost of self-intersection checking (after hardening) is effectively 0 ms. After − Disabled = −46 ms across 294 tiles, within noise (σ ≈ 10–35 ms per run).

---

### 2.4 Rules with NO measured production data

The following rules have been tested with unit tests and synthetic fixtures only. They have never been run against the 294-tile benchmark corpus in a documented, recorded way. Their false-positive profiles on production tiles are unknown.

| Rule | Unit tested | Synthetic fixtures | Run on 294-tile corpus |
|:-----|:-----------:|:------------------:|:----------------------:|
| `tile/winding-order` | ✓ | ✓ | ✗ — no recorded run |
| `tile/unclosed-ring` | ✓ | ✓ | ✗ — no recorded run |
| `tile/zero-area-ring` | ✓ | ✓ | ✗ — no recorded run |
| `tile/hole-containment` | ✓ | ✓ | ✗ — no recorded run |
| `tile/degenerate-geometry` | ✓ | ✓ | ✗ — no recorded run |
| `tile/required-layers` | ✓ | ✓ | n/a (needs config) |
| `tile/required-properties` | ✓ | ✓ | n/a (needs config) |
| `tile/feature-count` | ✓ | ✓ | n/a (needs config) |
| `tile/layer-feature-count` | ✓ | ✓ | n/a (needs config) |
| `tile/no-empty` | ✓ | ✓ | ✗ — no recorded run |

This is the most important gap in the current evidence base.

---

### 2.5 Decoder cross-validation

Date: 2026-07-18T03:18Z  
Source: `analysis/phase1-coordinate-range/decoder-crosscheck.json`

| Metric | Value |
|:-------|:------|
| Features tested | 562 |
| Layers tested | 13 |
| Dimensions compared | 5 (x, y, type, length, properties) |
| Divergences | **0** |
| Conclusion | TileGuard decoder identical to `@mapbox/vector-tile` reference |

---

### 2.6 Real tile — Tokyo

File: `fixtures/real-tiles/tokyo.pbf`  
Source: OpenMapTiles, z14, central Tokyo  
Downloaded: 2026-07-12  
File size: 403,601 bytes (394 KB)

| Metric | Value |
|:-------|:------|
| Layers | 13 |
| Total features | 8,233 |
| Self-intersections detected | **1** |
| Location | `transportation` layer, feature 733, part 5, segments 1 and 4 |
| Coordinate-range violations | 0 (with v0.5.1 defaults) |
| Visual rendering in MapLibre | Correct — no visible artifact |
| Time to detect | < 50 ms |

**Confirmed:** One self-intersecting linestring in a production z14 tile. Geometrically invalid per OGC Simple Features. Undetectable by visual inspection. Detected automatically by TileGuard.

**Not confirmed:** Whether this defect causes or would cause any rendering anomaly under any MapLibre configuration.

---

### 2.7 Phase 2 false-positive classification

Date: 2026-07-21  
Source: `analysis/phase2-self-intersection/ROOT_CAUSE_INVESTIGATION.md`, `self-intersection-rings.csv`  
Corpus: 294 tiles, z0–z4, all three providers  
Total diagnostics before fix: 619

| Category | Description | Count | Classification | Outcome |
|:---------|:-----------|------:|:--------------|:--------|
| Cat A | Duplicate-vertex quantization spike | 161 | False positive | Suppressed by Guard 3 |
| Cat B1 | Genuine topological crossing | 170 | True positive | Retained |
| Cat B2 | Closed LineString, missing closure skip | 282 | False positive | Suppressed by Guard 2 |
| Cat C | Collinear overlap at closing pair | 6 | False positive | Suppressed by Guard 2 |
| **Total** | | **619** | | **449 suppressed, 170 retained** |

**By dataset:**

| Dataset | Before | After | Reduction | Remaining category |
|:--------|-------:|------:|----------:|:-------------------|
| OpenMapTiles | 173 | 154 | 10.98% | 154 genuine crossings (countries layer) |
| OpenFreeMap | 223 | 8 | 96.41% | 8 genuine crossings |
| CARTO Streets | 223 | 8 | 96.41% | 8 genuine crossings |
| **Total** | **619** | **170** | **72.54%** | |

---

### 2.8 Phase 1 coordinate-range classification

Date: 2026-07-18  
Source: `analysis/phase1-coordinate-range/classification.json`, `offset-histogram.md`  
Corpus: 294 tiles, z0–z4

| Category | Count | % | Cause |
|:---------|------:|--:|:------|
| Geometry clipping buffer (Polygon/LineString) | 84,324 | 56.9% | Tile compilers extend geometry 64–80 units past tile edges |
| Cross-tile label duplication (Point) | 63,944 | 43.1% | Labels duplicated at geographic center regardless of tile boundary |
| **Total** | **148,268** | **100%** | **All intentional tile compiler behavior** |

Decoder cross-validation ruled out decoder bugs (0 divergences). After v0.5.1 defaults: **0 diagnostics** on the entire 294-tile z0–z4 corpus.

---

### 2.9 End-to-end pipeline verification

Date: 2026-09-07  
Source: `docs/foss4g/FOSS4G_RULE_AUDIT.md`  
Corpus: `demo/tokyo/`

| Stage | Input | Expected output | Result |
|:------|:------|:----------------|:-------|
| PBF decode | `tokyo-clean.pbf` (403 KB) | 13 layers, 8,233 features | ✓ |
| Tile validation (broken) | `invalid-polygon.pbf` | 2 errors: self-intersection + zero-area-ring | ✓ |
| Tile validation (clean) | `tokyo-clean.pbf` | 1 error: self-intersection in transportation | ✓ |
| Style validation | `style.json` | 0 diagnostics (all 9 style rules pass) | ✓ |
| Comparison | before.pbf → after.pbf | +8,189 features, layer changes | ✓ |
| Regression analysis | before → after | 8,235 candidates, dominant kind: layer | ✓ |
| JSON reporter | CLI `--reporter json` | Structured JSON with diagnostics + summary | ✓ |
| Text reporter | CLI default | Colored terminal output with locations | ✓ |
| Markdown report | `report --format markdown` | Engineering report with executive summary | ✓ |

---

## Part 3 — Evidence Inventory

All evidence artifacts are catalogued in `evidence/EVIDENCE_INDEX.md` with exact locations.

### Analysis data

| Artifact | Location | Contains |
|:---------|:---------|:---------|
| Coordinate offset distribution (JSON) | `analysis/phase1-coordinate-range/offset-distribution.json` | 68 MB raw offset data for all 148,268 violations |
| Coordinate offset distribution (CSV) | `analysis/phase1-coordinate-range/offset-distribution.csv` | 18.7 MB tabular version |
| Classification results | `analysis/phase1-coordinate-range/classification.json` | Hypothesis test outcomes with evidence |
| Offset histogram | `analysis/phase1-coordinate-range/offset-histogram.md` | Summary statistics table |
| Decoder crosscheck | `analysis/phase1-coordinate-range/decoder-crosscheck.json` | 0 divergences result |
| Offset visualization | `analysis/phase1-coordinate-range/offset_visualization.ipynb` | Jupyter notebook, Plotly visualizations |
| Offset dashboard | `analysis/phase1-coordinate-range/offset-dashboard.html` | Interactive HTML visualization |
| Phase 1 step 4 benchmarks | `analysis/phase1-coordinate-range/step4-benchmark-*.jsonl` | 3 mode × 5 run benchmark files |
| Self-intersection rings (JSON) | `analysis/phase2-self-intersection/self-intersection-rings.json` | 1.4 MB raw ring geometry for all 619 flagged rings |
| Self-intersection rings (CSV) | `analysis/phase2-self-intersection/self-intersection-rings.csv` | 94 KB tabular version |
| Self-intersection analysis | `analysis/phase2-self-intersection/phase2_self_intersection_analysis.ipynb` | Jupyter notebook with full classification |
| Phase 2 step 5 benchmarks | `analysis/phase2-self-intersection/step5-benchmark-*.jsonl` | 3 mode × 5 run benchmark files |
| Initial benchmark report | `analysis/tileguard_benchmark_results.md` | v0.5.0 performance summary |

### Engineering investigation docs

| Artifact | Location |
|:---------|:---------|
| Phase 1 summary | `docs/engineering/investigations/phase1/PHASE1_SUMMARY.md` |
| Phase 1 diagnostic classification | `docs/engineering/investigations/phase1/DIAGNOSTIC_CLASSIFICATION.md` |
| Phase 1 benchmark assessment | `docs/engineering/investigations/phase1/BENCHMARK_ASSESSMENT.md` |
| Phase 1 evaluation report v0.5.1 | `docs/engineering/investigations/phase1/EVALUATION_REPORT_v0.5.1.md` |
| Phase 2 summary | `docs/engineering/investigations/phase2/PHASE2_SUMMARY.md` |
| Phase 2 implementation plan | `docs/engineering/investigations/phase2/PHASE2_IMPLEMENTATION_PLAN.md` |
| Phase 2 rule selection report | `docs/engineering/investigations/phase2/RULE_SELECTION_REPORT.md` |
| Phase 2 root cause investigation | `docs/engineering/investigations/phase2/ROOT_CAUSE_INVESTIGATION.md` |
| Phase 2 evaluation report v0.5.2 | `docs/engineering/investigations/phase2/EVALUATION_REPORT_v0.5.2.md` |
| Phase 2 implementation report | `docs/engineering/investigations/phase2/IMPLEMENTATION_REPORT_v0.5.2.md` |

### Real-world findings

| Artifact | Location |
|:---------|:---------|
| Tokyo self-intersection finding | `docs/foss4g/REAL_WORLD_FINDING.md` |
| Tokyo tile (production PBF) | `fixtures/real-tiles/tokyo.pbf` (403 KB) |
| Ground truth reference | `docs/foss4g/GROUND_TRUTH_REFERENCE.md` |
| FOSS4G rule audit | `docs/foss4g/FOSS4G_RULE_AUDIT.md` |
| FOSS4G demo materials | `docs/foss4g/FOSS4G_DEMO.md`, `FOSS4G_SHORT.md`, `FAQ.md` |

### Fixtures and test data

| Artifact | Location |
|:---------|:---------|
| 294 production tiles (benchmark cache) | `fixtures/benchmark-cache/` (3 providers, z0–z4) |
| Tokyo z14 tile | `fixtures/real-tiles/tokyo.pbf` |
| Manhattan tile | `fixtures/real-tiles/manhattan.pbf` |
| Ocean tile (near-empty) | `fixtures/real-tiles/ocean.pbf` |
| Valid tile fixture | `fixtures/good/valid-tile.pbf` |
| Valid style fixture | `fixtures/good/valid-style.json` |
| Invalid tile fixtures | `fixtures/bad/invalid-tile-*.pbf` (3 files) |
| Invalid style fixtures | `fixtures/bad/*.json` (10 files) |
| Synthetic coordinate-range tiles | `fixtures/synthetic/coordinate-*.pbf` (5 files) |
| Demo Tokyo corpus | `demo/tokyo/` (clean, broken, style, regression, comparison) |

### Scripts (reusable toolchain)

| Script | Location | Status |
|:-------|:---------|:-------|
| Benchmark runner | `scripts/benchmark.mjs` | Executed — results in analysis/ |
| Offset distribution extractor | `scripts/offset-distribution.mjs` | Executed — Phase 1 data |
| Decoder cross-validator | `scripts/decoder-crosscheck.mjs` | Executed — 0 divergences |
| Self-intersection ring extractor | `scripts/extract-self-intersecting-rings.mjs` | Executed — Phase 2 data |
| Synthetic fixture generator | `scripts/generate-synthetic-fixtures.mts` | Ready — produces known-defect tiles |
| Real-world evaluator | `scripts/evaluate-real-world.mjs` | Available |
| Diagnostic inspector | `scripts/inspect-diagnostics.mjs` | Available |
| Boundary checker | `scripts/check-boundaries.mjs` | Available |

---

## Part 4 — What the Evidence Cannot Support

The following claims are not supported by any existing measurement. They require new experiments.

| Unsupported claim | What would establish it |
|:-----------------|:------------------------|
| Self-intersections occur at any particular rate at z5–z14 | Run TileGuard on a z5–z14 corpus |
| Winding-order violations exist in production tiles (or don't) | Run winding-order rule on 294-tile corpus, record counts |
| Unclosed rings exist in production tiles (or don't) | Run unclosed-ring rule on 294-tile corpus, record counts |
| Any rule other than coordinate-range and self-intersection has a measurable false-positive rate | Per-rule investigation on benchmark corpus |
| Any geometry defect causes a visible rendering anomaly in MapLibre | Headless rendering experiment |
| Source-level diagnostics can explain visual regression failures | Both rendering experiment AND diagnostic comparison |
| Results generalize beyond OSM-derived tiles | Data collection from non-OSM providers |
| Any novelty claim relative to existing work | Literature review |
