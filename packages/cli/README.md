# tileguard (CLI)

The command-line interface for TileGuard.

```bash
npx tileguard check ./tile.pbf
npx tileguard check ./style.json
npx tileguard check ./tile.pbf ./style.json --reporter json
```

## Status

📋 **Pending implementation.** See [`docs/engineering/MIGRATION_PLAN.md`](../../docs/engineering/MIGRATION_PLAN.md).

## Responsibilities

- Load and resolve `tileguard.config.ts`
- Register rule plugins
- Resolve artifact paths from CLI arguments
- Invoke the engine
- Route output to the selected reporter
- Set process exit code based on diagnostic severities

## Legacy reference

The procedural CLI in [`legacy/js/bin/tileguard.js`](../../legacy/js/bin/tileguard.js) implements the same user-facing interface and serves as the behavioral reference during implementation.
