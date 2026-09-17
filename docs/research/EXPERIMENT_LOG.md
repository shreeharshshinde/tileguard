# Experiment Log

**Rule:** Only experiments that were actually run appear here. Numbers are taken directly from benchmark files, classification reports, and investigation documents. No estimates.

---

## EXP-001 — Decoder Cross-Validation

**Date:** 2026-07-18  
**Status:** Complete  
**Question:** Does TileGuard's PBF decoder produce the same coordinate values as the Mapbox reference implementation?

**Motivation:** Before investigating coordinate-range diagnostics, verify that TileGuard's decoder is not introducing artifacts. If the decoder diverges from the reference, all downstream analysis is suspect.

**Method:**  
Script `scripts/decoder-crosscheck.mjs` decoded the same tiles with both TileGuard's internal decoder and `@mapbox/vector-tile` (the Mapbox reference library). Compared 5 dimensions per feature: x, y, type, length, properties.

**Dataset:**  
- 562 features across 13 layers from the benchmark tile cache
- Tiles from all three providers (OpenMapTiles, OpenFreeMap, CARTO Streets)

**Results:**

| Metric | Value |
|:-------|:------|
| Features compared | 562 |
| Layers compared | 13 |
| Dimensions per feature | 5 |
| Divergences | **0** |

**Raw data:** `analysis/phase1-coordinate-range/decoder-crosscheck.json`

**Conclusion:** TileGuard's decoder is identical to the Mapbox reference implementation. Decoder bugs are eliminated as a source of coordinate-range diagnostics.

**What this does not establish:** Parity on features not in this sample; parity with other third-party decoders; correctness of rule logic above the decoder layer.

---

## EXP-002 — Coordinate Range False-Positive Classification (Phase 1)

**Date:** 2026-07-18 to 2026-07-19  
**Status:** Complete  
**TileGuard version:** v0.5.0 → v0.5.1  
**Question:** Are coordinate-range diagnostics on production z0–z4 tiles genuine data errors, or artifacts of tile generation?

**Dataset:** 294 cached production tiles, z0–z4  
- OpenMapTiles: 94 tiles  
- OpenFreeMap: 100 tiles  
- CARTO Streets: 100 tiles  

**Starting state:** `tile/coordinate-range` with buffer=0, excludeLayers=[] → 148,268 diagnostics on 294 tiles

**Method:**  
1. Extracted all flagged coordinate offsets to `analysis/phase1-coordinate-range/offset-distribution.json` (68 MB) and `.csv` (18.7 MB)
2. Computed histogram of signed offset magnitudes and directions
3. Performed cross-provider identity verification on 28,679 features appearing in ≥2 providers; confirmed 1,695 matches by property values (name, class)
4. Tested three hypotheses (see below)
5. Implemented evidence-based defaults and re-ran benchmark

**Hypotheses tested:**

| Hypothesis | Status | Evidence |
|:-----------|:-------|:---------|
| A: Geometry clipping buffer | Confirmed | Bimodal distribution; p95 offset = 80 units; consistent with compiler buffer behavior |
| B: Coordinate wrap-around | Rejected | Direction balance symmetric; no concentration at modulus boundary |
| C: Decoder bug | Eliminated | EXP-001 — 0 divergences |

**Classification of 148,268 diagnostics:**

| Category | Count | % | Layers affected | Geometry types |
|:---------|------:|--:|:----------------|:---------------|
| Geometry clipping buffer | 84,324 | 56.9% | countries, water, boundary, landcover, park, waterway, geolines | Polygon, LineString |
| Cross-tile label duplication | 63,944 | 43.1% | place, water_name, centroids | Point only |
| **Total** | **148,268** | **100%** | | |

**Clipping buffer detail:**

| Metric | Value |
|:-------|:------|
| p50 offset | 40 units |
| p95 offset | 80 units |
| p99 offset | 80 units |
| max offset | 80 units |
| Two distinct buffer values | 64 units (water/boundary/landcover/park/waterway) and 80 units (countries/geolines) |

