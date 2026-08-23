import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(defineConfig({
  title: 'TileGuard',
  description: 'Automated quality gates for geospatial software.',
  lang: 'en-US',
  appearance: 'dark',
  lastUpdated: true,

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    [
      'link',
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    ],
    [
      'link',
      {
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
        rel: 'stylesheet',
      },
    ],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
  ],

  themeConfig: {
    logo: '/tileguard_hero_logo.png',
    siteTitle: 'TileGuard',

    nav: [
      { text: 'Docs', link: '/getting-started/quick-start' },
      {
        text: 'Guides',
        items: [
          { text: 'Validating Tiles', link: '/guides/validating-tiles' },
          { text: 'Inspecting Findings', link: '/guides/inspecting-findings' },
          { text: 'Comparing Tiles', link: '/guides/comparing-tiles' },
          { text: 'MapLibre Styles', link: '/guides/maplibre-styles' },
          { text: 'Configuring Rules', link: '/guides/configuring-rules' },
          { text: 'Programmatic Usage', link: '/guides/programmatic-usage' },
          { text: 'CI / GitHub Actions', link: '/guides/ci-github-actions' },
          { text: 'Generating Reports', link: '/guides/generating-reports' },
        ],
      },
      { text: 'Rules', link: '/rules/' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'API', link: '/api/' },
    ],

    sidebar: [
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
          { text: 'Validating Tiles', link: '/guides/validating-tiles' },
          { text: 'Inspecting Findings', link: '/guides/inspecting-findings' },
          { text: 'Comparing Tiles', link: '/guides/comparing-tiles' },
          { text: 'MapLibre Styles', link: '/guides/maplibre-styles' },
          { text: 'Configuring Rules', link: '/guides/configuring-rules' },
          { text: 'Programmatic Usage', link: '/guides/programmatic-usage' },
          { text: 'CI / GitHub Actions', link: '/guides/ci-github-actions' },
          { text: 'Generating Reports', link: '/guides/generating-reports' },
        ],
      },
      {
        text: 'Rules',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/rules/' },
          {
            text: 'Tile Rules',
            collapsed: true,
            items: [
              { text: 'required-layers', link: '/rules/tile/required-layers' },
              { text: 'required-properties', link: '/rules/tile/required-properties' },
              { text: 'coordinate-range', link: '/rules/tile/coordinate-range' },
              { text: 'feature-count', link: '/rules/tile/feature-count' },
              { text: 'layer-feature-count', link: '/rules/tile/layer-feature-count' },
              { text: 'unclosed-ring', link: '/rules/tile/unclosed-ring' },
              { text: 'zero-area-ring', link: '/rules/tile/zero-area-ring' },
              { text: 'winding-order', link: '/rules/tile/winding-order' },
              { text: 'hole-containment', link: '/rules/tile/hole-containment' },
              { text: 'self-intersection', link: '/rules/tile/self-intersection' },
              { text: 'degenerate-geometry', link: '/rules/tile/degenerate-geometry' },
              { text: 'no-empty', link: '/rules/tile/no-empty' },
            ],
          },
          {
            text: 'Style Rules',
            collapsed: true,
            items: [
              { text: 'valid-json', link: '/rules/style/valid-json' },
              { text: 'version', link: '/rules/style/version' },
              { text: 'sources-present', link: '/rules/style/sources-present' },
              { text: 'layers-present', link: '/rules/style/layers-present' },
              { text: 'layer-id-required', link: '/rules/style/layer-id-required' },
              { text: 'unique-layer-id', link: '/rules/style/unique-layer-id' },
              { text: 'known-source', link: '/rules/style/known-source' },
              { text: 'zoom-range', link: '/rules/style/zoom-range' },
              { text: 'no-deprecated-ref', link: '/rules/style/no-deprecated-ref' },
            ],
          },
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
        text: 'Decisions (ADRs)',
        collapsed: true,
        items: [
          { text: 'ADR-001: Why TileGuard Exists', link: '/decisions/adr-001-why-tileguard-exists' },
          { text: 'ADR-002: Local-First Processing', link: '/decisions/adr-002-local-first-processing' },
          { text: 'ADR-003: Rule-Based Architecture', link: '/decisions/adr-003-rule-based-architecture' },
          { text: 'ADR-004: Structured Diagnostics', link: '/decisions/adr-004-structured-diagnostics' },
          { text: 'ADR-005: Validation ≠ Visualization', link: '/decisions/adr-005-validation-visualization-separation' },
        ],
      },
      {
        text: 'API Reference',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/api/' },
          { text: '@tileguard/core', link: '/api/core' },
          { text: '@tileguard/tile-rules', link: '/api/tile-rules' },
          { text: '@tileguard/style-rules', link: '/api/style-rules' },
          { text: '@tileguard/analysis', link: '/api/analysis' },
          { text: '@tileguard/reporters', link: '/api/reporters' },
          { text: '@tileguard/config', link: '/api/config' },
          { text: '@tileguard/cli', link: '/api/cli' },
        ],
      },
      {
        text: 'Project',
        collapsed: true,
        items: [
          { text: 'Contributing', link: '/project/contributing' },
          { text: 'Development', link: '/project/development' },
          { text: 'Roadmap', link: '/project/roadmap' },
          { text: 'Releases', link: '/project/releases' },
        ],
      },
    ],

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/shreeharshshinde/tileguard',
      },
    ],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern:
        'https://github.com/shreeharshshinde/tileguard/edit/main/docs-site/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Shreeharsh Shinde',
    },
  },

  mermaid: {
    theme: 'dark',
  },

  vite: {
    optimizeDeps: {
      include: ['mermaid', 'dayjs'],
    },
  },
}));
