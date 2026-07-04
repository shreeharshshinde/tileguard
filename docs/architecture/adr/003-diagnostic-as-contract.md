# ADR-003: Structured Diagnostics as the Universal Interface Contract

## Status

**Accepted** — 2026-07-02

## Context

The current codebase uses ad-hoc error objects with inconsistent shapes
across modules:

```javascript
// validate.js
{ code: 'MISSING_LAYER', message: '...', available: [...] }
{ code: 'GEOMETRY_INVALID', layer: '...', details: [...] }

// style-lint.js
{ code: 'UNKNOWN_SOURCE', message: '...' }

// render-compare.js
{ code: 'INVALID_FIXTURE', message: '...' }
```

Each module defines its own error shape. The reporter has separate methods
for each module type (`printValidation`, `printLint`, `printRender`), each
understanding a different result structure. Adding a new output format
(SARIF, GitHub annotations) requires understanding all these shapes.

## Decision

All validation results are represented as structured **Diagnostic** values
conforming to a single type defined in `@tileguard/core`. No component
produces formatted output directly. Rules emit diagnostics. Reporters
consume diagnostics.

The Diagnostic type includes: `ruleId`, `severity`, `message`, `artifact`
reference, optional `location`, optional `suggestion`, optional `docsUrl`,
and optional `data`.

## Consequences

### Benefits

- **One reporter implementation covers all validation domains.** A JSON
  reporter works identically for tile diagnostics, style diagnostics,
  and render diagnostics.
- **SARIF support is straightforward.** SARIF's result schema maps
  cleanly to the Diagnostic type.
- **IDE integration becomes possible.** A language server can emit
  diagnostics in LSP format by mapping from the Diagnostic type.
- **Diagnostic deduplication, filtering, and aggregation** work uniformly
  across all validation domains.

### Costs

- **Domain-specific data is weakly typed.** The `data` field is
  `Record<string, unknown>`. Rule-specific structured data (like the
  list of available layers) is not type-checked by the diagnostic
  system itself.
- **Location is a flat record.** Different artifact types use different
  subsets of location fields, which means the type is wider than
  necessary for any single use case.

### Mitigations

- Rules define their own `data` schemas in documentation. The framework
  provides the transport; rules provide the semantics.
- The flat Location type is a pragmatic choice over a discriminated union.
  See [02 — Diagnostic Model](../02-diagnostic-model.md) for detailed
  rationale.

## Alternatives Considered

### Alternative 1: Module-specific result types
Each module (tile validator, style linter, render comparison) defines its
own result type. Reporters understand each type independently. Rejected
because this approach scales linearly: every new module requires every
reporter to be updated.

### Alternative 2: Unstructured strings
Diagnostics are plain strings. Reporters simply print them. Rejected
because this prevents structured output (JSON, SARIF), filtering, sorting,
and severity-based exit codes.

### Alternative 3: Error codes as the primary identity
Keep the current pattern of error codes (`MISSING_LAYER`, `GEOMETRY_INVALID`)
as the primary identifier, but standardize the error shape. This was
considered viable but rejected in favor of rule IDs because error codes
conflate identity (what rule produced this) with classification (what kind
of problem is this). A rule ID uniquely identifies the source; the code
and message describe the finding.
