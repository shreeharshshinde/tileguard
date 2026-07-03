# @tileguard/shared

Shared utilities used across multiple TileGuard packages.

## Status

📋 **Pending implementation.** See [`docs/engineering/MIGRATION_PLAN.md`](../../docs/engineering/MIGRATION_PLAN.md).

## Intended contents

- Geometry utilities (coordinate math, ring validation helpers) extracted from legacy validation logic
- File format detection helpers
- Common test fixtures and helpers

## Dependency rule

`@tileguard/shared` may depend only on `@tileguard/core`. Domain packages (`tile-rules`, `style-rules`) may depend on `@tileguard/shared`. `@tileguard/shared` must never depend on any domain package.
