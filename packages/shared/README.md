# @tileguard/shared

Shared utilities used across multiple TileGuard packages.

## Status

✅ **Implemented and stable** (v0.5.0).

## Contents

- Geometry utilities (coordinate math, ring validation helpers) shared across tile-rules and style-rules
- File format detection helpers
- Common utilities

## Dependency rule

`@tileguard/shared` may depend only on `@tileguard/core`. Domain packages (`tile-rules`, `style-rules`) may depend on `@tileguard/shared`. `@tileguard/shared` must never depend on any domain package.
