# @tileguard/core

The framework contracts package for TileGuard.

This package defines the interfaces and types that all other TileGuard packages depend on:

- `Diagnostic` — the universal validation result type
- `Artifact` / `ArtifactProvider` — the artifact loading and decoding contracts
- `Rule` / `RuleContext` — the validation rule contract
- `Reporter` — the output formatting contract
- `Engine` — the orchestration pipeline contract

## Status

🔨 **Pending implementation.** Interfaces are being designed. See [`docs/engineering/MIGRATION_PLAN.md`](../../docs/engineering/MIGRATION_PLAN.md) for the migration roadmap.

## Dependencies

`@tileguard/core` has **zero runtime dependencies**. All other packages depend on core; core depends on nothing.

## Architecture

See [`docs/architecture/`](../../docs/architecture/) for the full specification.
