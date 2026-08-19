# What is TileGuard?

TileGuard is a **rule-based validation framework** for vector tiles and MapLibre style specifications. It applies the same engineering discipline that ESLint brings to JavaScript — to the geospatial stack.

## The Problem

Modern web maps render vector tiles client-side. The tile data is the truth — if a polygon has an unclosed ring, a self-intersection, or incorrect winding order, the rendering engine has to guess. Different renderers guess differently. The result: visual glitches, broken extrusions, missing features, and silent data corruption.

**Rendering tests** can tell you something *looks* wrong. But they can't tell you:

- Which geometry in which layer has the error?
- Is it a self-intersection or a winding order issue?
- Was this bug introduced in this tile generation run, or was it always there?
- Which features regressed between v1 and v2?

You're left manually inspecting tiles in QGIS, writing ad-hoc scripts, or hoping someone notices in production.

## The Solution

TileGuard provides **deterministic, automated validation** with structured diagnostics:

```text
Input                    TileGuard                     Output
─────────────────────    ──────────────────────        ─────────────────
Vector Tiles (.pbf)  →   Decode → Apply Rules →        Diagnostics
MapLibre Styles      →   Parse  → Apply Rules →        (rule, severity,
                                                         location, message,
                                                         suggestion)
```

Every finding is machine-readable. Every finding is actionable. Every finding tells you exactly where the problem is and how to fix it.

## Core Principles

### Rules, Not Monolithic Validators

TileGuard doesn't have a single `validate()` function that checks everything. Each concern is a separate **rule** — a plain TypeScript object under 25 lines:

| Rule | What it catches |
|:-----|:----------------|
| `tile/self-intersection` | Polygon edges that cross themselves |
| `tile/winding-order` | Rings wound in the wrong direction |
| `tile/hole-containment` | Holes outside their parent polygon |
| `style/known-source` | Layers referencing undeclared sources |

Rules run independently. You enable, disable, or configure each one. You can write new rules without touching existing ones.

### Structured Diagnostics

Every diagnostic is a data structure, not a string:

```typescript
{
  ruleId: 'tile/self-intersection',
  severity: 'error',
  message: 'Geometry has intersecting segments 1 and 4.',
  location: { layer: 'buildings', featureIndex: 42, partIndex: 0 },
  suggestion: 'Simplify or repair this geometry.',
  data: { segments: [1, 4] }
}
```

This means:
- **CI** can parse it as JSON and fail builds
- **The Inspector** can highlight the exact segment on canvas
- **Reports** can aggregate findings by severity and layer
- **Custom tooling** can consume it programmatically

### Convention-Aware

TileGuard auto-detects whether tiles use the **MVT convention** (outer rings clockwise) or the **OGC/GeoJSON convention** (outer rings counter-clockwise). It won't give you false positives on Planetiler or OpenMapTiles output.

### Separation of Concerns

```text
Rules never print.
Reporters never validate.
The Inspector never runs rules.
```

Adding a rule never touches formatting. Adding a reporter never touches validation. Adding a visualization never touches diagnostics. Each layer has one job.

## Who Is It For?

- **Tile pipeline engineers** — Catch geometry errors before production
- **Style authors** — Validate styles match your source definitions
- **CI/CD systems** — Automated quality gates on pull requests
- **Data teams** — Compare tile versions, detect regressions, generate evidence
- **Open-source contributors** — Extend with custom rules in ~25 lines

## What Next?

- [**Quick Start →**](/getting-started/quick-start) — Run TileGuard in 5 minutes
- [**How It Works →**](/learn/how-it-works) — Architecture and pipeline
- [**View All Rules →**](/rules/) — See what TileGuard catches
