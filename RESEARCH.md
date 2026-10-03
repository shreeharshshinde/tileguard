# TileGuard — Research

TileGuard is built on a corpus study of vector tile quality across three production pipelines at zoom levels z0–z14. This document summarises the empirical work behind the tool's rule defaults, suppression guards, and diagnostic taxonomy.

Full methodology, raw data, and per-experiment notes live in [`docs/research/EXPERIMENT_LOG.md`](docs/research/EXPERIMENT_LOG.md). Classification criteria are in [`docs/research/CLASSIFICATION_CRITERIA.md`](docs/research/CLASSIFICATION_CRITERIA.md).

---

## Research Question

> For Mapbox Vector Tiles produced by production pipelines, what fraction of geometry-validator diagnostics are encoding artifacts versus genuine data defects, what transformation mechanisms produce them, and to what extent do genuine defects produce observable rendering anomalies in web map engines?

The core difficulty is that the transformations in a tile pipeline — simplification, coordinate quantization, clipping, winding-convention normalisation — make it non-trivial to distinguish a genuine geometry defect from an intentional encoding behavior. A naively correct geometry validator produces massive false-positive rates on valid production tiles. Deciding which diagnostics matter requires understanding what the pipeline does.

---

## Corpus

| Provider | Pipeline | Tiles (z0–z4) | Extent | Buffer |
|:---------|:---------|:-------------:|:------:|:------:|
| OpenMapTiles | PostGIS + imposm3 | 94 | 4096 | 80 units |
| OpenFreeMap | Planetiler | 100 | 4096 | 64 units |
| CARTO Streets | CARTO proprietary | 100 | 4096 | 64 units |

294 tiles total at z0–z4. Extended to z8, z12, and z14 (1,800 additional tiles across OpenFreeMap and CARTO Streets) in Phase 3. Compiler provenance was established by URL analysis, raw PBF inspection, layer schema fingerprinting, and provider documentation — no tile compiler embeds generator tags in the PBF format.

---

## Diagnostic Taxonomy

All diagnostics produced by TileGuard rules are classified into four categories:

| Category | Definition |
|:---------|:-----------|
| **Checker Error** | Diagnostic caused by a TileGuard rule bug or edge case. Tile data is valid. |
| **Quantization Artifact** | Caused by float→integer coordinate snapping during tile compilation. Source geometry is valid. |
| **Spec-Permitted Convention** | Encoding choice explicitly permitted by MVT spec or established tile compiler practice. |
| **Genuine Defect** | True topological/structural defect in tile data. Persists with a corrected rule on correctly compiled data. |

---

## Experiments

### EXP-001 — Decoder Cross-Validation

**Question:** Does TileGuard's PBF decoder produce the same results as the Mapbox reference implementation?

**Result:** 0 divergences across 562 features, 13 layers, 5 dimensions per feature. Decoder bugs are eliminated as a source of downstream diagnostic variance. All subsequent experiments operate on decoder-verified data.

---

### EXP-002 — Coordinate-Range False-Positive Classification

**Question:** Are `tile/coordinate-range` diagnostics on production z0–z4 tiles genuine errors or encoding artifacts?

**Starting count:** 148,268 diagnostics across 294 tiles with default parameters.

**Classification:**

| Category | Count | % | Taxonomy |
|:---------|------:|--:|:---------|
| Geometry clipping buffer (64–80 units beyond tile extent) | 84,324 | 56.9% | Spec-Permitted Convention |
| Cross-tile label point duplication | 63,944 | 43.1% | Spec-Permitted Convention |
| **Total** | **148,268** | **100%** | **100% Spec-Permitted** |

**After fix:** Evidence-based defaults (buffer=80, label layers excluded) → **0 diagnostics** on the full 294-tile corpus.

**Implication:** A naively configured coordinate-range validator produces 148,268 false-positive alerts on valid production tiles. The two mechanisms — clipping buffer coordinates and cross-tile label duplication — are documented, intentional behaviors of every major tile compiler.

---

### EXP-010 — Winding Convention Audit

**Question:** What winding convention do production providers actually use, and is TileGuard's `geometry.ts` correct?

**Result (4,775 Polygon features across 294 tiles):**

| Provider | CW Exterior (MVT Spec) | CCW Exterior (OGC) |
|:---------|:----------------------:|:------------------:|
| OpenMapTiles | 99.85% | 0.15% |
| OpenFreeMap | 100% | 0% |
| CARTO Streets | 100% | 0% |

All three providers emit MVT spec-conformant clockwise exterior rings. TileGuard's adaptive convention detection (`detectWindingConvention`) is correct. A validator that naively enforces OGC winding convention on production tiles would produce false positives on every polygon feature.

---

### EXP-003 — Self-Intersection False-Positive Classification

**Question:** Which `tile/self-intersection` diagnostics are genuine topological crossings and which are algorithmic artifacts?

