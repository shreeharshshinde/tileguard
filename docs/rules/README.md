# Rule Docs: `docs/rules/`

This directory contains per-rule reference documentation for all 19 TileGuard v0.3.0 rules.

## Style Rules (`@tileguard/style-rules`)

| Rule ID | File | Description |
|:--------|:-----|:------------|
| `style/valid-json` | [valid-json.md](./style/valid-json.md) | Style files must contain valid JSON |
| `style/version` | [version.md](./style/version.md) | Style must declare version 8 |
| `style/sources-present` | [sources-present.md](./style/sources-present.md) | Top-level `sources` object must be present |
| `style/layers-present` | [layers-present.md](./style/layers-present.md) | Top-level `layers` array must be present |
| `style/layer-id-required` | [layer-id-required.md](./style/layer-id-required.md) | Every layer must declare an `id` |
| `style/unique-layer-id` | [unique-layer-id.md](./style/unique-layer-id.md) | Layer IDs must be unique |
| `style/known-source` | [known-source.md](./style/known-source.md) | Layer source references must be declared |
| `style/zoom-range` | [zoom-range.md](./style/zoom-range.md) | `minzoom` must not exceed `maxzoom` |
| `style/no-deprecated-ref` | [no-deprecated-ref.md](./style/no-deprecated-ref.md) | Layers must not use deprecated `ref` property |

## Tile Rules (`@tileguard/tile-rules`)

| Rule ID | File | Description |
|:--------|:-----|:------------|
| `tile/required-layers` | [required-layers.md](./tile/required-layers.md) | Required layers must be present |
| `tile/feature-count` | [feature-count.md](./tile/feature-count.md) | Total feature count within configured bounds |
| `tile/layer-feature-count` | [layer-feature-count.md](./tile/layer-feature-count.md) | Per-layer feature count within configured bounds |
| `tile/required-properties` | [required-properties.md](./tile/required-properties.md) | Features must have required properties |
| `tile/coordinate-range` | [coordinate-range.md](./tile/coordinate-range.md) | Coordinates must stay within tile extent |
| `tile/degenerate-geometry` | [degenerate-geometry.md](./tile/degenerate-geometry.md) | Geometries must have enough vertices |
| `tile/unclosed-ring` | [unclosed-ring.md](./tile/unclosed-ring.md) | Polygon rings must be closed |
| `tile/zero-area-ring` | [zero-area-ring.md](./tile/zero-area-ring.md) | Polygon rings must have non-zero area |
| `tile/self-intersection` | [self-intersection.md](./tile/self-intersection.md) | Geometries must not self-intersect |
| `tile/no-empty` | [no-empty.md](./tile/no-empty.md) | Tiles must contain at least one feature |

---

*Part of the [TileGuard Architecture Handbook](../architecture/README.md) · v0.3.0*
