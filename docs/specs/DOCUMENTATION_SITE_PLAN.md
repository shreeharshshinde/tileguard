# docs.tileguard — Implementation Plan

## Goal

> Someone watches the FOSS4G talk → visits docs.tileguard → understands what TileGuard is → runs it in 5 minutes → understands the architecture → can trust/extend it.

This is a **small, intentional documentation site** — not a documentation dump of the repository.

---

## Technology Choice: VitePress

**Why VitePress over alternatives:**

| Criteria | VitePress | Docusaurus | Starlight (Astro) |
|:---------|:----------|:-----------|:------------------|
| Already in ecosystem | ✅ Vite (Inspector uses Vite) | ❌ React/Webpack | ❌ Astro |
| Markdown-first | ✅ | ✅ | ✅ |
| TypeScript code blocks | ✅ built-in shiki | ✅ | ✅ |
| Fast builds | ✅ ~2s | ❌ ~15s | ✅ |
| Custom components | ✅ Vue SFC | ✅ React/MDX | ✅ Astro |
| Deploy anywhere | ✅ Static | ✅ Static | ✅ Static |
| Looks professional OOB | ✅ | ⚠️ Needs theming | ✅ |

VitePress aligns with the project's existing Vite toolchain, builds in seconds, and produces a clean professional site with zero customization.

---

## Visual Identity — Match the Inspector Homepage

The docs site must feel like it belongs to the same product as the Inspector homepage. This means applying TileGuard's exact design system — not a generic VitePress theme.

### Design Tokens (from `packages/inspector/src/styles/tokens.css`)

```css
:root {
  --tg-bg-primary: #000000;
  --tg-bg-secondary: #09090b;
  --tg-bg-surface: #121214;
  --tg-bg-hover: #1f1f22;
  --tg-border: #27272a;
  --tg-accent: #a3ff00;
  --tg-accent-hover: #bef264;
  --tg-text-primary: #ffffff;
  --tg-text-secondary: #a1a1aa;
  --tg-text-muted: #71717a;
  --tg-error: #ef4444;
  --tg-warning: #f59e0b;
  --tg-success: #22c55e;
  --tg-font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --tg-font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code", monospace;
}
```

### Visual Design Principles (from Inspector HomePage)

| Element | Treatment |
|:--------|:----------|
| **Background** | Pure black `#000000` with `#09090b` surface panels |
| **Accent** | Neon green `#a3ff00` — used for highlights, links, badges, CTAs |
| **Typography** | Inter for body, JetBrains Mono for code. White text on dark. |
| **Cards/panels** | `#121214` bg, `1px solid #27272a` border, `6px` radius |
| **Hero** | Large logo with drop-shadow glow, staggered fade-in animation |
| **Stats pill** | Rounded-full, `#09090b` inner bg, thin gradient border with accent glow |
| **Section headings** | `text-xs font-semibold uppercase tracking-widest text-[--tg-text-muted]` |
| **Hover states** | `#1f1f22` background, accent color on scrollbar thumbs |
| **Gradients** | Subtle `from-[--tg-accent] to-emerald-400` for emphasis text |
| **Shadows** | Green glow: `drop-shadow-[0_0_50px_rgba(163,255,0,0.3)]` on logo/hero |
| **Motion** | Framer Motion-style stagger on hero (0.09s between items, spring on logo) |

### VitePress Custom Theme Implementation

Override the default VitePress theme to match:

```typescript
// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme';
import './custom.css';

export default {
  extends: DefaultTheme,
};
```

