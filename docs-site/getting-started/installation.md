# Installation

## Requirements

- **Node.js ≥ 20**: TileGuard uses modern JavaScript features (ES2022+)
- **npm, pnpm, or yarn**: any package manager works
- No native dependencies, no Docker, no server, no database

Verify your Node version:

```bash
node --version
# v20.0.0 or higher
```

## Install Options

### Run Without Installing (Recommended for trying out)

```bash
npx @tileguard/cli check ./tile.pbf
```

This downloads and runs TileGuard without permanently installing it. Perfect for one-off checks or CI.

### Global Install

```bash
npm install -g @tileguard/cli
```

Then use `tileguard` anywhere:

```bash
tileguard check ./tile.pbf
tileguard compare ./v1.pbf ./v2.pbf
tileguard rules list
```

### Project Dependency (Recommended for teams)

::: code-group

```bash [npm]
npm install -D @tileguard/cli
```

```bash [pnpm]
pnpm add -D @tileguard/cli
```

```bash [yarn]
yarn add -D @tileguard/cli
```

:::

Then add scripts to your `package.json`:

```json
{
  "scripts": {
    "lint:tiles": "tileguard check ./tiles/",
    "lint:styles": "tileguard check ./styles/",
    "quality": "tileguard check ./tiles/ ./styles/"
  }
}
```

### Individual Packages

For programmatic use, install only what you need:

```bash
# Core framework only
npm install @tileguard/core

# Tile validation rules
npm install @tileguard/tile-rules @tileguard/core

# Style lint rules
npm install @tileguard/style-rules @tileguard/core

# Comparison and regression engine
npm install @tileguard/analysis @tileguard/core

# Report generation
npm install @tileguard/reporters @tileguard/core
```

## Verify Installation

```bash
tileguard version
```

```text
@tileguard/cli 0.5.0
  @tileguard/core        0.5.0
  @tileguard/tile-rules  0.5.0
  @tileguard/style-rules 0.5.0
  @tileguard/reporters   0.5.0
  @tileguard/analysis    0.5.0
  @tileguard/config      0.5.0
  node                   v22.x.x
```

Check that the system is healthy:

```bash
tileguard doctor
```

```text
✓ Node.js version    v22.x.x (≥20 required)
✓ Core loaded        @tileguard/core 0.5.0
✓ Tile rules         12 rules registered
✓ Style rules        9 rules registered
✓ Config discovery   tileguard.config.ts found
✓ Reporter           text (default)

All checks passed.
```

## Scaffold Configuration

Generate a config file in your project:

```bash
tileguard init
```

This creates `tileguard.config.ts` with all recommended rules enabled at their default severities. You can then customize rule settings as needed.

## What Next?

- [**Your First Tile Check ›**](/getting-started/first-check)
Walk through a real validation
- [**Quick Start ›**](/getting-started/quick-start)
Run common commands
- [**CI / GitHub Actions ›**](/guides/ci-github-actions)
Set up automated quality gates
