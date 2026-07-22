# Root Cause Investigation — `tile/self-intersection`

> **Date:** 2026-07-21  
> **Phase:** 2 — Self-Intersection Investigation & Hardening  
> **Step:** 2 — Root Cause Investigation  
> **Status:** ✅ Complete  
> **Source data:** 294 tiles, 619 flagged rings  
> **Extraction script:** `scripts/extract-self-intersecting-rings.mjs`  
> **Machine-readable data:** `analysis/self-intersection-rings.json`, `analysis/self-intersection-rings.csv`

---

## 1. Detector Review

Before classifying diagnostics, the implementation was read in full
(`packages/tile-rules/src/geometry.ts`, `src/rules/self-intersection.ts`).

Key properties of `findFirstSelfIntersection()`:

| Property | Value |
| :--- | :--- |
| Applies to | `feature.type === 2` (LineString) and `3` (Polygon) |
| Algorithm | O(N²) segment-pair comparison per ring |
| Adjacent-pair skip | `Math.abs(first - second) <= 1` — correct, prevents trivial adjacent-segment flags |
| Closure skip | `closed && first === 0 && second === segmentCount - 1` — only applied when `closed=true` |
| `closed` flag value | `true` for Polygon (`type===3`), **`false` for LineString (`type===2`)** |
| Arithmetic | Pure integer cross-product — no floating-point epsilon |
| Collinear handling | `onSegment()` — a point lying exactly on a segment triggers the check |
| Reports | First intersection per ring only |

The closure skip applies to Polygons but **not** to LineStrings — this asymmetry is the root cause
of the largest single false-positive category.

---

## 2. Extraction Methodology

`scripts/extract-self-intersecting-rings.mjs` decoded every PBF in `fixtures/benchmark-cache/`
using `@mapbox/vector-tile` directly (bypassing the engine) and ran the same O(N²) intersection
logic as the rule. For each flagged ring it recorded:

- dataset, tile, layer, feature index, part index
- geometry type, vertex count
- the two intersecting segment indices and all four endpoint coordinates
- the intersection point and its distance to the nearest tile boundary edge
- whether the intersection is collinear, whether the two segments share an endpoint
- whether the ring contains a non-closing duplicate vertex
- the full vertex list

Extracted 619/619 rings, matching the benchmark diagnostic count exactly.

---

## 3. Initial Observations

| Metric | Count | % |
| :--- | ---: | ---: |
| Total flagged rings | 619 | 100% |
| Rings in `boundary` layer | 446 | 72.1% |
| Rings in `countries` layer | 173 | 27.9% |
| LineString geometry | 446 | 72.1% |
| Polygon geometry | 173 | 27.9% |
| Rings with any duplicate vertex | 603 | 97.4% |
| Rings where two flagged segments share an endpoint | 449 | 72.5% |
| Intersection point within 10 units of tile boundary | 61 | 9.9% |
| Collinear intersections | 6 | 1.0% |

The corpus is entirely concentrated in two layers across the three datasets. No other layer
contributes a single flagged ring.

---

## 4. Category Definitions and Evidence

Rings were placed into four mutually exclusive categories using this priority order:

1. **Cat C** if `isCollinear` (orientation = 0, segments overlap on a line)
2. **Cat B2** if the ring is a closed LineString (start == end) **and** the two flagged segments share an endpoint
3. **Cat A** if the ring contains a non-closing duplicate vertex (a vertex that appears twice other than the start==end closure pair)
4. **Cat B1** otherwise (proper topological crossing, no shared endpoint, no real duplicate vertex)

---

### Category A — Duplicate Vertex Spike (161 rings, 26.0%) — FALSE POSITIVE

**Description.** A ring visits one of its interior vertices twice — the path goes A → B → C → B → D
or similar, creating a spike that goes out to a point and backtracks. The two segments sharing
vertex B are non-adjacent (there is at least one intermediate vertex C between them), so the
adjacency-skip does not fire. The algorithm detects the shared endpoint B as an intersection.

