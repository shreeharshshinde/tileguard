# TileGuard — Research Questions

**Created:** September 2026  
**Derived from:** `TILEGUARD_AUDIT.md`, `EXPERIMENT_LOG.md`, `RESEARCH_ROADMAP.md`  
**Revised:** September 2026 — added RQ0 (overarching) following feedback that the framing should separate research vision from empirical scope.  
**Rule:** Questions are grounded in the actual evidence base documented in the Audit. Each question traces back to an observation, a gap, or an experiment.

---

## How to Use This Document

Each research question has a status:

- **Answerable now** — the data to answer it exists in the current evidence base
- **Answerable pending experiment** — requires a named experiment (EXP-XXX) that is planned but not run
- **Requires literature** — cannot be framed properly until the literature search is done
- **Aspirational** — points to a long-term direction; not addressable in a single master's thesis

**Two-level structure.** RQ0 is the broad framing question that literature review will sharpen or collapse. RQ1–RQ5 are the MVT-level empirical questions that the current evidence base already supports. RQ0 does not replace RQ1–RQ5; it contextualises them. If the literature shows that representation-specific tile QA is already well-studied, RQ0 dissolves and RQ1 becomes the primary question. If the literature shows a genuine gap, RQ0 becomes the thesis-level question and RQ1–RQ5 become the supporting empirical investigation.

---

## Overarching Research Question (Provisional — Requires Literature)

### RQ0 — Representation-Aware Tiled Data QA

> **How should automated quality assurance systems distinguish genuine data defects from representation-induced artifacts in tiled geospatial datasets, and to what extent are the required validation strategies specific to a particular tile encoding?**

**Where it comes from:**  
The repeated pattern across Phase 1 and Phase 2: applying a naively correct validation rule (check coordinates are in range; check segments do not cross) to a specific tile representation (MVT) produces an overwhelming proportion of false positives — not because the rule is wrong in principle, but because the representation has intentional encoding behaviors that look like defects to a generic validator. 148,268 coordinate-range diagnostics were 100% encoding artifacts. 449/619 self-intersection diagnostics were artifacts of integer-grid quantization and closed-LineString conventions. The research insight is not "our rules have bugs" — it's "the representation makes this non-trivial in a systematic way."

The broader question is whether this phenomenon (representation-induced artifact vs. genuine defect) is studied in the literature for tiled geospatial data generally, and whether the suppression methodology developed empirically for MVT represents a reusable pattern or an MVT-specific workaround.

**What would answer it:**  
Category 0 literature search (general tiled geospatial QA). If equivalent work exists for raster tiles, 3D tiles, or other formats, the question has prior context. If it does not, there may be a generalisation contribution here. Either way the literature determines the scope.

**Status: Requires literature. Do not promote to thesis question until Category 0 is searched.**

**Relationship to RQ1–RQ5:** RQ1–RQ5 are the MVT instantiation of this question. They stand on their own as empirical contributions regardless of how RQ0 is resolved.

---

## Primary MVT Research Question

### RQ1 — Prevalence

> **How prevalent are structural and geometric defects in production vector tile datasets, and what proportion are genuine errors versus artifacts of the MVT encoding convention?**

**Where it comes from:**  
EXP-002 found 148,268 diagnostics from `tile/coordinate-range` on 294 tiles; 100% were artifacts of intentional tile-compiler behavior (clipping buffers, cross-tile label duplication). EXP-003 found 619 `tile/self-intersection` diagnostics; 449 (72.5%) were artifacts of integer-grid quantization and closed-LineString encoding. This distinction — genuine error vs. encoding artifact — is the core empirical problem that the research addresses.

**What would answer it:**  
Running all 12 tile rules on a large, representative corpus (current: 294 z0–z4 tiles; needs extension to z5–z14) and classifying each diagnostic as genuine or artifact using the methods developed in Phase 1 and Phase 2.

**Status:** Partially answerable. `tile/coordinate-range` and `tile/self-intersection` are answered for z0–z4. All other geometry rules are unanswered (see Section 2.4 of the Audit). z5–z14 is entirely unmeasured.

**Experiments needed:** EXP-006 (other rules on 294-tile corpus), EXP-008 (z5–z14 corpus)

---

## Secondary Research Questions

### RQ2 — False-Positive Engineering

> **Can rule-specific false-positive suppression techniques be derived empirically from production tile data, and does such suppression preserve detection of genuine defects?**