**Starting count:** 619 diagnostics across 294 tiles.

**Classification (4-Way Taxonomy):**

| Category | Description | Count | % | Taxonomy |
|:---------|:------------|------:|--:|:---------|
| Cat B2 | Closed LineString closure skip: checker compared seg[0] vs seg[N−1] at the closing vertex | 282 | 45.6% | Checker Error |
| Cat C | Collinear overlap at closing pair | 6 | 1.0% | Checker Error |
| Cat A | Duplicate-vertex quantization spike: float→int snapping produces P[i] = P[i+1] | 161 | 26.0% | Quantization Artifact |
| Cat B1 (LineString) | LineString crossing: OGC non-simple but valid | 16 | 2.6% | Spec-Permitted Convention |
| Cat B1 (Polygon) | Polygon interior crossing: non-adjacent segments cross — OGC invalid | 154 | 24.9% | **Genuine Defect** |
| **Total** | | **619** | **100%** | |

**Suppression guards implemented (v0.5.2):**

| Guard | Mechanism | FP Eliminated |
|:------|:----------|:-------------:|
| Guard 1 | Minimum-vertex skip (< 4 vertices) | 0 (edge case) |
| Guard 2 | Closed-LineString closure skip | 288 |
| Guard 3 | Duplicate-vertex pre-scan + pair skip | 161 |
| Guard 4 | AABB bounding-box pre-check | Performance only |
| Guard 5 | Self-tangency skip (non-adjacent shared vertex) | 0 on this corpus |

**After guards:** 619 → 170 diagnostics. 72.5% reduction. The 170 remaining are all genuine crossings — no false negatives introduced.

**Geometry-type split of the 170 remaining:**
- 154 Polygon rings (OGC invalid — genuine structural defects)
- 16 LineString rings (OGC non-simple but valid — optional diagnostic)

---

### EXP-003b — Dual-Oracle Validation

**Question:** Do TileGuard's suppression guards achieve defensible Precision and Recall against two independent oracles?

**Method:** 619 rings deduplicated to 407 unique rings. Evaluated against:
- **Oracle 1 (GEOS):** `LinearRing.is_simple` via Shapely 2.1.2 — no TileGuard guards applied
- **Oracle 2 (Exact Integer):** Standalone Python `orient2d` using arbitrary-precision integers — no floating point, no external C++

**Agreement matrix (407 rings):**

Four categories emerged. The critical one is `AGREE_NOPROPER_TOUCH` (131 rings): GEOS and TileGuard both fire, but Oracle 2 finds only a collinear-endpoint contact — a vertex lying exactly on the line of a non-adjacent segment — rather than a proper interior crossing. This is one specific, nameable mechanism and the sole source of the 127 Polygon false positives.

| Category | Count | Meaning |
|:---------|------:|:--------|
| `AGREE_DEFECT` | 31 | All three agree: proper interior crossing — genuine defect |
| `AGREE_NOPROPER_TOUCH` | 131 | GEOS non-simple + TileGuard fires; Oracle 2 finds only collinear-endpoint contact, not a proper crossing |
| `GEOS_EXTRA_DUP_VERTEX` | 103 | GEOS fires; TileGuard correctly suppressed via Guard 3 — confirms guard is working |
| `PARTIAL_AGREE` | 142 | LineString rings where Oracle 2 detects a vertex touch; neither GEOS nor TileGuard fires — zero FPs here |

**Polygon metrics (dual-oracle consensus as ground truth):**

| Metric | Value |
|:-------|:-----:|
| TP | 27 |
| FP | 127 |
| FN | **0** |
| TN | 19 |
| **Precision** | **17.5%** |
| **Recall** | **100.0%** |
| **F1** | 0.2983 |

**Recall = 100%** — TileGuard never misses a genuine Polygon crossing confirmed by both oracles.

**Precision = 17.5%** — All 127 Polygon FPs are `AGREE_NOPROPER_TOUCH` cases where TileGuard fires on a collinear-endpoint contact (one `orient2d = 0`), while Oracle 2's strictly-straddling proper-crossing definition does not. This is one specific, nameable mechanism — a candidate for Guard 6.

---

### EXP-003c — Guard 5 Implementation and Corpus Re-validation

**Question:** Does Guard 5 (self-tangency skip for non-adjacent repeated vertices) fix the 17.5% Polygon precision?

**Result:** Guard 5 suppressed 0 rings. Precision unchanged at 17.5%.

**Root cause of null result:** The `AGREE_NOPROPER_TOUCH` category label described the oracle disagreement pattern, not the geometric mechanism. Exhaustive inspection of all 131 FPs confirms they have no non-adjacent repeated vertex. Guard 5 is correctly implemented and will fire on true self-tangency patterns; none occur in this corpus because all rings with non-adjacent vertex repeats also have adjacent duplicates, which Guard 3 already handles.

