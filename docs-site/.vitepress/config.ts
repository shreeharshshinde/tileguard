import { defineConfig } from 'vitepress';

export default defineConfig({
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
      { text: 'Get Started', link: '/getting-started/quick-start' },
      { text: 'Rules', link: '/rules/' },
      { text: 'Architecture', link: '/architecture/overview' },
      {
        text: 'GitHub',
        link: 'https://github.com/shreeharshshinde/tileguard',
      },
    ],

    sidebar: [
      {
        text: 'Get Started',
        items: [
          { text: 'Quick Start', link: '/getting-started/quick-start' },
        ],
      },
      {
        text: 'Learn',
        items: [
          { text: 'What is TileGuard?', link: '/learn/what-is-tileguard' },
          { text: 'How It Works', link: '/learn/how-it-works' },
        ],
      },
      {
        text: 'Guides',
        items: [
          { text: 'CI / GitHub Actions', link: '/guides/ci-github-actions' },
        ],
      },
      {
        text: 'Rules',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/rules/' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Overview', link: '/architecture/overview' },
        ],
      },
      {
        text: 'Project',
        collapsed: true,
        items: [
          { text: 'Contributing', link: '/project/contributing' },
          { text: 'Roadmap', link: '/project/roadmap' },
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
});
