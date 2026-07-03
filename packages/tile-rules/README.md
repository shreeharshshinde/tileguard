# @tileguard/tile-rules

Vector tile artifact provider and validation rules for TileGuard.

## Status

📋 **Pending implementation.** See [`docs/engineering/MIGRATION_PLAN.md`](../../docs/engineering/MIGRATION_PLAN.md).

## Planned rules

| Rule ID | Description | Legacy source |
|:--------|:------------|:--------------|
| `tile/required-layers` | Validates that required layers are present | `legacy/js/src/validate.js`, `legacy/python/tileguard/validate.py` |
| `tile/coordinate-range` | Checks coordinates are within tile extent | `legacy/js/src/validate.js` |
| `tile/geometry-validity` | Detects unclosed rings, self-intersections, degenerate polygons | `legacy/js/src/validate.js`, `legacy/python/tileguard/validate.py` |
| `tile/feature-count` | Validates feature count bounds (global and per-layer) | `legacy/js/src/validate.js` |
| `tile/required-properties` | Ensures required properties exist on features | `legacy/js/src/validate.js` |

## Legacy reference

- [`legacy/js/src/validate.js`](../../legacy/js/src/validate.js)
- [`legacy/python/tileguard/validate.py`](../../legacy/python/tileguard/validate.py)
