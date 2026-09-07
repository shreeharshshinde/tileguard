# Rule Investigation Journals

These directories contain the complete engineering record for each rule investigation phase. They are not how-to guides — they are a structured journal of hypothesis, evidence, implementation, and validation for specific rule false-positive and performance investigations.

Each phase follows the same cycle: **classify → investigate root cause → design fix → implement → re-evaluate**.

---

## How to read these

Each phase directory contains:
- A **summary** — start here for an overview of what was found and what changed
- An **implementation plan** — the pre-investigation scope and acceptance criteria
- A **root cause investigation** — the detailed diagnostic classification with evidence
- An **evaluation report** — before/after numbers proving the fix worked
- Supporting reports (rule selection, benchmark assessment, diagnostic classification)

---

## Phases

### [phase1/](./phase1/) — `tile/coordinate-range` false positives (v0.5.1)

Investigated the high false-positive rate on production tiles from OpenMapTiles, OpenFreeMap, and CARTO Streets. Found that 100% of flagged diagnostics were intentional artifacts of vector tile generation (clipping buffers and cross-tile label duplication). Introduced evidence-based defaults: `buffer: 80`, `excludeLayers: ["place", "water_name", "centroids"]`.

| File | Contents |
|:-----|:---------|
| [PHASE1_SUMMARY.md](./phase1/PHASE1_SUMMARY.md) | Full narrative of the investigation and outcomes |
| [BENCHMARK_ASSESSMENT.md](./phase1/BENCHMARK_ASSESSMENT.md) | Runtime benchmarks before and after |
| [DIAGNOSTIC_CLASSIFICATION.md](./phase1/DIAGNOSTIC_CLASSIFICATION.md) | Classification of all flagged diagnostics |
| [EVALUATION_REPORT_v0.5.1.md](./phase1/EVALUATION_REPORT_v0.5.1.md) | Final before/after evaluation — 148,268 → 0 false positives |

### [phase2/](./phase2/) — `tile/self-intersection` false positives & performance (v0.5.2)

Investigated the dominant remaining diagnostic category. Found that 72.54% of self-intersection diagnostics were false positives from two causes: missing closure skip on closed LineStrings, and integer grid quantization spikes. Implemented four algorithmic fixes. Retained all 170 genuine true-positive crossings.

| File | Contents |
|:-----|:---------|
| [PHASE2_SUMMARY.md](./phase2/PHASE2_SUMMARY.md) | Full narrative of the investigation and outcomes |
| [PHASE2_IMPLEMENTATION_PLAN.md](./phase2/PHASE2_IMPLEMENTATION_PLAN.md) | Pre-investigation scope, acceptance thresholds, and out-of-scope decisions |
| [RULE_SELECTION_REPORT.md](./phase2/RULE_SELECTION_REPORT.md) | Confirmation that `tile/self-intersection` was the correct sole focus |
| [ROOT_CAUSE_INVESTIGATION.md](./phase2/ROOT_CAUSE_INVESTIGATION.md) | Detailed root cause classification of all 619 flagged rings |
| [EVALUATION_REPORT_v0.5.2.md](./phase2/EVALUATION_REPORT_v0.5.2.md) | Final before/after evaluation — 619 → 170 (72.54% reduction) |
| [IMPLEMENTATION_REPORT_v0.5.2.md](./phase2/IMPLEMENTATION_REPORT_v0.5.2.md) | Implementation summary of the four algorithmic fixes |