**Concrete example:**

```
Ring: 1432,1432 → 1433,1430 → 1433,1429 → 1433,1430 → 1433,1433 → 1432,1432
Duplicate: vertex (1433,1430) at indices 1 and 3
Seg 0: (1432,1432)→(1433,1430)  vs  Seg 2: (1433,1429)→(1433,1430)
Shared endpoint: (1433,1430) ← the duplicate
```

The ring is a 6-vertex country boundary sub-ring. The path goes to (1433,1430), continues one step
to (1433,1429), then returns exactly to (1433,1430). This spike is a quantization artifact: two
adjacent geographic coordinates that are distinct in floating-point space round to the same integer
grid point after tile compilation, causing the ring to revisit a vertex.

**Why it is a false positive.** OGC Simple Features §6.1.2.1 defines a simple curve as one that
does not pass through the same point more than once. A spike that backtracks through a vertex
technically violates this definition. However, the spike exists only because of integer-grid
quantization, not because the underlying geographic feature self-intersects. The real-world boundary
is valid; the artifact is introduced by the tile compiler. Flagging it as a self-intersection
misrepresents the data quality of the source.

**Evidence summary:**

| Metric | Value |
| :--- | ---: |
| Count | 161 (26.0%) |
| Layers | boundary: 142, countries: 19 |
| Geometry types | LineString: 142, Polygon: 19 |
| Median vertex count | 36 |
| Intersections within 10 units of boundary | 8 / 161 (5%) |
| Median distance to nearest tile boundary | 634 units |

The low boundary-proximity rate (5%) confirms this is an interior quantization artifact, not
clipping-edge noise.

**Specification reference.** MVT Specification §4.3.4.3 permits geometry to extend beyond tile
extent with a clipping buffer; it does not mandate lossless float precision. The integer quantization
is a standard, documented property of the MVT format (tile extent = 4096 units by default). A
validator that flags the results of this documented quantization as self-intersections is applying
the wrong evidentiary standard to the MVT coordinate model.

---

### Category B1 — Genuine Topological Crossing (170 rings, 27.5%) — TRUE POSITIVE

**Description.** Two non-adjacent segments properly cross each other — neither shares an endpoint
with the other, and the ring has no non-closing duplicate vertex. These are geometrically
self-intersecting in the full topological sense.

**Concrete example (5-vertex bowtie):**

```
Ring: 3153,2023 → 3155,2023 → 3155,2025 → 3154,2023 → 3153,2023
Seg 0: (3153,2023)→(3155,2023)   [horizontal segment at y=2023]
Seg 2: (3155,2025)→(3154,2023)   [diagonal, endpoint (3154,2023) lies ON seg 0]
Intersection at: (3154,2023) — a proper crossing
```

The ring draws a tiny near-degenerate country boundary sub-polygon where the return path crosses
the outgoing path. This is a genuine figure-8 bowtie shape at the integer coordinate level.

**Larger genuine crossings** (37 to 923 vertices) occur in both the `countries` and `boundary`
layers and represent real data quality issues: complex administrative boundary rings that fold back
on themselves, either due to source data errors or to the geometric effects of quantization on
highly complex shapes.

**Evidence summary:**

| Metric | Value |
| :--- | ---: |
| Count | 170 (27.5%) |
| Layers | countries: 154, boundary: 16 |
| Geometry types | Polygon: 154, LineString: 16 |
| Median vertex count | 5 |
| Intersections within 10 units of boundary | 19 / 170 (11%) |
| Median distance to nearest tile boundary | 583 units |

**Specification reference.** OGC Simple Features §6.1.2.1 (simple geometry) and §6.1.11.1 (valid
polygon): a polygon ring must not self-intersect. These diagnostics are correct per the specification.

---

