# `perf/vertex-budget`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.6.0 · **Default Severity:** `warning` · **Recommended:** `true` · **Opt-in thresholds**

## Summary

Feature-level and tile-level vertex counts must not exceed configured performance budgets.

---

## Details

Vertex count is the primary rendering cost driver for vector tiles. GPUs render tiles by uploading vertex buffers to the GPU; a single feature with 10,000+ vertices can stall the render thread long enough to drop frames at 60fps.

Two orthogonal checks serve complementary purposes:

- **Per-feature limit** (`maxVerticesPerFeature`): catches individual outliers — a coastline or administrative boundary that wasn't simplified for this zoom level. Every offending feature gets its own diagnostic with a `{ layer, featureIndex }` location pointer for precise identification.

- **Tile-wide limit** (`maxVerticesPerTile`): catches tiles that are globally over-complex even when no single feature is an outlier — e.g., a z10 tile with 50,000 building footprints each with 10 vertices.

Vertex counts include all coordinate points across all geometry parts (rings, lines) of each feature.

**Important:** Thresholds are opt-in — neither limit is enforced without explicit configuration.

---

## Diagnostics

**Per-feature budget exceeded:**

```
Feature #<featureIndex> in layer "<layer>" has <vertexCount> vertices, exceeding the per-feature budget of <maxVerticesPerFeature>.
```

*Location:* `{ layer: "<name>", featureIndex: <n> }`

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | Layer containing the feature |
| `featureIndex` | `number` | 0-indexed feature position in the layer |
| `vertexCount` | `number` | Actual vertex count of the feature |
| `maxVerticesPerFeature` | `number` | Configured per-feature limit |

**Tile-wide budget exceeded:**

```
Tile contains <totalVertices> total vertices, exceeding the tile-wide budget of <maxVerticesPerTile>.
```

*Location:* none (tile-level finding)

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `totalVertices` | `number` | Total vertex count across the entire tile |
| `maxVerticesPerTile` | `number` | Configured tile-wide limit |

---

## Examples

### ❌ Failing

Feature #412 in `transportation` has 3,891 vertices, budget is 3,000:

*Diagnostic:* `Feature #412 in layer "transportation" has 3,891 vertices, exceeding the per-feature budget of 3,000.`

### ✅ Passing

All features under 3,000 vertices: no diagnostic.

---

## Configuration

```jsonc
{
  "rules": {
    "perf/vertex-budget": ["warning", {
      "maxVerticesPerFeature": 3000,
      "maxVerticesPerTile": 200000
    }]
  }
}
```

**Options:**
| Field | Type | Default | Description |
|:------|:-----|:--------|:------------|
| `maxVerticesPerFeature` | `number` | — | Maximum vertices in a single feature (all geometry parts summed) |
| `maxVerticesPerTile` | `number` | — | Maximum total vertices across the entire tile |

---

## Remediation

1. Use `tileguard profile <tile.pbf>` to identify the worst-offending feature.
2. Apply geometry simplification (e.g., Douglas-Peucker algorithm) at this zoom level.
3. For polygon layers, consider reducing precision of coordinates — most zoom levels don't need sub-pixel accuracy.
4. If the tile-wide budget fires without per-feature offenders, apply global simplification or reduce feature density.

---

*Back to [Rule Index](../README.md)*
