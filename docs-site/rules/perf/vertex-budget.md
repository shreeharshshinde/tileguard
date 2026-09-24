# perf/vertex-budget

> Severity: `off` (opt-in) · Since: v0.6.0 · Package: `@tileguard/tile-rules`

## What it checks

Fails if the **total vertex count** across all layers in a tile exceeds a configured
budget.

## Why it matters

Vertex count is the primary driver of GPU cost when rendering vector tiles. Every
vertex must be processed by the GPU on every frame. Tiles with over 100,000 vertices
will cause perceptible lag on mid-range mobile devices.

## Example output

```text
✗ perf/vertex-budget
  Tile has 163,890 total vertices, exceeding budget of 100,000.
  at ./tiles/14/8741/5476.pbf
  ℹ Simplify the "roads" layer — it accounts for 60% of vertex cost.
```

## Configuration

```typescript
rules: {
  'perf/vertex-budget': ['warning', { maxVertices: 100_000 }],
}
```

| Option | Type | Required | Description |
|:-------|:-----|:---------|:------------|
| `maxVertices` | `number` | ✅ Yes | Maximum total vertex count across all layers |

## Suggested thresholds

| Use case | Suggested limit |
|:---------|:----------------|
| Mobile-first | 50,000 |
| General production | 100,000 |
| Desktop/high-end | 200,000 |

## Remediation

- **Simplify geometry** at the data source level (`ST_Simplify`, tippecanoe `--simplification`)
- **Drop small features** at lower zoom levels (they're invisible anyway)
- **Reduce polygon complexity** for buildings and landuse — most real-world polygons
  need far fewer vertices than raw cadastral data provides

## Related rules

- [`perf/tile-size`](/rules/perf/tile-size) — total tile byte budget
- [`perf/feature-density`](/rules/perf/feature-density) — feature count budget