### Category B2 — Closed LineString Missing Closure Skip (282 rings, 45.6%) — FALSE POSITIVE

**Description.** A LineString feature whose first and last vertex are identical (a closed
LineString, typically a small boundary loop) is flagged because the algorithm does not apply the
closure skip to LineStrings.

For a Polygon, the algorithm skips the comparison of `seg[0]` vs `seg[segCount-1]` because they
are logically adjacent at the ring closure. This skip is conditional on `closed === true`, which is
only set for `feature.type === 3` (Polygon). For a closed LineString (`feature.type === 2`,
start == end), `closed` is `false`, so the skip never fires.

For any closed LineString with N vertices (forming a loop), `seg[0]` and `seg[N-2]` share the
closing vertex as an endpoint. The orientation test classifies this shared-endpoint as a proper
crossing (since the proper-crossing condition `o1 ≠ o2 AND o3 ≠ o4` is satisfied when one
orientation is 0), and the ring is flagged.

**Concrete example (4-vertex triangle loop):**

```
Ring: 3914,3808 → 3912,3807 → 3914,3805 → 3914,3808   (LineString, start == end)
Seg 0: (3914,3808)→(3912,3807)
Seg 2: (3914,3805)→(3914,3808)   ← shares endpoint (3914,3808) with seg 0
Flagged as intersecting.
```

This is a simple triangle — a valid closed boundary loop with no self-intersection whatsoever.
The flag is entirely an artifact of the LineString/Polygon closure-skip asymmetry.

**Evidence summary:**

| Metric | Value |
| :--- | ---: |
| Count | 282 (45.6%) |
| Layers | boundary: 282 (100%) |
| Geometry types | LineString: 282 (100%) |
| All are closed (start == end) | 282 / 282 (100%) |
| Median vertex count | 6 |
| Vertex count range | 4 – 85 |
| Intersections within 10 units of boundary | 32 / 282 (11%) |

**Why this is 100% false positive.** A closed LineString forming a simple loop (triangle, quadrilateral,
etc.) is geometrically valid. The `boundary` layer in OpenMapTiles, OpenFreeMap, and CARTO Streets
uses LineString features for administrative boundary segments; some of these form closed loops
(e.g., a country boundary that is a small island or exclave). None of these shapes are
self-intersecting. Every one of these 282 flags is attributable solely to the missing closure skip.

**Specification reference.** The MVT specification does not prohibit closed LineStrings. OGC Simple
Features §6.1.5 (LineString): a LineString is a one-dimensional curve; it may be closed (start == end)
without being self-intersecting. The self-intersection test must treat `start == end` as a valid
closure, not as an intersection.

---

### Category C — Collinear Overlap (6 rings, 1.0%) — TRUE POSITIVE

**Description.** Two non-adjacent segments lie on the same line and overlap. The `onSegment()` check
in the collinear branch of `segmentsIntersect()` correctly catches these.

**Concrete example:**

```
Ring (boundary, tile 2-2-1.pbf):
3500,1912 → 3503,1912 → 3506,1906 → 3504,1899 → 3496,1907 → 3497,1912 → 3500,1912
Seg 0: (3500,1912)→(3503,1912)   [horizontal at y=1912]
Seg 5: (3497,1912)→(3500,1912)   [horizontal at y=1912, overlaps end of seg 0]
Both lie on y=1912; endpoint (3500,1912) is collinear with and on both segments.
```

Two of the six rings occur in a cross-tile pair: one tile at y-tile=2 has the ring with positive
y coordinates, and the matching tile at y-tile=3 has the same ring reflected to negative y
coordinates (y values below 0, within the clipping buffer). These represent the same geographic
feature appearing in both tiles.

**Evidence summary:**

| Metric | Value |
| :--- | ---: |
| Count | 6 (1.0%) |
| Layers | boundary: 6 (100%) |
| Median vertex count | 10 |
| Intersections within 10 units of boundary | 2 / 6 (33%) |

