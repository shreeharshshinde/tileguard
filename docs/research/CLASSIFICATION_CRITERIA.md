# Classification Criteria — EXP-006 Diagnostic Taxonomy

**Author:** Shreeharsh Shinde  
**Created:** 2026-10-01 — written before any diagnostic inspection (Task 2.3 pre-condition)  
**Related:** [`EXPERIMENT_LOG.md`](./EXPERIMENT_LOG.md) · [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)

---

> **Process note.** These criteria are written *before* running the EXP-006 rule audit script and *before* inspecting any individual diagnostic. Writing criteria first prevents the classifier from unconsciously tailoring definitions to fit what the data already shows (a form of measurement bias). No individual diagnostic message or sample entry was read prior to authoring this document.

---

## 1. Taxonomy Definitions

Every diagnostic produced by the 10+4 rules in EXP-006 receives exactly one label from the four-category taxonomy established in EXP-002/EXP-003 Task 1.5.

| Label | Code | Definition |
|:------|:-----|:-----------|
| **Checker Error** | `CE` | The diagnostic is triggered by a bug or edge-case in TileGuard's rule implementation. The tile data is valid; a correct rule would not fire on this input. Sub-categories: wrong sign convention in the implementation, off-by-one index, incorrect options parsing. |
| **Quantization Artifact** | `QA` | The diagnostic is caused by floating-point → integer coordinate snapping during tile compilation. The source geometry (in geographic / float coordinates) is valid. The integer grid representation introduces a condition (duplicate vertex, collapsed ring, coordinate shift) that triggers the rule. The rule fires correctly *on the quantized data* but the root defect is in the pipeline, not the semantic geometry. |
| **Spec-Permitted Convention** | `SP` | The encoding pattern that triggers the rule is explicitly permitted by the MVT specification v2.1 or is a widely established, documented practice of production tile compilers (e.g., PostGIS/imposm3, Planetiler, CARTO proprietary pipeline). A standards-compliant encoder producing this pattern is not making an error. |
| **Genuine Defect** | `GD` | A true topological or structural defect in the tile data that persists even on correctly compiled tiles. The defect is invalid under OGC Simple Features, the MVT specification, or both, and would be expected to cause a rendering error (missing fill, corrupt triangulation, invisible geometry, performance degradation) in a reference renderer. |

### Decision procedure

Apply labels in priority order when a diagnostic is ambiguous:

1. If a rule implementation bug explains the firing → **Checker Error** (even if the tile data has other issues)
2. If the firing is solely caused by float→int quantization and the underlying source geometry is valid → **Quantization Artifact**
3. If the encoding choice is documented and permitted by MVT spec or established compiler practice → **Spec-Permitted Convention**
4. If none of the above apply → **Genuine Defect**

A diagnostic cannot carry two labels. If it plausibly fits two, use the highest-priority label above.

---

## 2. Per-Rule Criteria

### 2.1 `tile/winding-order`

**What the rule checks:** Polygon rings use a consistent winding convention: either all outers CW + holes CCW (MVT spec) or all outers CCW + holes CW (OGC). Reports rings that break the *detected feature-level convention*.

**Expected classification:**

| Pattern | Label | Rationale |
|:--------|:------|:----------|
| Ring winding inconsistent with *detected convention* on a tile from a provider whose convention is mixed by construction | `SP` | The rule detects convention per feature, not globally; a provider that mixes MVT and OGC conventions across features produces diagnostics that reflect pipeline choice, not a rendering defect. |
| Ring winding inconsistent with *detected convention* on all three production providers | `SP` — unless clearly a pipeline defect | All three providers (OpenMapTiles/PostGIS, OpenFreeMap/Planetiler, CARTO) use consistent OGC-convention outers per EXP-010. A winding diagnostic on these tiles would most likely indicate a corrupted ring. |
| Ring winding inconsistent on a known-correct encoder (EXP-009 synthetic) | `GD` | A synthetic ring with deliberately wrong winding is a genuine defect. |
| Zero diagnostics on corpus | N/A — no instances to classify |

