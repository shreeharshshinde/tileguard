# ADR-010: Extract Shared Analysis Engine

**Status:** Accepted  
**Date:** 2026-08-02  
**Deciders:** @shreeharsh-shinde  

---

## Context

Milestone 7 introduced three analysis capabilities in sequence:

1. **Step 1** — Comparison Engine (feature matching, geometry/property diffing, layer comparison)
2. **Step 2** — Regression Investigation Engine (confidence scoring, evidence building, candidate ranking)
3. **Step 3** — Report Engine (Markdown/HTML/JSON generation from analysis results)

These engines were initially implemented inside `@tileguard/inspector`, the browser-based visual debugging environment. When Step 4 required CLI access to the same capabilities, the Inspector package could not be imported: it is private, uses Vite for bundling, and carries React/DOM dependencies incompatible with a Node.js CLI context.

The initial CLI implementation duplicated the comparison and regression algorithms in a standalone `AnalysisAdapter`. This worked but violated a core architectural principle: **single authoritative implementation of every analysis algorithm**. The duplicated code used different matching heuristics, different confidence weights, and different modification detection, meaning the Inspector and CLI could produce divergent results for the same tile pair.

An architectural audit before freezing Milestone 7 identified this duplication as the single remaining structural deficiency.

The architecture before this decision:

```
Inspector owns algorithms
        ↓
CLI duplicates algorithms
```

The architecture after:

```
Algorithms (shared)
        ↓
Inspector, CLI, future integrations
```

This is a fundamental inversion. Analysis algorithms are no longer an implementation detail of the Inspector — they are a shared foundation that multiple consumers build upon.

---

## Decision Drivers

- Single authoritative implementation of all analysis algorithms
- Deterministic parity between Inspector and CLI outputs
- Framework independence (zero React/DOM/browser dependencies)
- Long-term plugin and integration support
- Independent testability of analysis logic
- Clear, enforceable package boundaries
- Minimal dependency surface

---

## Decision

Introduce `@tileguard/analysis` as a new package that owns all comparison and regression algorithms. Both the Inspector and CLI consume this package as their single source of truth.

### What moved into `@tileguard/analysis`

| Module | Responsibility |
|--------|---------------|
| `models/comparison.ts` | TileSnapshot, FeatureSnapshot, TileComparison, all diff types |
| `models/regression.ts` | RegressionAnalysis, RegressionCandidate, ConfidenceWeights, constants |
| `models/statistics.ts` | TileStatistics, LayerStatistics |
| `FeatureMatcher.ts` | Multi-priority feature matching (ID → stable-prop → geometry → property) |
| `GeometryDiffer.ts` | Coordinate-level geometry comparison |
| `PropertyDiffer.ts` | Property set comparison |
| `ComparisonEngine.ts` | Full comparison pipeline orchestration |
| `RegressionEngine.ts` | Candidate identification and ranking |
| `ConfidenceScorer.ts` | Weighted confidence scoring |
| `EvidenceBuilder.ts` | Structured evidence generation |
| `SnapshotFactory.ts` | TileSnapshot creation from raw layer/feature data |

### What stayed in each consumer

**Inspector (`@tileguard/inspector`)**
- `ComparisonService.createSnapshot(store)` — extracts TileSnapshot from InspectorStore (requires store access)
- `ComparisonService.compare()` — delegates to `@tileguard/analysis` ComparisonEngine
- All `comparison/` and `analysis/` files become thin re-exports for backward compatibility

**CLI (`@tileguard/cli`)**
- `AnalysisAdapter.loadTileSnapshot()` — reads .pbf, decodes via tile-rules, creates snapshot via SnapshotFactory
- `AnalysisAdapter.compareTiles()` — delegates to ComparisonEngine
- `AnalysisAdapter.analyzeRegression()` — delegates to RegressionEngine
- Adapts results into `@tileguard/reporters` input shapes

---

## Non-Goals

This ADR does NOT:

- Introduce new comparison or regression algorithms
- Modify feature matching heuristics or priority ordering
- Modify confidence scoring weights or formulas
- Redesign report generation or output formats
- Change public CLI commands or their flags
- Alter the Inspector's UI or interaction model
- Add new package dependencies

This was a purely architectural refactor. Zero functional changes.

---

## Package Constraints

`@tileguard/analysis` has exactly **one** dependency: `@tileguard/core` (for the `Diagnostic` type).

It has **zero** dependencies on:
- React, DOM, Canvas, or browser APIs
- Vite, webpack, or any bundler
- Node.js `fs`, `path`, or other platform APIs
- Inspector store, renderer, or UI state
- tile-rules, style-rules, or any decoder

This makes it importable from any context: Node.js CLI, browser Inspector, future REST server, VS Code extension, or third-party plugin.

---

## Complete Dependency Graph

