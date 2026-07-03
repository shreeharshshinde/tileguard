# @tileguard/style-rules

MapLibre style specification provider and lint rules for TileGuard.

## Status

📋 **Pending implementation.** See [`docs/engineering/MIGRATION_PLAN.md`](../../docs/engineering/MIGRATION_PLAN.md).

## Planned rules

| Rule ID | Description | Legacy source |
|:--------|:------------|:--------------|
| `style/version` | Style version must be `8` | `legacy/js/src/style-lint.js` |
| `style/known-source` | Layers must reference existing sources | `legacy/js/src/style-lint.js` |
| `style/layer-ids` | Layer IDs must be present and unique | `legacy/js/src/style-lint.js` |
| `style/zoom-range` | `minzoom` must not exceed `maxzoom` | `legacy/js/src/style-lint.js` |
| `style/no-ref` | Deprecated `ref` property must not be used | `legacy/js/src/style-lint.js` |

## Legacy reference

- [`legacy/js/src/style-lint.js`](../../legacy/js/src/style-lint.js)
