# TileGuard Research — Implementation Plan

**Author:** Shreeharsh Shinde  
**Created:** September 2026  
**Revised:** September 2026 (v4 — Math sign fix, CS paper citations corrected, 4-way relabeling task added, exact Python integer oracle, OFAT pipeline design, deadline check)  
**Status:** Active — Living Document  
**Related:** [`docs/RESEARCH_BRIEF.md`](../RESEARCH_BRIEF.md) · [`docs/research/EXPERIMENT_LOG.md`](./EXPERIMENT_LOG.md)

---

> **Purpose.** Detailed, task-level plan for all four research phases. Every task has defined inputs, expected output artifacts, and a measurable completion criterion.
>
> Update this document as tasks complete or change. Log completion dates inline.

---

## Revision Log

| Version | Date | Changes |
|:--------|:-----|:--------|
| v1 | Sep 2026 | Initial plan |
| v2 | Sep 2026 | Peer review: geometry-type split on 170 crossings; citation corrections; literature search moved to Week 1; controlled-pipeline experiment added; winding audit made independent; EXP-006 sampling + inter-rater; rendering experiment tightened; folder names aligned; Gap A2 assigned; Japan labs added |
| v3 | Sep 2026 | Refined peer review: CS/SE literature queries added; ring deduplication + dual-oracle; metamorphic testing added to EXP-009; controlled pipeline set as core; high-res rendering diffs; CS reading list added; proposal reframed around Software Engineering & Data Systems QA |
| v4 | Sep 2026 | Peer review v4: Corrected winding sign math (screen Y-down CW area > 0 per MVT spec); corrected 4 CS paper citations; reframed Task 1.3 polygon crossing claim (untested render impact); added Task 1.5 (4-way relabeling of EXP-002/003); simplified Oracle 2 to Python exact integer predicates with aligned self-intersection definitions; OFAT pipeline design with zoom factor; metamorphic relations scoped to geometry rules only; verified lab list; unified path to `analysis/phase1-literature/LITERATURE_LOG.md`; updated tracker status; added Week 1 deadline audit |

---

## Phase Overview

