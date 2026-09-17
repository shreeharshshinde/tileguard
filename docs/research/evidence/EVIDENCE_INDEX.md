# Evidence Index

**Created:** September 2026  
**Purpose:** Catalogue every piece of evidence that exists in the TileGuard repository. This is a preservation index — the goal is to know exactly what we have and where it is, not to polish or summarise it.  
**Rule:** Only artifacts that physically exist in the repository appear here. No estimates. No aspirational items. Paths are relative to the repository root.

---

## How to Use This Index

Each entry records:
- **What it is** — exactly
- **Path** — from repo root
- **File size / format** — so you can judge what's loadable
- **Date produced** — when the experiment was run
- **What it establishes** — the one-line conclusion
- **Experiment** — which EXP-XXX produced it
- **Status** — whether it has been analysed, partially analysed, or is raw/unanalysed

---

## Category 1 — Raw Benchmark Data (JSONL)

Machine-readable benchmark outputs. Source of all throughput and diagnostic count numbers in the Audit.

---

### Phase 1 — Coordinate Range (v0.5.1)

| Artifact | Path | Size | Date | Experiment |
|:---------|:-----|:-----|:-----|:-----------|
| Step 4 benchmark — after (5 runs) | `analysis/phase1-coordinate-range/step4-benchmark-after.jsonl` | ~3.8 KB | 2026-07-19T14:15Z | EXP-002 |
| Step 4 benchmark — disabled (5 runs) | `analysis/phase1-coordinate-range/step4-benchmark-disabled.jsonl` | ~3.9 KB | 2026-07-19T14:15Z | EXP-002 |
| Step 4 benchmark — legacy (5 runs) | `analysis/phase1-coordinate-range/step4-benchmark-legacy.jsonl` | ~3.9 KB | 2026-07-19T14:15Z | EXP-002 |

**Status:** Fully analysed. Numbers are in `TILEGUARD_AUDIT.md §2.2` and `EXPERIMENT_LOG.md EXP-002`.

---

### Phase 2 — Self-Intersection (v0.5.2)

| Artifact | Path | Size | Date | Experiment |
|:---------|:-----|:-----|:-----|:-----------|
| Step 5 benchmark — after (5 runs) | `analysis/phase2-self-intersection/step5-benchmark-after.jsonl` | ~4.5 KB | 2026-07-21T13:35Z | EXP-003 |
| Step 5 benchmark — disabled (5 runs) | `analysis/phase2-self-intersection/step5-benchmark-disabled.jsonl` | ~4.5 KB | 2026-07-21T13:35Z | EXP-003 |
| Step 5 benchmark — legacy (5 runs) | `analysis/phase2-self-intersection/step5-benchmark-legacy.jsonl` | ~5.0 KB | 2026-07-21T13:35Z | EXP-003 |

**What they establish:** Per-run throughput and diagnostic counts for 294 tiles in three modes. After vs. disabled delta = −46 ms across 294 tiles (within noise). After mode: 170 diagnostics total (154 OMT, 8 OFM, 8 CARTO).

**Status:** Fully analysed. Numbers are in `TILEGUARD_AUDIT.md §2.3` and `EXPERIMENT_LOG.md EXP-003`.

---

### Initial Benchmark (v0.5.0)

| Artifact | Path | Size | Date | Experiment |
|:---------|:-----|:-----|:-----|:-----------|
| Benchmark results summary (Markdown) | `analysis/tileguard_benchmark_results.md` | ~1.4 KB | 2026-07-18T05:00Z | EXP-002 (v0.5.0 baseline) |

**What it establishes:** v0.5.0 baseline performance: OMT 47.18 tiles/s, OFM 49.46 tiles/s, CARTO 67.65 tiles/s. Pre-Phase-1 fix aggregate diagnostics (173/223/223). No per-rule breakdown.

**Status:** Analysed. Numbers in `TILEGUARD_AUDIT.md §2.1`.

---

## Category 2 — Raw Analysis Data (Large Files)

These are the primary data artifacts from Phase 1 and Phase 2 root-cause investigations.