**Cross-tile label duplication detail:**

| Metric | Value |
|:-------|:------|
| Affected geometry type | Point only |
| Offset range | up to ±4096 (full extent) |
| Direction balance (place layer) | 45,634 below-zero / 45,386 above-extent — symmetric |
| Identity-confirmed cross-provider matches | 1,695 (same named feature, same offset, different provider) |

**Benchmark before/after fix (Step 4, 5 runs):**

Mode: v0.5.1 defaults (buffer=80, excludeLayers=[place, water_name, centroids, ...])

| Dataset | Tiles | Diagnostics before | Diagnostics after | Runtime ms (median) | Throughput tiles/s (median) |
|:--------|------:|-------------------:|------------------:|--------------------:|-----------------------------:|
| OpenMapTiles | 94 | 173 | 173 | 1,769 | 53.1 |
| OpenFreeMap | 100 | 223 | 223 | 1,195 | 83.7 |
| CARTO Streets | 100 | 223 | 223 | 1,117 | 89.5 |

Note: Diagnostics count did not drop to 0 here because Phase 2 (self-intersection) had not yet been completed. Coordinate-range diagnostics specifically went to 0; the remaining counts are self-intersection diagnostics.

**Final result:** v0.5.1 coordinate-range rule with evidence-based defaults → **0 coordinate-range diagnostics** on the entire 294-tile z0–z4 corpus.

**Raw data:**  
- `analysis/phase1-coordinate-range/offset-distribution.json`  
- `analysis/phase1-coordinate-range/classification.json`  
- `analysis/phase1-coordinate-range/offset-histogram.md`  
- `analysis/phase1-coordinate-range/step4-benchmark-after.jsonl`  
- `docs/engineering/investigations/phase1/`

---

## EXP-003 — Self-Intersection False-Positive Classification (Phase 2)

**Date:** 2026-07-21  
**Status:** Complete  
**TileGuard version:** v0.5.1 → v0.5.2  
**Question:** Which self-intersection diagnostics on production z0–z4 tiles are genuine topological crossings, and which are algorithmic artifacts?

**Dataset:** 294 cached production tiles, z0–z4 (same corpus as EXP-002)  
Starting diagnostic count (self-intersection only): 619

**Method:**  
1. Ran `scripts/extract-self-intersecting-rings.mjs` to extract all 619 flagged ring geometries to CSV and JSON
2. Classified each ring into categories by visual and algorithmic inspection
3. Designed four algorithmic fixes
4. Implemented fixes in v0.5.2
5. Re-ran benchmark in three modes (legacy, after, disabled) × 5 runs

**Classification of 619 diagnostics:**

| Category | Description | Count | Classification |
|:---------|:-----------|------:|:--------------|
| Cat A | Duplicate-vertex quantization spike (adjacent coordinates snapped to same integer) | 161 | False positive |
| Cat B1 | Genuine topological crossing (non-adjacent segments actually cross) | 170 | True positive |
| Cat B2 | Closed LineString, missing closure skip at the (0, N-1) pair | 282 | False positive |
| Cat C | Collinear overlap at closing pair | 6 | False positive |
| **Total** | | **619** | |

**Fixes implemented:**

| Fix | Guard | Addresses | Impact |
|:----|:------|:----------|:-------|
| Fix 1 (Guard 2) | Skip the (0, N-1) pair in closed LineStrings (first==last) | Cat B2, Cat C | 288 false positives suppressed |
| Fix 2 (Guard 3) | Pre-scan for duplicate vertices; skip pairs whose only contact is a duplicate | Cat A | 161 false positives suppressed |
| Fix 3 (Guard 4) | Axis-aligned bounding box pre-check before orientation test | Performance | ~99.97% of pairs rejected before orientation test |
| Fix 4 (Guard 1) | Skip rings with < 4 vertices | Edge case | No non-adjacent pair possible |