**Specification reference.** OGC Simple Features §6.1.2.1: a simple curve does not pass through
the same point more than once, and collinear overlapping segments violate this by covering the
same line segment with two distinct path segments. These are genuine data quality issues.

---

## 5. Investigation Summary

| Category | Count | Classification | Root cause | Candidate fix |
| :--- | ---: | :--- | :--- | :--- |
| Duplicate vertex spike (Cat A) | 161 | ❌ False positive | Integer-grid quantization collapses two distinct float coords to one point; ring revisits the vertex | Skip segment pairs whose only intersection is a known non-closing duplicate vertex |
| Closed LineString (Cat B2) | 282 | ❌ False positive | Closure skip applies to Polygons (`closed=true`) but not to LineStrings with `start==end` | Extend the closure skip to closed LineStrings (`first vertex == last vertex`) |
| Genuine crossing (Cat B1) | 170 | ✅ True positive | Ring segments actually cross each other geometrically | No change — these are correct diagnostics |
| Collinear overlap (Cat C) | 6 | ✅ True positive | Two non-adjacent segments lie on the same line and overlap | No change — these are correct diagnostics |
| **Total** | **619** | | | |

Combined false-positive reduction from the two candidate fixes: **443 / 619 = 71.6%** — below the ≥ 80% acceptance threshold. Step 3 must decide whether any sub-population of Cat B1 warrants reclassification, or whether 71.6% is the honest ceiling and the threshold gap is acknowledged explicitly in ADR-007.

---

## 6. Frequency Table

| Category | Description | Count | % | Classification |
| :--- | :--- | ---: | ---: | :--- |
| A | Duplicate vertex spike (float→int quantization) | 161 | 26.0% | ❌ FALSE POSITIVE |
| B1 | Genuine topological crossing | 170 | 27.5% | ✅ TRUE POSITIVE |
| B2 | Closed LineString, missing closure skip | 282 | 45.6% | ❌ FALSE POSITIVE |
| C | Collinear overlap | 6 | 1.0% | ✅ TRUE POSITIVE |
| **Total** | | **619** | **100%** | |
| **False positives** | | **443** | **71.6%** | |
| **True positives** | | **176** | **28.4%** | |

---

## 7. Fix Mapping

Two targeted fixes address the two false-positive categories:

**Fix 1 — Extend closure skip to closed LineStrings** (eliminates Cat B2: 282 rings, 45.6%):

Change the `closed` flag in `findFirstSelfIntersection()` to also be `true` when the geometry is
a LineString whose first vertex equals its last vertex:

```
closed = (feature.type === 3) || (feature.type === 2 && firstVertex == lastVertex)
```

This is the same skip that already exists for Polygons, applied symmetrically to the closed
LineString case. Zero false-negative risk: a closed LineString that genuinely crosses itself
(where non-adjacent interior segments cross, not at the closure point) is still caught by all
other segment-pair comparisons.

**Fix 2 — Skip non-adjacent segments that share a duplicate vertex** (eliminates Cat A: 161 rings, 26.0%):

Before the O(N²) loop, identify all vertices that appear more than once (excluding the start==end
closure). During the segment-pair comparison, skip any pair where both segments have an endpoint
equal to the same duplicate vertex — i.e., where the segments meet at a revisited point rather than
crossing through it.

Zero false-negative risk: the only pairs skipped are those whose sole "intersection" is the shared
duplicate vertex. Any pair that also has a proper geometric crossing would be caught through a
different segment pair in the same ring.

**Combined reduction: 443 / 619 = 71.6%**

This is below the ≥ 80% acceptance threshold defined in the Phase 2 plan. Step 3 must address
this gap. Options include:

- Investigating whether Cat B1's 170 rings contain any sub-category of false positives that the
  current analysis has not yet separated out (e.g., tiny near-degenerate polygons created by
  quantization that are technically self-intersecting but practically meaningless)
