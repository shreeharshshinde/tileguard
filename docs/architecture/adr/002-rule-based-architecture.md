# ADR-002: Rule-Based Architecture Over Procedural Validators

## Status

**Accepted** — 2026-07-02

## Context

The current tile validator (`validate.js`) is a single function that performs
all validation checks inline: required layer presence, feature count thresholds,
geometry validation, property presence, and empty-tile detection. All checks
are hardcoded within one procedural flow.

This approach worked well for the initial prototype. It is simple to
understand, simple to debug, and produces correct results. However, it does
not support several requirements of the long-term framework vision:

1. Users cannot enable or disable individual checks.
2. Users cannot change the severity of a specific check (e.g., downgrade
   self-intersection from error to warning).
3. Adding a new check requires modifying the monolithic function.
4. Third parties cannot contribute checks without forking the project.
5. Checks cannot be tested in isolation.

## Decision

All validation logic is decomposed into independent **rules**. Each rule
validates exactly one concern and is encapsulated in its own module.

A rule is a plain object conforming to the `Rule` interface defined in
`@tileguard/core`. Rules receive an artifact and a context, and emit
diagnostics. They have no side effects.

The engine orchestrates rule execution. Adding, removing, or configuring
rules requires no changes to the engine, other rules, or reporters.

## Consequences

### Benefits

- **Granular configuration.** Users can enable, disable, or change the
  severity of any individual rule.
- **Independent testing.** Each rule is tested with minimal fixtures,
  independent of all other rules.
- **Open for extension.** New rules can be added to existing domain
  packages or contributed as third-party packages without modifying
  the framework.
- **Clear documentation.** Each rule has its own documentation page
  explaining what it checks, why, and how to configure it.
- **Familiar pattern.** The rule model is directly inspired by ESLint,
  which is understood by millions of developers.

### Costs

- **More files.** Ten rules in ten files is more code than one function
  in one file. Navigating the codebase requires understanding the
  package structure.
- **Iteration overhead.** Each rule has boilerplate (id, meta, artifactTypes,
  create function). This is minimal (~15-25 lines) but nonzero.
- **Performance overhead.** Multiple rules iterating over the same features
  instead of a single pass. In practice, the overhead is negligible because
  the artifact is decoded once and shared across rules.

### Mitigations

- Rule boilerplate is kept minimal by design. The `RuleContext` handles
  common concerns (severity, artifact ref, docsUrl) automatically.
- A rule authoring guide will make it easy for contributors to create
  new rules following established patterns.

## Alternatives Considered

### Alternative 1: Plugin-based monolithic validators
Keep the monolithic `validateTile()` function but allow plugins to register
additional check functions. Rejected because this doesn't provide granular
per-check configuration and still creates a coupling between all checks
within the monolith.

### Alternative 2: Middleware pipeline
Each check is a middleware function in a pipeline. Checks pass results to
the next check. Rejected because validation checks are independent — they
don't transform or depend on each other's results. A pipeline implies
ordering and dependency that doesn't exist.

### Alternative 3: Event-based system
Checks subscribe to events (onLayer, onFeature, onGeometry) emitted during
artifact traversal. This is essentially the visitor pattern. See
[ADR-004](./004-direct-artifact-access.md) for why this was not chosen.
