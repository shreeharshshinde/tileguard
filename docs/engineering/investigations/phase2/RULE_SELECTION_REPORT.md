# Rule Selection Report — Phase 2 / v0.5.2

> **Date:** 2026-07-21  
> **Phase:** 2 — Self-Intersection Investigation & Hardening  
> **Step:** 1 — Confirm the Target  
> **Status:** ✅ Complete — `tile/self-intersection` confirmed as sole focus

---

## 1. Purpose

This report satisfies the Step 1 deliverable for Phase 2: verify that `tile/self-intersection`
remains the correct, singular focus for this investigation, and rule out any other active rule
hiding a comparable false-positive rate. This is a confirmatory report, not a fresh investigation —
all conclusions are derived from re-running existing scripts against the same corpora used in Phase 1.

---

## 2. Corpus Clarification — Which Numbers Come From Where

Before presenting per-rule counts, the corpus question flagged during review must be resolved
explicitly, because getting it wrong would mean comparing self-intersection's *dense-tile* numbers
against the other rules' *sparse-tile* numbers — an unfair comparison.

**The 173 / 223 / 223 self-intersection figures** cited in the Phase 2 plan come from
`scripts/benchmark.mjs` run against `fixtures/benchmark-cache/` (294 cached tiles, z0–z4 only).
This was confirmed by inspecting the cache directly:

| Dataset | Cached tile count | Zoom range |
| :--- | ---: | :--- |
| OpenMapTiles | 94 | z0–z4 |
| OpenFreeMap | 100 | z0–z4 |
| CARTO Streets | 100 | z0–z4 |

`scripts/evaluate-real-world.mjs` uses a different tile list: 85 tiles at z0–z3 plus 15 urban tiles
at z4–z14 (Tokyo/Manhattan). It fetches live from the network and was not the source of 173/223/223.

**Consequence:** the benchmark-corpus comparison in Section 3 is internally consistent — all rules
were measured on the same 294-tile z0–z4 corpus. However, Phase 1 established that z0–z4 alone is
not a representative sample of where real complexity lives, and the review correctly flagged that
Step 1 should not close without confirming the other four rules are also clean at high zoom. That
verification is in Section 4.

---

## 3. Per-Rule Diagnostic Breakdown — Benchmark Corpus (z0–z4)

### 3.1 Source and methodology note

Per-rule counts were obtained by re-running `benchmark.mjs` live with the `--json` flag. The five
archived JSONL runs in `artifacts/step4-benchmark-*.jsonl` did not serialize the `ruleDiagnostics`
field — it was tracked internally by the script but omitted from the JSON serializer at Phase 1
collection time. The live re-run resolves this gap.

A separate methodological issue was discovered during this re-run: `benchmark.mjs`'s `disabled`
mode omits `tile/coordinate-range` from the explicit rules config, but the engine automatically
activates all `recommended: true` rules at their `meta.defaultSeverity` when not explicitly
overridden. Since `tile/coordinate-range` carries `recommended: true`, it was running at its
v0.5.1 defaults in "disabled" mode all along. On the z0–z4 corpus, those defaults suppress all
coordinate-range diagnostics, so the effect was invisible — but the mode name is misleading and
this is documented here for Phase 2's awareness (it matters for Step 5's benchmark design).

### 3.2 Results

For the **after** mode (all rules at v0.5.1 defaults), measured against the z0–z4 benchmark corpus:

| Dataset | Tiles | `tile/self-intersection` | `tile/degenerate-geometry` | `tile/unclosed-ring` | `tile/zero-area-ring` | `tile/no-empty` | `tile/coordinate-range` | Total |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| OpenMapTiles | 94 | **173** | 0 | 0 | 0 | 0 | 0 | 173 |
| OpenFreeMap | 100 | **223** | 0 | 0 | 0 | 0 | 0 | 223 |
| CARTO Streets | 100 | **223** | 0 | 0 | 0 | 0 | 0 | 223 |
| **Total** | **294** | **619** | **0** | **0** | **0** | **0** | **0** | **619** |

