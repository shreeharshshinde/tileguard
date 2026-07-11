# Rule Docs: `docs/rules/`

This directory contains per-rule reference documentation for all 19 TileGuard v0.3.0 rules.

## Style Rules (`@tileguard/style-rules`)
<!-- TODO: INSERT DIAGRAM 5: Non-Short-Circuiting Schema Validation -->

**Image Description / Generation Prompt:** An activity flowchart demonstrating the parallel non-short-circuiting configuration schema validation logic in `validator.ts`.
1. Start with the incoming configuration object.
2. Check: "Is the root configuration a plain object?"
   - No: Throw `ConfigValidationError` immediately (fast-fail root check).
   - Yes: Proceed to run validation sub-checkers.
3. Perform the following checks concurrently without stopping on failures:
   - `validatePlugins`: Check that plugins are not defined in JSON config files.
   - `validateRules`: Verify the syntax of rules, severities, and options shapes.
   - `validateReporters`: Verify reporter configurations (strings or tuples).
   - `validateOverrides`: Validate file globs and rule override maps.
   - `checkUnknownKeys`: Detect extraneous properties and collect warning diagnostics.
4. Aggregation Step: Accumulate all collected validation errors and warnings.
5. Decision: "Are there any errors in the accumulated list?"
   - Yes: Throw a single `ConfigValidationError` containing the complete list of errors and warnings.
   - No: Return the verified configuration object alongside any advisory warnings.


| Rule ID | File | Description |
|:--------|:-----|:------------|
| `style/valid-json` | [valid-json.md](./style/valid-json.md) | Style files must contain valid JSON |
| `style/version` | [version.md](./style/version.md) | Style must declare version 8 |
| `style/sources-present` | [sources-present.md](./style/sources-present.md) | Top-level `sources` object must be present |
| `style/layers-present` | [layers-present.md](./style/layers-present.md) | Top-level `layers` array must be present |
| `style/layer-id-required` | [layer-id-required.md](./style/layer-id-required.md) | Every layer must declare an `id` |
| `style/unique-layer-id` | [unique-layer-id.md](./style/unique-layer-id.md) | Layer IDs must be unique |
| `style/known-source` | [known-source.md](./style/known-source.md) | Layer source references must be declared |
| `style/zoom-range` | [zoom-range.md](./style/zoom-range.md) | `minzoom` must not exceed `maxzoom` |
| `style/no-deprecated-ref` | [no-deprecated-ref.md](./style/no-deprecated-ref.md) | Layers must not use deprecated `ref` property |

## Tile Rules (`@tileguard/tile-rules`)
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


| Rule ID | File | Description |
|:--------|:-----|:------------|
| `tile/required-layers` | [required-layers.md](./tile/required-layers.md) | Required layers must be present |
| `tile/feature-count` | [feature-count.md](./tile/feature-count.md) | Total feature count within configured bounds |
| `tile/layer-feature-count` | [layer-feature-count.md](./tile/layer-feature-count.md) | Per-layer feature count within configured bounds |
| `tile/required-properties` | [required-properties.md](./tile/required-properties.md) | Features must have required properties |
| `tile/coordinate-range` | [coordinate-range.md](./tile/coordinate-range.md) | Coordinates must stay within tile extent |
| `tile/degenerate-geometry` | [degenerate-geometry.md](./tile/degenerate-geometry.md) | Geometries must have enough vertices |
| `tile/unclosed-ring` | [unclosed-ring.md](./tile/unclosed-ring.md) | Polygon rings must be closed |
| `tile/zero-area-ring` | [zero-area-ring.md](./tile/zero-area-ring.md) | Polygon rings must have non-zero area |
| `tile/self-intersection` | [self-intersection.md](./tile/self-intersection.md) | Geometries must not self-intersect |
| `tile/no-empty` | [no-empty.md](./tile/no-empty.md) | Tiles must contain at least one feature |

---

*Part of the [TileGuard Architecture Handbook](../architecture/README.md) · v0.3.0*