```css
/* .vitepress/theme/custom.css */
:root {
  /* Override VitePress defaults with TileGuard tokens */
  --vp-c-brand-1: #a3ff00;
  --vp-c-brand-2: #bef264;
  --vp-c-brand-3: #a3ff00;
  --vp-c-brand-soft: rgba(163, 255, 0, 0.14);

  --vp-c-bg: #000000;
  --vp-c-bg-alt: #09090b;
  --vp-c-bg-elv: #121214;
  --vp-c-bg-soft: #1f1f22;

  --vp-c-text-1: #ffffff;
  --vp-c-text-2: #a1a1aa;
  --vp-c-text-3: #71717a;

  --vp-c-border: #27272a;
  --vp-c-divider: #27272a;
  --vp-c-gutter: #09090b;

  --vp-c-tip-1: #a3ff00;
  --vp-c-warning-1: #f59e0b;
  --vp-c-danger-1: #ef4444;

  --vp-font-family-base: "Inter", system-ui, -apple-system, sans-serif;
  --vp-font-family-mono: "JetBrains Mono", "Fira Code", monospace;

  --vp-code-bg: #121214;
  --vp-code-color: #a3ff00;

  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: linear-gradient(135deg, #ffffff 50%, #a3ff00);
  --vp-home-hero-image-background-image: radial-gradient(
    circle, rgba(163, 255, 0, 0.15) 0%, transparent 60%
  );
  --vp-home-hero-image-filter: blur(68px);
}

/* Force dark mode — TileGuard is dark-only like the Inspector */
html {
  color-scheme: dark;
}

/* Custom selection color */
::selection {
  background: rgba(163, 255, 0, 0.25);
  color: #ffffff;
}

/* Navbar blend into the background */
.VPNav {
  border-bottom: 1px solid #27272a !important;
  background: #09090b !important;
}

/* Sidebar styling */
.VPSidebar {
  background: #09090b !important;
  border-right: 1px solid #27272a !important;
}

/* Active sidebar link — accent glow */
.VPSidebarItem.is-active > .item .link .text {
  color: #a3ff00 !important;
}

/* Code block styling — match Inspector */
.vp-code-group .tabs label.active {
  color: #a3ff00;
  border-bottom-color: #a3ff00;
}

div[class*="language-"] {
  border: 1px solid #27272a;
  background: #09090b !important;
}

/* Custom scrollbars (match Inspector) */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 999px; }
::-webkit-scrollbar-thumb:hover { background: #a3ff00; }
```

### Landing Page (index.md) — Match Inspector Hero Layout

The VitePress `index.md` frontmatter hero should replicate the Inspector's HomeHeader:

```yaml
---
layout: home
hero:
  name: TileGuard
  text: Automated quality gates for geospatial software.
  tagline: Validate vector tiles and MapLibre styles. Inspect geometry. Diagnose failures. Compare versions. Generate reports.
  image:
    src: /tileguard_hero_logo.png
    alt: TileGuard
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/quick-start
    - theme: alt
      text: View Rules
      link: /rules/
    - theme: alt
      text: GitHub
      link: https://github.com/shreeharshshinde/tileguard

features:
  - icon: 🗺️
    title: 12 Tile Rules
    details: Validate MVT structure, geometry integrity, winding order, and feature constraints.
  - icon: 🎨
    title: 9 Style Rules
    details: Lint MapLibre style specifications for source references, layer structure, and zoom ranges.
  - icon: 🔍
    title: Visual Inspector
    details: Browser-based debugging with canvas geometry rendering, diagnostic overlays, and investigation workflows.
  - icon: ⚡
    title: CI-Native
    details: Exit codes, JSON output, GitHub Actions ready. Fail PRs on quality gate violations.
  - icon: 📊
    title: Compare & Regress
    details: Structural diff between tile versions with confidence-scored regression ranking.
  - icon: 📝
    title: Engineering Reports
    details: Markdown, HTML, and JSON reports with executive summary and prioritized recommendations.
---
```

### Assets to Copy from Inspector

```text
docs-site/public/
├── tileguard_hero_logo.png   ← from packages/inspector/public/
├── dotted_map.svg            ← from packages/inspector/public/
└── favicon.svg               ← shield icon in accent green
```

### Typography & Fonts

Load Inter and JetBrains Mono (same as Inspector):

```html
<!-- .vitepress/config.ts head -->
head: [
  ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
  ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
  ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap', rel: 'stylesheet' }],
]
```

---

## Site Structure

```text
docs-site/
├── .vitepress/
│   ├── config.ts          # Site config, nav, sidebar
│   └── theme/
│       └── index.ts       # Custom theme extensions (minimal)
├── index.md               # Home (landing page)
├── getting-started/
│   ├── installation.md
│   ├── quick-start.md
│   └── first-check.md
├── learn/
│   ├── what-is-tileguard.md
│   ├── how-it-works.md
│   └── concepts.md
├── guides/
│   ├── validating-tiles.md
│   ├── inspecting-findings.md
│   ├── comparing-tiles.md
│   ├── maplibre-styles.md
│   ├── ci-github-actions.md
│   └── generating-reports.md
├── rules/
│   ├── index.md           # Overview + rule table
│   ├── tile/
│   │   ├── required-layers.md
│   │   ├── self-intersection.md
│   │   ├── winding-order.md
│   │   ├── hole-containment.md
│   │   ├── unclosed-ring.md
│   │   ├── zero-area-ring.md
│   │   ├── degenerate-geometry.md
│   │   ├── coordinate-range.md
│   │   ├── feature-count.md
│   │   ├── layer-feature-count.md
│   │   ├── required-properties.md
│   │   └── no-empty.md
│   └── style/
│       ├── valid-json.md
│       ├── version.md
│       ├── sources-present.md
│       ├── layers-present.md
│       ├── layer-id-required.md
│       ├── unique-layer-id.md
│       ├── known-source.md
│       ├── zoom-range.md
│       └── no-deprecated-ref.md
├── architecture/
│   ├── overview.md
│   ├── validation-pipeline.md
│   ├── rule-engine.md
│   └── decoder-diagnostics.md
├── decisions/
│   ├── index.md
│   ├── adr-001-why-tileguard-exists.md
│   ├── adr-002-local-first-processing.md
│   ├── adr-003-rule-based-architecture.md
│   ├── adr-004-structured-diagnostics.md
│   └── adr-005-validation-visualization-separation.md
├── api/
│   └── index.md           # Links to TypeDoc or inline reference
└── project/
    ├── contributing.md
    ├── development.md
    ├── roadmap.md
    └── releases.md
```

