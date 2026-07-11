# `tile/required-layers`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Required vector tile layers must be present. If any layer name listed in `options.layers` is absent from the decoded tile, an error is reported.

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


This rule is a no-op when `options.layers` is empty or not provided. It iterates the configured list of required layer names and compares them against the layers present in the decoded `VectorTile`.

Runs only on artifacts of type `vector-tile`.

---

## Diagnostic

```
Required layer "<layerName>" is not present in the tile.
```

**Location:** `{ layer: "<layerName>" }`

**Suggestion:** Add a `"<layerName>"` layer to the tile generation pipeline, or remove it from the required layer list.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `requiredLayer` | `string` | The missing layer name |
| `availableLayers` | `string[]` | All layer names present in the tile |

---

## Examples

### ❌ Failing

Tile contains layers `["water"]`, but config requires `["roads", "water"]`:

*Diagnostic:* `Required layer "roads" is not present in the tile.`

### ✅ Passing

Tile contains `["roads", "water"]` and config requires `["roads", "water"]`: no diagnostic.

---

## Configuration

```jsonc
{
  "rules": {
    "tile/required-layers": ["error", {
      "layers": ["roads", "water", "buildings"]
    }]
  }
}
```

**Options:**
| Field | Type | Default | Description |
|:------|:-----|:--------|:------------|
| `layers` | `string[]` | `[]` | List of layer names that must exist |

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `MISSING_LAYER` | `tile/required-layers` |

---

*Back to [Rule Index](../README.md)*
