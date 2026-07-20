# Phase 2 — Self-Intersection Investigation & Hardening
## Complete Implementation Plan for v0.5.2

Building on the exact methodology validated in Phase 1, with the guardrails Phase 1 was missing until its closeout — acceptance thresholds and an explicit scope boundary defined *before* investigation begins, not discovered as a gap afterward.

---

## 0. Current State — What We Already Know

Self-intersection is not a candidate to be discovered — it is the confirmed, dominant remaining diagnostic category, established across every benchmark run in Phase 1:

| Dataset | Self-intersection diagnostics (post-coordinate-range-fix) |
|---|---:|
| OpenMapTiles | 173 |
| OpenFreeMap | 223 |
| CARTO Streets | 223 |

Phase 1's isolated-cost comparison also confirmed self-intersection dominates whole-engine runtime, to the point that coordinate-range's own marginal cost was too noisy to measure cleanly against it. Phase 1's Step 2 classification explicitly deferred this category with status `requires_investigation` — it has never been classified against a specification or reference implementation the way coordinate-range was.

Two Phase 1 deliverables carry forward directly into this phase:
- The minimum-vertex guard (rings under 4 points skipped entirely) — implement this first, since it requires no new evidence to justify.
- The unresolved <60-second/10,000-tile throughput target from the project's original success criteria, still unmet, and self-intersection is the confirmed reason why.

---

## 1. Out of Scope — Decided Before Step 2 Begins

Explicitly excluded from Phase 2, so the investigation has a natural stopping point:

- A full sort-and-sweep (Bentley–Ottmann) rewrite — only pursued if the bounding-box pre-check alone cannot close the throughput gap.
- Spatial indexing (R-tree, quadtree, or similar) across tiles or across a full render/CI run — this is architecture-level work belonging to a later phase, not a rule-level fix.
- Any change to `tile/unclosed-ring` or `tile/zero-area-ring` beyond what naturally falls out of the vertex guard — those rules are not part of this investigation.
- Render regression testing, PMTiles/MBTiles providers, SARIF reporter, Python SDK — carried forward unchanged from Phase 1's own out-of-scope list.
- GitHub Annotations reporter and governance docs — these remain the actual "FOSS4G readiness" work, explicitly parked until Phase 2 closes.

---

## 2. Acceptance Thresholds — Defined Before Step 2 Begins

| Metric | Threshold | Rationale |
|---|---:|---|
| False-positive reduction (self-intersection) | ≥ 80% | Same evidentiary bar Phase 1 held itself to |
| False-negative increase | 0 | A genuinely self-intersecting ring must never be missed — the same non-negotiable constraint that governed coordinate-range's `excludeLayers` design |
| Whole-corpus throughput, 10,000 tiles | < 60 seconds | The original, still-unmet project success criterion from the roadmap; this is the headline metric this phase exists to move |
| Existing test suite | 100% pass | No regressions |
| Vertex-guard correctness | 0 divergence — every ring under 4 points produces the identical result (no diagnostic) as before, with measurably lower cost | Confirms the "free win" is actually free |

---

## Step 1 — Confirm the Target (not rediscover it)

**Objective:** Verify self-intersection remains the correct, singular focus, and rule out any other rule hiding a comparable false-positive rate underneath it.

### Activities:
* Pull self-intersection's diagnostic counts directly from Phase 1's `analysis/` artifacts and the v0.5.1 evaluation report — no new data collection needed for this part.
* Run one afternoon-scale check: re-tabulate the per-rule diagnostic breakdown already captured in the benchmark's `ruleDiagnostics` output (this data already exists in your JSONL benchmark outputs from Phase 1) and confirm no other active rule (`tile/degenerate-geometry`, `tile/unclosed-ring`, `tile/zero-area-ring`, `tile/no-empty`) shows a comparable or unexpected count.
* If any other rule does show something worth a second look, note it explicitly as a candidate for a future phase — do not expand this phase's scope to cover it.

**Expected outcome:** A short, confirmatory report — not a fresh investigation. You should spend roughly half a day here, and the expected finding is "self-intersection confirmed as sole focus, nothing else warrants inclusion in this phase."

**Deliverable:** `RULE_SELECTION_REPORT.md` — 1–2 pages, referencing existing Phase 1 artifacts rather than regenerating data.

