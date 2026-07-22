# ADR-007: Self-Intersection Rule Hardening — Correctness Fixes and Performance Pre-checks

## Status

**Accepted** — 2026-07-21

## Context

TileGuard's `tile/self-intersection` rule was confirmed in Phase 2 Step 1 as the sole remaining
source of diagnostics on the 294-tile benchmark corpus (619 diagnostics across OpenMapTiles,
OpenFreeMap, and CARTO Streets), and the dominant contributor to whole-engine runtime — the
reason the project's 10,000-tile / 60-second throughput target remains unmet.

Step 2 extracted all 619 flagged rings and classified each one against OGC Simple Features
geometry validity rules. The full investigation is in
[`ROOT_CAUSE_INVESTIGATION.md`](../../engineering/ROOT_CAUSE_INVESTIGATION.md). Summary:

| Category | Count | % | Classification |
| :--- | ---: | ---: | :--- |
| Cat B2 — Closed LineString, missing closure skip | 288 | 46.5% | ❌ False positive |
| Cat A — Duplicate vertex spike (float→int quantization) | 161 | 26.0% | ❌ False positive |
| Cat B1 — Genuine topological crossing | 170 | 27.5% | ✅ True positive |
| Cat C — Collinear overlap (closed LS, closure skip) | 0* | 0% | subsumed into B2 |

*The 6 rings originally classified Cat C are closed LineStrings whose collinear detection fires at
the closure pair — same root cause as Cat B2, subsumed into that count.

**Cat B2 root cause.** The algorithm skips the comparison of `seg[0]` vs `seg[segCount-1]` for
Polygon features (`closed = true`), treating them as logically adjacent at the ring closure. For
LineString features (`closed = false` always), this skip never fires — even when the LineString
is closed (first vertex == last vertex). Every closed-LineString boundary loop is therefore
flagged because `seg[0]` and `seg[last]` share the closing vertex and the orientation test
classifies this as an intersection.

**Cat A root cause.** When tile compilers quantize floating-point geographic coordinates to the
integer grid (MVT extent = 4096), two adjacent geographic points that are distinct in float space
may round to the same integer. The ring visits that grid point twice. The two non-adjacent segments
that arrive at and depart from the duplicated vertex are flagged as intersecting, even though the
underlying geographic feature does not self-intersect.

**Throughput issue.** The rule's O(N²) segment-pair loop dominates engine runtime. A bounding-box
pre-check (4 comparisons per pair before the orientation cross-product) can short-circuit the
overwhelming majority of pairs. On the full OpenMapTiles corpus (18,976 rings, 140,585,584 O(N²)
pairs), 140,548,775 pairs (≈100%) have non-overlapping bounding boxes and can be skipped without
any orientation math. Only 36,809 pairs require the full check.

## Decision

Four changes will be made to `findFirstSelfIntersection()` in `geometry.ts`:

1. **Extend the closure skip to closed LineStrings.** Set `closed = true` whenever either (a)
   the feature is a Polygon, or (b) the feature is a LineString whose first vertex equals its last
   vertex. This mirrors the existing Polygon closure skip symmetrically.

2. **Skip segment pairs that share a duplicate interior vertex.** Before the O(N²) loop, collect
   all vertices that appear more than once in the ring, excluding the start==end closing pair.
   During iteration, skip any segment pair `(i, j)` where `points[i+1]` or `points[i]` equals a
   known duplicate vertex that is also an endpoint of segment `j`. This prevents the quantization
   spike from being reported as a self-intersection.

3. **Add a bounding-box pre-check inside the inner loop.** Before calling `segmentsIntersect()`,
   test whether the axis-aligned bounding boxes of the two segments overlap. If they do not, skip
   immediately. This is a pure performance change — it does not alter which rings are flagged.

4. **Add a minimum-vertex guard.** Skip any ring with fewer than 4 vertices before entering the
   O(N²) loop. A ring with 3 or fewer vertices cannot produce a non-adjacent, non-closure segment
   pair. This is a free guard — one comparison per ring, zero diagnostic change.