**Key implementation note (EXP-010):** The rule's `detectWindingConvention()` reads the first non-zero-area ring's sign to determine the per-feature convention, then validates all rings against that convention. This is correct; it does not impose MVT-spec CW on OGC-convention tiles. Zero false positives expected on the z0–z4 corpus given EXP-010 results.

---

### 2.2 `tile/unclosed-ring`

**What the rule checks:** Polygon rings where first vertex ≠ last vertex.

**Expected classification:**

| Pattern | Label | Rationale |
|:--------|:------|:----------|
| Polygon ring emitted without a closing vertex by a production compiler | `SP` | Some compilers omit the explicit closing vertex (encoding it as `closePath` command 7 in the MVT command stream), which the decoder should reconstruct. If the TileGuard decoder's `getFeatureParts()` does not reconstruct the close, it is a **Checker Error**. |
| Ring genuinely not closed in source data, surviving through compiler | `GD` | Earcut requires closed rings. An unclosed polygon ring is a structural defect. |
| Zero diagnostics on corpus | N/A |

**Disambiguation note:** Verify against `pbf-decoder.ts` whether the decoder returns rings with or without the reconstructed closing vertex before classifying. If the decoder always returns closed rings (first==last), any `unclosed-ring` diagnostic on production tiles would be `QA` (quantization collapsed all vertices to the same point) or `GD`.

---

### 2.3 `tile/zero-area-ring`

**What the rule checks:** Polygon rings whose `|signedArea|` is exactly 0 (default) or below a `minArea` threshold.

**Expected classification:**

| Pattern | Label | Rationale |
|:--------|:------|:----------|
| Adjacent duplicate vertices (Cat A quantization spike) collapse a ring to zero area | `QA` | Float→int snapping collapses two distinct source vertices to the same integer coordinate; the resulting ring has zero area. Source geometry was valid. |
| Degenerate polygon in source (e.g., line digitised as polygon) | `GD` | A genuine structural defect — the feature carries no areal information. |
| Three-vertex triangle simplified to three collinear points | `QA` | Douglas-Peucker at aggressive tolerance flattens the triangle; the resulting collinear ring has zero area. Source geometry was valid. |
| Self-crossing ring (butterfly/hourglass) whose signed areas cancel | This fires `zero-area-ring` on TP synthetic fixtures — | `GD` — the underlying crossing is genuine; the zero area is a symptom. Do not label `QA`. |

---

### 2.4 `tile/hole-containment`

**What the rule checks:** Each vertex of a hole ring must lie within (or on the boundary of) its parent outer ring, using ray-casting point-in-polygon.

**Expected classification:**

| Pattern | Label | Rationale |
|:--------|:------|:----------|
| Hole ring vertex appears outside outer ring due to **MVT tile boundary clipping**: outer ring and hole ring are clipped independently at the tile boundary, so a hole vertex can be outside the clipped outer even though the original source geometry is valid | `SP` | This is a documented MVT coordinate-space artefact. The MVT spec clips geometry at tile boundaries independently per ring. The source topology (in geographic space) is valid; the apparent hole violation exists only in tile-coordinate space. Confirmed in EXP-002 analysis of the `countries` layer clipping buffer pattern. |
| Hole ring outside outer ring due to Douglas-Peucker simplification shifting hole vertices past the simplified outer boundary | `QA` | Simplification is a pipeline transformation; the source geometry was valid. The quantization of the simplified coordinates introduced the violation. |
| Hole ring outside outer ring in source data (e.g., mislabelled polygon ring) | `GD` | A genuine topology defect — earcut will produce corrupt triangulation. |

**Primary expectation for EXP-006 corpus:** All 109 diagnostics from `countries` / OpenMapTiles z0–z4 are expected to be `SP` (MVT clipping artefact). This is a single recurring pattern from one provider; the classifier should verify the message consistently references `countries` layer before assigning `SP` in bulk.

---

### 2.5 `tile/degenerate-geometry`

**What the rule checks:** LineStrings with fewer than 2 distinct vertices, Polygons with fewer than 3 distinct vertices (after deduplication).

**Expected classification:**