| Phase | Weeks | Theme | Closes Gaps |
|:------|:------|:------|:------------|
| [Phase 1](#phase-1-correct--re-frame) | 1–2 | Correct & Re-Frame | **A1, A2, A3, B1, C1, D1, E1** |
| [Phase 2](#phase-2-methodological-strengthening) | 2–4 | Dual Oracle + Metamorphic Recall | C2, C3, C5 |
| [Phase 3](#phase-3-controlled-pipeline--rendering) | 4–6 | Controlled Pipeline + Render Correlation | C4, D2, D3 |
| [Phase 4](#phase-4-academic-packaging--outreach) | 6–8 | SE Packaging, Preprint & Outreach | E2, E3 |

---

## Phase 1 — Correct & Re-Frame

**Duration:** Weeks 1–2  
**Goal:** Fix factual and framing errors, perform literature searches across Geospatial and Computer Science databases, audit academic application deadlines, and establish defensible baselines.  
**Status:** ✅ Complete — 2026-09-29

---

### Task 1.0 — Literature Search & Academic Deadline Audit (FIRST TASK)

**Gap closed:** E1, A2

**Why first & expanded:** Running literature searches first prevents discovering prior work after months of experimentation. In addition, university research fellowship and admission deadlines (e.g., JSPS, MEXT, European PhD intake windows) must be checked in Week 1 to ensure Week 6 outreach aligns with application cycles.

**Databases:**

| Domain | Database | URL |
|:-------|:---------|:----|
| **Geospatial** | ACM DL, IEEE Xplore, ISPRS, MDPI IJGI, AGILE | `dl.acm.org`, `ieeexplore.ieee.org`, `isprs.org` |
| **CS / SE** | ACM SIGSOFT (FSE/ESEC), IEEE ICSE, ACM SIGMOD, VLDB, arXiv (cs.SE, cs.DB) | `dl.acm.org`, `arxiv.org` |

**Queries to log verbatim:**

| Query Category | Query String | Target Domain |
|:---------------|:-------------|:--------------|
| **Geospatial direct** | `"vector tile" quality` | Web cartography |
| **Geospatial direct** | `"Mapbox Vector Tile" validation` | Web cartography |
| **Geospatial direct** | `MVT geometry artifact` | Web cartography |
| **Geospatial general** | `geospatial data quality tiles` | Spatial SDI |
| **Geospatial general** | `tile generalization artifact` | Simplification |
| **CS / SE Static Analysis** | `"static analysis" false positive suppression` | Software engineering |
| **CS / SE Testing** | `"metamorphic testing" geometry OR spatial` | Software testing |
| **CS / SE Testing** | `"differential testing" geometry OR cad` | Software testing |
| **CS / SE Data Systems** | `"data validation" pipeline quality` | Data systems |

**Work:**
1. Run every query across target databases. Log query string, database, date, result count.
2. Store in `analysis/phase1-literature/LITERATURE_LOG.md`.
3. **Academic Deadline Audit:** Check research application and fellowship deadlines for target Japanese and European universities (e.g., JSPS Postdoctoral/Research Fellowships, MEXT, lab intake dates) and log them in `docs/phase4-proposal/DEADLINE_CALENDAR.md`.
4. **Scope Gate:** If any paper directly addresses MVT-specific diagnostic classification or metamorphic geometry validation, revise research scope immediately in `docs/RESEARCH_BRIEF.md` Audit Entry 002.

**Output:**
- `analysis/phase1-literature/LITERATURE_LOG.md`
- `docs/phase4-proposal/DEADLINE_CALENDAR.md`
- `docs/RESEARCH_BRIEF.md` Section 8 updated.

**Completion criterion:** All queries logged in `analysis/phase1-literature/LITERATURE_LOG.md`. Academic deadline calendar populated. Gap A2 marked resolved.

---

### Task 1.1 — Verify Compiler Provenance of the 294-Tile Corpus

**Gap closed:** D1 (`"format-wide"` generalization overclaim)

> **Compiler attribution correction:** OpenMapTiles pipeline uses PostGIS, imposm3, and custom tile-server SQL functions (not Tippecanoe). Verify exact compiler provenance against official docs and tile metadata.

**Input:**
- `analysis/phase1-corpus/classification.json`
- `docs/research/EXPERIMENT_LOG.md` (EXP-002 corpus description)
- Provider docs: `openmaptiles.org`, `openfreemap.org`, CARTO developer docs.

**Work:**
1. Inspect tile headers/metadata via `vt-cli` or `tilestats` for generator tags.
2. Cross-reference provider documentation to document pipeline architecture.
3. Record per provider: compiler name, version/commit (if determinable), source dataset, tile extent (4096 vs 8192), buffer size.

**Output:**
- `analysis/phase1-corpus/compiler-provenance-table.json`
- Compiler Provenance Table added to `docs/research/EXPERIMENT_LOG.md` under EXP-002.

**Completion criterion:** All 3 providers have attributed compiler pipelines with cited evidence sources.

---

### Task 1.2 — Winding Convention Audit (Independent Signed-Area Calculation)

**Gap closed:** B1 (winding-order framing)

> **Spec & Math rigor (Corrected Sign Convention):**
> - Mapbox Vector Tile Specification v2.1, Section 4.3.2.1 ("Polygon geometry type") specifies that exterior rings MUST be clockwise in tile coordinate space.
> - In screen/tile coordinates, the Y-axis points **downward**.
> - The shoelace formula $\frac{1}{2} \sum (x_i y_{i+1} - x_{i+1} y_i)$ applied to a clockwise ring in a Y-down coordinate system produces a **positive** value ($\text{Signed Area} > 0$).
> - Exterior rings in MVT spec have $\text{Signed Area} > 0$. Interior rings (holes) have $\text{Signed Area} < 0$.
> - Do NOT use TileGuard's `detectWindingConvention()`. Compute raw shoelace signed area independently in the audit script.

**Input:**
- Benchmark fixture tile corpus (294 tiles).
- MVT Specification v2.1 Section 4.3.2.1.

**Work:**
1. Write `scripts/phase1-winding-audit.mjs` using raw coordinate math:
   $$\text{Signed Area} = \frac{1}{2} \sum_{i=0}^{n-1} (x_i y_{i+1} - x_{i+1} y_i)$$
2. Tally three distinct categories per provider:
   - **Spec-conformant (MVT):** exterior rings with $\text{Signed Area} > 0$ (CW in screen Y-down).
   - **OGC-style:** exterior rings with $\text{Signed Area} < 0$ (CCW in screen Y-down / CW in cartesian Y-up).
   - **Intra-feature inconsistent:** features where exterior rings have mixed winding directions.
3. Audit `packages/tile-rules/src/geometry.ts` comments and code to ensure internal sign definitions match MVT Spec §4.3.2.1.

**Output:**
- `analysis/phase1-winding/winding-convention-counts.json`
- `docs/research/EXPERIMENT_LOG.md` — EXP-010 entry.

**Completion criterion:** Three-category breakdown documented per provider with raw data JSON. `geometry.ts` comments verified against MVT Spec §4.3.2.1.

---

### Task 1.3 — Geometry-Type Split on 170 Crossings

**Gap closed:** C1 (conflated geometry types in headline number)

> **OGC Simple Features distinction:**
> Under OGC Simple Features, a non-simple `LineString` (self-crossing line, overpass, transit loop) is **valid**. A self-crossing `Polygon` ring is **invalid under OGC** (breaks planar partitioning & earcut triangulation), though its actual rendering impact remains untested until EXP-007.

**Work:**
1. Parse `analysis/phase2-self-intersection/self-intersection-rings.json` (619 rings).
2. For all 170 Cat B1 crossings, split by `feature.type`:
   - `Polygon` (Type 3) → Invalid under OGC Simple Features (render impact untested).
   - `LineString` (Type 2) → OGC non-simple curve (valid structure, optional diagnostic).
3. Update headline numbers in `docs/RESEARCH_BRIEF.md` and proposal drafts.

**Output:**
- `analysis/phase1-corpus/geometry-type-split.json`
- `docs/research/EXPERIMENT_LOG.md` EXP-003 updated with geometry-type breakdown.

**Completion criterion:** 170 crossings split into Polygon vs LineString counts. Headline figures corrected across all docs.

---

### Task 1.4 — Update Research Dossier Claims

**Gap closed:** A1, A3

**Work:**
1. Soften/refocus all rule-engine architecture claims in `docs/RESEARCH_BRIEF.md`.
2. Ensure narrowed RQ appears consistently across dossier sections.
3. Close Audit Log 001.

**Completion criterion:** Dossier audited; no unverified generalization claims remain.

---

### Task 1.5 — 4-Way Taxonomy Relabeling of EXP-002 & EXP-003 Diagnostics (NEW TASK)

**Gap closed:** C1 (full diagnostic taxonomy classification)

**Why needed:** Task 1.3 splits geometry types for self-intersections, but the existing EXP-002 (coordinate range) and EXP-003 (self-intersection) diagnostic counts have not been systematically relabeled into the 4-way diagnostic taxonomy (Checker Error, Quantization Artifact, Spec-Permitted Convention, Genuine Defect).

**Work:**
1. Parse raw output files from EXP-002 (`analysis/phase1-coordinate-range/`) and EXP-003 (`analysis/phase2-self-intersection/`).
2. Categorize all diagnostics into the 4-way taxonomy using the formal definitions:
   - **Checker Error:** Diagnostic caused by rule bug or edge case in TileGuard itself.
   - **Quantization Artifact:** Diagnostic caused by floating-point to integer coordinate snapping during tile compilation.
   - **Spec-Permitted Convention:** Encoding choice permitted or recommended by MVT spec (clipping buffer, label centroids outside tile).
   - **Genuine Defect:** True topological/structural defect in tile data.
3. Produce the finalized 4-way breakdown matrix for EXP-002 and EXP-003.

**Output:**
- `analysis/phase1-corpus/exp002-exp003-taxonomy-relabeling.json`
- `docs/RESEARCH_BRIEF.md` Section 6 updated with full 4-way taxonomy table.

**Completion criterion:** 100% of EXP-002 and EXP-003 diagnostics assigned to one of the 4 taxonomy categories.

---

### Phase 1 Exit Criteria

- [ ] Task 1.0 (Literature search & deadline audit) logged in `analysis/phase1-literature/LITERATURE_LOG.md`. Gap A2 & E1 closed.
- [ ] Task 1.1 (Compiler provenance) documented with citations.
- [ ] Task 1.2 (Winding audit) completed with corrected sign math (MVT Spec §4.3.2.1).
- [ ] Task 1.3 (Geometry-type split) completed; claims reframed.
- [ ] Task 1.5 (4-way relabeling) completed for EXP-002 and EXP-003. Gap C1 fully closed.
- [ ] Phase 1 artifacts saved to `analysis/phase1-*/`.

---

## Phase 2 — Methodological Strengthening

**Duration:** Weeks 2–4  
**Goal:** Eliminate circular ground truth using dual independent oracles, measure recall with reference synthetic tiles and metamorphic testing, and audit remaining rules with inter-rater reliability.  
**Status:** 🔴 Not Started

---

### Task 2.1 — EXP-003b: Dual-Oracle Validation (GEOS + Exact Python Integer Oracle)

**Gap closed:** C2 (circular ground truth)

> **Dual Oracle & Deduplication Strategy:**
> 1. **Deduplicate first:** Remove identical ring coordinate sequences from the 619 ring set before evaluation.
> 2. **Oracle 1 (JTS Lineage):** GEOS / Shapely (`LinearRing.is_simple`, `Polygon.is_valid`).
> 3. **Oracle 2 (Exact Integer Predicates):** A standalone Python checker implementing exact arbitrary-precision integer cross-products (`orient2d` via Python `int`) to test proper segment crossings and vertex touching without external C++ library dependency limits.
> 4. **Aligned Definition of Self-Intersection:** GEOS `is_simple` treats vertex-touching (self-tangency) as non-simple, whereas TileGuard explicitly suppresses single-point vertex touching (Guard 3 duplicate vertex). The oracle comparison script must explicitly report:
>    - **Proper interior crossings** (both GEOS and TileGuard agree).
>    - **Vertex-touching / self-tangency** (GEOS non-simple, TileGuard Guard 3 suppressed).
>    - **Endpoint closure** (GEOS simple, TileGuard Guard 2 skipped).
> 5. **Evaluate Polygon & LineString separately.**

**Work:**
1. Write `scripts/phase2-deduplicate-rings.py` → produce `analysis/phase2-oracle/deduplicated-rings.json`.
2. Write `scripts/phase2-exact-integer-oracle.py` (Oracle 2 using Python exact `int` arithmetic).
3. Write `scripts/phase2-dual-oracle.py` to compare Shapely/GEOS (Oracle 1), Python Exact Integer (Oracle 2), and TileGuard.
4. Compute Precision, Recall, and F1 for **Polygon rings** against dual oracle consensus for proper interior crossings.

**Output:**
- `analysis/phase2-oracle/geos-oracle-results.json`
- `analysis/phase2-oracle/exact-integer-oracle-results.json`
- `analysis/phase2-oracle/agreement-matrix.json`
- `docs/research/EXPERIMENT_LOG.md` — EXP-003b entry.

**Completion criterion:** Dual oracle consensus matrix calculated on deduplicated rings. Precision/Recall/F1 reported for polygon geometries.

---

### Task 2.2 — EXP-009: Synthetic Defect Injection & Metamorphic Testing

**Gap closed:** C3 (no recall measurement)

> **Reference Encoder + Metamorphic Scoping:**
> - Encode synthetic tiles using standard reference encoder `@mapbox/vector-tile` + `vt-pbf`.
> - **Scoped Metamorphic Relations:** Apply metamorphic relations ONLY to geometry-specific validation rules (`tile/self-intersection`, `tile/winding-order`, `tile/zero-area-ring`), excluding `tile/coordinate-range` (to prevent out-of-bounds false positives when coordinates shift beyond tile extent).
>   - **MR1 (Internal Translation Invariance):** Translating integer coordinates within the valid extent interval $[-80, \text{extent}+80]$ must not change geometry diagnostic outcomes.
>   - **MR2 (Uniform Grid Scale Invariance):** Scaling integer coordinates by a constant factor $k$ preserves topological self-intersection verdicts.

**Work:**
1. Write `scripts/phase2-build-synthetic-tiles.mjs` using `@mapbox/vector-tile` + `vt-pbf`:
   - **Polygon TP set:** Butterfly crossing, hourglass polygon, self-crossing interior hole.
   - **Polygon TN set:** Convex square, valid ring with buffer (+80 units), quantization spike (Cat A).
   - **Metamorphic variants:** Generate translated and scaled variants for each fixture.
2. Run geometry rules on all fixtures and metamorphic variants.
3. Compute Precision, Recall, and Metamorphic Pass Rate.

**Output:**
- `fixtures/phase2-synthetic/` — synthetic `.pbf` tiles and metamorphic variants.
- `analysis/phase2-synthetic/synthetic-results.json`
- `docs/research/EXPERIMENT_LOG.md` — EXP-009 entry.

**Completion criterion:** Zero false negatives on polygon TP set. Metamorphic Pass Rate = 100% on scoped geometry rules.

---

### Task 2.3 — EXP-006: Diagnostic Classification for Remaining 10 Rules

**Gap closed:** C5 (only 2 of 12 rules examined)

> **Second Reviewer Assignment:**
> - **Primary Reviewer:** Shreeharsh Shinde
> - **Second Reviewer (Kappa evaluation):** Designated research colleague / co-author (e.g. lab peer or project co-maintainer).

**Work:**
1. Write classification criteria in `docs/research/CLASSIFICATION_CRITERIA.md` **before** inspecting diagnostics.
2. Run rules on 294-tile corpus. Stratified-sample 100 diagnostics per rule (record seed).
3. Primary reviewer labels sample. Second reviewer independently labels 15% subset.
4. Calculate Cohen’s Kappa coefficient $\kappa$ for inter-rater agreement.

**Output:**
- `analysis/phase2-rules/sampled-classification-results.json`
- `docs/research/EXPERIMENT_LOG.md` — EXP-006 entry with Kappa scores.

**Completion criterion:** 10 remaining rules classified with pre-written criteria, sampling, and documented Cohen's Kappa.

---

### Phase 2 Exit Criteria

- [ ] Deduplicated 619 rings evaluated against Dual Oracles (GEOS + Python Exact Integer) with aligned definitions (Task 2.1).
- [ ] EXP-009 reference-encoded synthetic tiles & scoped metamorphic testing completed (Task 2.2).
- [ ] EXP-006 rule audit completed with named second reviewer and inter-rater Kappa scores (Task 2.3).
- [ ] Phase 2 artifacts stored in `analysis/phase2-*/` and `fixtures/phase2-synthetic/`.

---

## Phase 3 — Controlled Pipeline & Rendering Experiments

**Duration:** Weeks 4–6  
**Goal:** Run a controlled tile-compilation pipeline (OFAT design) to trace defect origins, benchmark higher zooms, and test rendering impact on polygon geometries.  
**Status:** 🔴 Not Started

---

### Task 3.1 — EXP-011: Controlled Pipeline Experiment (CORE TASK — OFAT Design)

**Gap closed:** C4 (genuine defects not traced to transformation stage)

> **Feasibility & Compiler Inputs (OFAT Design):**
> - **Input handling:** Planetiler accepts OSM PBF; Tippecanoe accepts GeoJSON. Generate GeoJSON directly from the OSM PBF extract so both compilers process identical source geometry.
> - **OFAT (One-Factor-At-A-Time) Parameter Sweeps:** Instead of an unfeasible 36-combination full factorial, use a baseline configuration and sweep one parameter at a time across compilers:
>   - **Simplification tolerance:** 0, 1, 2, 4 pixels at target zoom.
>   - **Extent:** 4096 (standard for both compilers).
>   - **Buffer size:** 0, 64, 80 units.
>   - **Target Zoom Level (Factor):** z8, z12, z14 (simplification interacts directly with zoom level).

**Work:**
1. Obtain clean source GeoJSON/OSM extract (~50–100MB). Verify source validity with Shapely (`isValid == True`).
2. Generate tiles using Planetiler and Tippecanoe across OFAT parameter sweeps.
3. Run `tileguard check` on each output tile set.
4. Attribute each detected defect directly to the specific compiler parameter or zoom level that introduced it.

**Output:**
- `analysis/phase3-pipeline/controlled-pipeline-results.json`
- `docs/research/EXPERIMENT_LOG.md` — EXP-011 entry.

**Completion criterion:** Defect origin attribution matrix produced across compilers, zoom levels, and OFAT parameter settings.

---

### Task 3.2 — Note on Overpass Source Tracing (DROPPED)

> **Status: Dropped (replaced by EXP-011).**
> Direct Overpass matching on 3rd-party production tiles is dropped because: (1) OSM data has evolved since tile creation, (2) low-zoom features are merged aggregates, and (3) production tiles strip `osm_id`. EXP-011 (Task 3.1) replaces this with a controlled, fully-reproducible pipeline.

---

### Task 3.3 — EXP-008: z5–z14 Corpus Extension

**Gap closed:** D2 (higher zoom levels unmeasured)

**Work:**
1. Download z8, z12, z14 tiles from OpenMapTiles, OpenFreeMap, CARTO over a fixed 2°×2° bounding box.
2. Benchmark with `tileguard check`. Apply 4-way taxonomy to diagnostics.
3. Compare FP ratios and defect density against z0–z4 baselines.

**Output:**
- `analysis/phase3-higher-zooms/higher-zooms-results.json`
- `docs/research/EXPERIMENT_LOG.md` — EXP-008 entry.

**Completion criterion:** Higher-zoom corpus benchmarked and compared against z0–z4.

---

### Task 3.4 — EXP-007: Headless MapLibre Rendering Experiment

**Gap closed:** D3 (rendering impact unknown)

> **Rendering Evaluation Strategy:**
> - Do not use global 512px SSIM < 0.99 (misses localized thin defects).
> - Render at **2048×2048** resolution in headless Chromium via Playwright.
> - Compute **Bounding-Box Bounding Region Pixel Difference** around the specific defect coordinate.
> - Evaluate **Polygon fills** (earcut triangulation collapse, fill inversion) separately from **LineString strokes**.

**Work:**
1. Render synthetic defect tiles from EXP-009 vs clean control tiles in MapLibre GL JS at 2048×2048.
2. Render confirmed production polygon defect tiles (Task 1.3) vs repaired tiles.
3. Crop to 256×256 bounding box around defect coordinate; compute pixel delta and visual defect classification.

**Output:**
- `analysis/phase3-rendering/` — high-res render PNGs, cropped diffs, pixel delta scores.
- `docs/research/EXPERIMENT_LOG.md` — EXP-007 entry.

**Completion criterion:** High-res bounding-box render diffs executed on synthetic & production polygon defects. Render impact classified per defect type.

---

### Phase 3 Exit Criteria

- [ ] Task 3.1 (Controlled pipeline OFAT) completed; transformation stage attribution documented.
- [ ] Task 3.3 (z5–z14 corpus) benchmarked.
- [ ] Task 3.4 (Rendering diffs) evaluated on high-res bounding boxes for polygon defects.
- [ ] Phase 3 artifacts saved in `analysis/phase3-*/`.

---

## Phase 4 — Academic Packaging & Outreach

**Duration:** Weeks 6–8  
**Goal:** Reframing research proposal around CS/Software Engineering & Data Systems QA, reading adjacent CS literature, drafting a preprint, and conducting targeted outreach aligned with deadline calendar.  
**Status:** 🔴 Not Started

---

### Task 4.1 — Read CS & Geospatial Literature in Full (Corrected Citations)

**Gap closed:** E2, E3

**Reading List (Corrected & Verified Citations):**

| Paper / Reference | Domain | Exact Focus / Key Value |
|:------------------|:-------|:------------------------|
| **MapLibre Tile** (SIGSPATIAL '25) | Web Mapping | Modern MVT rendering & pipeline architecture |
| **AGILE 2022** (`10.5194/agile-giss-3-67-2022`) | Spatial SDI | Vector tile generation for spatial data infrastructures |
| **Ingensand et al. 2016** | Web Mapping | Implementation of tiled vector services (case study) |
| **OGC Testbed-13 ER** | Standards | OGC engineering report evaluating vector tile solutions |
| ***Spatter*** (ACM SIGSOFT FSE) | SE / Testing | Automated testing of spatial database logic via affine transformations |
| **Hu et al. 2025** | SE / Static Analysis | Empirical study of suppressed static analysis warnings in software |
| **Shankar et al. 2023** (CIKM '23) | Data Systems | Automatic and precise data validation for ML & data pipelines |
| **Breck et al. 2019** (SEDE / SysML) | Data Systems | Data validation for machine learning & data pipeline assertions |

**Work:**
1. Read all 8 papers in full. Write 300-word reading notes per paper.
2. Store in `docs/research/READING_NOTES.md`.
3. Update `docs/RESEARCH_BRIEF.md` Section 8 with verified citations.

**Completion criterion:** All 8 papers read and annotated in `docs/research/READING_NOTES.md`.

---

### Task 4.2 — Write 2–3 Page Research Proposal (SE / Data Systems Framing)

> **Framing:** Reframe proposal around **Software Engineering & Data Systems Quality Assurance**, presenting Mapbox Vector Tiles as a high-throughput, lossy-compression spatial data representation case study.

**Structure:**
1. **Problem Statement:** Data pipeline assertions for quantized, simplified geospatial vector payloads.
2. **Demonstrated Evidence:** Dual-oracle findings, 4-way taxonomy, controlled pipeline defect origins.
3. **Research Questions:** Narrowed RQ1–RQ4 on diagnostic taxonomy, oracle agreement, and render impact.
4. **Methodology & Open Data:** Reproducible pipeline, open-source dataset, synthetic test fixtures.
5. **Partnership Request:** Academic supervision, joint publication, database access.

**Output:**
- `docs/phase4-proposal/RESEARCH_PROPOSAL.md`

**Completion criterion:** Proposal completed with SE/Data Systems framing and corrected figures.

---

### Task 4.3 — Draft Preprint / Workshop Paper

**Goal:** Package experimental findings into a formal 4–6 page academic short paper / preprint.

**Target Venues:** FOSS4G Academic Track, ACM SIGSPATIAL Workshop, or arXiv cs.SE / cs.DB preprint.

**Work:**
1. Write 4-page paper draft covering background, taxonomy, dual-oracle experiment (EXP-003b), controlled pipeline (EXP-011), and rendering diffs (EXP-007).
2. Render PDF using standard IEEE / ACM two-column template.

**Output:**
- `docs/phase4-preprint/tileguard_research_paper.pdf`
- `docs/phase4-preprint/main.tex`

**Completion criterion:** Draft PDF compiled and ready for review/submission.

---

### Task 4.4 — Target Lab Identification & Outreach (Verified SE & Spatial Labs)

> **Verified Target Labs (CS / SE & Spatial Computing):**
> 1. **TU Delft 3D Geoinformation Group** (Delft, Netherlands — spatial data quality & validation).
> 2. **ETH Zürich Software Engineering / Information Systems Lab** (Zürich, Switzerland — database & system testing).
> 3. **University of Tokyo CS / Spatial Information Lab** (Tokyo, Japan — verified recent 2024–2026 spatial computing papers).
> 4. **TU Munich Chair of Cartography / GIS** (Munich, Germany — web mapping QA).
> 5. **NUS School of Computing / Database Systems** (Singapore — spatial database QA).

**Work:**
1. Verify recent 2024–2026 publications for each lab against `docs/phase4-proposal/DEADLINE_CALENDAR.md`.
2. Send personalized 3-paragraph outreach emails with proposal PDF and preprint draft attached.
3. Log outreach responses in `docs/phase4-proposal/OUTREACH_LOG.md`.

**Output:**
- `docs/phase4-proposal/OUTREACH_LOG.md`

**Completion criterion:** 5 verified lab emails sent. Responses tracked against application deadlines.

---

### Phase 4 Exit Criteria

- [ ] Task 4.1 (8 papers annotated in `READING_NOTES.md`).
- [ ] Task 4.2 (Proposal written in `docs/phase4-proposal/`).
- [ ] Task 4.3 (Preprint drafted in `docs/phase4-preprint/`).
- [ ] Task 4.4 (5 verified lab emails sent & logged).
- [ ] `docs/RESEARCH_BRIEF.md` Audit Entry 002 filed.

---

## Status Tracker

| Task | Phase | Status | Completion Date |
|:-----|:------|:-------|:----------------|
| 1.0 Literature search & deadline audit | 1 | ✅ Complete (structure) | 2026-09-29 |
| 1.1 Verify compiler provenance | 1 | ✅ Complete | 2026-09-29 |
| 1.2 Winding audit (independent signed-area, MVT sign fix) | 1 | ✅ Complete | 2026-09-29 |
| 1.3 Geometry-type split on 170 crossings | 1 | ✅ Complete | 2026-09-29 |
| 1.4 Update dossier claims | 1 | ✅ Complete | 2026-09-29 |
| 1.5 4-Way taxonomy relabeling of EXP-002 & EXP-003 | 1 | ✅ Complete | 2026-09-29 |
| 2.1 EXP-003b: Dual-Oracle (GEOS + Python Exact Int) | 2 | 🔴 Not Started | — |
| 2.2 EXP-009: Reference-encoded synthetic + scoped metamorphic | 2 | 🔴 Not Started | — |
| 2.3 EXP-006: Remaining 10 rules (sampled + Kappa) | 2 | 🔴 Not Started | — |
| 3.1 EXP-011: Controlled pipeline experiment (OFAT design) | 3 | 🔴 Not Started | — |
| 3.2 Note on Overpass source tracing | 3 | ⚪ Dropped | — |
| 3.3 EXP-008: z5–z14 corpus extension | 3 | 🔴 Not Started | — |
| 3.4 EXP-007: Headless high-res render diffs | 3 | 🔴 Not Started | — |
| 4.1 Read 8 CS & Geospatial papers (corrected citations) | 4 | 🔴 Not Started | — |
| 4.2 Write 2–3 page SE-framed proposal | 4 | 🔴 Not Started | — |
| 4.3 Draft preprint / short paper | 4 | 🔴 Not Started | — |
| 4.4 Lab outreach (5 verified labs against deadline calendar) | 4 | 🔴 Not Started | — |

---

## New Files & Phase Directory Structure

```
analysis/
├── phase1-literature/
│   └── LITERATURE_LOG.md
├── phase1-corpus/
│   ├── compiler-provenance-table.json
│   ├── geometry-type-split.json
│   └── exp002-exp003-taxonomy-relabeling.json
├── phase1-winding/
│   └── winding-convention-counts.json
├── phase2-oracle/
│   ├── deduplicated-rings.json
│   ├── geos-oracle-results.json
│   ├── exact-integer-oracle-results.json
│   └── agreement-matrix.json
├── phase2-synthetic/
│   └── synthetic-results.json
├── phase2-rules/
│   └── sampled-classification-results.json
├── phase3-pipeline/
│   └── controlled-pipeline-results.json
├── phase3-higher-zooms/
│   └── higher-zooms-results.json
└── phase3-rendering/
    └── render-diffs-summary.json

fixtures/
└── phase2-synthetic/
    └── *.pbf

docs/
├── research/
│   ├── IMPLEMENTATION_PLAN.md
│   ├── CLASSIFICATION_CRITERIA.md
│   └── READING_NOTES.md
├── phase4-proposal/
│   ├── RESEARCH_PROPOSAL.md
│   ├── DEADLINE_CALENDAR.md
│   └── OUTREACH_LOG.md
└── phase4-preprint/
    ├── tileguard_research_paper.pdf
    └── main.tex
```

---

## Gap Register Cross-Reference

| Gap ID | Description | Closed By | Status |
|:-------|:------------|:----------|:-------|
| A1 | Rule-engine novelty overclaim | Task 1.4 | 🟡 In Progress |
| A2 | "No prior work" without systematic search | Task 1.0 | 🔴 |
| A3 | Broad research question scope | Task 1.4 | 🟡 In Progress |
| B1 | Winding-order framing (spec vs. practice) | Task 1.2 | 🔴 |
| C1 | "72.5% FP" conflated causes; geometry type unsplit; relabeling | Task 1.3, Task 1.5 | 🔴 |
| C2 | Circular ground truth in EXP-003 | Task 2.1 | 🔴 |
| C3 | No recall measurement | Task 2.2 | 🔴 |
| C4 | Genuine defects not traced to transformation stage | Task 3.1 | 🔴 |
| C5 | Only 2 of 12 rules examined | Task 2.3 | 🔴 |
| D1 | "Format-wide" generalization overclaim | Task 1.1 | 🔴 |
| D2 | Higher zoom levels unmeasured | Task 3.3 | 🔴 |
| D3 | Rendering impact unknown | Task 3.4 | 🔴 |
| E1 | No systematic literature search | Task 1.0 | 🔴 |
| E2 | Unread adjacent work / wrong citations | Task 4.1 | 🔴 |
| E3 | Unverified citations | Task 4.1 | 🔴 |

---

*Implementation Plan v4 — September 2026*  
*Related: [`RESEARCH_BRIEF.md`](../RESEARCH_BRIEF.md) · [`EXPERIMENT_LOG.md`](./EXPERIMENT_LOG.md)*