| Artifact | Path | Size | Date | Experiment |
|:---------|:-----|:-----|:-----|:-----------|
| Coordinate offset distribution (JSON) | `analysis/phase1-coordinate-range/offset-distribution.json` | 68 MB | 2026-07-18T03:08Z | EXP-002 |
| Coordinate offset distribution (CSV) | `analysis/phase1-coordinate-range/offset-distribution.csv` | 18.7 MB | 2026-07-18T03:08Z | EXP-002 |
| Classification results (JSON) | `analysis/phase1-coordinate-range/classification.json` | ~4.9 KB | 2026-07-18 | EXP-002 |
| Decoder crosscheck (JSON) | `analysis/phase1-coordinate-range/decoder-crosscheck.json` | ~179 B | 2026-07-18 | EXP-001 |
| Self-intersection rings (JSON) | `analysis/phase2-self-intersection/self-intersection-rings.json` | 1.4 MB | 2026-07-21T12:41Z | EXP-003 |
| Self-intersection rings (CSV) | `analysis/phase2-self-intersection/self-intersection-rings.csv` | 94 KB | 2026-07-21T12:41Z | EXP-003 |

**What the offset-distribution files establish:** 148,268 out-of-range coordinates; bimodal distribution peaking at ±80 units (clipping buffer) and ±4096 units (cross-tile label duplication). Basis for all Phase 1 conclusions.

**What the rings files establish:** Ring geometries and metadata for all 619 flagged self-intersections. Basis for Phase 2 root-cause classification.

**What the crosscheck file establishes:** 0 divergences between TileGuard decoder and Mapbox reference decoder across 562 features / 13 layers.

**Status:** Fully analysed. Summary statistics in `TILEGUARD_AUDIT.md §2.5, §2.7, §2.8`.

---

## Category 3 — Jupyter Notebooks

Computational notebooks with visualisations. Not yet converted to static outputs in the repo.

| Artifact | Path | Size | Date | Experiment |
|:---------|:-----|:-----|:-----|:-----------|
| Offset visualisation notebook | `analysis/phase1-coordinate-range/offset_visualization.ipynb` | 151 KB | 2026-07-18T08:14Z | EXP-002 |
| Self-intersection analysis notebook | `analysis/phase2-self-intersection/phase2_self_intersection_analysis.ipynb` | 137 KB | 2026-07-21T14:20Z | EXP-003 |

**What they contain:**  
- `offset_visualization.ipynb`: Plotly histograms of offset distributions; layer breakdown charts; cross-provider identity verification visualisation.  
- `phase2_self_intersection_analysis.ipynb`: Ring geometry classification; visualisations of each false-positive category; before/after diagnostic count comparisons.

**Status:** Produced during experiments; not independently verified for reproducibility after repo reorganisation. Cells last run: see notebook metadata.

**To reproduce:** Python 3.14 venv at `.venv/`; requires `pip install -r analysis/requirements.txt`.

---

## Category 4 — Interactive / Static Visualisations

| Artifact | Path | Size | Date | Experiment |
|:---------|:-----|:-----|:-----|:-----------|
| Offset dashboard (HTML) | `analysis/phase1-coordinate-range/offset-dashboard.html` | 16.3 KB | 2026-07-18T03:11Z | EXP-002 |
| Offset histogram summary (Markdown) | `analysis/phase1-coordinate-range/offset-histogram.md` | ~3.2 KB | 2026-07-18T03:08Z | EXP-002 |

**What they contain:** The dashboard is a standalone HTML file with embedded Plotly charts from the offset distribution data. The histogram markdown is a summary table of bucketed offset counts (12 buckets from −4096 to +4096).

**Status:** Produced; useful for presentations. Not reproducible without the Python notebook.

---

## Category 5 — Engineering Investigation Documents

Narrative documents written during each phase to record reasoning, decisions, and conclusions. These are the closest thing to a methods section for the experiments.

### Phase 1

| Document | Path | Size |
|:---------|:-----|:-----|
| Phase 1 summary | `docs/engineering/investigations/phase1/PHASE1_SUMMARY.md` | ~7.6 KB |
| Diagnostic classification | `docs/engineering/investigations/phase1/DIAGNOSTIC_CLASSIFICATION.md` | ~8.9 KB |
| Benchmark assessment | `docs/engineering/investigations/phase1/BENCHMARK_ASSESSMENT.md` | ~5.3 KB |
| Evaluation report v0.5.1 | `docs/engineering/investigations/phase1/EVALUATION_REPORT_v0.5.1.md` | ~11.3 KB |

**Experiment covered:** EXP-002

### Phase 2

