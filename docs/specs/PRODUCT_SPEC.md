# TileGuard Inspector — Product Specification

**Version:** 1.0  
**Status:** Authoritative  
**Scope:** Inspector UI (packages/inspector) — all behaviour, navigation, layout, and interaction  
**Does not cover:** CLI, core engine, rule packages, reporters

This document is the single source of truth for how the TileGuard Inspector behaves.  
Every implementation decision must be traceable to a section here.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Information Architecture](#2-information-architecture)
3. [Application Lifecycle](#3-application-lifecycle)
4. [Navigation Model](#4-navigation-model)
5. [Workspace Specifications](#5-workspace-specifications)
6. [Sequential Engineering Workflow](#6-sequential-engineering-workflow)
7. [Session Management](#7-session-management)
8. [State Architecture](#8-state-architecture)
9. [Visual Design System](#9-visual-design-system)
10. [Interaction Guidelines](#10-interaction-guidelines)
11. [Component Hierarchy](#11-component-hierarchy)
12. [Demo Workflow](#12-demo-workflow)
13. [Accessibility Requirements](#13-accessibility-requirements)
14. [Performance Requirements](#14-performance-requirements)
15. [Future Extension Strategy](#15-future-extension-strategy)
16. [UI Technology Stack](#16-ui-technology-stack)


---

## 1. Product Vision

### One sentence

TileGuard Inspector is the engineering workstation where geospatial developers load vector tiles, understand their structure, diagnose problems, compare versions, investigate regressions, and share findings — without leaving a single application.

### The problem it solves

Today a geospatial engineer investigating a tile regression navigates between: a tile server to download the file, a hex editor or CLI tool to decode it, a MapLibre dev environment to render it, a spreadsheet to track which features changed, and a screen-capture tool to produce a report. None of these tools talk to each other. Every context switch loses state.

The Inspector closes all of those gaps in one workspace.

### What it is not

- Not a tile server
- Not a rendering engine
- Not a data editor
- Not a GIS application

It is a **read-only quality analysis workspace** for vector tiles and MapLibre styles.

### The one missing concept (added in this spec)

**Home is a first-class destination.**

Before this spec, TileGuard had no explicit "start over" concept. Once a tile was loaded you were inside the application with no obvious return path. This spec introduces Home as a persistent, always-reachable destination that anchors the entire lifecycle.

The lifecycle is now:

```
Launch → Home → Session → [Explore → Analyze → Compare → Investigate → Share] → Home
```

Returning Home asks whether to preserve or discard the current session, then returns to the Welcome page. This transforms TileGuard from a collection of tools into an application with a clear beginning, middle, and end.

---

## 2. Information Architecture

### 2.1 Current state assessment

The current sidebar has nine items:

| Current label | Actual responsibility | Problem |
|:---|:---|:---|
| Welcome | Home / file open | Disappears when a tile is loaded |
| Inspector | Canvas + feature panel | Ambiguous — the whole app is an "inspector" |
| Diagnostics | Rule violations | Correct responsibility |
| Statistics | Tile metadata | Correct responsibility |
| Style | Style lint | Correct but siloed from tile workflow |
| Compare | Tile diff | Feature-oriented, not workflow-oriented |
| Regression | Diff analysis | Only reachable after Compare — not obvious |
| Reports | Export | Terminal workflow step, buried |
| Settings | Config | Should be persistent, not a page |

Three problems: the navigation is feature-oriented (what does this tab do?) rather than workflow-oriented (what am I trying to accomplish?). Home disappears. Regression is only discoverable if you already know Compare exists.

### 2.2 Revised navigation hierarchy

Navigation is split into three tiers:

**Tier 1 — Always present (persistent controls)**
- Home button (top of sidebar, always visible, navigates to Welcome)
- Settings icon (bottom of sidebar, opens settings overlay, never a full page)
- Presentation Mode toggle (in AppHeader)

**Tier 2 — Primary workflow navigation (sidebar)**

| ID | Label | Icon | Responsibility |
|:---|:---|:---|:---|
| `explore` | Explore | `Crosshair` | Canvas + Feature Explorer + Feature Inspector |
| `diagnostics` | Diagnose | `AlertTriangle` | Tile Health + Diagnostic Explorer + Rule Details |
| `statistics` | Statistics | `BarChart3` | Layer breakdown, geometry distribution, feature counts |
| `style` | Style | `FileJson` | MapLibre style lint |
| `compare` | Compare | `GitCompare` | Side-by-side tile diff |
| `regression` | Regression | `SearchCode` | Root cause investigation |
| *(plugins)* | *(plugin label)* | *(plugin icon)* | Third-party analysis pages, inserted here |
| `reports` | Report | `FileOutput` | Export findings |

**Plugin ordering rule:** Plugin pages are inserted between Regression and Report. Report is invariantly the final workflow step regardless of how many plugins are installed. The full sidebar order is: Explore → Diagnose → Statistics → Style → Compare → Regression → [Plugins] → Report → [Settings gear / Home button].

**Tier 3 — Contextual workflow guidance (in-page)**
- "Next step" affordances at the bottom of each page (see §6)
- Breadcrumb context in page headers (see §4.3)

### 2.3 Page responsibility matrix

Each page has exactly one primary question it answers.

| Page | Primary question | Secondary question | Canvas? |
|:---|:---|:---|:---|
| Home | Where do I start? | What did I work on recently? | No |
| Explore | What is inside this tile? | Is anything selected? | Yes — primary |
| Diagnose | What is wrong with this tile? | Why is it wrong? | Yes — secondary |
| Statistics | How is this tile structured? | How does it compare to expectations? | No |
| Style | Does this style pass validation? | Which rules fired? | No |
| Compare | What changed between two tiles? | Where did it change? | Yes — split view |
| Regression | Which change is a regression? | What is the evidence? | Yes — evidence view |
| Report | What should I share? | In what format? | No |
| Settings | How is TileGuard configured? | (overlay, not a page) | N/A |

**Rule:** no two pages answer the same primary question. If they do, they should be merged.

### 2.4 Renamed tabs

| Old | New | Reason |
|:---|:---|:---|
| `inspector` | `explore` | "Inspector" is the whole app name. "Explore" describes the action. |
| `style-explorer` | `style` | Shorter, consistent with other tab labels |
| `welcome` | `home` | "Welcome" implies one-time onboarding. "Home" is a permanent destination. |

### 2.5 Workflow dependency graph

```
Home
 │
 ├─── Explore ──────────────────────────────► Diagnose
 │         └── (tile loaded)                      │
 │                                                 ▼
 ├─── Statistics ◄─────── (any tile loaded) ── Compare ◄── (two tiles)
 │                                                 │
 ├─── Style ◄──────────── (style file loaded)  Regression ◄── (comparison result)
 │                                                 │
 └─── Report ◄─────────── (any analysis)       Report
```

Dependencies:
- Explore, Diagnose, Statistics require: one tile loaded
- Compare requires: two tiles loaded
- Regression requires: a comparison result
- Report accepts: any analysis result (tile, comparison, or regression)
- Style requires: a style file loaded
- Home, Settings require: nothing

---

## 3. Application Lifecycle

### 3.1 Lifecycle state machine

```
┌─────────────────────────────────────────────────────┐
│                    IDLE (Home)                      │
│   No tile loaded. Welcome page visible.             │
│   Demo catalog and recent files available.          │
└─────────────────────────────────────────────────────┘
        │ Load tile / Open demo
        ▼
┌─────────────────────────────────────────────────────┐
│                   LOADING                           │
│   Tile decode in progress. LoadingOverlay shown.    │
│   Navigation disabled (except Home = cancel).       │
└─────────────────────────────────────────────────────┘
        │ Success             │ Error
        ▼                     ▼
┌──────────────────┐   ┌──────────────────────────────┐
│  TILE LOADED     │   │  LOAD ERROR                  │
│  Workspace live  │   │  Error message + retry shown │
└──────────────────┘   └──────────────────────────────┘
        │
        ├─── User opens second tile for comparison
        │         ▼
        │   COMPARISON READY (both tiles loaded)
        │
        ├─── User runs comparison
        │         ▼
        │   COMPARISON COMPLETE (diff result available)
        │
        ├─── User runs regression
        │         ▼
        │   REGRESSION COMPLETE (candidates available)
        │
        └─── User navigates Home
                  ▼
        ┌──────────────────────────────────────────────┐
        │  HOME TRANSITION                             │
        │  If unsaved state exists: confirm dialog     │
        │  "Discard session and return to Home?"       │
        │  Cancel: stay in workspace                   │
        │  Confirm: dispose store, return to IDLE      │
        └──────────────────────────────────────────────┘
```

### 3.2 Session model

A **session** is the period between loading the first tile and returning to Home. Sessions are not persisted across browser refreshes.

Within a session:
- Tile data is held in `InspectorStore`
- Comparison result is held in Workspace React state
- Regression result is derived from comparison result
- Viewport state (zoom, pan) is held in `WorkspaceService`
- Active tab is held in `WorkspaceService`

A session ends when:
- The user navigates to Home and confirms the transition
- The browser tab is closed or refreshed

### 3.3 Loading another tile within a session

When a tile is already loaded and the user opens another tile:
- Ask: "Replace current tile or open in Compare?"
- Replace: dispose current tile state, load new tile, navigate to Explore
- Open in Compare: load as tile B in comparison, navigate to Compare

This prompt prevents accidental state loss.

### 3.4 Workspace reset

"Start Over" is always available from Home. On trigger:
1. `InspectorStore.dispose()` called
2. Comparison and regression state cleared
3. WorkspaceService reset to defaults (tab: `home`, viewport: null)
4. Application returns to Home (IDLE state)

---

## 4. Navigation Model

### 4.1 Navigation principles

1. **Every page answers three questions:** Where am I? Where can I go next? How do I go back?
2. **Home is always reachable.** The Home button in the sidebar is always visible and always functional.
3. **No dead ends.** Every page has at least one outgoing navigation affordance.
4. **State is preserved on lateral navigation.** Switching from Explore to Diagnose preserves canvas zoom, selected feature, and search query.
5. **Back navigation is explicit.** There is no browser back-button dependency. Back is a UI affordance in the page header.

### 4.2 Primary navigation (sidebar)

The sidebar is always visible. It shows:

**Top group — workflow pages (require tile loaded to be active):**
- Explore
- Diagnose
- Statistics
- Style

**Middle group — analysis pages (require prior state):**
- Compare
- Regression
- Report

**Bottom group — persistent actions:**
- Settings (gear icon — opens overlay, not a page)
- Home (house icon — always at very bottom, pinned)

Inactive pages (no tile loaded) are shown with reduced opacity and a tooltip explaining the requirement. They are not hidden — hiding creates the impression they don't exist.

### 4.3 Page header navigation

Every canvas-workspace page has a header that includes:

```
[← Back]  [Page Title]  [Subtitle/Context]  [Next Step →]
```

- **Back** — returns to the previous page in the workflow sequence, or to Home if at the start
- **Page Title** — the page name with its accent colour
- **Subtitle** — the primary question this page answers (e.g. "What is inside this tile?")
- **Next Step** — a contextual affordance to advance the workflow (e.g. "Found problems? → Diagnose")

Next Step is only shown when relevant state exists (e.g. Next Step to Compare only appears when two tiles are available).

### 4.4 Keyboard navigation

Full keyboard navigation between pages:

| Shortcut | Action |
|:---|:---|
| `Ctrl+H` or `Alt+Home` | Return to Home |
| `Ctrl+1` | Explore |
| `Ctrl+2` | Diagnose |
| `Ctrl+3` | Statistics |
| `Ctrl+4` | Style |
| `Ctrl+5` | Compare |
| `Ctrl+6` | Regression |
| `Ctrl+7` | Report |
| `Ctrl+,` | Settings overlay |
| `Ctrl+Shift+P` | Presentation mode |
| `?` | Keyboard shortcut reference overlay |
| `Esc` | Close overlay / clear selection |

### 4.5 History model

TileGuard maintains a lightweight in-memory navigation history (not the browser History API). This enables:

- `←` Back button in page headers
- The "came from" context in page subtitles
- The breadcrumb in Report ("from comparison on tokyo.pbf vs manhattan.pbf")

History is a capped stack of `WorkspaceTab` values:
- Push on every tab navigation
- Pop on Back button press
- **Maximum depth: 20 entries.** When the 21st entry would be pushed, the oldest entry (index 0) is removed first (`shift()`). A `WorkspaceTab` string is negligible in memory; the cap exists to prevent unbounded growth, not to save memory.
- History is cleared entirely when returning to Home (session end)

---

## 5. Workspace Specifications

Each workspace is specified by: purpose, hero component, panels, states, and keyboard shortcuts.

### 5.1 Home

**Purpose:** The start and end of every session. Loads data, shows recent history, provides demo access.  
**Primary question:** Where do I start?  
**Canvas:** No

**Layout:**
```
┌─────────────────────────────────────┬──────────────────┐
│  Hero: TileGuard wordmark + tagline │  Quick Start     │
│                                     │  ─────────────── │
│  Demo Catalog (grid of 6 cards)     │  Keyboard ref    │
│                                     │                  │
│  ── or open your own file ──        │  Recent sessions │
│                                     │                  │
│  Drop Zone + Open File button       │                  │
└─────────────────────────────────────┴──────────────────┘
```

**Empty state:** This IS the empty state. Always shown before a session starts.  
**Loading state:** Demo card shows spinner while fetching file.  
**Error state:** Inline error below the failed card. Other cards remain functional.

**Interactions:**
- Click demo card → one-click load (no file picker)
- Drag .pbf onto drop zone → load tile, navigate to Explore
- Click "Open File" → OS file picker
- Click recent session item → re-opens the file picker pre-filtered to that filename

**After load:** Navigate automatically to Explore.

---

### 5.2 Explore

**Purpose:** Understand what is inside a loaded tile. Feature-level browsing and inspection.  
**Primary question:** What is inside this tile?  
**Canvas:** Yes — primary focus

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  [← Home]  EXPLORE  What is inside this tile?  [→ Diagnose]     │
├──────────────────────┬───────────────────────┬───────────────────┤
│  Feature Explorer    │                       │  Feature          │
│  ─────────────────── │      Canvas           │  Inspector        │
│  [Search features…]  │                       │  ─────────────── │
│                      │  ← primary surface →  │  (empty until    │
│  Layers · 8          │                       │   feature        │
│  ▸ water   2,410     │                       │   selected)      │
│  ▸ building 1,823    │                       │                  │
│  ▸ road      942     │                       │  Feature         │
│  ...                 │                       │  Layer           │
│  ─────────────────── │                       │  Geometry        │
│  Selection           │                       │  Properties      │
│  building[42] Polygon│                       │  Coordinates     │
└──────────────────────┴───────────────────────┴───────────────────┘
```

**Page identity:** Blue accent. Title "Explore".  
**Hero:** Canvas — pan, zoom, hover, click.

**Left panel (Feature Explorer):**
- Search input (full-text across layer names and property values)
- Layer list with feature counts, clickable to filter canvas
- Selection section showing selected feature summary + clear button

**Right panel (Feature Inspector):**
- Empty state: "Click a feature on the canvas to inspect it"
- Populated: Feature header (layer, ID, type) → Properties table → Geometry section → Coordinates
- Feature diagnostics shown inline at the bottom of the right panel (secondary — linking to Diagnose)

**Canvas toolbar:** Collapse left panel | Collapse right panel | Reset view | Search | Settings

**Empty state (no tile loaded):** Drop zone overlay on canvas. Message: "Load a tile to begin exploring."

**Loading state:** LoadingOverlay on canvas with step progress.

**Next Step affordance:** "Found problems? → Diagnose" — shown when diagnostics > 0 after load.

**Keyboard shortcuts:**
- `F` — fit selected feature to canvas
- `R` — reset view to tile bounds
- `Esc` — clear selection
- `Ctrl+F` — focus search input
- `Ctrl+Shift+V` — toggle vertex display
- `Ctrl+B` — toggle tile bounds
- `Ctrl+H` — toggle hover highlight

---

### 5.3 Diagnose

**Purpose:** Identify and understand rule violations in the loaded tile.  
**Primary question:** What is wrong with this tile?  
**Canvas:** Yes — secondary (shows affected geometry)

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  [← Explore]  DIAGNOSE  What is wrong?  [→ Compare]             │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Tile Health: [2 Errors] [1 Warning]  ✗ Not passing     │    │
│  └──────────────────────────────────────────────────────────┘    │
├──────────────────────┬───────────────────────┬───────────────────┤
│  Diagnostic Explorer │                       │  Rule Details     │
│  ─────────────────── │      Canvas           │  ─────────────── │
│  Filter toolbar      │                       │  Rule ID          │
│                      │  (click diagnostic →  │  Explanation      │
│  ▸ Errors  (2)       │   camera animates)    │  Suggested fix    │
│    · self-intersect  │                       │  Location         │
│  ▸ Warnings (1)      │                       │  Documentation    │
│    · unclosed-ring   │                       │   link (future)  │
└──────────────────────┴───────────────────────┴───────────────────┘
```

**Page identity:** Red accent. Title "Diagnose".  
**Hero:** Tile Health bar — the first thing the eye lands on.

**Tile Health bar states:**
- No tile: "Load a tile to see diagnostics"
- Clean: green "✓ Tile is clean" 
- Errors: red badge count + "✗ Not passing"
- Warnings only: amber badge count + "⚠ Warnings present"

**Left panel (Diagnostic Explorer):**
- Filter toolbar: severity toggles (E/W/I), layer filter, geometry type filter, sort
- Grouped list: Errors → Warnings → Info, each collapsible
- Selecting a row: camera animates to feature + right panel updates

**Right panel (Rule Details):**
- Empty state: "Select a diagnostic to see rule details"
- Populated: rule title, rule ID (mono), severity badge, diagnostic message, explanation paragraph, suggested fix, feature location

**Canvas:** Same singleton canvas. Shows affected feature highlighted when diagnostic selected.

**Next Step affordance:** "Ready to compare versions? → Compare" — always shown when tile is loaded.

**Empty state (no tile):** Prominent drop zone + message in canvas. Tile Health shows "Load a tile" state.

---

### 5.4 Statistics

**Purpose:** Understand the structural composition of the loaded tile.  
**Primary question:** How is this tile structured?  
**Canvas:** No — data display only

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  [← Explore]  STATISTICS  How is this tile structured?  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 8 Layers │ │7,412 Feat│ │ 0 Errors │ │ 403 KB   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│  Layer breakdown table  │  Geometry distribution chart  │
│                         │                               │
│  Diagnostic summary     │  Feature count by layer       │
└──────────────────────────────────────────────────────────┘
```

**Page identity:** Purple accent. Title "Statistics".

**No canvas.** Full-width data panels.

**Stat cards (top row):** Layer count, feature count, diagnostic count (with severity colour), file size.

**Layer breakdown table:** name, feature count, geometry types, has diagnostics flag.

**Geometry chart:** Stacked bar per layer showing Point / LineString / Polygon proportions.

**Diagnostic summary:** Error count, warning count, info count. Click to navigate to Diagnose.

**Empty state:** "Load a tile to see statistics."

**Next Step:** "Ready to compare? → Compare" or "See problems → Diagnose" (whichever is relevant).

---

### 5.5 Style

**Purpose:** Validate a MapLibre style specification against 9 lint rules.  
**Primary question:** Does this style pass validation?  
**Canvas:** No

**Layout:**
```
┌────────────────────────────────────────────────────────┐
│  [← Home]  STYLE  Does this style pass validation?    │
├────────────────────────────────────────────────────────┤
│  [Open style.json]  or  drag and drop                  │
│                                                        │
│  Style Health: [3 Errors] [0 Warnings]  ✗ Not passing │
│                                                        │
│  Rule results list (rule ID, severity, message)        │
│  Click rule → full explanation in right panel          │
└────────────────────────────────────────────────────────┘
```

**Page identity:** Cyan accent. Title "Style".  
**Not dependent on tile session.** Can run standalone.

**Empty state:** File picker prompt. "Drop a style.json to validate it."

---

### 5.6 Compare

**Purpose:** Structural diff between two tile versions.  
**Primary question:** What changed between these tiles?  
**Canvas:** Yes — side-by-side or overlay view (future: split canvas)

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  [← Diagnose]  COMPARE  What changed?  [→ Regression]           │
├──────────────────────────────────────────────────────────────────┤
│  Tile A: [tokyo-before.pbf ▾]    Tile B: [tokyo-after.pbf ▾]    │
│                    [Run Comparison]                               │
├────────────────────────┬─────────────────────────────────────────┤
│  Difference Explorer   │  Canvas (shows changed features)        │
│  ─────────────────     │                                         │
│  ▸ water    +2 −0 ~1   │                                         │
│  ▸ building +0 −5 ~12  │                                         │
│  ▸ road     +1 −1 ~0   │                                         │
│                        │                                         │
│  [Selected diff item]  │                                         │
│  before / after detail │                                         │
└────────────────────────┴─────────────────────────────────────────┘
```

**Page identity:** Amber accent. Title "Compare".

**Tile selectors:** Tile A and Tile B. Pre-populated when arriving from a two-tile demo load.

**Difference Explorer:** Layer-by-layer view of added (+), removed (−), and changed (~) features.

**Empty state (no tiles):** "Load two tiles to compare them."  
**Empty state (one tile):** "Add a second tile to run a comparison."  
**Empty state (tiles loaded, not run):** "Click Run Comparison to see differences."

**Next Step:** "Found a regression? → Investigate" — shown when comparison result exists.

---

### 5.7 Regression

**Purpose:** Identify which differences are regressions (unintended changes) vs. intentional improvements.  
**Primary question:** Which change is a regression?  
**Canvas:** Yes — evidence view

**Requires:** A completed comparison result.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  [← Compare]  REGRESSION  Which change is a regression?         │
├────────────────────────┬─────────────────────────────────────────┤
│  Regression Candidates │  Evidence Panel                         │
│  ─────────────────     │  ─────────────                          │
│  Ranked by confidence  │  Geometry diff visualization            │
│                        │  Property delta table                   │
│  ● 94% road layer      │  Confidence breakdown                   │
│    5 features missing  │  Recommendation                         │
│  ● 71% building        │                                         │
│    12 props changed    │                                         │
└────────────────────────┴─────────────────────────────────────────┘
```

**Page identity:** Violet accent. Title "Regression".

**Empty state (no comparison):** "Run a comparison first to investigate regressions." Link to Compare.

**Next Step:** "Ready to share findings? → Report"

---

### 5.8 Report

**Purpose:** Compile and export analysis findings.  
**Primary question:** What should I share?  
**Canvas:** No

**Accepts:** Any combination of tile analysis, comparison, regression result.

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  [← Regression]  REPORT  What should I share?           │
├──────────────────────────────────────────────────────────┤
│  Report contents:                                        │
│  ☑ Tile summary (tokyo.pbf — 8 layers, 7412 features)   │
│  ☑ Diagnostics (2 errors, 1 warning)                    │
│  ☑ Comparison (vs manhattan.pbf)                        │
│  ☑ Regression findings (1 high-confidence candidate)    │
│                                                          │
│  Format: ○ Text  ○ JSON  ○ Markdown                      │
│                                                          │
│  [Generate Report]  [Copy to Clipboard]  [Download]      │
└──────────────────────────────────────────────────────────┘
```

**Page identity:** Teal accent. Title "Report".

**Empty state:** "Complete at least one analysis to generate a report." Shows which analyses are available.

**Next Step:** "Start a new session → Home"

---

### 5.9 Settings (overlay, not a page)

**Purpose:** Configure TileGuard behaviour.  
**Trigger:** Gear icon in sidebar bottom, or `Ctrl+,`  
**Canvas:** Not applicable — overlay on top of current page

Settings is a **slide-in overlay panel** anchored to the right side of the screen. It never replaces the current page. The user can see the canvas behind it and close it with `Esc` or the × button.

**Sections:**
- Render: hover highlight, vertex display, tile bounds, selection thickness
- Diagnostics: default severity filter, rule enable/disable overrides
- Appearance: (future) theme selection
- About: version, licence, GitHub link

**Width:** `var(--tg-sidebar-width)`. This ensures settings automatically scales with Presentation Mode (which enlarges `--tg-sidebar-width` to 360px) without any additional code. Never hardcode a pixel width for the settings overlay.

---

## 6. Sequential Engineering Workflow

The navigation model must feel like a workflow, not a menu. Each page naturally leads to the next.

### 6.1 The standard investigation path

```
Home
 │  Load tile (one click from demo catalog)
 ▼
Explore
 │  Canvas visible immediately. Feature Explorer populates.
 │  If diagnostics > 0: banner "2 errors found → Diagnose"
 ▼
Diagnose
 │  Tile Health shows error count. Click error → camera jump + Rule Details.
 │  "Ready to compare versions? → Compare" affordance.
 ▼
Compare
 │  Tile A pre-loaded. User opens Tile B. Run Comparison.
 │  "Found a regression? → Investigate" affordance.
 ▼
Regression
 │  Ranked candidates with confidence scores. Click for evidence.
 │  "Ready to share? → Report" affordance.
 ▼
Report
 │  Generate report. Copy/download.
 │  "Start another investigation → Home" affordance.
 ▼
Home
```

### 6.2 Next Step affordance specification

Each page has a "Next Step" bar at the bottom of the left panel or at the footer of the content area.

Rules for when to show it:

| Page | Condition | Affordance text |
|:---|:---|:---|
| Explore | diagnostics > 0 | "2 errors found — Diagnose →" |
| Explore | diagnostics == 0 | "Tile is clean — Compare versions →" |
| Diagnose | always | "Compare with another version →" |
| Statistics | always | "See rule violations → Diagnose" |
| Compare | result exists | "Investigate regressions →" |
| Regression | result exists | "Share findings → Report" |
| Report | always | "New investigation → Home" |

The affordance is a subtle footer button — not a modal, not a blocking prompt. It can be ignored entirely.

### 6.3 Cross-feature interaction

**From Explore to Diagnose:**
- Selected feature is preserved. If the selected feature has diagnostics, the Diagnose tab opens with that feature's diagnostic pre-selected.

**From Diagnose to Explore:**
- The feature selected via diagnostic click is preserved in Explore's right panel.

**From Compare to Regression:**
- The comparison result is automatically available. Regression tab shows candidates immediately without requiring a separate load step.

**From Regression to Report:**
- The regression findings are pre-checked in the Report contents selection.

---

## 7. Session Management

### 7.1 Session definition

A session begins when the first tile is loaded and ends when the user navigates to Home and confirms.

### 7.2 Session state

| State item | Owner | Persisted? |
|:---|:---|:---|
| Active tab | WorkspaceService (localStorage) | Yes — survives refresh |
| Left/right panel collapsed | WorkspaceService (localStorage) | Yes |
| Viewport (zoom, pan) | WorkspaceService (localStorage) | Yes |
| Last file path | WorkspaceService (localStorage) | Yes (display only) |
| Loaded tile data | InspectorStore (memory) | No — lost on refresh |
| Comparison result | Workspace React state (memory) | No |
| Regression result | Derived from comparison (memory) | No |
| Selected feature | InspectorStore (memory) | No |
| Presentation mode | PresentationService (localStorage) | Yes |

### 7.3 Home transition

When the user clicks Home during an active session:

If tile is loaded OR comparison state exists — show confirmation dialog (full spec in Appendix C.1):

```
"Return to Home?"
Current session: [lists what exists — tile name, comparison, regression]
[Cancel]  [Return to Home]
```

If nothing is loaded: navigate immediately, no dialog.

Default focused button is always **Cancel**. The destructive action requires an explicit click.

On confirm:
1. `store.dispose()`
2. Clear comparison state
3. Clear regression state
4. `workspaceService.updateLayout({ activeTab: 'home', viewport: null })`
5. Render `<WelcomeView />`

### 7.4 Loading a second tile within a session

When a tile is already loaded and the user opens another tile file — show selection dialog (full spec in Appendix C.2):

```
"You opened [filename]"
Current investigation: [current filename]
○ Replace current investigation
○ Compare both tiles (default selection)
[Cancel]  [Continue]
```

Rules for dialog content:
- Always shows actual filenames — never "Tile A" or "Tile B" in the UI
- Default selection: Compare (less destructive)
- When Compare is chosen, current tile becomes **Baseline**, new file becomes **Candidate**
- If comparison state already exists: warn that it will be replaced
- If Replace is chosen: warn that current tile will be closed

### 7.5 What Home persists

**Persisted to localStorage (survives refresh):**
- Recent file paths (last 5, display only — browser cannot re-read without user interaction)
- Presentation mode on/off
- Workspace layout: panel collapse state, last active tab
- Theme (future)

**Never persisted (ephemeral, cleared on session end):**
- Loaded tile data
- Comparison result
- Regression result
- Selected feature
- Search query

Sessions are deliberately ephemeral. Persisting analysis state would create confusing "half-restored" investigations where the UI shows a feature selected but the tile data is gone. Clean start is always preferable.

`WorkspaceService` stores the last 5 file paths. The Home page shows these as "Recent" items with a "Browse again" prompt that opens the file picker pre-filtered by extension.

### 7.6 Style loading alongside an active tile session

When a style.json is loaded while a tile session is already active:

- The style loads into the Style page independently
- The tile session is **not** affected — `InspectorStore` is untouched
- Both coexist simultaneously in the application
- This is required for Milestone 8 (Tile–Style Consistency Analysis), which needs both artifacts present at once
- The Style page never reads from `InspectorStore`; `InspectorStore` never holds style data

### 7.7 Comparison scope

v1.0 supports exactly **two tiles** in a comparison — one Baseline, one Candidate.

Three-way or n-way comparison is explicitly out of scope for v1.0. Any implementation that receives more than two tiles must reject the extras with a clear error message. This constraint will be revisited in a dedicated milestone when the use cases are better understood.

---

## 8. State Architecture

### 8.1 State ownership map

```
PresentationService (singleton, localStorage)
 └── presentationMode: boolean

WorkspaceService (singleton, localStorage)
 └── activeTab: WorkspaceTab
 └── leftCollapsed: boolean
 └── rightCollapsed: boolean
 └── viewport: { zoom, panX, panY } | null
 └── lastFilePath: string | null
 └── recentFiles: string[] (max 5)

InspectorStore (instance per session, memory only)
 └── lifecycle: InspectorLifecycle
 │    ├── uninitialized
 │    ├── loading
 │    ├── loaded: { artifact, diagnostics, filePath }
 │    └── empty
 └── selection: FeatureRef
 └── hover: FeatureRef
 └── filters: FilterState

Workspace component (React state, memory)
 └── snapshotA: TileSnapshot | null
 └── snapshotB: TileSnapshot | null
 └── filePathA: string | null
 └── filePathB: string | null
 └── comparison: TileComparison | null
 └── isComparing: boolean
 └── pendingFile: File | null
 └── loadingStep: LoadingStep
 └── devOverlayVisible: boolean

DiagnosticsState (hook, React state, memory)
 └── selectedDiagnostic: Diagnostic | null

NavigationHistory (new — React state or service, memory)
 └── stack: WorkspaceTab[]
```

### 8.2 State boundaries

**Rule 1 — InspectorStore owns only tile data.**  
Comparison, regression, and report state must never live in InspectorStore. They are separate concerns.

**Rule 2 — WorkspaceService owns only layout and navigation.**  
It must never hold tile data, comparison results, or analysis state.

**Rule 3 — Presentation state is independent of session state.**  
Presentation mode persists across sessions. Clearing a session does not disable presentation mode.

**Rule 4 — Derived state is never stored.**  
`regressionAnalysis` is derived from `comparison` via `useMemo`. It is never written to state independently.

**Rule 5 — Memory state does not outlive the component tree.**  
All React state in Workspace is cleared when the session ends. `InspectorStore.dispose()` is the authoritative cleanup call.

---

## 9. Visual Design System

### 9.1 Page identity colours

Each page has a unique accent colour. The accent appears in: the page title, the page identity header, the sidebar tab highlight, and relevant badge colours.

| Page | Accent | CSS variable override |
|:---|:---|:---|
| Home | `--tg-accent` blue (#3b82f6) | base |
| Explore | `--tg-accent` blue (#3b82f6) | base |
| Diagnose | `--tg-error` red (#ef4444) | `--tg-page-accent: var(--tg-error)` |
| Statistics | purple (#8b5cf6) | `--tg-page-accent: #8b5cf6` |
| Style | cyan (#06b6d4) | `--tg-page-accent: #06b6d4` |
| Compare | amber (#f59e0b) | `--tg-page-accent: var(--tg-warning)` |
| Regression | violet (#7c3aed) | `--tg-page-accent: #7c3aed` |
| Report | teal (#14b8a6) | `--tg-page-accent: #14b8a6` |

The `--tg-page-accent` variable is set on the workspace container via inline style when the active tab changes. All components within the page inherit from it for their identity elements.

### 9.2 Typography scale

| Use | Size | Weight | Font |
|:---|:---|:---|:---|
| Page title | 11px / uppercase / tracking-widest | 700 | sans |
| Section heading | 13px | 600 | sans |
| Body text | 12px | 400 | sans |
| Caption / meta | 11px | 400 | sans |
| Code / IDs | 11px | 400 | mono |
| Stat numbers (hero) | 18px | 700 | sans |
| Badge counts | 10px | 600 | sans |

### 9.3 Spacing system

Spacing follows the existing CSS custom properties (`--tg-space-xs` through `--tg-space-2xl`). No ad-hoc pixel values in component code.

### 9.4 Panel hierarchy

Three levels of background depth:

```
--tg-bg-primary    (#0f172a)  — page background, canvas background
--tg-bg-secondary  (#1e293b)  — sidebars, headers, footer
--tg-bg-surface    (#273548)  — cards, inputs, inline panels
--tg-bg-hover      (#334155)  — hover states, selected rows
```

**Rule:** a sidebar sits on `--tg-bg-secondary`. Cards inside the sidebar sit on `--tg-bg-surface`. No sidebar should use `--tg-bg-primary` as its background — that creates the illusion it is part of the canvas.

### 9.5 Motion

- Tab switches: no animation on panel content replacement (instant swap)
- Camera animation (Diagnose → feature focus): 300ms ease-out via `CameraAnimator`
- Loading overlay: fade in 150ms, fade out 150ms after completion
- Presentation mode toggle: CSS transition on font-size and spacing, 200ms ease
- Sidebar collapse: CSS width transition, 150ms ease

**Rule:** motion should never block interaction. If the animation has not finished and the user clicks, the action fires immediately.

### 9.6 Iconography

All icons from `lucide-react`. Icon sizes:
- Sidebar nav icons: 20px
- Panel section icons: 14px
- Inline inline text icons: 12px
- Hero empty state icons: 32px

### 9.7 Presentation mode overrides

When `.presentation-mode` is active on `<html>`:
- Font sizes: +20% across all scale levels
- Spacing: +25% across all levels
- Sidebar width: 360px (from 320px)
- Accent colours: higher contrast variants
- Hidden: FPS counter, DeveloperOverlay
- Larger hit targets: minimum 40px button height

---

## 10. Interaction Guidelines

### 10.1 Selection model

Exactly one feature may be selected at a time. Selection is global — it persists across tab switches within the canvas workspace.

- Canvas click → select feature, open Feature Inspector
- Diagnostic click → select associated feature (same store action), open Rule Details
- `Esc` → clear selection
- Sidebar tab switch → selection is preserved
- Session end → selection cleared

### 10.2 Hover model

Hover is a preview state. It never triggers panel updates. Hovering over a feature shows a highlight on the canvas and updates the footer status bar only.

Hover is disabled automatically when dragging (panning) the canvas.

### 10.3 Search

- Search is scoped to the currently loaded tile
- Results update on every keystroke (debounced 150ms)
- Results list is keyboard-navigable (arrow keys, Enter to select)
- Selecting a search result focuses the canvas on that feature and selects it
- Search state (query + results) is preserved when switching between Explore and Diagnose
- Search is cleared when a new tile is loaded

### 10.4 Filtering (Diagnose)

The Diagnostic Explorer toolbar provides:
- Severity toggles: E (error) / W (warning) / I (info)
- Layer filter: multi-select dropdown
- Geometry type filter: multi-select dropdown
- Sort: by severity (default), by layer, by rule ID
- Reset: clears all filters in one click

Filter state is local to the Diagnose page. It does not affect other pages.

### 10.5 Camera animation

When a diagnostic is selected:
1. Compute the bounding box of the affected feature's geometry
2. Expand by 20% padding
3. Animate viewport to fit the bounding box over 300ms (ease-out)
4. After animation: select the feature, trigger Feature Inspector update

If the feature has no geometry or is out of tile bounds: skip animation, show error in Rule Details.

### 10.6 Keyboard shortcut behaviour

- Shortcuts fire only when focus is not inside a text input, textarea, or contenteditable
- `?` key opens a shortcut reference overlay (keyboard-navigable, closed with `Esc`)
- All shortcuts are listed in the overlay with their current bindings
- Shortcuts that require tile data (e.g. `F` to focus feature) are silently ignored when no tile is loaded — no error shown

### 10.7 Panel collapse behaviour

- Left and right panels each have an independent collapse toggle
- Collapsed state persists in WorkspaceService
- Collapsing is instant (no animation) — the canvas expands immediately to fill the space
- When both panels are collapsed the canvas fills the entire workspace

### 10.8 Context menus

No context menus in the current spec. Right-click on canvas: no action. Right-click on feature panel: no action. This is a deliberate simplification — context menus will be introduced in a later milestone when multi-selection is implemented.

---

## 11. Component Hierarchy

### 11.1 Top-level tree

```
<InspectorApp>
 └── <InspectorProvider>          ← store, inspector instance
      └── <Workspace>
           ├── <AppHeader>        ← logo, title, PresentationToggle, window controls
           ├── <SidebarNav>       ← primary navigation
           ├── [content area]
           │    ├── <WelcomeView> ← when activeTab === 'home'
           │    ├── <ComparisonPage>  ← when activeTab === 'compare'
           │    ├── <RegressionPage> ← when activeTab === 'regression'
           │    ├── <ReportPage>     ← when activeTab === 'reports'
           │    ├── <StyleExplorerPage> ← when activeTab === 'style'
           │    └── [Canvas Workspace] ← when activeTab ∈ {explore, diagnose, statistics, settings}
           │         ├── [PageHeader]  ← InspectorPageHeader or DiagnosticsPageHeader
           │         ├── <Toolbar>
           │         ├── [Left Sidebar] ← FeatureExplorer | DiagnosticsLeftPanel | StatisticsPanel | SettingsOverlay
           │         ├── <CanvasView>   ← SINGLETON — never unmounts
           │         │    ├── <CanvasSurface>
           │         │    ├── <DropZone>
           │         │    └── <LoadingOverlay>
           │         └── [Right Sidebar] ← FeaturePanel | DiagnosticsRightPanel
           └── <Footer>
```

### 11.2 Component responsibility rules

Each component must satisfy:
1. **Single responsibility** — does one thing, named for that thing
2. **No cross-panel data sharing via props drilling** — use hooks that read from the store or services
3. **No direct store mutation from render** — all mutations go through handlers
4. **No DOM API calls in component body** — DOM access only in `useEffect` or event handlers

### 11.3 Shared components

The following are reusable across pages:

| Component | Usage |
|:---|:---|
| `SeverityBadge` | DiagnosticList, TileHealthHeader, Report |
| `PropertyTable` | FeaturePanel, RuleDetailsPanel (future) |
| `LoadingOverlay` | CanvasView |
| `EmptyState` | All pages (standardised empty state layout) |
| `PresentationToggle` | AppHeader |
| `DemoCard` | WelcomeView |

### 11.4 Proposed new shared components

| Component | Purpose | Used by |
|:---|:---|:---|
| `PageHeader` | Standardised page title + subtitle + back + next-step bar | All workspace pages |
| `NextStepBar` | Contextual workflow advancement affordance | All pages |
| `ConfirmDialog` | Session reset, tile replacement confirmation | Workspace |
| `SettingsOverlay` | Slide-in settings panel | AppHeader gear |
| `ShortcutReference` | `?` key overlay showing all shortcuts | Global |
| `EmptyState` | Standardised empty/error/no-data state display | All pages |

---

## 12. Demo Workflow

### 12.1 Demo-specific requirements

The Inspector must support a fully scripted 20-minute conference demo with:
- Zero dependency on external network
- Zero OS file picker interactions
- Zero application configuration before starting
- Recovery from any single point of failure within 30 seconds

### 12.2 One-click demo start sequence

1. Application opens at Home
2. Presenter enables Presentation Mode: `Ctrl+Shift+P`
3. Presenter clicks "Tokyo — Clean Tile" demo card
4. Application loads tile, navigates to Explore automatically
5. Total time: < 5 seconds

### 12.3 Demo progression (aligned with FOSS4G script)

Each demo card in the catalog maps to a specific page and has a `demoStep` label that matches the script section.

| Demo dataset | Navigates to | Demo minute |
|:---|:---|:---|
| Tokyo — Clean | Explore | 1–3 |
| Broken Geometry | Diagnose | 3–6 |
| Comparison Demo | Compare | 8–12 |
| Regression Demo | Regression | 12–14 |
| Style Demo | Style | 14–15 |

### 12.4 Presentation Mode specification

Activated by `Ctrl+Shift+P`. Effects:
- Font sizes: +20%
- Spacing: +25%
- Hidden: FPS counter, DeveloperOverlay, debug buttons
- Higher contrast accents
- Persists across refresh (localStorage)

Presentation Mode does not change application functionality — only visual scale and developer noise.

### 12.5 Demo recovery procedures

All recovery procedures are documented in `docs/demo/FOSS4G_DEMO.md`. The application itself must support:
- `R` key: reset canvas view at any point
- `Esc` key: clear any selection state
- `Ctrl+Shift+P`: toggle presentation mode on/off if text is too large for projector

---

## 13. Accessibility Requirements

### 13.1 Keyboard-only operation

Every feature must be reachable by keyboard alone:
- All interactive elements are focusable via `Tab`
- Focus order follows visual reading order (left to right, top to bottom)
- No keyboard traps — `Esc` always escapes the current overlay or selection
- Custom keyboard shortcuts do not conflict with browser or OS shortcuts

### 13.2 ARIA requirements

| Element | Required ARIA |
|:---|:---|
| Sidebar nav buttons | `aria-label`, `aria-current="page"` when active |
| Canvas | `role="img"`, `aria-label="Vector tile canvas"` |
| Diagnostic list | `role="list"`, each item `role="listitem"` |
| Tile Health header | `role="status"`, `aria-live="polite"` |
| Loading overlay | `role="status"`, `aria-live="assertive"` |
| Empty states | `aria-label` describing the empty condition |
| Panels | `role="region"`, `aria-label` matching the panel title |

### 13.3 Colour and contrast

- All text meets WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- Severity is never communicated by colour alone — icons accompany all severity badges
- Error states use both red colour AND an error icon
- Selected state uses both colour change AND a border/outline

### 13.4 Screen reader support

- Page transitions must announce the new page title via `aria-live="polite"` on the content area
- Dynamic content changes (diagnostic selection, feature selection) must announce via `aria-live`
- The canvas is intentionally not accessible to screen readers — it is a visual tool. All canvas interactions have equivalent keyboard shortcuts that produce textual output in the panels.

### 13.5 Reduced motion

When `prefers-reduced-motion: reduce` is set:
- Camera animation is instant (no 300ms transition)
- Loading overlay fade is instant
- No decorative animations

---

## 14. Performance Requirements

### 14.1 Startup

| Metric | Target |
|:---|:---|
| Time to interactive (Home visible) | < 1s on modern hardware |
| Time to first demo (tile loaded + Explore visible) | < 5s from Home click |
| Canvas first paint after tile loaded | < 200ms |

### 14.2 Canvas rendering

| Metric | Target |
|:---|:---|
| Frame rate during pan/zoom | ≥ 60 fps on modern hardware |
| Camera animation frame rate | ≥ 60 fps |
| Re-render on feature selection | < 16ms |

### 14.3 Validation engine

| Metric | Target |
|:---|:---|
| Tile validation (all 10 rules, tokyo.pbf 403KB) | < 100ms |
| Style validation (all 9 rules) | < 10ms |
| Comparison (manhattan vs tokyo) | < 1s |
| Regression analysis | < 200ms |

### 14.4 Tab switching

| Metric | Target |
|:---|:---|
| Switch between canvas tabs (Explore ↔ Diagnose) | < 16ms — no canvas recreate |
| Switch to non-canvas tab (Compare, Reports) | < 100ms |
| Return to canvas tab from non-canvas tab | < 16ms — canvas was never unmounted |

### 14.5 Memory

| Metric | Target |
|:---|:---|
| Idle memory (no tile loaded) | < 50MB |
| After loading tokyo.pbf | < 150MB |
| After comparison of two tiles | < 300MB |
| Memory released after session end (Home) | Returns to near idle |

---

## 15. Future Extension Strategy

### 15.1 Milestone 8 — Tile–Style Consistency Analysis

**Where it fits:** A new page "Consistency" between Style and Compare.  
**Navigation change:** Add `consistency` to WorkspaceTab. Requires both a tile and a style file.  
**Page identity:** Indigo accent.  
**Primary question:** Does this tile match this style?

No existing pages change. The new page slots into the navigation between Style and Compare in the workflow sequence.

### 15.2 Milestone 9 — Render Regression Testing

**Where it fits:** New tab "Render" in the canvas workspace group.  
**Navigation change:** Add `render` to WorkspaceTab. Requires tile + style.  
**Canvas:** Yes — renders the tile using the headless renderer, shows pixel diff.  
**Page identity:** Rose accent.  
**Primary question:** Has the visual output changed?

The render diff result feeds into the existing Regression tab naturally — `regressionAnalysis` could incorporate render evidence alongside structural evidence.

### 15.3 Plugin pages

Future plugins may register new pages via the plugin API. The navigation model supports this:
- Plugins declare a `page` object with `{ id, label, icon, component, requiredState }`
- The sidebar renders plugin pages after the built-in pages in a separate group
- The canvas workspace's `else` block checks for canvas-using plugin pages

### 15.4 Cloud workflows

If TileGuard gains cloud features (tile server integration, shared sessions):
- A new "Connect" overlay (not a page) handles authentication
- The Home page gains a "Recent Cloud Sessions" section alongside "Recent Files"
- No existing pages change — cloud data is loaded into the same `InspectorStore` as local files

### 15.5 Design system extraction

When the Inspector reaches v1.0 stability, the component library should be extracted to `@tileguard/ui`. This enables:
- A documentation site using TileGuard's own components
- Future CLI interactive output using the same design tokens
- Third-party plugin developers using the standard component set

---

## Appendix A — Page Rename Mapping

| Current code ID | Spec ID | Display label | Tab type |
|:---|:---|:---|:---|
| `welcome` | `home` | Home | Replacement |
| `inspector` | `explore` | Explore | Canvas |
| `diagnostics` | `diagnostics` | Diagnose | Canvas |
| `statistics` | `statistics` | Statistics | Canvas |
| `style-explorer` | `style` | Style | Replacement |
| `compare` | `compare` | Compare | Replacement |
| `regression` | `regression` | Regression | Replacement |
| `reports` | `reports` | Report | Replacement |
| `settings` | `settings` | Settings | Overlay (not a page) |

**Canvas tabs** share the singleton `CanvasView`. **Replacement tabs** fully replace the canvas workspace. **Overlay** is not a tab at all.

---

## Appendix B — Resolved Design Decisions

All open questions from the initial draft have been resolved. This table is authoritative.

| # | Question | Decision | Rationale |
|:--|:---------|:---------|:----------|
| 1 | Session confirmation dialog scope | **Prompt only on explicit Home navigation.** Never use `beforeunload`. | `beforeunload` is inconsistent across browsers, mobile-unreliable, impossible to customise, and often suppressed. TileGuard is an engineering workstation, not a document editor. Losing an in-memory session on refresh is acceptable. The only fully controlled exit point is the Home button. |
| 2 | Replace or Compare dialog wording | **Always use actual filenames. Never show "Tile A / Tile B" to the user.** Use "Current Investigation" (existing tile) and "You opened" (new tile). Internally A/B labels are fine. When comparison starts, label tiles "Baseline" and "Candidate". | Engineers think in filenames. "Tile A" is an implementation detail that leaks into the UI. Baseline/Candidate is domain language the user already knows. |
| 3 | Navigation history depth | **Cap at 20 entries.** Pop oldest entry when the 21st is pushed. | `WorkspaceTab` is an enum string — the memory cost is negligible. 10 was considered too shallow for users who jump between pages during an investigation. 20 is effectively unlimited in practice. |
| 4 | Settings overlay width | **Use `var(--tg-sidebar-width)`** — the existing design token. | Ties settings width to the same token that Presentation Mode scales. One token governs both. Never hardcode a pixel width that duplicates a token. |
| 5 | Plugin page ordering in sidebar | **Plugins appear between Regression and Report. Report is always last.** | Plugins are analyses — they belong in the analysis section of the workflow. Report is the conclusion of every workflow. This invariant must hold regardless of how many plugins are installed. The sidebar order is: Explore → Diagnose → Statistics → Style → Compare → Regression → [Plugins] → Report → [Settings / Home]. |
| 6 | Style file loaded while tile session exists | **Style loads alongside the active tile session. It never replaces it.** A tile session and a style session coexist independently. | Milestone 8 requires both simultaneously for Tile–Style Consistency Analysis. Loading a style must never discard an active tile investigation. The Style page is stateless with respect to tile data. |
| 7 | Comparison scope (number of tiles) | **Exactly two tiles in v1.0.** Three-way or n-way comparison is out of scope until explicitly planned. | Two-tile comparison covers all current use cases. N-way comparison is a separate design problem. Documenting the v1.0 constraint prevents scope creep. |
| 8 | What Home is allowed to remember | **Persist: recent file paths, presentation mode, workspace layout (panel collapse, active tab), theme.** **Do not persist: loaded tile, comparison result, regression result, selected feature, search query.** | Sessions are ephemeral. Persisting analysis state creates "half-restored" investigations that are harder to understand than a clean start. UI preferences (layout, mode) are safe to persist because they have no semantic meaning tied to a specific dataset. |

---

## Appendix C — Dialog Specifications

### C.1 Home navigation confirmation

Triggered when: user clicks Home button AND (tile is loaded OR comparison state exists).

```
┌─────────────────────────────────────────────────────────┐
│  Return to Home?                                        │
│                                                         │
│  Your current investigation will be closed.             │
│                                                         │
│  Current session:                                       │
│  · tokyo.pbf loaded                                     │
│  · Comparison available (vs manhattan.pbf)              │
│  · Regression analysis available                        │
│                                                         │
│  This cannot be undone.                                 │
│                                                         │
│  [Cancel]                    [Return to Home]           │
└─────────────────────────────────────────────────────────┘
```

Rules:
- Shows only the state items that actually exist (no line for comparison if no comparison)
- Default focused button: Cancel (destructive action must be an explicit choice)
- `Esc` = Cancel
- `Enter` on "Return to Home" = confirm

### C.2 Open file while session exists

Triggered when: user opens a new tile file AND a tile is already loaded in the session.

```
┌─────────────────────────────────────────────────────────┐
│  You opened tokyo_after.pbf                             │
│                                                         │
│  Current investigation: tokyo_before.pbf                │
│                                                         │
│  What would you like to do?                             │
│                                                         │
│  ○  Replace current investigation                       │
│     tokyo_before.pbf will be closed.                    │
│                                                         │
│  ○  Compare both tiles                                  │
│     tokyo_before.pbf → Baseline                         │
│     tokyo_after.pbf  → Candidate                        │
│                                                         │
│  [Cancel]                    [Continue]                 │
└─────────────────────────────────────────────────────────┘
```

Rules:
- Default selected option: Compare (the less destructive action)
- "Replace" selection shows a secondary warning: "This will close your current tile."
- If comparison state already exists when "Compare" is chosen: "This will replace your current comparison."
- `Continue` is disabled until one option is selected
- `Esc` = Cancel

---

---

## 16. UI Technology Stack

This section defines the approved frontend dependency stack for TileGuard Inspector.
All libraries listed here are **authoritative** — new dependencies require a PR that
cites which approved library was insufficient before adding an alternative.

---

### 16.1 Core Framework

| Library | Version Policy | Role |
|---|---|---|
| **React** | `^18` | Component rendering, concurrency |
| **TypeScript** | `^5` | Full strict-mode type safety |
| **Vite** | `^5` | Dev server, bundling, HMR |
| **Tailwind CSS** | `^3` | Utility styling system |
| **CSS Variables** | Native | Design token system (`--tg-*`) |

Tailwind and CSS Variables are **complementary, not alternatives**. Tailwind provides
utilities; CSS variables provide the semantic token layer that Tailwind classes reference.

---

### 16.2 Component Libraries

#### shadcn/ui ⭐ MUST HAVE

**Why:** Beautiful defaults, fully customizable, built on Radix primitives, no runtime
framework overhead. Components are copied into the codebase and owned by the team —
no version lock-in, no `node_modules` bloat.

**Use for:**
- Dialogs (confirmation, settings, export)
- Command palette trigger shell
- Dropdown menus and context menus
- Tooltips and popovers
- Sheets (side drawers for mobile layout)
- Tabs (within panels)
- Toast notifications (via Sonner integration)
- Keyboard shortcut overlay

**Do not use for:** Canvas rendering, data tables (use TanStack Table instead).

---

#### Radix UI ⭐ MUST HAVE

**Why:** The best accessible primitive layer available for React. shadcn/ui builds on
Radix, but raw Radix primitives can be used directly for components not covered by shadcn.

**Use for:**
- `Dialog` — settings panel, confirmation
- `Popover` — feature property quick-look
- `Tooltip` — toolbar icon labels, sidebar item hints
- `HoverCard` — diagnostic rule preview on hover
- `DropdownMenu` — file menu, export format picker
- `ContextMenu` — right-click on canvas feature
- `ScrollArea` — long feature property lists, diagnostic lists
- `Accordion` — collapsible property groups
- `Slider` — comparison threshold controls

**Accessibility:** All Radix primitives are WCAG-compliant by default. This satisfies
Section 13 Accessibility Requirements without extra work.

---

### 16.3 Data Display

#### TanStack Table ⭐ MUST HAVE

**Why:** The best React table library available. Headless — works with any styling.
Built for large datasets with virtualization support.

**Use for:**
- Statistics layer table (sortable, filterable columns)
- Feature property table inside FeaturePanel
- Diagnostic list with sortable severity/layer/rule columns
- Comparison diff table (Added / Modified / Removed / Unchanged)
- Regression candidate list with sortable confidence scores

**Do not use:** `<table>` hand-rolled HTML for any list with more than ~20 rows.

---

#### react-syntax-highlighter

**Why:** Report previews (Markdown, JSON, HTML) require syntax highlighting.
Writing a custom highlighter is not worth the effort.

**Use for:**
- Report preview panel (Markdown, JSON, HTML tabs)
- Style JSON inspection
- Diagnostic rule documentation code snippets

**Note:** Use the `Prism` renderer with a dark theme matching `--tg-bg-secondary`.

---

#### Monaco Editor *(optional — Milestone 8+)*

**Why:** Makes JSON and style inspection instantly feel professional (VS Code-level editing).

**Use for (future):**
- MapLibre style JSON editing
- Configuration file editing
- Report preview with editing capability

**Decision gate:** Adds ~2MB to bundle. Evaluate when style editing becomes a milestone
feature. Use dynamic import (`import()`) to keep initial bundle clean.

---

### 16.4 Interaction & Animation

#### Framer Motion ⭐ USE LIGHTLY

**Why:** Smooth micro-animations for UI state transitions. **Not** for canvas — the
canvas has its own `CameraAnimator` 60 FPS animation loop.

**Use for:**
- Dialog mount/unmount transitions
- Sidebar panel expand/collapse
- Demo card hover effects in WelcomeView
- Presentation Mode transition
- Loading state card animations
- Page-level tab transitions (fade, not slide)

**Do not use for:**
- Canvas geometry rendering
- Feature highlight pulses (handled by CanvasRenderer)
- Any animation running at > 16ms per frame

---

#### cmdk ⭐ MUST HAVE

**Why:** Provides a Figma/VS Code–grade command palette out of the box.

**Keyboard shortcut:** `Ctrl+K`

**Commands to implement:**

| Command | Action |
|---|---|
| Load Demo | Opens demo catalog and selects first entry |
| Compare Tiles | Navigates to Compare tab |
| Run Regression | Navigates to Regression tab |
| Export Report | Opens report page in Markdown format |
| Toggle Presentation | Fires `PresentationService.toggle()` |
| Open Settings | Navigates to Settings tab |
| Search Feature | Focuses the feature search input |
| Go to Statistics | Navigates to Statistics tab |
| Reset View | Fires `inspector.render()` (re-fits viewport) |

---

### 16.5 Layout

#### react-resizable-panels ⭐ MUST HAVE

**Why:** Users should be able to resize the three-column workspace layout
(Feature Explorer | Canvas | Feature Inspector). This is expected behavior in any
DevTools-grade application.

**Use for:**
- The three-column canvas workspace (left sidebar : canvas : right sidebar)
- Comparison page dual-canvas split

**Implementation rule:** Store panel sizes in `WorkspaceService` (localStorage) so
layout is preserved across sessions.

---

### 16.6 Feedback & Notifications

#### Sonner ⭐ MUST HAVE

**Why:** Beautiful, minimal toast notification library. Replaces any hand-rolled
notification system.

**Use for:**

| Event | Toast |
|---|---|
| Tile loaded successfully | ✅ `"tokyo-clean.pbf loaded — 14 layers"` |
| Tile load error | ❌ `"Failed to load: invalid PBF header"` |
| Comparison finished | ✅ `"Comparison complete — 312 changes found"` |
| Report generated | ✅ `"Report exported as report.html"` |
| Copied to clipboard | ✅ `"Copied to clipboard"` |
| Regression detected | ⚠️ `"High confidence regression detected (92%)"` |
| Presentation mode on | 🎤 `"Presentation Mode enabled"` |

**Placement:** Bottom-right. Auto-dismiss after 4 seconds. Errors persist until dismissed.

---

### 16.7 File Handling

#### react-dropzone

**Why:** More reliable cross-browser drag-and-drop than raw DOM events. Handles edge
cases (file type filtering, multiple file rejection, touch events).

**Use for:**
- WelcomeView tile drop zone
- Comparison Page tile A / tile B drop zones

**Configuration:**
```ts
accept: { 'application/octet-stream': ['.pbf', '.mvt'] }
maxFiles: 1
```

---

### 16.8 Scrollbars *(optional)*

#### OverlayScrollbars or SimpleBar

Use only if the default browser scrollbar appearance conflicts with the design system
on non-macOS platforms. macOS hides scrollbars by default — this is primarily a
Windows/Linux polish item.

---

### 16.9 Libraries Explicitly Excluded

| Library | Reason |
|---|---|
| Chart.js | Too heavy; custom SVG charts are sufficient for engineering stats |
| D3.js | Too large; use only targeted D3 sub-packages if needed |
| MUI / Ant Design / Chakra | Impose design systems that conflict with TileGuard's token system |
| date-fns / moment | No date manipulation requirements yet |
| Redux / Zustand | `InspectorStore` is sufficient; external state managers would add indirection |
| React Query | No server-side data fetching; all data is local |

---

### 16.10 Overall Architecture Diagram

```
TileGuard Inspector
│
├── React 18 + TypeScript 5
├── Vite 5 (dev server, bundler)
├── Tailwind CSS + CSS Variables (--tg-*)
│
├── UI Components
│   ├── shadcn/ui        (dialogs, menus, sheets, popovers, tabs, toasts)
│   └── Radix UI         (accessible primitives under shadcn/ui)
│
├── Data Display
│   ├── TanStack Table   (statistics, diagnostics, comparison, regression tables)
│   └── react-syntax-highlighter (report preview, JSON/style inspection)
│
├── Interaction
│   ├── cmdk             (Ctrl+K command palette)
│   ├── react-resizable-panels (resizable three-column workspace)
│   └── Framer Motion    (dialog transitions, sidebar, card animations — light use)
│
├── File Handling
│   └── react-dropzone   (drag-and-drop tile loading)
│
├── Feedback
│   └── Sonner           (toast notifications)
│
├── Icons
│   └── lucide-react     (all icons — already in use)
│
└── Optional (Milestone 8+)
    └── Monaco Editor    (style JSON editing, report editing)
```

---

### 16.11 Installation Reference

```bash
# Core UI primitives
pnpm add @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-tooltip
pnpm add @radix-ui/react-dropdown-menu @radix-ui/react-context-menu
pnpm add @radix-ui/react-scroll-area @radix-ui/react-accordion @radix-ui/react-tabs

# shadcn/ui CLI (copies components into src/)
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add dialog popover tooltip dropdown-menu tabs

# Data display
pnpm add @tanstack/react-table
pnpm add react-syntax-highlighter
pnpm add -D @types/react-syntax-highlighter

# Interaction
pnpm add cmdk
pnpm add react-resizable-panels
pnpm add framer-motion

# File handling
pnpm add react-dropzone

# Notifications
pnpm add sonner
```

---

*This document is owned by the TileGuard engineering team. Changes require a PR with an updated version number and a summary of what changed in the PR description.*
