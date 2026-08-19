---
layout: home

hero:
  name: TileGuard
  text: Documentation
  tagline: Rules, architecture, guides, and API reference for automated geospatial quality gates.
  image:
    src: /tileguard_hero_logo.png
    alt: TileGuard
  actions:
    - theme: brand
      text: Quick Start →
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
    details: Validate geometry integrity, structure, and feature constraints in MVT tiles.
    link: /rules/#tile-validation-rules
  - icon: 🎨
    title: 9 Style Rules
    details: Lint MapLibre style specs for sources, layers, zoom ranges, and deprecated patterns.
    link: /rules/#style-lint-rules
  - icon: ⚡
    title: CI-Native
    details: Exit codes, JSON output, GitHub Actions ready. Fail PRs on quality gate violations.
    link: /guides/ci-github-actions
  - icon: 🏗️
    title: Architecture
    details: Pipeline design, package structure, and key decisions explained.
    link: /learn/how-it-works
---
