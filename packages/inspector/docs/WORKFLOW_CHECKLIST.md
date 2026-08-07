# Workflow Checklist — TileGuard Inspector

**Date:** 2026-08-07  
**Purpose:** Verify every workflow is complete before conference demo

---

## Complete Investigation Workflow

```
Home → Load Demo → Explore → Select Feature → Diagnose → Statistics → 
Style → Compare → Regression → Report → Export → Home
```

---

## Checklist

### 1. Cold Start
- [x] App loads without console errors
- [x] No canvas mounted on home
- [x] Theme applied correctly (dark mode)
- [x] Version badge visible
- [x] Demo gallery renders with all 6 datasets
- [x] Quick actions panel functional
- [x] Recent sessions panel renders

### 2. Load Tile (File)
- [x] Drop zone visible and responsive
- [x] File picker triggers on click
- [x] Loading overlay appears with multi-step progress
- [x] Progress bar animates through: Reading → Decoding → Statistics → Diagnostics → Ready
- [x] Success toast fires with filename
- [ ] ⚠️ Error state has retry/dismiss buttons
- [ ] ⚠️ Loading can be cancelled
- [x] Large tile (403KB tokyo.pbf) loads without stalling
- [x] Corrupted PBF shows error toast with message

### 3. Load Demo Dataset
- [x] Each card shows type icon + title + description + tags
- [x] One-click loads tile and transitions to workspace
- [x] Loading spinner on card during fetch
- [x] Comparison datasets load both files
- [x] Speaker notes visible as tooltips
- [x] Error toast on fetch failure

### 4. Explore Workspace
- [x] Canvas renders geometry correctly
- [x] Layer explorer shows all layers with feature counts
- [x] Layer search/filter works
- [x] Click feature → FeatureInspector updates
- [x] Hover highlights feature under cursor
- [x] Tab navigation: Summary / Properties / Geometry / Coords / JSON
- [x] Zoom/pan responds to mouse wheel + drag
- [x] Breadcrumb updates: Home > Dataset > Explore > Layer > Feature

### 5. Diagnostics Workspace
- [x] Tile health header shows error/warning/info counts
- [x] Diagnostic explorer lists all diagnostics
- [x] Severity filter tabs (Error / Warning / All)
- [x] Click diagnostic → highlights affected feature on canvas
- [x] Rule inspector panel shows rule details + suggestion
- [x] Breadcrumb updates when diagnostic selected

### 6. Statistics Workspace
- [x] Statistics dashboard renders metrics
- [x] Layer statistics table shows per-layer breakdown
- [x] Geometry chart visualizes type distribution
- [x] Diagnostic chart shows severity distribution
- [x] Empty state shown when no tile loaded

### 7. Style Explorer Workspace
- [x] Load style JSON from file picker
- [x] Layer list with sources, types, visibility
- [x] Select layer → property inspector
- [x] Style validation diagnostics inline
- [x] Empty state with "Choose File" action button

### 8. Compare Workspace
- [x] Load Tile A + Tile B slots
- [x] Run Comparison button (disabled until both loaded)
- [x] Comparison result renders with summary metrics
- [x] Difference explorer shows added/removed/modified
- [x] Toast notification with diff count
- [ ] ⚠️ Empty state needs "Load Tiles" action button
- [x] Investigation context updated on completion

### 9. Regression Workspace
- [x] Shows analysis when comparison data exists
- [x] Candidate list with confidence scores
- [x] Evidence panel for selected candidate
- [x] Recommendation panel for next steps
- [ ] ⚠️ Empty state needs "Go to Compare" button

### 10. Report Workspace
- [x] Format tabs: Markdown / HTML / JSON
- [x] Live preview updates on format change
- [x] Copy to clipboard button
- [x] Download button with correct filename/extension
- [ ] ⚠️ Empty state needs "Go to Compare" button
- [x] Report content includes all investigation sections

### 11. Return Home
- [x] Confirmation dialog appears when session active
- [x] Cancel returns to workspace
- [x] Confirm closes session and returns to home
- [x] Memory cleanup (store disposal)
- [x] Investigation context resets

### 12. Command Palette (Ctrl+K)
- [x] Opens with Ctrl+K
- [x] Closes with Escape
- [x] Fuzzy search filters commands
- [x] All workspace navigation commands work
- [x] Settings, shortcuts, presentation mode accessible
- [x] Timeline event recorded on execution

### 13. Global Search (Ctrl+/)
- [x] Opens with Ctrl+/
- [x] Searches features by property values
- [x] Searches layers by name
- [x] Searches diagnostics by rule ID
- [x] Results categorized with icons
- [x] Selecting result navigates to correct workspace
- [ ] ⚠️ Missing role="dialog" on wrapper

### 14. Engineering Console (Ctrl+`)
- [x] Collapsed bar shows event count + FPS
- [x] Expands on Ctrl+`
- [x] Diagnostics tab shows severity summary
- [x] Timeline tab shows compact investigation history
- [x] Performance tab shows FPS + memory
- [x] Collapse button works

### 15. Presentation Mode (Ctrl+Shift+P)
- [x] Toggle button in header shows state
- [x] CSS scales fonts +20%, increases spacing
- [x] Dev overlays hidden
- [x] Higher contrast colors applied
- [x] Persists across page reloads (localStorage)

---

## Summary

| Category | Pass | Fail | Total |
|----------|------|------|-------|
| Cold Start | 7 | 0 | 7 |
| Load Tile | 7 | 2 | 9 |
| Load Demo | 6 | 0 | 6 |
| Explore | 8 | 0 | 8 |
| Diagnostics | 6 | 0 | 6 |
| Statistics | 5 | 0 | 5 |
| Style | 5 | 0 | 5 |
| Compare | 6 | 1 | 7 |
| Regression | 4 | 1 | 5 |
| Report | 4 | 1 | 5 |
| Return Home | 5 | 0 | 5 |
| Command Palette | 6 | 0 | 6 |
| Global Search | 6 | 1 | 7 |
| Console | 6 | 0 | 6 |
| Presentation | 5 | 0 | 5 |
| **TOTAL** | **86** | **6** | **92** |

**Pass rate: 93%** — 6 items need targeted fixes before demo.
