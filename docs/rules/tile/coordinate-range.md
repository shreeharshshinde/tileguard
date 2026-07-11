# `tile/coordinate-range`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

All vector tile coordinates must stay within the layer's declared extent (typically 0–4096). Out-of-range coordinates indicate broken tile encoders and cause rendering artefacts.

---

## Details
<!-- TODO: INSERT DIAGRAM 7: ZigZag Coordinate Decoding -->

Each vector tile layer declares an `extent` (commonly `4096`). All coordinates in all features must fall within `[0, extent]` on both axes. This rule delegates to `findCoordinateRangeIssues()` from `geometry.ts`, which inspects each geometry point of every feature.

One diagnostic is emitted **per out-of-range coordinate point**. In practice this means a single malformed feature can produce multiple diagnostics (one per bad point).

Runs only on artifacts of type `vector-tile`.

---

## Diagnostic

```
Coordinate "<x>,<y>" in layer "<layerName>" is outside tile extent "0-<extent>".
```

**Location:** `{ layer: "<layerName>", featureIndex: N, partIndex?: N }`

**Suggestion:** Clamp, simplify, or reproject geometries so all coordinates fit within the tile extent.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | Layer name |
| `featureIndex` | `number` | Feature index |
| `partIndex` | `number?` | Ring/part index within the geometry |
| `pointIndex` | `number?` | Point index within the ring |
| `point` | `{x,y}?` | The out-of-range point |
| `extent` | `number` | The layer extent |

---

## Examples

### ❌ Failing

Feature has a point at `(5000, 100)` in a layer with extent `4096`:

*Diagnostic:* `Coordinate "5000,100" in layer "roads" is outside tile extent "0-4096".`

### ✅ Passing

All features have coordinates within `[0, 4096]`.

---

## Configuration

This rule accepts no options.

```jsonc
{
  "rules": {
    "tile/coordinate-range": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `GEOMETRY_INVALID` (coordinate out of range) | `tile/coordinate-range` |

---

*Back to [Rule Index](../README.md)*
