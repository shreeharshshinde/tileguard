# UX Audit — TileGuard Inspector

**Date:** 2026-08-07  
**Version:** 0.4.5  
**Auditor:** Automated QA pipeline  
**Scope:** All user journeys, navigation, panels, dialogs, states

---

## Executive Summary

| Category | Score | Verdict |
|----------|-------|---------|
| User Journeys | 8/10 | Solid lifecycle, needs error recovery |
| Navigation | 9/10 | Every page has identity and next steps |
| Panels | 9/10 | Tabbed, well-organized, minor a11y gaps |
| Toolbar | 8/10 | Functional but search ref broken |
| Dialogs | 7/10 | Missing focus traps on 2 key dialogs |
| Error States | 6/10 | Exist but lack recovery actions |
| Empty States | 7/10 | Present but 3 pages lack action buttons |
| Loading States | 7/10 | Multi-step progress but uncancellable |
| Notifications | 9/10 | Specific and contextual |

**Overall: 7.8/10 — Conference-ready with targeted fixes.**

---

## Critical Findings (3)

### 1. GlobalSearch missing dialog semantics
- **File:** `components/command/GlobalSearch.tsx:232`
- **Impact:** Screen readers don't announce modal
- **Fix:** Add `role="dialog" aria-modal="true" aria-label="Universal Search"` to wrapper

### 2. LoadingOverlay error state has no recovery
- **File:** `components/loading/LoadingOverlay.tsx`
- **Impact:** User trapped on error screen with no way to retry or dismiss
- **Fix:** Add retry button + dismiss/go-home button to error state

### 3. Missing focus rings on primary navigation
- **File:** `components/navigation/SidebarItem.tsx`, `components/shared/WorkspaceComponents.tsx`
- **Impact:** Keyboard users can't see current focus position
- **Fix:** Add `focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)]` to interactive elements

---

## Important Findings (14)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Dead code (~250 lines) in InspectorApp.tsx | InspectorApp.tsx:196-380 | Delete unused Workspace/AppHeader/Footer |
| 2 | Theme toggle button is a no-op | WorkspaceHeader.tsx:107 | Hide or remove until ThemeService exists |
| 3 | Missing `role="tablist"` on FeatureInspector | FeatureInspector.tsx:365 | Add to tab container div |
| 4 | GlobalSearch has no focus trap | GlobalSearch.tsx | Add Tab-key trapping |
| 5 | CommandPalette has no focus trap | CommandPalette.tsx | Add Tab-key trapping |
| 6 | Escape double-fires (overlay + selection) | ShortcutService.ts:74 | Skip clearSelection when overlay is open |
| 7 | Ctrl+F hijacks browser find | ShortcutService.ts:83 | Consider Ctrl+Shift+F instead |
| 8 | Comparison/Regression/Report empty states lack actions | 3 files | Add navigation buttons |
| 9 | Loading cannot be cancelled | LoadingOverlay.tsx | Add cancel button |
| 10 | searchInputRef not wired in Toolbar | Toolbar.tsx:97 | Assign ref to search input |
| 11 | "Reset Camera" command is no-op | CommandPalette.tsx:228 | Wire to inspector.render() |
| 12 | No light theme exists | tokens.css | Document as dark-only |
| 13 | ShortcutService comments don't match bindings | ShortcutService.ts:12-15 | Update comments |
| 14 | No error boundary | Workspace.tsx | Add React ErrorBoundary |

---

## Nice-to-Have Findings (12)

1. Artificial loading delays (50ms total) — acceptable for UX feel
2. Inline `@keyframes` in ReturnHomeDialog — move to CSS
3. Math.min spread overflow on huge tiles — use reduce loop
4. No list virtualization — fine for demo-scale data
5. No loading skeletons — spinner is acceptable
6. Hardcoded scrollbar hex colors — use CSS variables
7. Inconsistent separator usage (dots vs borders)
8. Property table truncates at `120px` max-width on 4K
9. `genericErrorToast` title too vague — require title param
10. No style load toasts — add styleLoadedToast/styleLoadErrorToast
11. No `goHome` keyboard binding (only via command palette)
12. Resize handle invisible at rest — add subtle indicator

---

## User Journey Walkthrough

### Cold Start → Home
✅ App loads, no canvas mounted, version visible, theme correct, no console errors

### Home → Load Tile → Workspace
✅ Spinner + multi-step progress + error handling
⚠️ Error state lacks retry/dismiss
⚠️ Loading not cancellable

### Home → Demo Dataset → Workspace
✅ One-click, per-card spinner, metadata shown, toast on success

### Workspace → Home
✅ Confirmation dialog, cancel safe-default, proper cleanup

---

## Recommendation

Fix the 3 critical issues + top 5 important issues before FOSS4G. Time estimate: ~2 hours of focused work.
