# TileGuard — FOSS4G 2026 Demo Script

**Talk:** *"Ensuring Tile Quality in MapLibre Through Automated Testing and CI"*
**Conference:** FOSS4G 2026 — Hiroshima, Japan
**Total time:** 20 minutes
**Format:** Live demo with slides; slides are optional backup only.

---

## Pre-Talk Checklist (15 min before)

- [ ] Open TileGuard Inspector in the browser: `pnpm --filter @tileguard/inspector dev`
- [ ] Verify the Welcome page shows the Demo Catalog (6 cards visible)
- [ ] Enable Presentation Mode: press **Ctrl+Shift+P** — the button in the header turns blue
- [ ] Confirm font size is visibly larger
- [ ] Close all browser devtools panels
- [ ] Maximise the browser window
- [ ] Silence phone
- [ ] Confirm projector resolution matches (1920×1080 preferred)
- [ ] Bookmark `localhost:5173` in the browser
- [ ] Run through the first two demo steps once (muscle memory matters)

---

## Slide 0 — Title (while people settle in)

**What to say:**
> "Good morning. I'm going to spend 20 minutes showing you something I wish I'd had three years ago: automated quality gates for vector tiles."

---

## Minute 0–1 — The Problem

**What to say:**
> "If you've worked with tile pipelines, you've hit this. A road layer disappears at zoom 14. A polygon self-intersects. A style expression references a property that doesn't exist. These bugs survive code review. They surface when a user reports them, sometimes weeks after the change.
>
> Application developers solved this problem in 2013. It's called ESLint. We don't have an ESLint for the geospatial stack. TileGuard is that."

**What to click:** Nothing. Keep this verbal.

**Expected result:** Audience nods.

---

## Minute 1–3 — Load the Clean Tile (Inspector)

**What to click:**
1. Welcome page → Demo Catalog → click **"Tokyo — Clean Tile"** card → **Open Demo**
2. The tile loads automatically — no file picker, no waiting.
3. The Inspector tab opens. The Feature Explorer left panel shows 8+ layers.
4. Click a **building** feature on the canvas.

**What to say:**
> "One click, no file picker. The tile is bundled with the app — this is how every conference demo should work.
>
> The Feature Explorer on the left shows every layer and its feature count. I can click any feature on the canvas — watch the right panel."

> *(after clicking a building)*
> "Layer name, feature ID, geometry type, all 12 properties. This is what's in the tile."

**Expected result:**
- Feature Explorer visible on left with layer list
- Feature Inspector on right showing properties of selected feature
- Blue "Inspector" identity bar at top reads "What is inside this tile?"

**Fallback — if demo tile fails to load:**
> "Let me open the file manually."
> Drag `fixtures/real-tiles/tokyo.pbf` into the drop zone.

---

## Minute 3–6 — Run Diagnostics (Diagnostics tab)

**What to click:**
1. Click the **"Broken Geometry"** card back on Welcome — or click **Diagnostics** in the sidebar and load the broken tile if still on Welcome.
2. The Diagnostics tab opens automatically.
3. Point to the **Tile Health** bar at the top — "1 Error".
4. Click the error row in the Diagnostic Explorer on the left.

**What to say:**
> "Now switch to Diagnostics. Notice the page identity has completely changed — red header, Tile Health summary at the top. This page answers a different question: *What is wrong?*
>
> *(pointing to Tile Health bar)* One error. tile/self-intersection. Let me click it."

> *(after clicking)*
> "The camera animates to the exact feature, the Rule Details panel on the right explains what a self-intersecting polygon is, why it's invalid in the MVT spec, and what to fix."

**Expected result:**
- Tile Health header shows "1 Error" badge
- Diagnostic Explorer shows the error row
- Clicking the row: camera focus + Rule Details panel updates with explanation + suggestion
- RuleDetailsPanel shows "Self-Intersecting Geometry" explanation

**Fallback — if camera doesn't animate:**
> "The camera animation requires a canvas render. Let me press R to reset the view and try again."
> Press **R** to reset, then re-select the diagnostic.

---

## Minute 6–8 — Statistics & Tooling

**What to click:**
1. Click **Statistics** in the sidebar.
2. Show the layer breakdown and geometry distribution.
3. Click **Settings** briefly to show the toggle options.

**What to say:**
> "The Statistics tab gives you layer-by-layer geometry type distribution. This is the kind of structural awareness you need before you write rules — you need to know what normal looks like.
>
> Settings: hover highlighting, vertex display, tile bounds — all available while keeping the canvas live."

**Expected result:** Statistics panel visible with charts.

**Fallback:** Nothing to fail here — it's all derived from the loaded tile.

---

## Minute 8–12 — Compare Two Tiles

**What to click:**
1. Go back to Welcome (press **Ctrl+W** or click the Welcome tab).
2. Click **"Comparison — Before & After"** demo card → **Open Demo**.
3. The Compare tab loads with both tiles pre-loaded.
4. Click **Run Comparison**.
5. Expand the **road** layer diff in the Difference Explorer.

