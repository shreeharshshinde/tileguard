# Inspecting Findings

The TileGuard Inspector is a browser-based visual debugging environment. When the CLI tells you *what* is wrong, the Inspector shows you *where* — rendering geometry on canvas with diagnostic overlays pinpointing the exact problem.

## Opening the Inspector

Launch the Inspector from your project:

```bash
cd packages/inspector
pnpm dev
```

This opens a browser window with the Inspector application.

## Loading a Tile

1. **Drop a `.pbf` file** onto the Inspector window, or
2. **Click "Open File"** and select a tile, or
3. **Choose a demo tile** from the home screen gallery

The Inspector decodes the tile, runs all validation rules, and renders the geometry immediately.

## The Workspace

Once a tile is loaded, the workspace provides:

```text
┌─────────────────────────────────────────────────────────┐
│  Header (breadcrumb, search, settings)                  │
├──────────┬──────────────────────────────┬───────────────┤
│  Layer   │                              │  Feature      │
│  Explorer│       Canvas                 │  Inspector    │
│          │    (geometry rendering)      │               │
│  - water │                              │  Properties   │
│  - roads │    [diagnostic overlays]     │  Geometry     │
│  - bldgs │                              │  Coordinates  │
├──────────┴──────────────────────────────┴───────────────┤
│  Status bar (file, layers, features, zoom, fps)         │
└─────────────────────────────────────────────────────────┘
```

### Left Panel: Layer Explorer

Lists all layers in the tile with feature counts. Click a layer to isolate it visually — other layers dim to reduced opacity.

### Center: Canvas

Renders all geometry using the HTML5 Canvas 2D API with:
- **Polygons** — filled with layer-specific colors
- **Lines** — stroked paths
- **Points** — circular markers
- **Diagnostic overlays** — error highlights on top

### Right Panel: Feature Inspector

When you select a feature, shows:
- **Summary** — layer, type, vertex count
- **Properties** — all feature attributes
- **Geometry** — ring structure, winding direction
- **Coordinates** — raw vertex data
- **JSON** — full feature as JSON

## Navigating Diagnostics

Switch to the **Diagnose** tab (sidebar or `Ctrl+2`) to see all findings:

```text
┌─────────────────────────────────────────────────────────┐
│  Tile Health: 1 error, 1 warning                        │
├──────────┬──────────────────────────────┬───────────────┤
│Diagnostic│                              │ Rule          │
│Explorer  │       Canvas                 │ Inspector     │
│          │                              │               │
│ ✗ self-  │    [segments highlighted     │ What it checks│
│   inter  │     in red on canvas]        │ Why it matters│
│ ⚠ winding│                              │ Remediation   │
│          │                              │               │
└──────────┴──────────────────────────────┴───────────────┘
```

- **Left**: List of diagnostics grouped by severity
- **Center**: Canvas with overlay highlighting the affected geometry
- **Right**: Rule documentation and remediation guidance

Click a diagnostic → the canvas zooms to the affected feature and highlights the exact problem geometry.

## Diagnostic Overlays

Each rule type renders a specific visual overlay:

| Rule | Overlay |
|:-----|:--------|
| `tile/self-intersection` | Red segments at the crossing + ✕ marker at intersection point |
| `tile/unclosed-ring` | Full ring drawn + red dot at the gap |
| `tile/winding-order` | Ring with directional arrows showing incorrect direction |
| `tile/hole-containment` | Outer ring + escaped hole vertices marked red |
| `tile/coordinate-range` | Out-of-range vertex as red dot |
| `tile/zero-area-ring` | Collapsed ring shown as point marker |
| `tile/degenerate-geometry` | Vertices marked at near-duplicate positions |

The overlays render as a **top pass** above all geometry, ensuring they're always visible regardless of zoom level.

## Investigation Workflow

The Inspector supports a structured investigation workflow:

1. **Load tile** — See the full geometry rendered
2. **Check health** — Switch to Diagnose to see findings
3. **Inspect finding** — Click a diagnostic to zoom to it
4. **Examine feature** — View properties, geometry, coordinates
5. **Understand rule** — Read the rule documentation in the right panel
6. **Compare** — If needed, compare against a baseline tile

## Keyboard Shortcuts

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+1` | Switch to Explore workspace |
| `Ctrl+2` | Switch to Diagnose workspace |
| `Ctrl+3` | Switch to Statistics |
| `Ctrl+K` | Open Command Palette |
| `Ctrl+/` | Global Search |
| `Escape` | Clear selection |
| `?` | Show all shortcuts |

## Statistics View

Switch to **Statistics** (`Ctrl+3`) for aggregate views:

- Feature count by layer
- Geometry type distribution
- Diagnostic count by severity and rule
- Layer size breakdown

## What Next?

- [**Comparing Tiles →**](/guides/comparing-tiles) — Diff between tile versions
- [**Validating Tiles →**](/guides/validating-tiles) — CLI validation guide
- [**Rules Reference →**](/rules/) — All 21 rules
