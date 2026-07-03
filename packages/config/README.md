# @tileguard/config

Configuration loading, schema validation, and preset resolution for TileGuard.

## Status

📋 **Pending implementation.** See [`docs/engineering/MIGRATION_PLAN.md`](../../docs/engineering/MIGRATION_PLAN.md).

## Responsibilities

- Locate `tileguard.config.ts` or `tileguard.config.js` in the project root
- Load and validate the configuration schema
- Resolve preset configurations (e.g. `'recommended'`)
- Merge rule severity overrides with plugin defaults

## Architecture reference

[`docs/architecture/06-configuration.md`](../../docs/architecture/06-configuration.md)
