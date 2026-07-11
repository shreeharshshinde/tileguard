# `tile/coordinate-range`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

All vector tile coordinates must stay within the layer's declared extent (typically 0–4096). Out-of-range coordinates indicate broken tile encoders and cause rendering artefacts.

---

## Details
<!-- TODO: INSERT DIAGRAM 7: ZigZag Coordinate Decoding -->

**Image Description / Generation Prompt:** A flowchart illustrating the mathematical and bitwise operations used to decode relative coordinate offsets from MVT draw commands in `pbf-decoder.ts`.
1. Input: An unsigned integer `N` decoded from a raw protobuf varint.
2. Step 1: Perform the ZigZag decode bitwise shift: `(N >>> 1) ^ -(N & 1)` to obtain the signed coordinate delta offset `dValue` (which can be `dx` or `dy`).
3. Step 2: Feed `dValue` into the coordinate accumulator.
4. Step 3: Compute the absolute position relative to the previous point: `x_new = x_prev + dx` and `y_new = y_prev + dy`.
5. Output: Absolute 2D coordinates `(x_new, y_new)` plotted on the vector grid extent.


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