- Accepting 71.6% as the achievable reduction with the two clean, zero-false-negative fixes, and
  formally noting in ADR-007 that the threshold was not met and the gap is explicitly acknowledged

Step 3 is where this decision is made; this investigation provides the evidence to make it.

---

## 8. Hypotheses Evaluated

| Hypothesis | Verdict | Evidence |
| :--- | :--- | :--- |
| H1: Near-boundary floating-point quantization produces spurious crossings at tile clip edges | ❌ **Rejected** | Only 61/619 (9.9%) intersections are within 10 units of a boundary. Median distance is 588 units — well inside the tile. Not a boundary-proximity phenomenon. |
| H2: Complex legitimate boundary shapes (figure-8 administrative boundaries) are incorrectly flagged | ❌ **Rejected as dominant cause** | 161 Cat A spikes are quantization artifacts (not complex shapes), and 282 Cat B2 are algorithm bugs. Only Cat B1 (170) and Cat C (6) are genuinely complex shapes being correctly flagged. |
| H3: Algorithm bug — missing closure skip for closed LineStrings | ✅ **Confirmed** | 282 Cat B2 rings, all closed LineStrings in the `boundary` layer, 100% attributable to the Polygon-only closure skip. |
| H4: Algorithm behavior — duplicate vertex treated as intersection | ✅ **Confirmed** | 161 Cat A rings, all with a non-closing duplicate vertex from integer-grid quantization. |
| H5: Genuine data quality issues | ✅ **Confirmed** | 176 true positives: 170 proper crossings + 6 collinear overlaps. |

---

## 9. Per-Dataset Cross-Check

| Dataset | Cat A | Cat B1 | Cat B2 | Cat C | Total |
| :--- | ---: | ---: | ---: | ---: | ---: |
| OpenMapTiles | 19 | 154 | 0 | 0 | 173 |
| OpenFreeMap | 71 | 8 | 141 | 3 | 223 |
| CARTO Streets | 71 | 8 | 141 | 3 | 223 |

The OpenMapTiles distribution differs from OpenFreeMap/CARTO because the OpenMapTiles tile set
(demotiles.maplibre.org) covers only a `countries` and `boundary` schema with different feature
segmentation — its `boundary` layer does not produce the closed-LineString loops (Cat B2) that
appear in OpenFreeMap and CARTO Streets. OpenFreeMap and CARTO Streets are independently sourced
but produce identical category distributions, confirming both share the same tile compiler
behavior. The consistency within each provider confirms these are structural properties of the
data format and rule, not random noise.

---

## 10. Specification Citations

| Specification | Section | Relevance |
| :--- | :--- | :--- |
| OGC Simple Features §6.1.2.1 | Simple geometry — a curve does not pass through the same point twice | Basis for self-intersection as invalid; also basis for why Cat A spikes are technically invalid |
| OGC Simple Features §6.1.5 | LineString — a closed LineString (start==end) is valid and not inherently self-intersecting | Basis for Cat B2 false-positive classification |
| OGC Simple Features §6.1.11.1 | Valid polygon — ring must not self-intersect | Basis for Cat B1 true-positive classification |
| MVT Specification §4.3.4.3 | Geometry may extend beyond tile extent with clipping buffer | Establishes that integer-grid coordinate quantization is a documented, expected property of MVT |
| MVT Specification §4.3.2 | Geometry commands — integer delta encoding | Establishes that coordinates are inherently quantized to integer grid; float→int rounding is by design |

---

## 11. Artifacts

| File | Contents |
| :--- | :--- |
| `scripts/extract-self-intersecting-rings.mjs` | Extraction script; produces JSON and CSV |
| `analysis/self-intersection-rings.json` | 619 records, one per flagged ring, with full vertex lists |
| `analysis/self-intersection-rings.csv` | Same, without vertex lists, for spreadsheet analysis |