**No new rule options are introduced.** Fixes 1 and 2 are correctness fixes to the algorithm's
handling of standard MVT geometry — they are not configurable behaviors. The edge-tolerance option
described in the Phase 2 plan as conditional on Step 2 confirming near-boundary precision artifacts
is **not adopted**: Step 2 found that only 9.9% of intersections are within 10 units of a tile
boundary, and the two root causes (closed-LS closure skip, integer quantization spike) do not
require a tolerance parameter to resolve.

## Rationale

### Fix 1 — Closed LineString Closure Skip

The MVT spec (§4.3.2) does not prohibit closed LineStrings; they are commonly used for boundary
loops in the `boundary` layer across all three tested providers. OGC Simple Features §6.1.5
defines a closed LineString as one whose start equals its end — it is not inherently
self-intersecting. The existing closure skip for Polygons already encodes the correct principle:
the first and last segment of a closed ring are logically adjacent at the closure point and should
not be compared. Extending this to closed LineStrings is the direct symmetric application of the
same principle.

**False-negative verification (Step 2 data).** No true-positive ring is a closed LineString whose
only detectable intersection is at a non-closure segment pair. Every closed-LineString ring whose
sole flagged pair is `(0, segCount-1)` was confirmed to be a false positive. The 6 Cat C rings
that are closed LineStrings detected via the collinear branch were verified to have no alternative
intersecting pair — they are false positives from the same root cause, subsumed into Fix 1.

### Fix 2 — Duplicate Vertex Spike

The integer-grid quantization property of MVT (§4.3.2) is documented and expected. A ring that
revisits a vertex because two float coordinates rounded to the same integer is not the same as a
ring that genuinely self-intersects. OGC Simple Features §6.1.2.1 defines a simple curve as one
that does not pass through the same point twice — but this applies to the underlying geographic
feature, not to its integer-quantized tile representation. Applying the rule at the integer grid
level would mean flagging any complex boundary whose vertex count is high enough that grid
collisions are probable, regardless of geographic validity.

**False-negative verification (Step 2 data).** For every Cat A ring, the only detected
intersection is the pair meeting at the duplicate vertex. No Cat A ring has a second detectable
crossing elsewhere. Skipping pairs that share a known duplicate vertex therefore carries zero
false-negative risk.

**Alternative rejected: "flag all duplicate vertices as a separate rule."** This would be a
different diagnostic class (`tile/degenerate-geometry` or a new rule), not a fix to
`tile/self-intersection`. The correct fix here is to not treat a spike as a self-intersection;
whether spikes deserve their own diagnostic is a separate, future question.

### Fix 3 — Bounding-Box Pre-check (Performance Only)

On the full OpenMapTiles corpus, 99.97% of segment pairs (140,548,775 / 140,585,584) have
non-overlapping bounding boxes. This is expected: geographic features are spatially coherent, so
non-adjacent segments in a ring are almost always in different areas of the tile. The 4-comparison
BB test is cheaper than any of the 4+ cross-products in `segmentsIntersect()`, so the pre-check
reduces total computation by roughly two orders of magnitude on large rings.

This change does not alter any diagnostic output — it is a pure performance optimization. The
existing test suite must produce byte-identical results before and after.

**Sort-and-sweep (Bentley–Ottmann) not adopted.** The Phase 2 plan deferred this option unless
the BB pre-check alone cannot close the throughput gap. Given the 99.97% skip rate, the pre-check
reduces the effective cost of the O(N²) loop to near-O(N) in practice. Full sort-and-sweep would
add implementation complexity without material additional benefit on this corpus.

### Fix 4 — Minimum-Vertex Guard

Zero rings with fewer than 4 vertices appeared in the flagged corpus. The guard costs one
comparison per ring and prevents any future O(N²) entry on degenerate inputs. It mirrors the
existing minimum-vertex check in `findDegenerateGeometryIssues()`.

### On the 80% Threshold Gap

