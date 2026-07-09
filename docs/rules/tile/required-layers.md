# `tile/required-layers`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Required vector tile layers must be present. If any layer name listed in `options.layers` is absent from the decoded tile, an error is reported.

---

## Details

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