| Document | Path | Size |
|:---------|:-----|:-----|
| Phase 2 summary | `docs/engineering/investigations/phase2/PHASE2_SUMMARY.md` | ~5.1 KB |
| Root cause investigation | `docs/engineering/investigations/phase2/ROOT_CAUSE_INVESTIGATION.md` | ~19.2 KB |
| Implementation plan | `docs/engineering/investigations/phase2/PHASE2_IMPLEMENTATION_PLAN.md` | ~14.5 KB |
| Rule selection report | `docs/engineering/investigations/phase2/RULE_SELECTION_REPORT.md` | ~11.0 KB |
| Implementation report v0.5.2 | `docs/engineering/investigations/phase2/IMPLEMENTATION_REPORT_v0.5.2.md` | ~3.1 KB |
| Evaluation report v0.5.2 | `docs/engineering/investigations/phase2/EVALUATION_REPORT_v0.5.2.md` | ~11.0 KB |

**Experiment covered:** EXP-003

**Status:** Fully written. These are the authoritative accounts of each phase's reasoning. The TILEGUARD_AUDIT.md distils their conclusions.

---

## Category 6 — Real-World Production Tiles

| Artifact | Path | Size | Source | Date acquired |
|:---------|:-----|:-----|:-------|:--------------|
| Tokyo z14 tile | `fixtures/real-tiles/tokyo.pbf` | 394 KB (403,601 bytes) | OpenMapTiles | 2026-07-12 |
| Manhattan tile | `fixtures/real-tiles/manhattan.pbf` | 3.4 KB | Unknown source | 2026-07-12 |
| Ocean tile (near-empty) | `fixtures/real-tiles/ocean.pbf` | 77 B | Unknown source | 2026-07-12 |

**What the Tokyo tile establishes:** 13 layers, 8,233 features. 1 confirmed self-intersection in `transportation` layer, feature 733, part 5 (segments 1 and 4). Tile renders correctly in MapLibre — defect is sub-visual. Key evidence for EXP-004.

**What the ocean tile establishes:** Near-empty tile (77 bytes); exercises `tile/no-empty` and edge cases in all geometry rules.

**Status:** Tokyo tile: fully analysed (EXP-004, documented in `docs/foss4g/REAL_WORLD_FINDING.md`). Manhattan and ocean tiles: used for demo/comparison; not deeply analysed.

---

## Category 7 — Benchmark Cache (294 Production Tiles)

| Artifact | Path | Count | Source | Zoom levels | Date acquired |
|:---------|:-----|:-----:|:-------|:------------|:--------------|
| OpenMapTiles tiles | `fixtures/benchmark-cache/OpenMapTiles/` | 94 | OpenMapTiles | z0–z4 | 2026-07-18 |
| OpenFreeMap tiles | `fixtures/benchmark-cache/OpenFreeMap/` | 100 | OpenFreeMap | z0–z4 | 2026-07-18 |
| CARTO Streets tiles | `fixtures/benchmark-cache/CARTO Streets/` | 100 | CARTO Streets | z0–z4 | 2026-07-18 |
| **Total** | | **294** | 3 providers | z0–z4 | |

**Naming convention:** `{z}-{x}-{y}.pbf`

**What this corpus establishes:** The benchmark corpus for EXP-002 and EXP-003. All coordinate-range and self-intersection analysis uses these 294 tiles. Rules not yet run against this corpus: winding-order, unclosed-ring, zero-area-ring, hole-containment, degenerate-geometry.

**Total size:** ~50.7 MB (`analysis/phase2-self-intersection/step5-benchmark-after.jsonl` records `totalBytes: 50745591`)

**Status:** Tiles are intact. All Phase 1 and Phase 2 scripts ran against this corpus. EXP-006 (remaining rules) is pending.

---

## Category 8 — Test Fixtures (Synthetic and Controlled)

### Good / valid fixtures

| Artifact | Path | Size |
|:---------|:-----|:-----|
| Valid tile | `fixtures/good/valid-tile.pbf` | 64 B |
| Valid style | `fixtures/good/valid-style.json` | 1.2 KB |

### Bad / invalid fixtures