---

## Phased Delivery

### Phase 1 — FOSS4G Launch (Essential)

**7 pages that must be polished before the talk.**

These are the pages a FOSS4G attendee will visit immediately after your talk.

| # | Page | Source Material | Priority |
|:--|:-----|:----------------|:---------|
| 1 | **Home** (landing) | New — one-screen hero | P0 |
| 2 | **Quick Start** | README Quick Start + CLI README | P0 |
| 3 | **What is TileGuard?** | docs/PROJECT_VISION.md + PROBLEM_STATEMENT.md | P0 |
| 4 | **How It Works** | docs/architecture/01-overview.md | P0 |
| 5 | **Rules Index** | docs/rules/README.md + rule tables | P0 |
| 6 | **CI / GitHub Actions** | README CI section + CLI README | P0 |
| 7 | **Architecture Overview** | docs/architecture/01-overview.md + 04-rule-system.md | P0 |

**Also needed (structural):**
- VitePress project scaffold + config
- Navigation sidebar
- Deploy pipeline (GitHub Pages or Vercel)

---

### Phase 2 — Complete the Learn & Guide Sections

| # | Page | Source Material |
|:--|:-----|:----------------|
| 8 | Installation (detailed) | CLI README installation section |
| 9 | Your First Tile Check | New — tutorial walkthrough |
| 10 | Concepts (Rules & Diagnostics) | docs/architecture/02-diagnostic-model.md + 04-rule-system.md |
| 11 | Validating Vector Tiles | New guide |
| 12 | Inspecting Findings | Inspector README + investigation workflow |
| 13 | Comparing Tiles | Analysis README + CLI compare docs |
| 14 | MapLibre Styles | style-rules README |
| 15 | Generating Reports | reporters README + CLI report docs |

---

### Phase 3 — Individual Rule Pages

Migrate and polish the 21 existing rule docs from `docs/rules/tile/*.md` and `docs/rules/style/*.md`. Each rule page follows a consistent template:

```markdown
# tile/self-intersection

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/tile-rules`

## What it checks
...

## Why it matters
...

## Example
...

## Diagnostic output
...

## Configuration
...

## Remediation
...

## Related rules
...
```

The existing rule docs already have most of this content — they need reformatting into the template and removal of TODO diagram placeholders.

---

### Phase 4 — Architecture Deep Dives + ADRs

| # | Page | Source Material |
|:--|:-----|:----------------|
| 16 | Validation Pipeline | docs/architecture/07-engine.md |
| 17 | Rule Engine | docs/architecture/04-rule-system.md |
| 18 | Decoder & Diagnostics | docs/architecture/02-diagnostic-model.md + 03-artifact-model.md |
| 19 | ADR-001: Why TileGuard Exists | docs/architecture/adr/001-*.md (rewrite for audience) |
| 20 | ADR-002: Local-First Processing | New |
| 21 | ADR-003: Rule-Based Architecture | docs/architecture/adr/002-*.md (rewrite) |
| 22 | ADR-004: Structured Diagnostics | docs/architecture/adr/003-*.md (rewrite) |
| 23 | ADR-005: Validation ≠ Visualization | docs/architecture/adr/008-*.md + 009-*.md (extract) |

---

### Phase 5 — API Reference + Project Pages

| # | Page | Source |
|:--|:-----|:-------|
| 24 | API Reference | TypeDoc generated output or manual summaries |
| 25 | Contributing | CONTRIBUTING.md |
| 26 | Development Setup | CONTRIBUTING.md development section |
| 27 | Roadmap | ROADMAP.md |
| 28 | Releases | CHANGELOG.md |

---

## Implementation Tasks

### Step 1: Scaffold VitePress Project

```bash
# From repo root
mkdir docs-site
cd docs-site
pnpm init
pnpm add -D vitepress
```

Create `.vitepress/config.ts`:
- Site title: "TileGuard"
- Description: "Automated quality gates for geospatial software"
- Sidebar navigation matching the structure above
- Social links (GitHub)
- Search enabled (local)
- Dark mode forced (no light mode — matches Inspector)
- Google Fonts head tags (Inter + JetBrains Mono)

### Step 2: Apply TileGuard Theme

Create `.vitepress/theme/custom.css` with the full VitePress variable overrides (see Visual Identity section above). This ensures the docs site looks like it belongs to the same product as the Inspector.

Copy assets from `packages/inspector/public/` → `docs-site/public/`:
- `tileguard_hero_logo.png`
- `dotted_map.svg`
- Create a `favicon.svg` (shield icon in `#a3ff00`)

