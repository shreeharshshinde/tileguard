# Phase 1 Summary

## Overview

Phase 1 investigated the high false-positive rate of the `tile/coordinate-range` rule in TileGuard through a systematic, evidence-driven engineering workflow. Initial evaluation of production vector tiles from OpenMapTiles, OpenFreeMap, and CARTO Streets revealed that the rule generated a large number of diagnostics on valid datasets. Before modifying the rule, the investigation followed a structured validation process to determine whether these diagnostics originated from implementation defects, decoder inconsistencies, or intentional characteristics of vector tile generation.

Rather than immediately changing rule behavior, the work proceeded through four sequential phases of investigation, implementation, and validation. Each phase produced reproducible artifacts, supporting documentation, and quantitative evidence that informed the subsequent stage. This approach ensured that every implementation decision was directly supported by empirical observations instead of assumptions.

The completed investigation demonstrated that the overwhelming majority of reported coordinate-range violations were not genuine geometry errors, but expected artifacts of modern vector tile production workflows. Specifically, diagnostics originated from two intentional implementation strategies: (1) geometry clipping buffers extending beyond nominal tile extents, and (2) cross-tile label duplication for point-based labeling layers. These findings motivated the introduction of evidence-based default configuration values while preserving full configurability for users with different tile schemas.

The final implementation introduces a default clipping buffer of 80 coordinate units together with default layer exclusions for place, water_name, and centroids, while retaining user-configurable `buffer` and `excludeLayers` options. Comprehensive regression tests, synthetic validation fixtures, documentation updates, architectural decision records, and real-world benchmark results verify the correctness of the implementation and its impact on production datasets.

Phase 1 concludes with a fully validated implementation supported by empirical evidence, quantitative benchmarking, and complete engineering documentation. The methodology established during this investigation also provides a reusable framework for evaluating future TileGuard rules using the same cycle of hypothesis formation, validation, implementation, and re-evaluation.

## Objectives

Phase 1 pursued the following objectives:

* Determine whether `tile/coordinate-range` diagnostics represented genuine geometry corruption or intentional characteristics of production vector tiles.
* Validate the TileGuard decoder against the Mapbox Vector Tile reference implementation to eliminate decoder inconsistencies as a source of error.
* Classify all observed diagnostics using real-world production datasets and identify their underlying causes.
* Design and implement evidence-based default configuration values that significantly reduce false positives while preserving detection of genuine coordinate corruption.
* Verify the implementation through comprehensive unit testing, synthetic validation fixtures, and large-scale re-evaluation against the classified production corpus.
* Quantify implementation correctness, runtime characteristics, and remaining limitations through repeatable benchmarking.

---

## Phase 1 Deliverables

```text
Phase 1
├── Step 1 – Decoder Validation
│   ├── Purpose:
│   │   Verify decoder correctness against the Mapbox Vector Tile reference
│   │   implementation and eliminate decoder defects as a possible cause of
│   │   coordinate-range diagnostics.
│   ├── Primary Artifact:
│   │   [scripts/decoder-crosscheck.mjs](../../scripts/decoder-crosscheck.mjs)
│   └── Outcome:
│       Decoder parity confirmed; decoder-related hypotheses rejected.
│
├── Step 2 – Diagnostic Classification
│   ├── Purpose:
│   │   Classify every observed coordinate-range diagnostic using production
│   │   datasets from OpenMapTiles, OpenFreeMap, and CARTO Streets.
│   ├── Primary Artifact:
│   │   [DIAGNOSTIC_CLASSIFICATION.md](./DIAGNOSTIC_CLASSIFICATION.md)
│   └── Outcome:
│       Identified geometry clipping and label duplication as intentional
│       implementation behavior rather than data corruption.
│
├── Step 3 – Implementation
│   ├── Purpose:
│   │   Implement evidence-based default configuration values derived from
│   │   the classification results.
│   ├── Primary Artifact:
│   │   [coordinate-range.ts](../../packages/tile-rules/src/rules/coordinate-range.ts)
│   ├── Supporting Artifacts:
│   │   • Unit tests: [coordinate-range.test.ts](../../packages/tile-rules/tests/rules/coordinate-range.test.ts)
│   │   • Synthetic validation fixtures: [fixtures/synthetic/](../../fixtures/synthetic/)
│   │   • Rule documentation: [coordinate-range.md](../rules/tile/coordinate-range.md)
│   │   • CLI configuration updates: [tileguard.config.ts](../../packages/cli/tileguard.config.ts)
│   └── Outcome:
│       Introduced default buffer (80) and default excluded layers
│       (place, water_name, centroids) while preserving full configurability.
│
├── Step 4 – Real-World Re-Evaluation & Benchmarking
│   ├── Purpose:
│   │   Verify implementation correctness using the classified production
│   │   corpus and evaluate runtime performance.
│   ├── Primary Artifact:
│   │   [EVALUATION_REPORT_v0.5.1.md](./EVALUATION_REPORT_v0.5.1.md)
│   └── Outcome:
│       Confirmed complete suppression of previously classified false
│       positives across the evaluated datasets together with acceptable
│       runtime overhead.
│
└── ADR-006 – Data-Driven Defaults for tile/coordinate-range
    ├── Purpose:
    │   Record the architectural rationale supporting the final default
    │   configuration.
    └── Outcome:
        Documents the engineering decisions, supporting evidence, trade-offs,
        and final implementation adopted by TileGuard:
        [006-coordinate-range-defaults.md](../architecture/adr/006-coordinate-range-defaults.md)
```

This repository structure reflects the complete engineering workflow, from problem identification through implementation and empirical validation, and provides the supporting evidence for the finalized `tile/coordinate-range` rule improvements.

---

## Phase 1 Outcomes

Phase 1 established a complete engineering workflow for investigating validation-rule behavior using empirical evidence. Through decoder verification, large-scale diagnostic classification, evidence-based implementation, and independent re-evaluation, the project transformed `tile/coordinate-range` from a rule that produced substantial false-positive noise on production datasets into one with significantly improved default behavior while preserving configurability for alternative vector tile implementations. 

All implementation decisions are traceable to quantitative evidence collected during the investigation, and every change is supported by corresponding tests, documentation, benchmark results, and architectural records. This provides a complete and reproducible engineering history for future contributors, maintainers, reviewers, and thesis examiners, while serving as the foundation for subsequent phases of TileGuard research and development.