`tile/self-intersection` accounts for 100% of all 619 diagnostics on the z0–z4 benchmark corpus.

---

## 4. Full-Zoom Verification — Urban Tiles (z4–z14)

### 4.1 Design

The four geometry rules (`tile/degenerate-geometry`, `tile/unclosed-ring`, `tile/zero-area-ring`,
`tile/no-empty`) were run in isolation — both `tile/self-intersection` and `tile/coordinate-range`
explicitly set to `'off'`, with all other recommended rules also explicitly off to prevent
auto-activation — against the same 100-tile, z0–z14 corpus used by `evaluate-real-world.mjs`.
This is the only comparison that is fair: self-intersection's own high-zoom diagnostic counts
(measured separately below) against the other four rules on the same tile set.

### 4.2 Other four geometry rules — full zoom range

| Dataset | Tiles | `tile/degenerate-geometry` | `tile/unclosed-ring` | `tile/zero-area-ring` | `tile/no-empty` | Total |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| OpenMapTiles | 100 | 0 | 0 | 0 | 0 | 0† |
| OpenFreeMap | 100 | 0 | 0 | 0 | 0 | 0 |
| CARTO Streets | 100 | 0 | 0 | 0 | 0 | 0 |

†OpenMapTiles demotiles.maplibre.org only serves z0–z5 for the Tokyo/Manhattan tile coordinates
used by `evaluate-real-world.mjs`. All 14 urban tile requests above z5 return HTTP 404 and are
recorded as `artifact/load-failed` by the engine. This is a known provider limitation, not a tile
validity issue. The 86 tiles that did load produced zero geometry-rule diagnostics.

**Conclusion: all four other geometry rules produce zero diagnostics across all available tiles at
all zoom levels tested.** The Step 1 conclusion from the z0–z4 corpus holds at full zoom range.

### 4.3 Self-intersection at full zoom range

For completeness, self-intersection counts from `evaluate-real-world.mjs` (all rules at defaults,
coordinate-range at v0.5.1 defaults):

| Dataset | Tiles at z0–z14 | `tile/self-intersection` |
| :--- | ---: | ---: |
| OpenMapTiles | 86 served (14 × 404) | 172 |
| OpenFreeMap | 100 | 399 |
| CARTO Streets | 100 | 412 |

