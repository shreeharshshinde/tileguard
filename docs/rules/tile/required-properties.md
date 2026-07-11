# `tile/required-properties`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Every feature in a configured layer must include all required property keys. Missing properties indicate incomplete data pipelines and may break downstream consumers.

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


The rule accepts a map of layer names to arrays of required property keys. For each feature in each configured layer, it checks that every required property key is present (using `hasOwnProperty`). The **value** of the property is not validated — `null` and `""` are considered present.

Layers not listed in options are skipped. Layers listed but absent from the tile are skipped.

Options normalization:
- `options.layers` (preferred): `{ layerName: string[] }`
- `options.requiredProperties` (legacy alias): same shape
- Top-level keys with array values (legacy flat form): also accepted

Runs only on artifacts of type `vector-tile`.

---

## Diagnostic

```
Feature "<featureIndex>" in layer "<layerName>" is missing required property "<property>".
```

**Location:** `{ layer: "<layerName>", featureIndex: N }`

**Suggestion:** Add property `"<property>"` to every feature in layer `"<layerName>"`, or remove it from the required property list.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | The layer name |
| `featureIndex` | `number` | Zero-based feature index |
| `property` | `string` | The missing property key |

---

## Examples

### ❌ Failing

Feature in layer `roads` is missing `class` property. Config: `roads: ['class', 'name']`.

*Diagnostic:* `Feature "0" in layer "roads" is missing required property "class".`

### ✅ Passing

All features in `roads` have both `class` and `name` (even if values are `null`).

---

## Configuration

```jsonc
{
  "rules": {
    "tile/required-properties": ["error", {
      "layers": {
        "roads": ["class", "name"],
        "water": ["kind"]
      }
    }]
  }
}
```

**Options (`layers` map):**
| Field | Type | Description |
|:------|:-----|:------------|
| `layers` | `Record<string, string[]>` | Map of layer name → required property keys |
| `requiredProperties` | `Record<string, string[]>` | Alias for `layers` (legacy) |

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `MISSING_PROPERTY` | `tile/required-properties` |

---

*Back to [Rule Index](../README.md)*
