# Your First Tile Check

This tutorial walks you through validating a vector tile from start to finish — understanding what TileGuard finds, what the output means, and what to do about it.

## Step 1: Get a Tile

If you have a `.pbf` vector tile, use it. Otherwise, you can validate any tile from your pipeline or a public source.

```bash
# Use a tile from your project
tileguard check ./tiles/14/8741/5476.pbf

# Or validate an entire directory
tileguard check ./tiles/
```

## Step 2: Run the Check

```bash
tileguard check ./tile.pbf
```

TileGuard decodes the tile, runs all 12 tile validation rules against it, and reports any findings:

```text
✗ tile/self-intersection
  Geometry in layer "landuse", feature 42 has intersecting segments 1 and 4.
  at ./tile.pbf → layer: landuse, feature: 42, part: 0
  ℹ Simplify or repair this geometry so non-adjacent segments do not cross.

⚠ tile/winding-order
  Ring 0 of feature 17 in layer "buildings" has incorrect winding direction.
  at ./tile.pbf → layer: buildings, feature: 17, part: 0
  ℹ Reverse the ring vertex order to match the detected MVT convention (CW outer).

✓ tile/required-layers
✓ tile/coordinate-range
✓ tile/unclosed-ring
✓ tile/hole-containment
✓ tile/zero-area-ring
✓ tile/degenerate-geometry
✓ tile/feature-count
✓ tile/layer-feature-count
✓ tile/required-properties
✓ tile/no-empty

──────────────────────────────────
  1 error, 1 warning in 1 file (34ms)
```

## Step 3: Read the Diagnostic

Every finding has the same structure:

```text
✗ tile/self-intersection                        ← Rule ID
  Geometry in layer "landuse", feature 42       ← What's wrong
  has intersecting segments 1 and 4.
  at ./tile.pbf → layer: landuse, feature: 42  ← Exact location
  ℹ Simplify or repair this geometry...         ← How to fix it
```

| Part | What it tells you |
|:-----|:------------------|
| `✗` / `⚠` / `ℹ` | Severity: error / warning / info |
| `tile/self-intersection` | Which rule triggered |
| Message | Human-readable description of the problem |
| Location | File, layer, feature index, part index |
| `ℹ` Suggestion | Actionable remediation advice |

## Step 4: Understand Severities

| Severity | Icon | Meaning | Exit Code |
|:---------|:-----|:--------|:----------|
| **Error** | `✗` | Must fix — blocks CI | `1` |
| **Warning** | `⚠` | Should investigate — doesn't block CI | `0` |
| **Info** | `ℹ` | Informational — no action required | `0` |

Only **errors** cause TileGuard to exit with code `1` (fail the build). Warnings are reported but don't fail.

## Step 5: Fix or Configure

You have three options for each finding:

### Option A: Fix the geometry

Fix the issue in your tile generation pipeline. For `tile/self-intersection`, this means repairing the polygon so edges don't cross.

### Option B: Change severity

If a rule is too strict for your use case, downgrade it to a warning:

```typescript
// tileguard.config.ts
rules: {
  'tile/self-intersection': 'warning',  // report but don't fail
}
```

### Option C: Disable the rule

If a rule doesn't apply to your project:

```typescript
rules: {
  'tile/no-empty': 'off',  // skip entirely
}
```

## Step 6: Re-run and Verify

```bash
tileguard check ./tile.pbf
```

```text
✓ All rules passed.

──────────────────────────────────
  0 errors, 0 warnings in 1 file (28ms)
```

Exit code `0` — CI will pass.

## JSON Output

For programmatic access to diagnostics:

```bash
tileguard check ./tile.pbf --reporter json
```

```json
{
  "summary": { "pass": false, "errors": 1, "warnings": 1 },
  "diagnostics": [
    {
      "ruleId": "tile/self-intersection",
      "severity": "error",
      "message": "Geometry in layer \"landuse\", feature 42 has intersecting segments 1 and 4.",
      "location": { "layer": "landuse", "featureIndex": 42, "partIndex": 0 },
      "suggestion": "Simplify or repair this geometry so non-adjacent segments do not cross."
    }
  ]
}
```

## What You Learned

1. `tileguard check` decodes and validates tiles automatically
2. Every diagnostic tells you the rule, location, and fix
3. Errors fail the build; warnings don't
4. You can configure severity per-rule or disable rules entirely
5. JSON output enables CI automation

## What Next?

- [**Concepts ›**](/learn/concepts) — Understand rules and diagnostics in depth
- [**Validating Tiles ›**](/guides/validating-tiles) — Deep dive into tile validation
- [**CI / GitHub Actions ›**](/guides/ci-github-actions) — Automate quality gates