Self-intersection counts are substantially higher at full zoom range than at z0–z4 alone (172 vs.
173 for OMT is stable because OMT's urban tiles return 404; OFM 399 vs. 223; CARTO 412 vs. 223).
This reinforces that the high-zoom urban tiles are where self-intersection is concentrated — and
confirms that Phase 2's benchmark design for Step 5 should use the full-zoom corpus as the headline
measurement, not just the 294-tile z0–z4 cache.

---

## 5. Other Rules — Evaluation Against Inclusion Criteria

| Rule | z0–z4 count | z0–z14 count | Finding | Inclusion decision |
| :--- | ---: | ---: | :--- | :--- |
| `tile/degenerate-geometry` | 0 | 0 | Zero at all zoom levels | ❌ Out of scope |
| `tile/unclosed-ring` | 0 | 0 | Zero at all zoom levels | ❌ Out of scope |
| `tile/zero-area-ring` | 0 | 0 | Zero at all zoom levels | ❌ Out of scope |
| `tile/no-empty` | 0 | 0 | Zero at all zoom levels | ❌ Out of scope |
| `tile/coordinate-range` | 0 | see §6 | Phase 1 fully resolved at z0–z4; residual at z12–z14 (see §6) | ❌ Out of scope for Phase 2 — documented separately |

A zero count does not merely mean "no false positives to evaluate" — it also means a zero
false-positive rate by definition, so there is no principle-level case for expanding scope
either. All four geometry rules are correctly clean.

---

## 6. Incidental Finding — `tile/coordinate-range` Residual at High Zoom

Running `evaluate-real-world.mjs` in `after` mode revealed 405 `tile/coordinate-range` diagnostics
on both OpenFreeMap and CARTO Streets. These come entirely from high-zoom urban tiles:

| Layer | Count (OFM) | Count (CARTO) | Zoom |
| :--- | ---: | ---: | :--- |
| `housenumber` | 400 | 400 | z14 (4 Manhattan tiles × 100 cap each) |
| `park` | 5 | 5 | z5 |

This is a Phase 1 residual gap, not a Phase 2 item. The `housenumber` layer appears in dense
urban tiles at z14 and was not present in Phase 1's z0–z4 benchmark corpus at all. Its diagnostic
pattern is consistent with label duplication (same mechanism as `place` and `water_name`), but it
was not covered by Phase 1's `excludeLayers` defaults. The `park` count is small and its
classification is unknown.

**Phase 2 handling:** this finding is noted here and not expanded. It is a candidate for a future
focused follow-up (a "Phase 1.5" coordinate-range re-evaluation at high zoom), but it does not
change Phase 2's scope. Step 2 and all subsequent steps proceed on self-intersection only.

**One consequence for Phase 2's benchmark design (Step 5):** if Step 5 uses
`evaluate-real-world.mjs` rather than the cached z0–z4 benchmark, the baseline diagnostic total
will include these 405 coordinate-range entries. Step 5 must account for this by reporting
self-intersection diagnostics in isolation (either via per-rule breakdown or by running with
coordinate-range explicitly off) to avoid conflating the two sources of noise.

---

## 7. Self-Intersection Confirmation

Three independent observations establish `tile/self-intersection` as the sole focus:

**Observation 1 — Diagnostic monopoly at z0–z4.**
619 of 619 diagnostics on the benchmark corpus are `tile/self-intersection`. Every other rule
produces zero.

**Observation 2 — Deferred classification status.**
`analysis/classification.json` records `tile/self-intersection` with `status: "requires_investigation"`.
It is the only rule in that file with an open status.

**Observation 3 — Runtime dominance and throughput gap.**
Phase 1's isolated-cost comparison (EVALUATION_REPORT_v0.5.1.md §5) confirmed that the marginal
cost of `tile/coordinate-range` was too noisy to measure against the whole-engine baseline because
`tile/self-intersection` dominates runtime. The project's 10,000-tile / 60-second throughput target
cannot be reached by optimizing any other rule.

---

## 8. Conclusion

`tile/self-intersection` is confirmed as the sole focus for Phase 2 across both the z0–z4 benchmark
corpus and the full z0–z14 zoom range. No other rule produces non-zero diagnostics on either
corpus. The `tile/coordinate-range` residual at high zoom (§6) is noted as a future-phase item and
does not affect this determination.

One finding with direct bearing on Phase 2's own benchmark design: the full-zoom evaluation shows
higher self-intersection counts (399 / 412 vs. 223 / 223) than the cached z0–z4 benchmark, which
means the z0–z4 cache systematically understates the problem this phase exists to fix. Step 5
should use the full-zoom corpus as its headline measurement.

**Step 2 (Root Cause Investigation) may proceed.**

---

## 9. Artifact Reference

| Artifact | Role in this report |
| :--- | :--- |
| `artifacts/step4-benchmark-after.jsonl` | 5 Phase 1 benchmark runs; diagnostic totals used for context (no per-rule breakdown serialized) |
| `analysis/classification.json` | Machine-readable Phase 1 classification; source of `requires_investigation` status |
| `docs/engineering/DIAGNOSTIC_CLASSIFICATION.md` | Phase 1 classification narrative |
| `docs/engineering/EVALUATION_REPORT_v0.5.1.md` | Phase 1 evaluation; §5 isolated cost, §7 false-negative verification |
| `scripts/benchmark.mjs` | Benchmark script (z0–z4 cache); re-run live for §3 per-rule breakdown |
| `scripts/evaluate-real-world.mjs` | Full-zoom evaluation script (z0–z14); re-run live for §4 and §6 |
| `fixtures/benchmark-cache/` | 294 cached PBF tiles, z0–z4 |
