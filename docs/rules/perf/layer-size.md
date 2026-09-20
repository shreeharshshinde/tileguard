# `perf/layer-size`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.6.0 · **Default Severity:** `info` · **Recommended:** `false` (opt-in)

## Summary

No single layer should account for more than a configured fraction of the tile's total vertex budget.

---

## Details

MVT does not store per-layer byte sizes — the binary format interleaves all layers in a single protobuf stream. This rule uses **vertex count share** as a deterministic proxy:

```
estimatedFraction = layerVertices / totalTileVertices
```

This metric is:
- **Fast**: zero I/O, pure arithmetic over already-decoded geometry.
- **Reproducible**: the same tile always produces the same fraction.
- **Correlated with rendering cost**: vertex buffer size dominates tile decode/upload cost.

A fraction of `0.48` means that layer is estimated to consume ~48% of the tile's GPU vertex buffer. Layers with high dominance are candidates for geometry simplification or zoom-range splitting.

**The rule is opt-in (`recommended: false`)** — it is most useful in profiling pipelines and CI dashboards, not as a universal correctness gate.

Tiles with zero total vertices produce no diagnostics (empty tile guard, avoids divide-by-zero).

---

## Diagnostics

```
Layer "<name>" accounts for <pct>% of tile vertices, exceeding the <limit>% layer size budget.
```

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | Name of the dominant layer |
| `layerVertices` | `number` | Vertex count for this layer |
| `totalVertices` | `number` | Total vertex count across all layers |
| `estimatedFraction` | `number` | Computed fraction (e.g., `0.48`) |
| `maxLayerFraction` | `number` | Configured maximum fraction |

**Suggestion:** Simplify geometries in the layer or split it into sub-layers with zoom-range filtering.

---

## Examples

### ❌ Failing

Tile has 10,000 total vertices. The `buildings` layer has 6,000 vertices. `maxLayerFraction: 0.5`:

*Diagnostic:* `Layer "buildings" accounts for 60.0% of tile vertices, exceeding the 50% layer size budget.`

### ✅ Passing

`buildings` has 4,000 out of 10,000 vertices (40%): no diagnostic.

Tile has zero vertices: no diagnostic.

---

## Configuration

```jsonc
{
  "rules": {
    "perf/layer-size": ["info", {
      "maxLayerFraction": 0.5
    }]
  }
}
```

**Options:**
| Field | Type | Default | Description |
|:------|:-----|:--------|:------------|
| `maxLayerFraction` | `number` | — | Maximum fraction (`0–1`) of total tile vertices attributable to a single layer. Common production values: `0.4–0.6`. |

---

## Remediation

1. Run `tileguard profile <tile.pbf>` — the profile command shows per-layer vertex share in a breakdown table.
2. Identify which layer dominates the budget.
3. Apply Douglas-Peucker simplification or reduce coordinate precision at the affected zoom level.
4. Consider splitting the layer by feature type or geometry complexity into separate zoom-filtered tile sets.

---

*Back to [Rule Index](../README.md)*