| Pattern | Label | Rationale |
|:--------|:------|:----------|
| All vertices collapsed to one point by extreme quantization | `QA` | Float→int snapping can collapse a short line to a point. Source was valid. |
| Feature was digitised as a point but encoded as a LineString | `GD` | Structural defect — the geometry type is mismatched. |
| Two-vertex ring (point + close) after simplification | `QA` | Simplification collapsed a triangle to a line segment; the close vertex makes it appear a ring but it has 2 distinct vertices. Source was valid. |

---

### 2.6 `tile/no-empty`

**What the rule checks:** Tiles that contain zero features across all layers.

**Expected classification:**

| Pattern | Label | Rationale |
|:--------|:------|:----------|
| Tile covers an area with no geographic features (ocean tile, polar tile) | `SP` | An empty tile is semantically valid. The rule is a configurable sanity check, not a correctness gate. Firing here is expected behaviour for the rule but the *data* is not defective. |
| Tile has layers but each layer's feature array is empty due to a compiler bug | `GD` | If the compiler should have emitted features (source data has features in the tile's footprint) but did not, this is a pipeline defect. |

**Note:** On the z0–z4 corpus, `tile/no-empty` is expected to produce zero diagnostics because all tiles cover the populated world at low zoom and contain features.

---

### 2.7 `tile/required-layers`

**What the rule checks:** Named layers that the configuration declares as required must be present in the tile.

**Expected classification (structural run — empty `layers: []`):**

| Pattern | Label | Rationale |
|:--------|:------|:----------|
| Zero diagnostics (empty config → no requirements) | N/A | Structural run only confirms rule loads without crashing. |
| Non-zero diagnostics with empty config | `CE` | The rule should never fire when `layers: []`. Any firing indicates an implementation bug. |

---

### 2.8 `tile/required-properties`

**What the rule checks:** Features in named layers must have specified properties present.

**Expected classification (structural run — empty `layers: {}`):**

Same as `tile/required-layers`. Zero diagnostics expected; any firing = **Checker Error**.

---

### 2.9 `tile/feature-count`

**What the rule checks:** Total feature count across all layers must satisfy configured `min`/`max` bounds. With no bounds configured (neither `min` nor `max`), the rule returns immediately — zero diagnostics guaranteed.

**Expected classification (no-bounds structural run):**

| Pattern | Label | Rationale |
|:--------|:------|:----------|
| Zero diagnostics (no min/max configured) | N/A | Correct behaviour — rule short-circuits. |
| Non-zero diagnostics with no bounds | `CE` | Rule should not fire without a threshold. |

**If bounds were configured and diagnostics appeared:**

| Pattern | Label | Rationale |
|:--------|:------|:----------|
| Count below `min` on a tile that should be populated | `GD` | Possible data loss or incorrect filtering in the pipeline. |
| Count above `max` on a z0–z4 tile | `GD` | Over-inclusion at low zoom, indicates missing simplification/filtering. |

---

### 2.10 `tile/layer-feature-count`

**What the rule checks:** Per-layer feature counts must satisfy per-layer `min`/`max` bounds. With empty `layers: {}`, the rule loops over an empty configuration — zero diagnostics guaranteed.

**Expected classification (empty-layers structural run):**

Same as `tile/feature-count` no-bounds case. Zero diagnostics expected; any firing = **Checker Error**.

---

### 2.11 `perf/tile-size`

**What the rule checks:** Raw and/or gzip byte size of the tile PBF must not exceed configured thresholds. With default `warning` severity and no explicit byte thresholds configured, the rule's `create()` function short-circuits (no `maxBytes` or `maxGzipBytes` option → returns immediately).

**Expected classification (no thresholds):**

| Pattern | Label | Rationale |
|:--------|:------|:----------|
| Zero diagnostics (no thresholds configured) | N/A | Correct behaviour. |
| Non-zero diagnostics with no thresholds | `CE` | Rule must not fire without a threshold. |

**If thresholds were configured and diagnostics appeared:**

| Pattern | Label | Rationale |
|:--------|:------|:----------|
| Tile exceeds configured byte budget | `GD` | The tile is genuinely over-budget — a rendering/bandwidth performance defect. The "defect" is in the pipeline output relative to the declared budget; not a topology error but a quantifiable quality failure. |

