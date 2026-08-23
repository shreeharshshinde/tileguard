# ADR-011: Style Analysis Engine — Internal Package Boundaries

**Status:** Accepted  
**Date:** 2026-08-03  
**Deciders:** @shreeharshshinde  

---

## Context

Milestone 8, Step 1 introduces a Style Analysis Engine within `@tileguard/style-rules`. The engine parses, resolves, validates, and produces statistics for MapLibre Style Specification documents. It operates as a multi-stage pipeline with distinct responsibilities at each stage.

As the engine grows through Steps 2–5 (consistency checking, render-readiness scoring, advanced tile intelligence, and quality suite integration), clear boundaries between internal modules prevent logic leakage, reduce coupling, and make it obvious where new capabilities belong.

---

## Decision

The style analysis pipeline is split into four internal modules with strict one-way dependencies:

```
parser/  →  resolver/  →  validator/  →  services/
  ↑            ↑              ↑              ↑
models/     models/        models/        models/
```

### Module Responsibilities

| Module | Responsibility | What It Does NOT Do |
|--------|---------------|---------------------|
| `models/` | Define immutable data shapes | No logic, no I/O, no dependencies beyond TypeScript types |
| `parser/` | Convert raw JSON into typed models (syntax only) | No validation, no semantic resolution, no relationship building |
| `resolver/` | Build semantic relationships between parsed objects | No validation judgments, no diagnostic production, no file I/O |
| `validator/` | Produce diagnostics by checking correctness | No parsing, no relationship resolution, no side effects |
| `services/` | Orchestrate the full pipeline and expose the public API | No domain logic of its own — delegates to parser, resolver, validator |

### Dependency Rules

1. **Models depend on nothing** (except `@tileguard/core` types for `Severity`).
2. **Parser depends only on models.** It produces model instances from raw JSON.
3. **Resolver depends on models and parser output.** It reads parsed documents and builds relationship graphs.
4. **Validator depends on models.** It receives parsed documents and resolved layers, produces diagnostics.
5. **Services depend on all of the above.** The service layer is the only module that imports from multiple other modules.

No module imports laterally. No module imports upward.

### Validator Sub-Structure

The validator itself is further split into specialized validators:

| File | Scope |
|------|-------|
| `StructureValidator.ts` | Document-level structure: version, layer presence, IDs, duplicates |
| `SourceValidator.ts` | Source declarations: presence, unused, terrain references |
| `LayerValidator.ts` | Layer semantics: source refs, source-layer, zoom ranges, types |
| `ExpressionValidator.ts` | Expression correctness: unknown operators, type issues |
| `StyleValidator.ts` | **Orchestrator only** — calls all sub-validators, concatenates results |

Adding a new validation category means creating a new file and adding one line to the orchestrator.

### Extension Points for Later Milestones

- **Step 2 (Consistency):** A new `consistency/` module that imports from `models/` and `resolver/` to cross-reference tiles against style expectations.
- **Step 3 (Readiness):** A new `readiness/` module that imports from `models/` and uses resolved layers to estimate rendering complexity.
- **Step 4 (Advanced Intelligence):** Extends `validator/` with new specialized validators or adds a `topology/` module.

---

## Consequences

**Positive:**
- Adding new validation rules is a local change (one file + orchestrator import).
- The parser can be used independently without pulling in validation.
- Each module can be tested in isolation with focused fixtures.
- The dependency graph is strictly acyclic — no circular imports are possible.

**Negative:**
- More files than a single-file approach (tradeoff: ~15 files vs. 1 monolithic file).
- Contributors must understand where a new capability belongs before implementing it.

**Mitigations:**
- This ADR serves as the canonical reference for placement decisions.
- The barrel exports (`index.ts` in each module) make the public surface discoverable.

---

## Alternatives Considered

1. **Single `StyleValidator.ts` handling all checks** — rejected because it would grow to hundreds of lines and mix structural, semantic, source, and expression concerns.
2. **Separate packages per module** (`@tileguard/style-parser`, `@tileguard/style-validator`, etc.) — rejected as over-modularization for internal modules that are always deployed together.
3. **Class-based architecture with inheritance** — rejected per TileGuard design principle #5: composition over inheritance.
