# Phase 2 Summary

## Overview

Phase 2 investigated the high rate of false positives and runtime bottleneck within the `tile/self-intersection` validation rule in TileGuard. Building on the evidence-driven cycle established in Phase 1, Phase 2 targeted the dominant remaining diagnostic category across the evaluated datasets (OpenMapTiles, OpenFreeMap, and CARTO Streets).

Rather than rewriting the validation loop or adopting a complex spatial indexing algorithm, the investigation focused on identifying the root causes of false positives at the coordinate level. The work was carried out in five sequential stages: target selection, root cause investigation, architectural design, implementation, and re-evaluation.

The investigation revealed that **72.54% of all self-intersection diagnostics** were false positives arising from two distinct sources:
1. **Missing closure skip on closed LineStrings:** Causing simple boundary loops to flag adjacent segments at the closure vertex.
2. **Integer grid quantization spikes:** Snapping adjacent coordinates during tile compilation to a single point, creating hairpins that standard simple geometry checks flag as crossings.

By implementing targeted algorithmic fixes (extrapolating closure skip to closed LineStrings and skipping duplicate vertex spikes) and adding bounding-box overlap pre-checks, Phase 2 successfully suppressed **449 false-positive diagnostics** while retaining all **170 true-positive crossings** with effectively **0 ms** of marginal runtime overhead.

---

## Process Flow and Outcomes

```text
619 diagnostics
        │
        ▼
Classification
        │
        ├── 161 Duplicate spikes ───────────► Fix 2 (quantization skip)
        ├── 288 Closed LineStrings ─────────► Fix 1 (closure skip)
        ├──   6 Collinear closure ──────────► Fix 1 (closure skip)
        └── 170 Genuine crossings ──────────► Retained (true positives)
                      │
                      ▼
             170 diagnostics remain
```

---

## Phase 2 Deliverables

```text
Phase 2
├── Step 1 – Rule Selection
│   ├── Purpose:
│   │   Confirm tile/self-intersection as the sole remaining diagnostic bottleneck
│   │   and rule out other geometry rules at zoom levels z0–z14.
│   ├── Primary Deliverable:
│   │   [RULE_SELECTION_REPORT.md](./RULE_SELECTION_REPORT.md)
│   └── Outcome:
│       Self-intersection confirmed as 100% of the active diagnostic corpus.
│
├── Step 2 – Root Cause Investigation
│   ├── Purpose:
│   │   Extract all 619 flagged rings, classify them against OGC Simple Features
│   │   validity specs, and map them to compilation/clipping behaviors.
│   ├── Primary Deliverable:
│   │   [ROOT_CAUSE_INVESTIGATION.md](./ROOT_CAUSE_INVESTIGATION.md)
│   └── Outcome:
│       Identified missing closure skip and quantization spikes as the root
│       causes of 72.54% false positives.
│
├── Step 3 – Solution Design (ADR-007)
│   ├── Purpose:
│   │   Design the targeted correctness fixes and bounding-box pre-checks
│   │   while maintaining backward compatibility.
│   ├── Primary Deliverable:
│   │   [007-self-intersection-hardening.md](../../architecture/adr/007-self-intersection-hardening.md)
│   └── Outcome:
│       Approved symmetric LineString closure, duplicate vertex skips, and
│       axis-aligned bounding box short-circuiting.
│
├── Step 4 – Implementation
│   ├── Purpose:
│   │   Implement the four correctness and performance guards and write
│   │   comprehensive regression/false-negative tests.
│   ├── Primary Deliverable:
│   │   [IMPLEMENTATION_REPORT_v0.5.2.md](./IMPLEMENTATION_REPORT_v0.5.2.md)
│   └── Outcome:
│       Code added to geometry.ts; all 81 tests passing with 100% coverage.
│
└── Step 5 – Re-Evaluation & Benchmarking
    ├── Purpose:
    │   Evaluate diagnostic counts, rule-cost overheads, and measure progress
    │   toward the <60s/10,000-tile project target.
    ├── Primary Deliverable:
    │   [EVALUATION_REPORT_v0.5.2.md](./EVALUATION_REPORT_v0.5.2.md)
    └── Outcome:
        Confirmed 72.54% false-positive reduction, effectively 0 ms marginal
        overhead, and met <60s/10k target on CARTO Streets (53.4s).
```

---

## Key Outcomes

1. **Evidentiary Rationale for the Reduction Target:** The initial target of $\ge 80\%$ false-positive reduction was not met because 27.46% of the diagnostics were verified as genuine data quality issues in the source tiles. Staging the 72.54% reduction ensures that TileGuard remains a strict validator that does not suppress real defects.
2. **Relocation of Performance Bottlenecks:** The bounding-box pre-checks skip 99.97% of segment-pair evaluations. Consequently, self-intersection is no longer a performance bottleneck for TileGuard. Future optimization phases will focus on tile decompression and parsing.
