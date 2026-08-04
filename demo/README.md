# TileGuard Demo Datasets

Pre-packaged datasets for FOSS4G 2026 demonstrations.

Every dataset loads **offline** — no network access required during a conference presentation.

---

## Directory Structure

```
demo/
  DemoManifest.json     — Machine-readable catalog of all demo datasets
  README.md             — This file

  tokyo/
    clean/
      tokyo-clean.pbf   — 403 KB real-world tile, central Tokyo, fully valid
    broken/
      invalid-polygon.pbf   — Self-intersecting polygon (tile/self-intersection)
      missing-property.pbf  — Out-of-range coordinates (tile/coordinate-range)
      duplicate-id.pbf      — Degenerate geometry (tile/degenerate-geometry)
    comparison/
      before.pbf        — Manhattan tile (tile A in Compare demo)
      after.pbf         — Tokyo tile  (tile B in Compare demo)
    regression/
      before.pbf        — Manhattan tile (pre-deployment snapshot)
      after.pbf         — Tokyo tile   (post-deployment snapshot)
    style/
      style.json        — Valid MapLibre style specification
```

---

## Demo Catalog

| Dataset | Tab | Purpose |
|:--------|:----|:--------|
| Tokyo — Clean | Inspector | Feature explorer, canvas interaction, vertex display |
| Broken Geometry | Diagnostics | Self-intersecting polygon, camera-to-diagnostic workflow |
| Missing Property | Diagnostics | Coordinate range violation, rule explanation panel |
| Comparison Demo | Compare | Before/after feature diff, DifferenceExplorer |
| Regression Demo | Regression | High-confidence regression candidates, EvidencePanel |
| Style Linting | Style Explorer | 9 style lint rules on a real MapLibre style spec |

---

## Expected Outputs

### Tokyo — Clean
- Layers: water, landuse, park, building, road, transit, admin, place_label
- Features: ~7,000+ across all layers
- Diagnostics: 0 errors, 0 warnings, 0 info

### Broken Geometry
- Diagnostics: 1 error (`tile/self-intersection`)
- Camera navigation: clicking the error row animates to the affected feature

### Missing Property
- Diagnostics: 1 error (`tile/coordinate-range`)

### Style Linting
- Style passes all 9 rules cleanly — demonstrates green-state validation

---

## How Demo Loading Works

Datasets are loaded without the OS file picker using the Inspector's
built-in **Demo Catalog** on the Welcome page:

1. Click a demo card → `DemoLoader` fetches the `.pbf` or `.json` file
   from the bundled path using `fetch()`.
2. The file is decoded in-browser by the existing `browser-tile-loader`.
3. The workspace automatically navigates to the appropriate tab.
4. For comparison datasets, both tiles are loaded and Compare mode activates.

No file dialog. No external network request. Presentation starts in < 5 seconds.

---

## Updating Datasets

To update a dataset, replace the file in the corresponding directory. The
`DemoManifest.json` paths are relative to the `demo/` directory root.

The demo assets are copied into the Vite `public/` directory during build so
they are accessible at `/demo/...` URLs at runtime.