The Phase 2 plan set a ≥ 80% false-positive reduction threshold. The two correctness fixes
achieve **72.5% (449 / 619)**, leaving 170 true positives (Cat B1 genuine crossings) flagged.

The remaining 170 were reviewed individually. They are:
- 154 Polygon rings in the `countries` layer with genuine topological crossings (proper figure-8
  or bowtie shapes at the integer grid level)
- 16 non-closed LineString rings in the `boundary` layer with genuine crossings

These cannot be suppressed without either (a) introducing a tolerance that would also suppress
real self-intersections in other data, or (b) adding layer-based exclusions (`excludeLayers`-style)
for `countries` and `boundary` — which would disable the rule for the very layers where genuine
self-intersections most plausibly occur.

**Decision: accept 72.5% and acknowledge the threshold explicitly.** The two clean fixes — closure
skip extension and duplicate-vertex skip — are the maximum achievable reduction without
false-negative risk. The 170 remaining diagnostics are correctly flagged geometry problems. The
7.5-point gap to 80% is not a failure of the investigation; it is an accurate measurement of
the genuine-problem rate in these two production layers. Any approach that closes the remaining
gap would suppress real defects.

This is explicitly different from Phase 1's coordinate-range outcome (100% reduction), where
every diagnostic was an intentional implementation behavior. Here, 27.5% of diagnostics are
genuine problems. The threshold was set before knowing that proportion; now that it is known,
accepting 72.5% is the correct engineering decision.

## Consequences

### Benefits
- **False-positive reduction: 72.5% (449 / 619).** The dominant noise sources in the `boundary`
  layer (closed-LS closure skip) and `countries` layer (quantization spikes) are eliminated.
- **Zero false-negative increase.** Confirmed by exhaustive verification of every Cat A and B2
  ring in the Step 2 corpus: no true-positive ring is suppressed by either fix.
- **Runtime improvement (estimated ~2 orders of magnitude on large rings).** The bounding-box
  pre-check reduces the O(N²) segment-pair evaluations by ≈99.97% on the OpenMapTiles corpus.
  Progress toward the 10,000-tile / 60-second target will be measured in Step 5.
- **No new configuration surface.** No new rule options are added; the fix is entirely internal
  to the algorithm.

### Costs
- **Threshold not met.** The ≥ 80% acceptance criterion is not satisfied. This is documented
  explicitly and accepted with rationale above.
- **Duplicate-vertex pre-scan cost.** Fix 2 requires one pass over the ring's vertex list before
  the O(N²) loop to collect duplicates. This is O(N) and negligible against the O(N²) inner loop,
  but it is a new allocation per ring.

## Alternatives Considered

### Alternative 1: Edge-tolerance option (conditional in plan)
Add a configurable tolerance so that intersections within `t` units of a tile boundary are
suppressed. Step 2 showed that only 9.9% of all intersections are within 10 units of a boundary,
and the two root causes (closure skip, quantization spike) are not boundary-proximity phenomena
(median intersection distance = 583–634 units). A tolerance option would not materially improve
the false-positive rate and would introduce a new configuration surface requiring its own
evidence-based default. Rejected.

### Alternative 2: `excludeLayers` option (mirroring coordinate-range)
Suppress diagnostics for the `boundary` and/or `countries` layers. Rejected because these are
the layers where genuine self-intersections (Cat B1) are concentrated — disabling the rule there
would suppress the 170 true positives along with any future real defects in those layers.

### Alternative 3: Increase tolerance globally (reject all near-touching intersections)
Add a global pixel-distance tolerance below which any intersection is suppressed. Rejected for
the same reason as Phase 1's "buffer=4096" proposal: a tolerance large enough to suppress the
quantization spikes would also suppress real self-intersections in dense geometry.

### Alternative 4: Bentley–Ottmann sweep line
Replace O(N²) with O((N+k) log N). Given the BB pre-check reduces effective comparisons to ~O(N)
already, the implementation complexity of a full sweep is not justified at this time. Deferred
to a future phase if Step 5 shows the throughput target is still not met after these fixes.