**Where it comes from:**  
Phase 1 (EXP-002) and Phase 2 (EXP-003) each went through the cycle: initial diagnostic flood → root cause classification → targeted algorithmic fix → verification that true positives were preserved. This produced the buffer defaults, the 9 excluded label layers, and the 4 self-intersection guards. The question is whether this methodology generalises to the remaining rules.

**What would answer it:**  
Running EXP-006 (the remaining 5 geometry rules on the 294-tile corpus), classifying diagnostics into genuine/artifact, designing fixes, and verifying precision/recall against synthetic known-defect tiles (EXP-009).

**Status:** Answerable pending EXP-006 and EXP-009.

---

### RQ3 — Source-to-Render Relationship

> **Do the geometry defects detected by TileGuard at the source level correspond to observable rendering anomalies in MapLibre GL, and if so, under what conditions?**

**Where it comes from:**  
EXP-004 (Tokyo z14 tile): 1 confirmed self-intersection in the `transportation` layer. The tile renders correctly in MapLibre at all zoom levels tested. This is the central negative observation: a geometrically invalid tile that visually passes. The question is whether this is the general case or a special case.

The FAQ documents state: "MapLibre wraps earcut in a try/catch, so incorrect winding typically results in silent visual errors rather than crashes." This is a claim, not an empirical measurement.

**What would answer it:**  
A headless MapLibre rendering experiment (EXP-007): take the 170 confirmed self-intersecting geometries, render the affected tiles in headless MapLibre, compare with a corrected version, and record whether any visual difference is detectable at any zoom level.

A parallel experiment for winding-order violations (EXP-010).

**Status:** Not answerable without EXP-007. This is the highest-value open question for the research framing. A result either way is meaningful.

**Why this matters for a thesis:** If defects do correlate with rendering anomalies, TileGuard is a preventive QA tool. If they do not correlate, the research question shifts to why, and to what other consequences the defects have (downstream GIS processing, area calculation errors, etc.).

---

### RQ4 — Zoom Level Generalisation

> **Does the defect prevalence observed at z0–z4 generalise to higher zoom levels (z5–z14)?**

**Where it comes from:**  
All benchmark data is from z0–z4. Higher zoom tiles contain more features per tile, finer geometry, and different simplification characteristics. The 294-tile corpus is a convenience sample of globally sparse tiles. Production use cases (city-level maps, navigation, basemap rendering) operate primarily at z6–z14.

**What would answer it:**  
EXP-008: collect a z5–z14 tile corpus (e.g., a grid over Tokyo at z10–z14, or the same providers at higher zoom levels) and run the full rule set.

**Status:** Answerable pending EXP-008 (new data collection required).

---

### RQ5 — Detection Accuracy

> **What is the precision and recall of each TileGuard rule when applied to tiles with known, ground-truth defects?**

**Where it comes from:**  
The current evidence base establishes true-positive / false-positive counts on production tiles, but this is not the same as precision/recall in the classical sense — the denominator (total defects in the corpus) is unknown. The synthetic fixture generator (`scripts/generate-synthetic-fixtures.mts`) can produce tiles with known defects, enabling controlled accuracy measurement.

**What would answer it:**  
EXP-009: use `generate-synthetic-fixtures.mts` to produce a test set of tiles with planted, known defects; run TileGuard; measure TP, FP, FN, TN counts; compute precision and recall per rule.

**Status:** Answerable pending EXP-009 (tooling exists; experiment not run).

---

### RQ6 — Rule Architecture (Engineering Research Question)

> **Is a configurable, plugin-based rule-engine pattern more effective than a fixed validation checklist for vector tile quality assurance, and what design choices determine its scalability?**

**Where it comes from:**  
TileGuard's architecture is explicitly modelled on ESLint. The architectural claim — that rules should be independently configurable, produce structured diagnostics, and be extensible via plugins — is documented in the ADRs but not empirically evaluated as a research question.

**What would answer it:**  
Comparative evaluation: run TileGuard's rule engine against a simpler fixed-list validator on the same corpus and compare: number of actionable diagnostics, false-positive rate, CI usability (exit codes, JSON output), extensibility cost (lines of code for a new rule).

**Status:** This is a software engineering research question, not a spatial data quality question. Relevant for a systems/HCI paper, less relevant for a geospatial data quality paper. Deprioritised unless the thesis framing shifts to software architecture.

---

## Questions That Cannot Be Answered Yet (Require Literature)

### RQ-L1

> Is there existing published work measuring defect prevalence in production MVT datasets?

