# `tile/no-empty`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `warning`

## Summary

Vector tiles should contain at least one feature. An empty tile may indicate a broken data pipeline or misaligned tile request, unless empty tiles are explicitly expected.

---

## Details
<!-- TODO: INSERT DIAGRAM 6: Vector Tile Decoder -->

**Image Description / Generation Prompt:** A block diagram representing the hierarchical structure of a decoded Mapbox Vector Tile (MVT) binary payload.
1. The top-level block is the raw `VectorTile` binary buffer (protobuf format).
2. Underneath, show that the buffer contains one or more `Layers`.
3. Each `Layer` contains:
   - `Name` (string identifier)
   - `Extent` (typically 4096 coordinate grid dimensions)
   - `Feature Pool` (an array of individual feature objects)
   - `Key Pool` (a list of unique property keys)
   - `Value Pool` (a list of unique property values across different types: string, float, integer, boolean)
4. Each `Feature` within the pool contains:
   - `ID` (unique identifier)
   - `Type` (Geometry Type: Point, LineString, or Polygon)
   - `Packed Tags` (an array of alternating integers mapping key indices to value indices in the layer pools)
   - `Geometry Commands` (packed draw commands containing command IDs and coordinate parameters: MoveTo, LineTo, ClosePath)


This rule sums all features across all layers. If the total is zero, a warning is reported. If `options.allowEmpty` is `true`, the rule silently passes — useful for sparse datasets where some tile coordinates are legitimately empty.

Runs only on artifacts of type `vector-tile`.

---

## Diagnostic

```
Tile contains 0 features.
```

**Suggestion:** Confirm this is an intentional empty tile, or fix the tile generation filters.

**Data fields:**

| Field | Type | Description |
|:------|:-----|:------------|
| `totalFeatures` | `0` | Always `0` when this fires |
| `layers` | `string[]` | Layer names present in the tile |

---

## Examples

### ❌ Failing

Tile with no layers or all layers empty.

*Diagnostic:* `Tile contains 0 features.`

### ✅ Passing

Any tile with at least one feature, or any tile when `allowEmpty: true`.

---

## Configuration

```jsonc
{
  "rules": {
    "tile/no-empty": ["warning", { "allowEmpty": false }]
  }
}
```

**Options:**

| Field | Type | Default | Description |
|:------|:-----|:--------|:------------|
| `allowEmpty` | `boolean` | `false` | Set to `true` to suppress the diagnostic for tiles with 0 features |

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `EMPTY_TILE` | `tile/no-empty` |

---

*Back to [Rule Index](../README.md)*