```
          @tileguard/core
               ▲
               │
       @tileguard/analysis
            ▲       ▲
            │       │
@tileguard/inspector   @tileguard/cli
            │       │
            └───┬───┘
                ▼
       @tileguard/reporters
```

`@tileguard/core` owns framework abstractions, shared contracts, and validation infrastructure. Comparison and regression engines are application-domain analysis algorithms and therefore belong in `@tileguard/analysis`, not `@tileguard/core`.

---

## Consequences

### Immediate

1. **Duplication eliminated.** All comparison and regression algorithms exist in exactly one place. The CLI's duplicated feature matching, property diffing, geometry comparison, confidence scoring, and regression classification have been deleted.

2. **Guaranteed parity.** Inspector and CLI produce byte-for-byte identical `TileComparison` and `RegressionAnalysis` outputs for the same inputs. Cross-package parity tests enforce this on every CI run.

3. **Reporter consistency.** The `@tileguard/reporters` package consumes `ComparisonInput` and `RegressionInput` — slim shapes derived from the analysis models. Since both consumers now produce these from the same source, report content is consistent regardless of entry point.

4. **Independent testability.** The analysis package has its own test suite verifying algorithms in isolation, plus parity tests verifying cross-consumer equivalence.

5. **Clean dependency direction.** Dependencies flow strictly inward. No circular references. Each package can be built and tested independently.

### Future

6. **Plugin extensibility.** Future external integrations can import `@tileguard/analysis` directly without pulling in the full Inspector (React/DOM) or CLI (commander/fs).

7. **Ecosystem growth.** The analysis package becomes the foundation for a GitHub Action, VS Code extension, REST API, batch processing service, or third-party quality tools.

8. **Algorithm evolution.** Improvements to feature matching, confidence scoring, or regression detection automatically propagate to every consumer. No need to update algorithms in multiple places.

### Negative

9. **Additional package.** The monorepo grows from 7 to 8 packages. Version coordination adds minor overhead.

10. **Re-export indirection.** Inspector files that previously imported `./comparison/FeatureMatcher.js` now re-export from `@tileguard/analysis`. This adds one level of indirection to import resolution.

11. **Breaking for deep imports.** Any consumer that previously imported internal Inspector paths (`@tileguard/inspector/src/comparison/...`) would break. Since the Inspector is `private: true`, no external consumers exist.

---

## Alternatives Considered

### 1. Import Inspector analysis modules directly from CLI via workspace paths

Rejected. The Inspector uses Vite for its build and does not produce tsc-compatible `dist/` output. Its `package.json` has `"private": true` and no npm-publishable exports. Importing from it would create a fragile, undeclared coupling.

### 2. Keep the duplicated CLI adapter and document the divergence

Rejected. Divergent results between Inspector and CLI undermine user trust. An engineer who sees different regression confidence in the CLI vs the Inspector cannot trust either.

### 3. Move analysis into `@tileguard/core`

Rejected. `@tileguard/core` owns framework abstractions, shared contracts, and validation infrastructure. Comparison and regression engines are application-domain analysis algorithms and therefore belong in `@tileguard/analysis`, not `@tileguard/core`. Core should remain minimal and dependency-free.

---

## Behavior Verification

✓ Inspector and CLI produce identical `TileComparison` for the same snapshot pair  
✓ `RegressionAnalysis` is identical regardless of entry point  
✓ `EngineeringReport` content is identical for both workflows  
✓ Reporters consume identical model shapes from both paths  
✓ `SnapshotFactory` is deterministic across calls  
✓ All 1,172 existing tests continue to pass  

```
@tileguard/analysis    — 0 compilation errors, 19 parity tests pass
@tileguard/inspector   — 0 new errors, 864 tests pass
@tileguard/cli         — 0 errors, 216 tests pass
@tileguard/reporters   — 0 errors, 92 tests pass
```

---

## Follow-up Work

Potential future consumers of `@tileguard/analysis`:

- **GitHub Action** — automated regression detection in PR pipelines
- **VS Code extension** — inline tile quality diagnostics
- **REST API** — on-demand analysis as a service
- **Plugin SDK** — third-party quality tools building on TileGuard's analysis
- **Batch processing service** — large-scale tile fleet monitoring

Each of these can depend solely on `@tileguard/analysis` + `@tileguard/core` without pulling in browser frameworks, CLI tooling, or rendering infrastructure.

---

## References

- [ADR-008: Inspector Subsystem Architecture](008-inspector-subsystem.md)
- [ADR-009: Canvas Renderer Contract](009-canvas-renderer-contract.md)
- [CORE_CONTRACTS.md](../CORE_CONTRACTS.md) — Framework interface specifications
- [CI Integration Guide](../../../packages/cli/docs/CI_INTEGRATION.md)
