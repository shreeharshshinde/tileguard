# `tile/coordinate-range`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

All vector tile coordinates must stay within the layer's declared extent (typically 0–4096), plus an optional buffer margin. Out-of-range coordinates indicate broken tile encoders and cause rendering artefacts.

---

## Details
<!-- TODO: INSERT DIAGRAM 7: ZigZag Coordinate Decoding -->

**Image Description / Generation Prompt:** A flowchart illustrating the mathematical and bitwise operations used to decode relative coordinate offsets from MVT draw commands in `pbf-decoder.ts`.
1. Input: An unsigned integer `N` decoded from a raw protobuf varint.
2. Step 1: Perform the ZigZag decode bitwise shift: `(N >>> 1) ^ -(N & 1)` to obtain the signed coordinate delta offset `dValue` (which can be `dx` or `dy`).
3. Step 2: Feed `dValue` into the coordinate accumulator.
4. Step 3: Compute the absolute position relative to the previous point: `x_new = x_prev + dx` and `y_new = y_prev + dy`.
5. Output: Absolute 2D coordinates `(x_new, y_new)` plotted on the vector grid extent.


Each vector tile layer declares an `extent` (commonly `4096`). All coordinates in all features must fall within `[-buffer, extent + buffer]` on both axes, where `buffer` defaults to `80`. Layers listed in `excludeLayers` are skipped entirely. This rule delegates to `findCoordinateRangeIssues()` from `geometry.ts`, which inspects each geometry point of every feature.

One diagnostic is emitted **per out-of-range coordinate point**. In practice this means a single malformed feature can produce multiple diagnostics (one per bad point).

Runs only on artifacts of type `vector-tile`.

---

## Diagnostic

```
Coordinate "<x>,<y>" in layer "<layerName>" is outside allowed range [<min>, <max>] (extent: <extent>, buffer: <buffer>).
```

**Location:** `{ layer: "<layerName>", featureIndex: N, partIndex?: N }`

**Suggestion:** Clamp, simplify, or reproject geometries so all coordinates fit within the allowed range.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | Layer name |
| `featureIndex` | `number` | Feature index |
| `partIndex` | `number?` | Ring/part index within the geometry |
| `pointIndex` | `number?` | Point index within the ring |
| `point` | `{x,y}?` | The out-of-range point |
| `extent` | `number` | The layer extent |
| `buffer` | `number` | The buffer value used for this check |

---

## Examples

### ❌ Failing

Feature in a `roads` layer has a point at `(5000, 100)` with extent `4096` and default buffer `80`:

*Diagnostic:* `Coordinate "5000,100" in layer "roads" is outside allowed range [-80, 4176] (extent: 4096, buffer: 80).`

### ✅ Passing — within buffer

Feature in a `countries` layer has a clipping vertex at `(-64, 100)` — within the default buffer of `80`:

No diagnostic produced.

### ✅ Passing — excluded layer

Feature in a `place` layer has a label-duplication point at `(4324, 2742)` — far outside extent, but `place` is in the default `excludeLayers` list:

No diagnostic produced.

---

## Configuration

```jsonc
{
  "rules": {
    // Simple — use shipped defaults (buffer=80, excludeLayers=['place','water_name','centroids'])
    "tile/coordinate-range": "error",

    // Full — override both options
    "tile/coordinate-range": ["error", {
      "buffer": 80,
      "excludeLayers": ["place", "water_name", "centroids"]
    }]
  }
}
```

### Options

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `buffer` | `number` | `80` | Allowed margin beyond `[0, extent]` on each axis. Set to `0` to require strict containment. |
| `excludeLayers` | `string[]` | `["place", "water_name", "centroids"]` | Layer names to skip entirely. These layers use label duplication (placing points far outside extent for cross-tile rendering) which is intentional tile compiler behavior, not corruption. Passing an empty array `[]` disables the built-in exclusions and validates every layer. |

### Defaults & Rationale

The default `buffer` of `80` and `excludeLayers` of `["place", "water_name", "centroids"]` were determined empirically during a 294-tile evaluation across three production tile providers (OpenMapTiles, Planetiler/OpenFreeMap, and CARTO Streets). See [ADR-006](../../architecture/adr/006-coordinate-range-defaults.md) for full details.

- **Buffer 80** covers the P95 of observed clipping buffers across all geometry layers (`countries`, `geolines` at 80; `water`, `boundary`, `landcover`, `park`, `waterway` at 64).
- **Layer exclusion** targets three specific layers confirmed to use label duplication — a technique where tile compilers intentionally place Point features far outside extent to enable cross-tile label rendering. All 63,944 label-duplication entries in the evaluation came exclusively from these three layers.

> **Note:** These defaults are calibrated to OpenMapTiles/Planetiler schema conventions. If your tile compiler uses different layer names for label duplication, supply your own `excludeLayers` in your `tileguard.config.ts`.

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `GEOMETRY_INVALID` (coordinate out of range) | `tile/coordinate-range` |

---

*Back to [Rule Index](../README.md)*