---

### 2.12 `perf/vertex-budget`

**What the rule checks:** Per-feature vertex count must not exceed `maxVerticesPerFeature`; total tile vertex count must not exceed `maxVerticesPerTile`. With neither option configured, the rule short-circuits.

**Expected classification (no options configured):**

Same short-circuit pattern as `perf/tile-size`. Zero diagnostics expected.

**If options were configured:**

| Pattern | Label | Rationale |
|:--------|:------|:----------|
| Feature vertex count exceeds per-feature budget | `GD` | A high vertex count per feature is a genuine pipeline quality failure — the feature was not simplified appropriately for this zoom level. |
| Total tile vertex count exceeds tile budget | `GD` | Same reasoning as per-feature: too many vertices is a real performance defect relative to the declared budget. |

---

### 2.13 `perf/feature-density`

**What the rule checks:** Per-layer feature count must not exceed a configured `maxFeaturesPerLayer`. With no threshold configured (`warning` severity, no options), the rule short-circuits.

**Expected classification (no threshold):** N/A — zero diagnostics, correct behaviour.

---

### 2.14 `perf/layer-size`

**What the rule checks:** A single layer must not contribute more than `maxLayerFraction` of the tile's total vertex count. With no `maxLayerFraction` option, the rule short-circuits.

**Expected classification (no threshold):** N/A — zero diagnostics, correct behaviour.

---

## 3. Ambiguity Resolution Rules

These rules apply when a diagnostic could fit more than one label:

**Rule A — Compiler-introduced vs. source defect.** If the defect pattern is consistent across all tiles from one specific provider (but absent on the same geographic region from another provider), it is most likely introduced by that provider's pipeline → prefer `QA` or `SP` over `GD`.

**Rule B — Rule implementation ambiguity.** If the firing can only be explained by reading the rule implementation and cannot be inferred from the tile data alone, open a side investigation before classifying. Do not guess.

**Rule C — Bulk identical patterns.** When multiple consecutive diagnostics have the same message template, the same layer, and the same tile, they are the same pattern instance. Classify one, then apply the same label to all others in the same batch with a note "same pattern as sampleIdx N".

**Rule D — OGC vs. MVT spec conflict.** When a rule's specification invokes the MVT spec (CW exterior rings) but production tiles use OGC convention (CCW exterior rings), and the rule correctly auto-detects and accepts both conventions, a diagnostic is only valid if it fires on a ring that violates *its own feature's* convention — not because it differs from the MVT spec. Firing for "violates MVT spec but not the feature's OGC convention" = **Checker Error**.

---

## 4. Inter-Rater Instructions (Second Reviewer)

The second reviewer independently classifies entries with `sampleIdx` 0–14 for every rule that produced at least one diagnostic. For rules with zero diagnostics, no second-reviewer action is required.

**Instructions:**
1. Read each diagnostic's `message` field and the `layer`, `tile`, and `dataset` fields only. Do not read the primary reviewer's `taxonomyLabel` or `reviewerNote` before assigning your own label.
2. Apply the criteria in Section 2 for the rule identified by `ruleId`.
3. Assign exactly one of: `Checker Error`, `Quantization Artifact`, `Spec-Permitted Convention`, `Genuine Defect`.
4. Write a one-sentence rationale in your reviewer note.
5. After completing all 15 entries, the primary reviewer computes Cohen's Kappa from the two label sets.

**Cohen's Kappa formula:**

$$\kappa = \frac{p_o - p_e}{1 - p_e}$$

Where:
- $p_o$ = proportion of items where both reviewers agree (observed agreement)
- $p_e$ = expected agreement by chance = $\sum_k p_{k,\text{r1}} \cdot p_{k,\text{r2}}$ across all four categories

Interpretation: κ < 0.4 = poor; 0.4–0.6 = moderate; 0.6–0.8 = substantial; > 0.8 = almost perfect.

---

*Classification Criteria v1.0 — 2026-10-01*  
*Related: [`EXPERIMENT_LOG.md`](./EXPERIMENT_LOG.md) · EXP-006*