| Artifact | Path | Size | What defect it contains |
|:---------|:-----|:-----|:------------------------|
| Invalid tile — self-intersection | `fixtures/bad/invalid-tile-self-intersection.pbf` | 37 B | Bowtie polygon |
| Invalid tile — degenerate | `fixtures/bad/invalid-tile-degenerate.pbf` | 26 B | Degenerate geometry |
| Invalid tile — coords | `fixtures/bad/invalid-tile-coords.pbf` | 29 B | Out-of-range coordinates |
| Broken style | `fixtures/bad/broken-style.json` | 656 B | JSON syntax error |
| Missing sources | `fixtures/bad/missing-sources.json` | 168 B | No `sources` object |
| Missing layers | `fixtures/bad/missing-layers.json` | 159 B | No `layers` array |
| Deprecated ref | `fixtures/bad/deprecated-ref.json` | 350 B | `ref` property in layer |
| Invalid version | `fixtures/bad/invalid-version.json` | 209 B | `version` ≠ 8 |
| Invalid zoom range | `fixtures/bad/invalid-zoom-range.json` | 357 B | `minzoom > maxzoom` |
| Missing layer ID | `fixtures/bad/missing-layer-id.json` | 260 B | Layer without `id` |
| Duplicate layer ID | `fixtures/bad/duplicate-layer-id.json` | 356 B | Two layers share an `id` |
| Unknown source | `fixtures/bad/unknown-source.json` | 309 B | Layer references undeclared source |

### Edge case fixtures

| Artifact | Path | Size | What it tests |
|:---------|:-----|:-----|:--------------|
| Background layer without source | `fixtures/edge-cases/background-no-source.json` | 262 B | background layer type has no source requirement |
| Sources null | `fixtures/edge-cases/sources-null.json` | 161 B | `sources` is null |
| Layers not array | `fixtures/edge-cases/layers-not-array.json` | 144 B | `layers` is not an array |
| Version as string | `fixtures/edge-cases/version-as-string.json` | 164 B | version is "8" not 8 |
| Zoom equal | `fixtures/edge-cases/zoom-equal.json` | 359 B | `minzoom === maxzoom` (should pass) |
| Minimal valid style | `fixtures/edge-cases/minimal-valid-style.json` | 52 B | Absolute minimum valid style |
| Empty style | `fixtures/edge-cases/empty-style.json` | 0 B | Zero-byte file |

### Synthetic coordinate-range fixtures

| Artifact | Path | Size | What it contains |
|:---------|:-----|:-----|:-----------------|
| Coordinate — water name | `fixtures/synthetic/coordinate-water-name.pbf` | 70 B | Water_name label layer (cross-tile label duplication case) |
| Coordinate — place 228 | `fixtures/synthetic/coordinate-place-228.pbf` | 65 B | Place layer with large offset |
| Coordinate — countries 80 | `fixtures/synthetic/coordinate-countries-80.pbf` | 66 B | Countries layer at buffer boundary |
| Coordinate — boundary 64 | `fixtures/synthetic/coordinate-boundary-64.pbf` | 54 B | Boundary layer at 64-unit buffer |
| Coordinate — poi corrupt | `fixtures/synthetic/coordinate-poi-corrupt.pbf` | 72 B | POI with corrupt coordinate |

**Status:** All used in unit tests. Not yet used in precision/recall experiments (EXP-009 pending).

---

## Category 9 — Demo Corpus (FOSS4G)

| Artifact | Path | Size | Purpose |
|:---------|:-----|:-----|:--------|
| Clean Tokyo tile | `demo/tokyo/clean/tokyo-clean.pbf` | ~403 KB | Inspector demo — valid tile baseline |
| Broken geometry tile | `demo/tokyo/broken/invalid-polygon.pbf` | Small | Diagnostics demo — self-intersection + zero-area-ring |
| Missing property tile | `demo/tokyo/broken/missing-property.pbf` | Small | Diagnostics demo — coordinate-range |
| Duplicate ID tile | `demo/tokyo/broken/duplicate-id.pbf` | Small | Diagnostics demo — degenerate geometry |
| Comparison before | `demo/tokyo/comparison/before.pbf` | ~3.4 KB | Compare demo — Manhattan |
| Comparison after | `demo/tokyo/comparison/after.pbf` | ~403 KB | Compare demo — Tokyo |
| Regression before | `demo/tokyo/regression/before.pbf` | ~3.4 KB | Regression demo |
| Regression after | `demo/tokyo/regression/after.pbf` | ~403 KB | Regression demo |
| Demo style | `demo/tokyo/style/style.json` | Small | Style Explorer demo |

**What this corpus establishes:** All 9 pipeline stages verified end-to-end (EXP-005). All demo scenarios for FOSS4G 2026 confirmed working.

---

## Category 10 — FOSS4G Preparation Documents