If yes, TileGuard's contribution shifts to "extending the measurement to a new corpus with a new methodology." If no, TileGuard's prevalence measurements are themselves a primary empirical contribution.

**Requires:** Category E literature search (see PAPER_MATRIX.md).

---

### RQ-L2

> Has anyone previously formalised the distinction between MVT encoding artifacts (clipping buffers, integer quantisation, cross-tile duplication) and genuine geometry errors, and published suppression methods?

If yes, TileGuard's Phase 1 / Phase 2 work is an independent validation of existing methods. If no, the suppression methodology may itself be a contribution.

**Requires:** Category E literature search.

---

### RQ-L3

> Does existing literature treat tiled geospatial QA as a representation-specific problem (separate work for MVT, raster, 3D) or as a general abstraction?

This determines whether RQ0 is a genuine open question or already studied territory. If existing work treats each representation separately with no unifying framework, there may be a contribution in identifying common principles. If there is already a generalised framework, TileGuard's contribution is an empirical study within it.

**Requires:** Category 0 literature search (see PAPER_MATRIX.md §3, Category 0). This is more foundational than RQ-L1 and RQ-L2 — it determines the framing of the entire thesis.

---

### RQ-L4

> What is the relationship between this work and the OGC Simple Features specification conformance testing literature?

**Requires:** Category E literature search.

---

## Prioritised Experiment Queue

In order of value to the research questions above:

| Priority | Action | Research question(s) addressed | Estimated effort | Data available |
|:---------|:-------|:-------------------------------|:-----------------|:---------------|
| 1 | **Category 0 literature search** — general tiled geospatial QA | RQ0, RQ-L3 | 3–5 days | Public |
| 2 | **EXP-006** — Run all geometry rules on 294-tile corpus | RQ1, RQ2 | 1–2 days | Yes (existing 294 tiles) |
| 3 | **Category E literature search** — MVT-specific academic work | RQ-L1, RQ-L2, RQ-L4, all novelty claims | 2–3 days | Public |
| 4 | **EXP-007** — Headless MapLibre rendering for 170 self-intersections | RQ3 | 3–5 days | Existing tiles; needs headless setup |
| 5 | **EXP-009** — Precision/recall against synthetic known-defect tiles | RQ5 | 2–3 days | `generate-synthetic-fixtures.mts` exists |
| 6 | **EXP-008** — z5–z14 tile collection and rule run | RQ4 | 5–7 days | New data collection required |
| 7 | **EXP-010** — Headless rendering for winding-order violations | RQ3 extension | 3–4 days | Needs EXP-006 first |

---

## What the Experiments Done So Far Have Established

Anchoring to what is already solid, so new work builds on it rather than rehashing it:

| Established fact | Source |
|:----------------|:-------|
| TileGuard's PBF decoder is identical to the Mapbox reference (0 divergences, 562 features, 13 layers) | EXP-001 |
| 148,268 coordinate-range diagnostics on 294 z0–z4 tiles are 100% encoding artifacts (56.9% clipping buffer, 43.1% cross-tile label duplication) | EXP-002 |
| Evidence-based defaults (buffer=80, 9 excluded label layers) reduce coordinate-range false positives to 0 on the 294-tile corpus | EXP-002 |
| 449/619 (72.5%) self-intersection diagnostics on the same corpus are false positives from integer-grid quantization and closed-LineString encoding conventions | EXP-003 |
| The 4 algorithmic guards reduce false positives to 0 without suppressing any of the 170 confirmed genuine crossings | EXP-003 |
| Self-intersection detection throughput after hardening: 126–187 tiles/s; marginal overhead ≈ 0 vs. disabled (δ = −46 ms across 294 tiles, within noise) | EXP-003 |
| At least 1 genuine self-intersection exists in a production z14 tile (OpenMapTiles, central Tokyo) that passes visual inspection | EXP-004 |
| The full pipeline (decode → validate → style-lint → compare → regression → report) functions correctly end-to-end on a controlled corpus | EXP-005 |

---

## What the Evidence Cannot Support (from the Audit)

Reproducing the key constraints to avoid overclaiming:

| Cannot claim | What would establish it |
|:------------|:------------------------|
| Self-intersection rate at z5–z14 (any number) | EXP-008 |
| That winding-order violations exist in production tiles at any rate | EXP-006 |
| That any detected defect causes a visible rendering anomaly | EXP-007 |
| That TileGuard's approach is novel vs. existing academic work | Category E literature search |
| That results generalise beyond OSM-derived tiles | Data from non-OSM providers |
