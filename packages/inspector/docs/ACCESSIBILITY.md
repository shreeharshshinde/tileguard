# Accessibility Report — TileGuard Inspector

**Date:** 2026-08-07  
**Standard:** WCAG 2.1 AA (target)  
**Scope:** All interactive components, keyboard navigation, screen reader support

---

## Overall Score: 7.5/10

Good structural accessibility (ARIA landmarks, roles, labels) but needs focus ring visibility and dialog focus trapping for AA compliance.

---

## Critical Issues (3)

| # | Issue | WCAG | File | Fix |
|---|-------|------|------|-----|
| 1 | No visible focus rings on sidebar nav | 2.4.7 Focus Visible | SidebarItem.tsx | Add `focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)]` |
| 2 | No visible focus rings on toolbar buttons | 2.4.7 Focus Visible | WorkspaceComponents.tsx | Same |
| 3 | No visible focus rings on LayerRow | 2.4.7 Focus Visible | LayerExplorer.tsx | Same |

## Important Issues (7)

| # | Issue | WCAG | File |
|---|-------|------|------|
| 4 | GlobalSearch missing `role="dialog"` | 4.1.2 Name, Role, Value | GlobalSearch.tsx:232 |
| 5 | Missing `role="tablist"` on FeatureInspector | 4.1.2 | FeatureInspector.tsx:365 |
| 6 | Tab panel missing `aria-labelledby` | 1.3.1 Info and Relationships | FeatureInspector.tsx:371 |
| 7 | No focus trap on GlobalSearch | 2.4.3 Focus Order | GlobalSearch.tsx |
| 8 | No focus trap on CommandPalette | 2.4.3 Focus Order | CommandPalette.tsx |
| 9 | No `<main>` landmark | 1.3.1 Info and Relationships | Workspace.tsx |
| 10 | No skip-navigation link | 2.4.1 Bypass Blocks | Workspace.tsx |

## Color Contrast (All Pass AA)

| Token | Ratio | Pass? |
|-------|-------|-------|
| Primary text on bg | 16.6:1 | ✅ |
| Secondary text | 11.2:1 | ✅ |
| Muted text | 4.8:1 | ✅ |
| Accent on surface | 4.5:1 | ✅ |
| Error/Warning/Success | >5:1 | ✅ |

## Remediation: ~70 minutes total