**Before/after by dataset:**

| Dataset | Before | After | Reduction | Remaining |
|:--------|-------:|------:|----------:|:----------|
| OpenMapTiles | 173 | 154 | 10.98% | 154 genuine crossings (countries layer) |
| OpenFreeMap | 223 | 8 | 96.41% | 8 genuine crossings |
| CARTO Streets | 223 | 8 | 96.41% | 8 genuine crossings |
| **Total** | **619** | **170** | **72.54%** | **170 genuine** |

**Benchmark results (Step 5, 5 runs per mode):**

All numbers from `analysis/phase2-self-intersection/step5-benchmark-*.jsonl`.

Mode "after" (v0.5.2):

| Dataset | Tiles | Diagnostics | Runtime ms (mean) | Throughput tiles/s (mean) | Peak heap MB (mean) | Peak RSS MB (mean) |
|:--------|------:|------------:|------------------:|--------------------------:|--------------------:|-------------------:|
| OpenMapTiles | 94 | 154 | 744.68 | 126.29 | 23.35 | 115.75 |
| OpenFreeMap | 100 | 8 | 815.15 | 122.68 | 82.51 | 183.43 |
| CARTO Streets | 100 | 8 | 534.25 | 187.24 | 38.66 | 176.91 |

Mode "legacy" (v0.5.0, no fixes, pre-Phase-1):

| Dataset | Tiles | Diagnostics | Runtime ms (mean) | Throughput tiles/s (mean) |
|:--------|------:|------------:|------------------:|--------------------------:|
| OpenMapTiles | 94 | 7,563 | 761.79 | 123.52 |
| OpenFreeMap | 100 | 7,912 | 852.23 | 117.42 |
| CARTO Streets | 100 | 7,972 | 551.66 | 181.49 |

Mode "disabled" (self-intersection OFF, v0.5.1 coordinate-range):

| Dataset | Tiles | Diagnostics | Runtime ms (mean) | Throughput tiles/s (mean) |
|:--------|------:|------------:|------------------:|--------------------------:|
| OpenMapTiles | 94 | 154 | 754.87 | 124.78 |
| OpenFreeMap | 100 | 8 | 842.07 | 118.93 |
| CARTO Streets | 100 | 8 | 543.27 | 184.17 |

**Marginal cost of self-intersection hardening:**  
After total runtime: 2,094 ms across 294 tiles  
Disabled total runtime: 2,140 ms across 294 tiles  
Delta: **−46 ms** (within noise; σ ≈ 10–35 ms per run)

**Throughput projections to 10,000 tiles:**
- Combined average: 140.40 tiles/s → **71.2 seconds**
- CARTO Streets: 187.24 tiles/s → **53.4 seconds** (meets <60s target)
- OpenMapTiles: 126.29 tiles/s → **79.2 seconds**
- OpenFreeMap: 122.68 tiles/s → **81.5 seconds**

**Test environment:**  
OS: Fedora Linux, kernel 6.19.14-200.fc43.x86_64  
CPU: Intel Core Ultra 5 125H, 18 logical CPUs  
RAM: 14 GiB  
Node: v22.22.0  
5 warm-up iterations before timing; 5 independent process runs measured.

**Raw data:**  
- `analysis/phase2-self-intersection/self-intersection-rings.json`  
- `analysis/phase2-self-intersection/self-intersection-rings.csv`  
- `analysis/phase2-self-intersection/phase2_self_intersection_analysis.ipynb`  
- `analysis/phase2-self-intersection/step5-benchmark-after.jsonl`  
- `analysis/phase2-self-intersection/step5-benchmark-legacy.jsonl`  
- `analysis/phase2-self-intersection/step5-benchmark-disabled.jsonl`  
- `docs/engineering/investigations/phase2/`

---