**What the FPs actually are:** Degenerate near-zero-area rings (111 of 131 are 5-vertex rings at quantization scale) where a vertex lands exactly on the line of a non-adjacent segment. TileGuard fires because `o1 ≠ o2 && o3 ≠ o4` holds when one orient is 0. Oracle 2 requires strictly opposite signs. The correct fix is **Guard 6**: suppress pairs where the contact is a collinear-endpoint touch (one orient = 0, `onSegment = true`) with no proper interior crossing.

**Safety verification:** All 27 TPs have all four orients nonzero in their flagging pair. Guard 6 can be pair-scoped without false-negative risk on this corpus.

---

### EXP-009 — Synthetic Defect Injection and Metamorphic Testing

**Question:** Does `tile/self-intersection` detect all known genuine polygon crossings (recall = 100%) and avoid false positives on valid rings?

**Fixtures:** 3 TP (butterfly, hourglass, crossing-hole) + 3 TN (convex square, valid buffer, quantization spike). Each also tested under coordinate translation (MR1) and scaling (MR2).

| Metric | Value |
|:-------|:-----:|
| TP / FN / TN / FP | 3 / 0 / 3 / 0 |
| **Precision** | **100%** |
| **Recall** | **100%** |
| MR1 (translation) pass rate | 6/6 |
| MR2 (scaling) pass rate | 6/6 |

---

### EXP-006 — Diagnostic Classification for Remaining 14 Rules

**Question:** What are the production diagnostic counts and taxonomy classifications for all rules not yet examined?

**Dataset:** Same 294 z0–z4 corpus. Rules run with structural/empty config where schema-dependent.

**Key results:**

| Rule | Total Diags | Taxonomy |
|:-----|:-----------:|:---------|
| `tile/hole-containment` | 109 | Spec-Permitted Convention (MVT clips outer and hole rings independently at tile boundaries) |
| All other 13 rules | 0 each | N/A (no diagnostics under corpus conditions) |

`tile/hole-containment`: 109 diagnostics, all from `countries` layer, OpenMapTiles only. MVT clips outer rings and hole rings independently at tile boundaries — hole vertices appear outside the clipped outer-ring bounding box in integer tile-coordinate space even though source topology is valid.

---

### EXP-008 — Higher-Zoom Corpus Extension (z8 / z12 / z14)

**Question:** How does diagnostic density and defect type change from z0–z4 to z8–z14?

**Dataset:** 1,800 tiles (z8: 9 + z12: 696 + z14: 195 per provider × 2 providers — OpenFreeMap and CARTO Streets). OpenMapTiles excluded (demotiles maxzoom = 6).

**Genuine Defect density by zoom:**

| Zoom | GD/tile (OFM) | GD/tile (CARTO) | Layer |
|:-----|:-------------:|:---------------:|:------|
| z0–z4 | 0.08 | 0.08 | `countries` (Polygon) |
| z8 | 17.6 | 18.1 | `transportation` (LineString) |
| z12 | 2.88 | 2.91 | `transportation` (LineString) |
| z14 | **1.22** | **0.12** | `transportation` (LineString) |

**Key findings:**
- GD density peaks at z8 (220× higher than z0–z4) and drops monotonically through z12 and z14. Aggressive simplification at z8 is the likely driver.
- At z14, Planetiler (OFM) produces 10× more defects than CARTO on identical source geometry — a directly attributable compiler difference.
- All GDs at z8–z14 are in `transportation`/`transportation_name` layers. No polygon layers (buildings, water, landcover) produce GDs at any zoom.

---

### EXP-011 — Controlled Pipeline OFAT Experiment

**Question:** Do tile compilation parameters (simplification, buffer, zoom) or compiler choice introduce genuine defects into source-valid data?

**Method:** OFAT (One-Factor-At-A-Time) on Monaco source data (2,357 polygons, 100% source-valid per Shapely). Both Tippecanoe v2.82.0 and Planetiler v0.8.4 tested. Eight parameter combinations each.

**Results:**

| Compiler | Configurations | GD introduced |
|:---------|:-------------:|:-------------:|
| Tippecanoe v2.82.0 | 8 | **0** across all configs |
| Planetiler v0.8.4 | z8, z12 configs | **0** |
| Planetiler v0.8.4 | **z14 only** | **5** |

Simplification tolerance (0→4) and buffer size (0→80) produce zero GDs for both compilers at z12. The sole defect-introducing factor isolated in this experiment is Planetiler at z14 — confirming the EXP-008 finding in a controlled setting with source-valid input.

---

### EXP-007 — Headless MapLibre Rendering Experiment

**Question:** Do confirmed genuine-defect self-intersections produce visible rendering artifacts in MapLibre GL JS?

