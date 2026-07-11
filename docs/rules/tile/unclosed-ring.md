# `tile/unclosed-ring`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Every polygon ring in a vector tile must be closed — the first and last coordinate of each ring must be identical. Unclosed rings indicate broken encoders and cause incorrect area calculations and visual artefacts.

---

## Details
<!-- TODO: INSERT DIAGRAM 8: Polygon Topology Sanity Checks -->

The Mapbox Vector Tile (MVT) specification requires polygon rings to be explicitly closed. This rule delegates to `findUnclosedRingIssues()` from `geometry.ts`, which checks every ring of every `Polygon` feature.

Only `Polygon` and `MultiPolygon` features are checked. One diagnostic is emitted per unclosed ring.

Runs only on artifacts of type `vector-tile`.

---

## Diagnostic

```
Polygon ring in layer "<layerName>", feature "<featureIndex>" is not closed.
```

**Location:** `{ layer: "<layerName>", featureIndex: N, partIndex?: N }`

**Suggestion:** Ensure every polygon ring ends with the same coordinate it starts with.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | Layer name |
| `featureIndex` | `number` | Feature index |
| `partIndex` | `number?` | Ring index within the polygon |

---

## Examples

### ❌ Failing

Polygon ring starts at `(0, 0)` and ends at `(100, 100)` (should end at `(0, 0)`):

*Diagnostic:* `Polygon ring in layer "buildings", feature "2" is not closed.`

### ✅ Passing

All polygon rings have equal first and last coordinates.

---

## Configuration

This rule accepts no options.

```jsonc
{
  "rules": {
    "tile/unclosed-ring": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `GEOMETRY_INVALID` (unclosed ring) | `tile/unclosed-ring` |

---

*Back to [Rule Index](../README.md)*