---

## Step 2 — Root Cause Investigation

**Objective:** Determine whether self-intersection diagnostics represent genuine invalid geometry, floating-point precision artifacts at tile-clipping boundaries, or geometrically valid-but-complex shapes (e.g., figure-eight administrative boundaries) that a naive intersection test incorrectly flags.

### Activities — with the shape-based addition this rule specifically requires:
* Extract every self-intersecting ring from the cached 294-tile corpus (173 + 223 + 223 = 619 total flagged rings) into a structured artifact, the same way `offset-distribution.mjs` did for coordinate-range.
* For each flagged ring, capture: the layer it belongs to, its vertex count, the exact coordinates of the intersecting segment pair, and the *distance* between the intersection point and the nearest tile boundary (0–4096 edge) — this directly tests the "quantization near tile edges" hypothesis from Phase 1's original deferral note.
* **Visually or manually inspect a representative sample of the actual ring shapes**, not just their numeric properties — plot a handful of flagged polygons and look at them. Self-intersection false positives are much more likely to cluster around a small number of distinct *shapes of problem* (e.g., a "bowtie" near a clipped edge, a duplicate-vertex artifact from clipping, a legitimate complex multi-lobed boundary) than a single clean numeric distribution the way coordinate-range's offsets were.
* Cross-reference against **OGC Simple Features geometry validity rules** specifically — this is the directly relevant specification for self-intersection (a fundamentally geometry-validity concept), distinct from MVT's own spec which governed coordinate-range.
* Cross-reference against tile-clipping documentation from the same three compilers (Planetiler, OpenMapTiles, CARTO) to check whether their clipping algorithms have documented, known edge-case behaviors around shared/duplicate vertices at tile boundaries.
* Form and test hypotheses explicitly, the same way Hypotheses A/B/C worked for coordinate-range — likely candidates: (1) legitimate complex boundaries incorrectly flagged by a naive test that doesn't distinguish "touches at a single point" from "crosses," (2) floating-point/integer-snapping artifacts producing near-zero-length segments at clip boundaries that register as spurious intersections, (3) genuine data corruption.

**Expected outcome:** Unlike coordinate-range, do not expect a single clean bimodal histogram. Expect 2–4 distinct qualitative categories, each requiring its own targeted evidence and its own targeted fix (which may differ from category to category — a tolerance-based fix for near-boundary artifacts, and simply accepting genuinely complex-but-valid boundaries as correctly out-of-scope for a simple naive check).

**Deliverable:** `ROOT_CAUSE_INVESTIGATION.md`, including representative plotted/described examples of each identified shape category, frequency table per category, and cited evidence (OGC rule reference, or specific compiler documentation) for each classification.

---

## Step 3 — Solution Design

**Objective:** Design a fix constrained explicitly by Step 1's out-of-scope boundary — evaluate only the bounding-box pre-check and, if Step 2's root cause supports it, an edge-tolerance option. Do not evaluate sort-and-sweep or spatial indexing at this stage; if Step 2's findings show the bounding-box fix alone cannot plausibly close the throughput gap, that finding itself becomes the trigger to formally propose expanding scope in a follow-up ADR, rather than silently expanding mid-phase.

