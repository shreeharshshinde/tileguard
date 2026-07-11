# `tile/unclosed-ring`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Every polygon ring in a vector tile must be closed — the first and last coordinate of each ring must be identical. Unclosed rings indicate broken encoders and cause incorrect area calculations and visual artefacts.

---

## Details
<!-- TODO: INSERT DIAGRAM 8: Polygon Topology Sanity Checks -->

**Image Description / Generation Prompt:** A decision tree diagram mapping out the polygon topology sanity validation checks executed in `geometry.ts`.
1. Input: A sequence of coordinate vertices representing a polygon ring.
2. Condition 1: "Does the ring contain at least 3 unique vertices and 4 total points?"
   - No: Emit `DEGENERATE_POLYGON` diagnostic.
   - Yes: Proceed to next check.
3. Condition 2: "Is the first vertex identical to the last vertex (closure check)?"
   - No: Emit `UNCLOSED_RING` diagnostic.
   - Yes: Proceed to next check.
4. Condition 3: "Is the absolute signed area of the ring greater than zero (using Shoelace formula)?"
   - No: Emit `ZERO_AREA_RING` diagnostic.
   - Yes: The polygon ring is considered topologically sound (Pass).


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
