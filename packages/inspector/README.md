# @tileguard/inspector

Visual debugging environment for TileGuard. A browser-based tool that renders vector tile geometry on an HTML Canvas, overlays diagnostics, and provides investigation workflows for comparison and regression analysis.

> **Private package** — not published to npm. Used for development and conference demonstrations.

---

## Quick Start

```bash
# From the monorepo root
pnpm --filter @tileguard/inspector dev

# Opens at http://localhost:5173
```

---

## What It Does

The Inspector provides a visual interface for investigating TileGuard analysis results:

- **Feature Explorer** — Browse tile layers and features, inspect properties and geometry
- **Diagnostics View** — See rule violations overlaid on the tile canvas with camera-to-diagnostic navigation
- **Comparison** — Side-by-side structural diff of two tiles with feature matching
- **Regression Analysis** — Ranked regression candidates with confidence scores and evidence
- **Statistics** — Layer/feature/vertex counts and distributions
- **Reports** — Generate Markdown/HTML/JSON engineering reports
- **Style Explorer** — Visualize style rule violations

---

## Architecture

```
React App (main.tsx)
    │
    ├── Components (UI panels, dialogs, workspace tabs)
    ├── Store (Zustand-based state management)
    ├── Renderer (Canvas 2D — geometry rendering, overlays, hit-testing)
    ├── Services (search, export, settings, shortcuts, workspace)
    ├── Analysis (@tileguard/analysis integration)
    ├── Comparison (comparison workflows)
    ├── Viewport (camera, animation, spatial index)
    └── Interaction (mouse/keyboard handlers, selection)
```

### Key Subsystems

| Directory | Purpose |
|:----------|:--------|
| `src/components/` | React UI components (panels, tabs, dialogs) |
| `src/store/` | Global state management |
| `src/render/` | Canvas 2D rendering engine |
| `src/renderer/` | Geometry rendering, coordinate transforms |
| `src/services/` | Business logic services (search, export, shortcuts) |
| `src/analysis/` | Integration with `@tileguard/analysis` |
| `src/comparison/` | Tile comparison UI and logic |
| `src/viewport/` | Camera management, zoom, pan |
| `src/interaction/` | User input handling |
| `src/hittest/` | Spatial feature picking |
| `src/overlay/` | Diagnostic and annotation overlays |
| `src/animation/` | Camera animation (fly-to-feature) |
| `src/performance/` | FPS monitoring, profiling |

---

## Viewport Engine

The viewport maps between two coordinate spaces:

```
Tile Space   (integer grid 0 … extent, default 4096)
    │  tileToScreen(point)
    ▼
Screen Space (0 … canvas.width, 0 … canvas.height)
    │  screenToTile(point)
    ▲
```

The transform is a 2×3 affine matrix (uniform scale + translation):

```
screenX = tileX × zoom + panX
screenY = tileY × zoom + panY

tileX = (screenX − panX) / zoom
tileY = (screenY − panY) / zoom
```

**Round-trip invariant:** `screenToTile(tileToScreen(P)) ≈ P` within ±1e-6 tile units.

**Focal-point zoom:** when zooming by factor `f` around a screen-space focal point `F`, the focal tile coordinate must remain fixed on screen:

```
focalTile = screenToTile(F)
newPanX   = F.x − focalTile.x × newZoom
newPanY   = F.y − focalTile.y × newZoom
```

The `Viewport` API is immutable — every mutation (`pan`, `zoomAt`, `fitBounds`, `resize`) returns a new instance. The original is never modified, making it safe to pass as React state.

Zoom is clamped to `[minZoom, maxZoom]` (defaults: 0.25 – 64). Tile coordinates outside the extent (negative or > 4096) are valid — they represent the clipping buffer region used by MVT tile generators.

---

## Development

```bash
# Start dev server with hot reload
pnpm --filter @tileguard/inspector dev

# Run tests
pnpm --filter @tileguard/inspector test

# Build for production
pnpm --filter @tileguard/inspector build

# Preview production build
pnpm --filter @tileguard/inspector preview
```

---

## Testing

**35 test files** covering:

- Canvas renderer (mock canvas context)
- Store state management
- Services (search, export, shortcuts, settings, workspace)
- Comparison and regression logic
- Hit testing and spatial indexing
- Viewport transformations
- Performance profiling
- Integration tests (full investigation workflows)

```bash
pnpm --filter @tileguard/inspector test
```

---

## Dependencies

| Category | Key Dependencies |
|:---------|:-----------------|
| Framework | React 18, ReactDOM |
| UI | Radix UI (scroll, tooltip, dialog), cmdk, Framer Motion, Lucide icons |
| State | Zustand (via React context) |
| Styling | Tailwind CSS 4, PostCSS |
| Build | Vite 5, TypeScript 5.4 |
| Testing | Vitest |
| Internal | `@tileguard/core`, `@tileguard/analysis`, `@tileguard/reporters`, `@tileguard/tile-rules`, `@tileguard/style-rules` |

---

## Keyboard Shortcuts

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+1` – `Ctrl+7` | Switch workspace tabs |
| `Ctrl+K` | Command palette |
| `Ctrl+/` | Global search |
| `Ctrl+`` ` | Engineering console |
| `Ctrl+Shift+P` | Presentation mode (large fonts, high contrast) |

---

## Demo Datasets

The Inspector ships with 6 bundled demo tiles (in `/demo/tokyo/`) for offline conference presentations. Click any card on the Welcome page to load a pre-configured investigation.
