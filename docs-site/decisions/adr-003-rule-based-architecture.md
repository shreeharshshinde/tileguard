# ADR-003: Rule-Based Validation Architecture

**Status:** Accepted · **Date:** 2026-07-02

## Context

Tile validation logic can be organized as:

1. **Monolithic validator** — one large function that checks everything inline
2. **Rule-based system** — independent rules that each check one concern

The original TileGuard prototype used a monolithic `validate()` function. Adding a new check required editing that function, risking regressions in existing checks. Users couldn't disable individual checks without modifying source code.

## Decision

Express all validation logic as independent, configurable **Rules** — plain TypeScript objects with a standard interface:

```typescript
interface Rule {
  id: string;
  meta: { description, defaultSeverity, recommended };
  artifactTypes: string[];
  create(context: RuleContext): void;
}
```

Each rule:
- Has a unique ID (`tile/self-intersection`)
- Checks exactly one concern
- Is independently configurable (`'error'`, `'warning'`, `'off'`)
- Cannot access other rules' state or results
- Reports findings via `context.report()`

## Consequences

**Positive:**
- **Composable** — users install only the rules they need (`@tileguard/tile-rules`, `@tileguard/style-rules`, or both)
- **Configurable** — each rule has independent severity; teams customize strictness per-project
- **Extensible** — writing a new rule is ~20 lines of TypeScript; no framework knowledge required
- **Testable** — each rule is a pure function (artifact in, diagnostics out)
- **Predictable** — no ordering dependencies, no cascading failures
- **Community-friendly** — third parties can publish rule packages without modifying core

**Negative:**
- **No cross-rule analysis** — rules can't benefit from each other's findings (e.g., "only check winding if the ring is closed")
- **Some redundant traversal** — multiple rules may iterate the same geometry independently
- **Configuration surface** — 21 rules × 3 severity levels = many possible configurations

## Design Constraints

From this decision, these constraints follow:

| Constraint | Rationale |
|:-----------|:----------|
| Rules must be pure | No side effects, no I/O, no shared state |
| Rules receive immutable artifacts | No rule can corrupt data for another |
| Rules cannot print | Output formatting is the Reporter's job |
| Rules cannot access the filesystem | I/O is the Provider's job |
| One rule = one `id` in the registry | No overwriting, no ambiguity |

## Prior Art

This architecture is directly inspired by:
- **ESLint** — JavaScript linting with per-rule configuration
- **Ruff** — Python linting with the same rule model
- **Clippy** — Rust linting with independent, categorized lints
- **Semgrep** — Pattern-based code analysis with rule packs

All of these tools proved that rule-based architecture scales better than monolithic validators for community-driven validation tooling.