Not raw data, but contain analysis and findings narrative.

| Document | Path | Size | Contains |
|:---------|:-----|:-----|:---------|
| Real-world finding | `docs/foss4g/REAL_WORLD_FINDING.md` | 3.5 KB | Documented EXP-004: Tokyo self-intersection finding |
| Ground truth reference | `docs/foss4g/GROUND_TRUTH_REFERENCE.md` | 41.2 KB | Comprehensive rule truth tables for all rules |
| FOSS4G rule audit | `docs/foss4g/FOSS4G_RULE_AUDIT.md` | 20.1 KB | Detailed per-rule algorithm descriptions and EXP-005 results |
| FOSS4G demo script | `docs/foss4g/FOSS4G_DEMO.md` | 10.7 KB | Full 20-minute demo script |
| FOSS4G short demo | `docs/foss4g/FOSS4G_SHORT.md` | 1.8 KB | 5-minute lightning talk version |
| FOSS4G FAQ | `docs/foss4g/FAQ.md` | 7.2 KB | Anticipated questions with answers |

---

## Category 11 — Scripts (Reusable Experimental Toolchain)

These scripts were run to produce the evidence above. They are available for re-running or extending experiments.

| Script | Path | Status | Produced |
|:-------|:-----|:-------|:---------|
| Benchmark runner | `scripts/benchmark.mjs` | Ran — results in `analysis/` | EXP-002, EXP-003 data |
| Offset distribution extractor | `scripts/offset-distribution.mjs` | Ran — 68 MB output | EXP-002 raw data |
| Decoder cross-validator | `scripts/decoder-crosscheck.mjs` | Ran — 0 divergences | EXP-001 result |
| Self-intersection ring extractor | `scripts/extract-self-intersecting-rings.mjs` | Ran — 1.4 MB JSON + 94 KB CSV | EXP-003 ring data |
| Real-world evaluator | `scripts/evaluate-real-world.mjs` | Available (not fully recorded) | EXP-004 candidate |
| Diagnostic inspector | `scripts/inspect-diagnostics.mjs` | Available | Diagnostic analysis helper |
| Boundary checker | `scripts/check-boundaries.mjs` | Available | Coordinate boundary analysis |
| Synthetic fixture generator | `scripts/generate-synthetic-fixtures.mts` | Available — not run for EXP-009 yet | Needed for EXP-009 |
| Smoke test | `scripts/smoke-test.sh` | Available | CI integration verification |
| Rule test checker | `scripts/check-rule-tests.sh` | Available | Verifies each rule has test coverage |

---

## Category 12 — Unit Test Suite

| Artifact | Path | Test cases | Status |
|:---------|:-----|:----------:|:-------|
| Tile rule tests (12 rules) | `packages/tile-rules/tests/` | 124 `it()` blocks | All passing |
| Style rule tests (9 rules) | `packages/style-rules/tests/` | 198 `it()` blocks | All passing |
| Core engine tests | `packages/core/tests/` | — | Passing |
| Other package tests | `packages/*/tests/` | — | Passing |
| **Total** | | **322** | |

**What the tests establish:** Each rule produces correct diagnostics on unit-test inputs (controlled, known-defect fixtures). This is a functional correctness baseline, not a production accuracy measurement.

---

## What Does Not Exist Yet

Evidence that is referenced or needed but has not been produced:

| Gap | Why it matters | Would produce |
|:----|:--------------|:--------------|
| EXP-006 output — winding-order, unclosed-ring, zero-area-ring, hole-containment, degenerate-geometry on 294 tiles | Primary gap in the prevalence evidence | Raw diagnostic counts; may require false-positive investigation phases 3–7 |
| EXP-007 — headless MapLibre rendering for 170 self-intersections | RQ3: source-to-render relationship | Visual comparison images; correlation table |
| EXP-008 — z5–z14 tile corpus | RQ4: zoom generalisation | New benchmark dataset; diagnostic counts |
| EXP-009 — precision/recall against synthetic tiles | RQ5: detection accuracy | TP/FP/TN/FN per rule; precision and recall figures |
| EXP-010 — headless rendering for winding-order violations | RQ3 extension | Visual comparison images |
| Category E literature search results | Novelty verification; RQ-L1/L2/L3 | Paper matrix entries with confirmed reads |
| Screenshot gallery — Inspector UI | FOSS4G demo material | Static images showing canvas rendering, diagnostics overlay, comparison view |