**What to say:**
> "This is where it gets interesting for CI. I have two tiles — a before and an after. One click loads both.
>
> *(after Run Comparison)* The Difference Explorer breaks this down layer by layer. Here in the road layer I can see which features changed, which appeared, and which disappeared. This is structural diffing — no rendering required."

**Expected result:**
- ComparisonPage shows both file names
- After Run Comparison: DifferenceExplorer shows layer diff
- Expandable groups per layer

**Fallback — if comparison takes too long:**
> "The comparison is running — it's doing structural matching across every feature. This happens synchronously for real-time feedback."
> Wait up to 5 seconds. The comparison typically finishes under 1 second for these fixtures.

---

## Minute 12–14 — Regression Analysis

**What to click:**
1. Click **Regression** in the sidebar (comparison result is still in memory).
2. The Regression page shows ranked regression candidates.
3. Click the top candidate to open the Evidence Panel.

**What to say:**
> "The Regression tab takes the comparison output and ranks it. It asks: which of these differences is most likely a regression — an unintended change — versus an intentional improvement?
>
> The Confidence Scorer assigns a probability to each candidate based on geometry change magnitude, property delta count, and layer criticality. This is the kind of signal that catches 'wait, why did 40 building features disappear?' before it ships."

**Expected result:**
- Regression candidates list with confidence scores
- Evidence Panel on the right shows the specific diffs for the selected candidate

---

## Minute 14–15 — Style Linting (Style Explorer)

**What to click:**
1. Click **Style** in the sidebar.
2. Show the style.json validator UI.

**What to say:**
> "TileGuard also lints MapLibre style specifications. Nine rules covering source references, zoom ranges, duplicate layer IDs, deprecated properties. Same rule engine, same diagnostic format. You get one unified quality gate for tiles and styles."

**Expected result:** StyleExplorerPage visible.

---

## Minute 15–17 — CLI Demo

**Switch to terminal.**

```bash
# Validate a tile
npx tileguard check fixtures/real-tiles/tokyo.pbf

# Validate with JSON output for CI
npx tileguard check fixtures/bad/invalid-tile-self-intersection.pbf --reporter json

# Lint a style
npx tileguard check fixtures/good/valid-style.json
```

**What to say:**
> "Everything you just saw in the Inspector is also available in the CLI. The same engine, the same rules. This is what runs in CI."

**Expected result:**
- `tokyo.pbf` → clean output, exit 0
- `invalid-tile-self-intersection.pbf` → JSON with one error diagnostic
- `valid-style.json` → clean output

**Fallback — if CLI isn't built:**
```bash
pnpm --filter tileguard run build
```
Then repeat the commands.

---

## Minute 17–19 — GitHub Actions

**Switch to browser, open GitHub workflow file.**

```yaml
# .github/workflows/tile-quality.yml
jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npx tileguard check ./tiles/ ./styles/ --reporter json
```

**What to say:**
> "This runs on every pull request. If a tile pipeline change introduces a self-intersecting polygon, breaks a required layer, or causes 40 building features to vanish — this gate fails before the branch merges.
>
> That is the ESLint moment for the geospatial stack. The framework exists. The rules are composable. You can write a new rule in 25 lines of TypeScript."

---

## Minute 19–20 — Close

**What to say:**
> "TileGuard is MIT-licensed and on GitHub. The architecture is rule-engine-based — the same pattern ESLint uses — which means you can write domain-specific rules for your own tile schemas without touching the core.
>
> If you've ever shipped a tile regression that you caught too late, I'd love to talk after the session. Thank you."

**What to click:** Show the GitHub link: `github.com/shreeharshshinde/tileguard`

---

## Emergency Fallbacks

### The Inspector won't start
```bash
cd packages/inspector
pnpm dev
```
If port 5173 is taken: `pnpm dev --port 5174`

### Demo tiles fail to fetch from /demo/
The public/ symlink may have broken. Verify:
```bash
ls packages/inspector/public/demo/
```
If missing, re-create it:
```bash
ln -s ../../../../demo packages/inspector/public/demo
```

### No internet for npx tileguard
Use the local build:
```bash
node packages/cli/dist/bin/tileguard.js check fixtures/real-tiles/tokyo.pbf
```

### Presentation Mode makes text too large
Press **Ctrl+Shift+P** to toggle it off.

### Browser zoom accidentally changed
Press **Ctrl+0** to reset zoom.

---

## Timing Summary

| Minute | Section |
|:-------|:--------|
| 0–1 | The Problem |
| 1–3 | Inspector — Clean Tile |
| 3–6 | Diagnostics — Broken Tile |
| 6–8 | Statistics & Settings |
| 8–12 | Compare |
| 12–14 | Regression |
| 14–15 | Style Linting |
| 15–17 | CLI |
| 17–19 | GitHub Actions |
| 19–20 | Close & Questions |

---

## Keyboard Shortcuts Reference (during demo)

| Key | Action |
|:----|:-------|
| `Ctrl+Shift+P` | Toggle Presentation Mode |
| `Ctrl+1` | Diagnostics tab |
| `Ctrl+2` | Statistics tab |
| `Ctrl+Shift+D` | Developer overlay (turn off before presenting) |
| `R` | Reset canvas view |
| `F` | Focus selected feature |
| `Esc` | Clear selection |
