# TileGuard — FOSS4G 2026 Short Demo (5 minutes)

For lightning talks, hallway demos, and impromptu presentations.

---

## Pre-Talk (2 min before)

- [ ] Open Inspector at `localhost:5173`
- [ ] Enable Presentation Mode: **Ctrl+Shift+P**
- [ ] Confirm Welcome page with Demo Catalog is visible

---

## Minute 0–1 — Hook

**Say:**
> "Map tile bugs are silent. They survive code review and surface when users report them. TileGuard is ESLint for vector tiles."

---

## Minute 1–2 — Inspector (Clean Tile)

**Do:** Click **"Tokyo — Clean Tile"** → Open Demo
**Say:**
> "One click. No file picker. Feature Explorer on the left — 8 layers, 7,000 features. Click a feature, the Inspector panel fills in. This is what's in the tile."

---

## Minute 2–3 — Diagnostics (Broken Tile)

**Do:** Welcome → click **"Broken Geometry"** → Open Demo → click the error row
**Say:**
> "Now the Diagnostics tab. Tile Health header: 1 error. I click it — camera animates to the broken feature, Rule Details panel explains why and how to fix it."

---

## Minute 3–4 — CLI + CI

**Do:** Switch to terminal
```bash
node packages/cli/dist/bin/tileguard.js check fixtures/bad/invalid-tile-self-intersection.pbf --reporter json
```
**Say:**
> "Same engine in the CLI. Same JSON output. Drop it in GitHub Actions — every pull request gets a tile quality gate."

---

## Minute 4–5 — Close

**Say:**
> "MIT license. Rule engine architecture — write a custom rule in 25 lines of TypeScript. GitHub: shreeharshshinde/tileguard. Happy to talk after."

---

## What to Skip

- Statistics tab (cut if pressed for time)
- Style Explorer (cut if pressed for time)
- Regression tab (cut; needs prior Comparison run)
- Slide deck (entirely optional)