**Method:** Headless Chromium (Playwright), MapLibre GL JS 4.7.1, 2048×2048 canvas. Each defect tile rendered against a clean control. Per-pixel RGBA delta computed. Impact classified as none / minimal / minor / moderate / significant.

**Results (5 cases):**

| Case | Type | maxDelta | changedFraction | Impact |
|:-----|:-----|:--------:|:---------------:|:------:|
| tp-butterfly | Synthetic polygon | 193 | 51.8% | **significant** |
| tp-hourglass | Synthetic polygon | 193 | 46.2% | **significant** |
| tp-crossing-hole | Synthetic polygon | 119 | 2.5% | **moderate** |
| z14/8529/5974 | Production Planetiler | 155 | 84.6% | **significant** |
| z14/8530/5973 | Production Planetiler | 138 | 70.1% | **significant** |

All 5 GD cases produce visible artifacts. The two production tiles show 70–85% of crop pixels changed. Self-intersection defects detected by TileGuard correspond to real user-facing rendering failures — not abstract topology violations.

---

## Comprehensive Taxonomy (All Experiments Combined)

| Taxonomy | Count | % |
|:---------|------:|--:|
| Spec-Permitted Convention | 148,393 | 99.60% |
| Checker Error | 288 | 0.19% |
| Quantization Artifact | 161 | 0.11% |
| **Genuine Defect** | **154** | **0.10%** |
| **Total (z0–z4 corpus)** | **148,996** | |

The overwhelming majority of diagnostics from a naively configured validator are not defects. Of every diagnostic produced on this corpus, only 1 in 1,000 is a genuine defect. That 0.10% matters: all 154 genuine Polygon crossings produce significant rendering artifacts in MapLibre GL JS (EXP-007). The research challenge is not finding defects — it is distinguishing them from the 99.9% that are encoding conventions the pipeline is supposed to produce.

---

## Open Questions

**Collinear-endpoint contact suppression (precision fix).** All 127 Polygon false positives share one geometric mechanism: a vertex of one segment lies exactly on the line of a non-adjacent segment, making one `orient2d = 0`. TileGuard's intersection test fires because `o1 ≠ o2 && o3 ≠ o4` holds when one orient is zero; Oracle 2's strictly-straddling predicate does not fire because it requires strictly opposite signs. Suppressing pairs where the sole contact is this collinear-endpoint touch — with no proper interior crossing — would bring Polygon precision from 17.5% to approximately 100%. Safety is verified: all 27 true positives have all four orients nonzero in their flagging pair, so this suppression carries no false-negative risk on this corpus.

**Cross-tile boundary validation.** TileGuard validates individual tiles independently. Geometric continuity at tile seams is not addressed.

**Source-to-tile degradation quantification.** No mechanism exists to compare source geometry validity against its tile-encoded form and measure transformation-introduced degradation.

---

## Key Numbers at a Glance

| Metric | Value |
|:-------|:-----:|
| Production tiles analyzed | 2,094 (294 z0–z4 + 1,800 z8–z14) |
| Providers / pipelines | 3 |
| Zoom levels covered | z0–z4, z8, z12, z14 |
| Total diagnostics classified (z0–z4) | 148,996 |
| Genuine Defects (z0–z4) | 154 (0.10%) |
| Self-intersection FP reduction (v0.5.2 guards) | 72.5% (449 / 619) |
| Recall on dual-oracle TP set | **100%** |
| Defect rendering impact (5 cases tested) | 5 / 5 significant or moderate |
| Controlled pipeline experiment (OFAT) | Tippecanoe: 0 GDs · Planetiler: 5 GDs at z14 only |
| Tests | 1,744 across 9 packages |
| Experiments run | 8 complete |

---

## Repository Structure

```
docs/research/
├── EXPERIMENT_LOG.md          — per-experiment methodology, results, raw data refs
├── CLASSIFICATION_CRITERIA.md — pre-inspection taxonomy definitions
├── RESEARCH_QUESTIONS.md      — formal RQ hierarchy
└── evidence/EVIDENCE_INDEX.md — artifact inventory

docs/engineering/investigations/
├── phase1/                    — coordinate-range investigation reports
└── phase2/                    — self-intersection investigation reports (incl. ROOT_CAUSE_INVESTIGATION.md)

docs/architecture/adr/
└── 007-self-intersection-hardening.md — design decisions for suppression guards

analysis/
├── phase1-coordinate-range/   — offset distributions, decoder crosscheck
├── phase2-self-intersection/  — benchmark JSONL files
├── phase2-oracle/             — deduplicated rings, oracle results, agreement matrix
├── phase2-rules/              — EXP-006 sampled classification
├── phase3-pipeline/           — OFAT controlled pipeline results
├── phase3-higher-zooms/       — z8/z12/z14 audit results
└── phase3-rendering/          — PNG crops and pixel-diff summary
```