## EXP-004 — Tokyo Production Tile Analysis

**Date:** 2026-08-08 (finding documented)  
**Status:** Complete (single tile analysis)  
**Question:** Does TileGuard detect real geometry defects in production tiles at z14?

**Dataset:** `fixtures/real-tiles/tokyo.pbf` — OpenMapTiles z14, central Tokyo, 403 KB

**Method:** Ran `tileguard check fixtures/real-tiles/tokyo.pbf` with default configuration (v0.5.2).

**Results:**

| Metric | Value |
|:-------|:------|
| Layers in tile | 13 |
| Total features | 8,233 |
| Rules run | All enabled rules (v0.5.2 defaults) |
| Diagnostics produced | **1** |
| Diagnostic rule | `tile/self-intersection` |
| Location | `transportation` layer, feature 733, part 5, segments 1 and 4 |
| Severity | error |
| Detection time | < 50 ms |

**Verified independently:** The tile renders correctly in MapLibre GL. No visual artifact is visible at any zoom level or pan position tested. The self-intersection is sub-visual at the z14 tile resolution.

**Raw data:** `docs/foss4g/REAL_WORLD_FINDING.md`

---

## EXP-005 — End-to-End Pipeline Verification

**Date:** 2026-09-07  
**Status:** Complete  
**Question:** Does the full TileGuard pipeline produce consistent, correct output on a controlled corpus?

**Dataset:** `demo/tokyo/` — 5 files: clean tile, broken tile, 2 comparison tiles, style JSON

**Method:** Manual step-by-step verification of each pipeline stage using the Tokyo corpus. Results documented in `FOSS4G_RULE_AUDIT.md`.

**Results:**

| Stage | Input | Expected | Actual | Pass |
|:------|:------|:---------|:-------|:----:|
| Decode | tokyo-clean.pbf | 13 layers, 8,233 features | 13 layers, 8,233 features | ✓ |
| Validate (broken) | invalid-polygon.pbf | 2 errors (self-intersection + zero-area-ring) | 2 errors | ✓ |
| Validate (clean) | tokyo-clean.pbf | 1 error (self-intersection, transportation:733:5) | 1 error | ✓ |
| Style validate | style.json | 0 diagnostics (9 style rules pass) | 0 diagnostics | ✓ |
| Compare | before → after | +8,189 features, layer changes detected | +8,189 features | ✓ |
| Regression | before → after | 8,235 candidates, dominant kind: layer | 8,235 candidates | ✓ |
| JSON reporter | any | Structured JSON with diagnostics + summary | Correct JSON | ✓ |
| Text reporter | any | Colored terminal output with breadcrumbs | Correct text | ✓ |
| Markdown report | any | Engineering report with executive summary | Correct MD | ✓ |

**Raw data:** `docs/foss4g/FOSS4G_RULE_AUDIT.md`

---

## Experiments Not Yet Run

The following experiments are needed but have not been performed. Numbers will be filled in when they are run.

| ID | Question | Dataset needed | Priority |
|:---|:---------|:--------------|:---------|
| EXP-006 | What are the production diagnostic counts for winding-order, unclosed-ring, zero-area-ring, hole-containment, degenerate-geometry on the 294-tile corpus? | existing 294 tiles | HIGH — Phase 0 feasibility |
| EXP-007 | Do any of the 170 confirmed self-intersections produce visible rendering artifacts in MapLibre? | existing tiles + headless MapLibre | HIGH — RQ3 viability |
| EXP-008 | What is the self-intersection prevalence at z5–z14? | new tile collection | MEDIUM |
| EXP-009 | What is the detection accuracy (precision/recall/F1) of each rule against known-defect synthetic tiles? | `generate-synthetic-fixtures.mts` | MEDIUM |
| EXP-010 | Do winding-order violations in production tiles cause observable rendering anomalies? | existing tiles + headless MapLibre | MEDIUM |