### Activities:
* Evaluate the bounding-box pre-check (skip segment-pair comparisons whose axis-aligned bounding boxes don't overlap) purely as a performance optimization — this doesn't change *which* rings get flagged, only how fast the check runs, so it's evaluated on performance merits alone, separately from any false-positive fix.
* Evaluate an edge-tolerance option **only if** Step 2 confirms a specific, quantifiable pattern of near-boundary precision artifacts (mirroring how coordinate-range's `excludeLayers` was only justified once the label-duplication pattern was confirmed with real evidence, not assumed).
* Explicitly write out the same "alternatives considered and rejected" reasoning Phase 1 used — in particular, pre-emptively evaluate and likely reject "just increase the intersection tolerance globally" the same way "buffer=4096" was rejected for coordinate-range, if it would blind the rule to genuine self-intersections.
* Assess backward compatibility: does either change alter results for any currently-passing ring? The vertex guard already answers this for trivial rings; this step only needs to cover the bounding-box and (conditional) tolerance changes.

**Deliverable:** `docs/adr/ADR-007-self-intersection-hardening.md`, following the exact same structure as ADR-006 (Context, Decision, Rationale, Consequences, Alternatives Considered), plus a short design document if the edge-tolerance option is adopted (given it would need its own options schema addition to the rule, similar to how `excludeLayers` was added).

---

## Step 4 — Implementation

**Objective:** Implement whatever Step 3 approved — at minimum the vertex guard (already justified, no new evidence needed) and the bounding-box pre-check; the edge-tolerance option only if Step 2/3 justified it.

### Activities, in dependency order:
1. **Vertex guard** — implement and test first, independent of everything else in this phase.
2. **Bounding-box pre-check** — implement as a pure performance change; the existing self-intersection test suite must produce byte-identical pass/fail results before and after, since this must never change *which* rings get flagged, only how fast the check runs.
3. **Edge-tolerance option (conditional)** — new options field on the rule, new schema entry if one exists, new default value justified by Step 2's evidence, exactly mirroring how `excludeLayers` was added to `coordinate-range`.
4. **Regression fixtures:** at minimum, one fixture per distinct shape category identified in Step 2, plus a fixture proving a genuinely self-intersecting ring is still caught after all changes (the false-negative guard, same discipline as the `poi`-layer fixture from coordinate-range).
5. **Documentation Updates:** Update `docs/rules/tile/self-intersection.md` with the same rigor applied to `coordinate-range.md` — corrected diagnostic format if needed, full options table, Defaults & Rationale section citing ADR-007.

**Deliverable:** `IMPLEMENTATION_REPORT_v0.5.2.md`, listing every file changed, every test added, and explicit confirmation that the vertex guard and bounding-box pre-check produce identical diagnostic output to the pre-change baseline on the full existing test suite.

---

## Step 5 — Re-Evaluation

**Objective:** Produce the same rigor of before/after comparison Phase 1 delivered for coordinate-range, with the throughput target as the headline metric this time, not a secondary one.

### Activities:
* Re-run the 5-independent-process, mean/median/σ benchmark methodology from Phase 1, in all three modes (`legacy`, `after`, `disabled`), against the same cached 294-tile corpus.
* **Specifically measure and report progress toward the <60-second/10,000-tile target** — extrapolate from the 100-tile sample's measured throughput, and state plainly whether the vertex guard + bounding-box fix together are sufficient to plausibly hit that target, or whether it remains out of reach and requires the sort-and-sweep work explicitly deferred in Step 1.
* Re-run the false-positive classification against Step 2's categories and report the actual reduction percentage per category.
* Confirm zero false-negative regression via the dedicated fixtures from Step 4.
* Explicitly close out whichever of Step 2's identified categories remain unaddressed (e.g., "legitimate complex boundaries" may be correctly left as non-diagnostics requiring no fix at all — the classification itself, not a code change, may be the resolution for that category).

**Deliverable:** `EVALUATION_REPORT_v0.5.2.md`, structured identically to v0.5.1's report — before/after table, statistical benchmark results, isolated cost comparison, classification recap, false-negative verification, methodology, threats to validity — plus one new, explicit section: **"Progress Toward the 10,000-Tile/60-Second Target,"** stating the honest current extrapolated number and whether this phase closed the gap, narrowed it, or determined it requires further work.

---

## Definition of Done for Phase 2 / v0.5.2

Written now, before Step 2 begins, exactly as Phase 1's closeout revealed should have happened from the start:

1. Self-intersection confirmed as sole focus, with the "no other rule hiding a comparable rate" check documented.
2. Root cause investigation complete, with every diagnostic category cited against OGC Simple Features rules or specific compiler documentation — no category left as "requires further investigation" without an explicit, stated reason.
3. ADR-007 written and accepted, following ADR-006's structure exactly.
4. Vertex guard and bounding-box pre-check implemented, tested, and confirmed to produce identical diagnostic output to baseline (except for the trivial rings the vertex guard correctly newly skips).
5. False-positive reduction quantified and meets ≥80%, per category.
6. Zero false-negative increase, confirmed via dedicated regression fixtures.
7. Progress toward the <60s/10,000-tile target explicitly measured and reported, even if the honest answer is "not yet achieved, here's the remaining gap and what would close it."
8. `EVALUATION_REPORT_v0.5.2.md` and `ADR-007` committed together in the same release, tagged `v0.5.2`.