### Step 3: Landing Page (index.md)

Hero section matching Inspector's HomeHeader:
- **TileGuard** — large logo with accent glow
- Tagline: "Automated quality gates for geospatial software"
- Sub-tagline: "Validate vector tiles and MapLibre styles. Inspect geometry. Diagnose failures. Compare versions. Generate reports."
- Three CTA buttons: **Get Started** | **View Rules** | **GitHub**
- Feature grid (6 cards): 12 Tile Rules, 9 Style Rules, Visual Inspector, CI-Native, Compare & Regress, Engineering Reports
- Stats pill matching Inspector's rounded stat bar (if VitePress supports custom components, otherwise use the feature grid)

### Step 4: Quick Start Page

The single most important page. Must show:
1. One-line install
2. One-line run (`tileguard check tokyo.pbf`)
3. Real diagnostic output (copy from CLI README)
4. "What next?" links to Inspector, CI, Configuration

### Step 5: What is TileGuard? + How It Works

- Extract from PROJECT_VISION.md and PROBLEM_STATEMENT.md
- Rewrite for a general audience (not internal engineering docs)
- Include the pipeline diagram: Artifacts → Providers → Rules → Diagnostics → Reporters

### Step 6: Architecture Overview

- Rewrite docs/architecture/01-overview.md for docs site
- Package dependency diagram
- Principle list (contracts before implementation, dependencies point inward, etc.)

### Step 7: Rules Index

- Table of all 21 rules with one-line descriptions
- Links to individual rule pages (Phase 3)
- Group by category: Tile Structural, Tile Geometry, Style

### Step 8: CI / GitHub Actions

- Copy-pasteable workflow YAML
- Explain exit codes
- Show PR integration pattern
- JSON reporter for machine parsing

### Step 9: Deploy

Options (choose one):
- **GitHub Pages** — free, `.github/workflows/docs.yml` deploys on push to main
- **Vercel** — free tier, automatic preview deploys on PRs
- **Custom domain** — `docs.tileguard.dev` or `tileguard.dev/docs`

Recommended: **GitHub Pages** with custom domain. Simple, free, no vendor lock-in.

---

## Content Migration Map

Existing content that maps to docs site pages:

| Existing File | → Docs Site Page |
|:--------------|:-----------------|
| `docs/PROJECT_VISION.md` | learn/what-is-tileguard.md |
| `docs/PROBLEM_STATEMENT.md` | learn/what-is-tileguard.md |
| `docs/architecture/01-overview.md` | architecture/overview.md |
| `docs/architecture/04-rule-system.md` | architecture/rule-engine.md |
| `docs/architecture/02-diagnostic-model.md` | learn/concepts.md + architecture/decoder-diagnostics.md |
| `docs/architecture/07-engine.md` | architecture/validation-pipeline.md |
| `docs/rules/tile/*.md` (12 files) | rules/tile/*.md |
| `docs/rules/style/*.md` (9 files) | rules/style/*.md |
| `docs/architecture/adr/001-*.md` | decisions/adr-001-*.md |
| `docs/architecture/adr/002-*.md` | decisions/adr-003-*.md |
| `docs/architecture/adr/003-*.md` | decisions/adr-004-*.md |
| `README.md` CI section | guides/ci-github-actions.md |
| `packages/cli/README.md` | getting-started/installation.md + quick-start.md |
| `packages/analysis/README.md` | guides/comparing-tiles.md |
| `packages/reporters/README.md` | guides/generating-reports.md |
| `packages/inspector/README.md` | guides/inspecting-findings.md |
| `CONTRIBUTING.md` | project/contributing.md |
| `ROADMAP.md` | project/roadmap.md |
| `CHANGELOG.md` | project/releases.md |

---

## Navigation Sidebar Config

```typescript
// .vitepress/config.ts sidebar
sidebar: {
  '/': [
    {
      text: 'Get Started',
      items: [
        { text: 'Installation', link: '/getting-started/installation' },
        { text: 'Quick Start', link: '/getting-started/quick-start' },
        { text: 'Your First Check', link: '/getting-started/first-check' },
      ],
    },
    {
      text: 'Learn',
      items: [
        { text: 'What is TileGuard?', link: '/learn/what-is-tileguard' },
        { text: 'How It Works', link: '/learn/how-it-works' },
        { text: 'Concepts', link: '/learn/concepts' },
      ],
    },
    {
      text: 'Guides',
      items: [
        { text: 'Validate Tiles', link: '/guides/validating-tiles' },
        { text: 'Inspect Findings', link: '/guides/inspecting-findings' },
        { text: 'Compare Tiles', link: '/guides/comparing-tiles' },
        { text: 'MapLibre Styles', link: '/guides/maplibre-styles' },
        { text: 'CI / GitHub Actions', link: '/guides/ci-github-actions' },
        { text: 'Reports', link: '/guides/generating-reports' },
      ],
    },
    {
      text: 'Rules',
      collapsed: false,
      items: [
        { text: 'Overview', link: '/rules/' },
        { text: 'Tile Rules', link: '/rules/tile/' },
        { text: 'Style Rules', link: '/rules/style/' },
      ],
    },
    {
      text: 'Architecture',
      items: [
        { text: 'Overview', link: '/architecture/overview' },
        { text: 'Validation Pipeline', link: '/architecture/validation-pipeline' },
        { text: 'Rule Engine', link: '/architecture/rule-engine' },
        { text: 'Decoder & Diagnostics', link: '/architecture/decoder-diagnostics' },
      ],
    },
    {
      text: 'Decisions',
      collapsed: true,
      items: [
        { text: 'Index', link: '/decisions/' },
        { text: 'ADR-001: Why TileGuard Exists', link: '/decisions/adr-001-why-tileguard-exists' },
        { text: 'ADR-002: Local-First', link: '/decisions/adr-002-local-first-processing' },
        { text: 'ADR-003: Rule-Based', link: '/decisions/adr-003-rule-based-architecture' },
        { text: 'ADR-004: Structured Diagnostics', link: '/decisions/adr-004-structured-diagnostics' },
        { text: 'ADR-005: Validation ≠ Visualization', link: '/decisions/adr-005-validation-visualization-separation' },
      ],
    },
    {
      text: 'API Reference',
      items: [
        { text: 'Overview', link: '/api/' },
      ],
    },
    {
      text: 'Project',
      items: [
        { text: 'Contributing', link: '/project/contributing' },
        { text: 'Development', link: '/project/development' },
        { text: 'Roadmap', link: '/project/roadmap' },
        { text: 'Releases', link: '/project/releases' },
      ],
    },
  ],
}
```

---

## Design Principles for Writing

1. **Answer "what do I need to know?" not "how is it implemented?"**
2. **One page = one question answered.** Don't combine install + concepts + tutorial.
3. **Show real output.** Every page with a command should show actual terminal output.
4. **Link forward.** Every page ends with "What next?" pointing to 2–3 logical next steps.
5. **Copy-paste friendly.** Code blocks should work if pasted directly.
6. **Progressive disclosure.** Home → Quick Start → Concepts → Architecture. Never force the reader through 10 pages to get value.

---

## Timeline Estimate

| Phase | Scope | Effort |
|:------|:------|:-------|
| Phase 1 | VitePress scaffold + 7 essential pages + deploy | 2–3 days |
| Phase 2 | Learn + Guide sections (8 pages) | 2 days |
| Phase 3 | 21 rule pages (template + migrate existing) | 1–2 days |
| Phase 4 | Architecture + 5 ADRs | 1–2 days |
| Phase 5 | API reference + project pages | 1 day |

**Total: ~7–10 days for the full site.**
**Phase 1 alone (FOSS4G launch-ready): 2–3 days.**

---

## Success Criteria

After Phase 1, a FOSS4G attendee should be able to:

1. ✅ Land on docs.tileguard and understand what it does in 10 seconds
2. ✅ Run `tileguard check` on their own tile in under 5 minutes
3. ✅ Understand the architecture at a high level
4. ✅ Know all 21 rules exist and what they catch
5. ✅ Copy a GitHub Actions workflow into their project
6. ✅ Find the GitHub repo and star it
