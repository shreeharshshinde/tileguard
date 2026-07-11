# `tile/degenerate-geometry`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Vector tile geometries must have enough unique vertices for their declared geometry type. A `LineString` with fewer than 2 unique points and a `Polygon` ring with fewer than 3 unique vertices are considered degenerate.

---

## Details
<!-- TODO: INSERT DIAGRAM 8: Polygon Topology Sanity Checks -->

Degenerate geometries cannot be meaningfully rendered or measured. They usually indicate bugs in tile generation pipelines (duplicate points, collapsed features after simplification). This rule delegates to `findDegenerateGeometryIssues()` from `geometry.ts`.

Two issue codes:
- `DEGENERATE_LINESTRING`: LineString with `< 2` unique points
- `DEGENERATE_POLYGON`: Polygon ring with `< 3` unique vertices

One diagnostic is emitted per degenerate part (ring or line segment).

Runs only on artifacts of type `vector-tile`.

---

## Diagnostic

```
<issue.message> Layer "<layerName>", feature "<featureIndex>".
```

The `issue.message` describes the specific degeneracy (e.g., `"LineString has fewer than 2 unique points."`).

**Location:** `{ layer: "<layerName>", featureIndex: N, partIndex?: N }`

**Suggestion:** Remove degenerate geometry or emit enough distinct coordinates for the feature type.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `code` | `string` | `DEGENERATE_LINESTRING` or `DEGENERATE_POLYGON` |
| `layer` | `string` | Layer name |
| `featureIndex` | `number` | Feature index |
| `partIndex` | `number?` | Ring/part index |

---

## Examples

### ❌ Failing

A `LineString` with two identical points `(100, 200)` and `(100, 200)`:

*Diagnostic:* `LineString has fewer than 2 unique points. Layer "roads", feature "3".`

### ✅ Passing

All geometries have the minimum required unique vertices for their type.

---

## Configuration

This rule accepts no options.

```jsonc
{
  "rules": {
    "tile/degenerate-geometry": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `GEOMETRY_INVALID` (degenerate line) | `tile/degenerate-geometry` |
| `GEOMETRY_INVALID` (degenerate polygon) | `tile/degenerate-geometry` |

---

*Back to [Rule Index](../README.md)*
