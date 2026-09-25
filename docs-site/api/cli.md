# @tileguard/cli

The command-line interface. Includes all packages. Install this for the complete TileGuard experience.

```bash
npm install -g @tileguard/cli
```

---

## Commands

### `tileguard check`

Validate geospatial artifacts against configured rules.

```bash
tileguard check <sources...> [options]
```

| Option | Description |
|:-------|:------------|
| `--reporter <format>` | Output format: `text` (default), `json`, or `sarif` |
| `--config <path>` | Explicit config file path |

```bash
# Single file
tileguard check ./tile.pbf

# Directory (recursive)
tileguard check ./tiles/

# Multiple sources
tileguard check ./tiles/ ./styles/ --reporter json

# Style file
tileguard check ./styles/map.json
```

**Exit codes:** `0` = pass (no errors), `1` = fail (errors found)

---

### `tileguard compare`

Compare two vector tiles and report structural differences.

```bash
tileguard compare <before> <after> [options]
```

| Option | Description |
|:-------|:------------|
| `--json` | Output as JSON |

```bash
tileguard compare ./v1.pbf ./v2.pbf
```

Output: added/removed/modified/unchanged features, layer changes, statistics delta.

---

### `tileguard analyze`

Run full analysis: comparison + regression investigation in one command.

```bash
tileguard analyze <before> <after> [options]
```

| Option | Description |
|:-------|:------------|
| `--json` | Output as JSON |
| `--top <n>` | Show top N regression candidates (default: 5) |

```bash
tileguard analyze ./v1.pbf ./v2.pbf --top 10
```

Combines `compare` + regression detection. Shows ranked candidates with confidence scores.

---

### `tileguard report`

Generate an engineering report (Markdown, HTML, or JSON).

```bash
tileguard report <before> <after> [options]
```

| Option | Description |
|:-------|:------------|
| `--format <fmt>` | `markdown` (default), `html`, or `json` |

```bash
# Markdown (for PRs)
tileguard report ./v1.pbf ./v2.pbf --format markdown > report.md

# HTML (for investigation)
tileguard report ./v1.pbf ./v2.pbf --format html > report.html

# JSON (for automation)
tileguard report ./v1.pbf ./v2.pbf --format json > report.json
```

---

### `tileguard stats`

Display tile statistics: layers, geometry types, feature counts, vertices.

```bash
tileguard stats <file> [options]
```

```bash
tileguard stats ./tile.pbf
```

Shows: layer count, feature count, vertex count, geometry type distribution, per-layer breakdown.

---

### `tileguard style`

Analyze a MapLibre style specification: parse, validate, report structure.

```bash
tileguard style <file> [options]
```

```bash
tileguard style ./styles/map.json
```

Shows: version, sources, layers by type, expression count, filter count, and runs all 9 style rules.

---

### `tileguard profile`

Profile a single tile: compressed size, vertex count, per-layer breakdown.

```bash
tileguard profile <file>
```

```bash
tileguard profile ./tiles/14/8741/5476.pbf
```

Shows: compressed tile size, total vertices, per-layer feature/vertex/byte counts,
and identifies the largest contributors. Does not fail — informational only.

See [Profiling Tiles](/guides/profiling-tiles) for a full guide.

---

### `tileguard hook`

Manage a `pre-commit` Git hook that automatically validates staged tile files.

```bash
tileguard hook <action>
```

| Action | Description |
|:-------|:------------|
| `install` | Install the pre-commit hook into `.git/hooks/pre-commit` |
| `uninstall` | Remove the TileGuard hook |
| `status` | Check whether the hook is currently installed |

```bash
tileguard hook install    # one-time setup
tileguard hook status     # check current state
tileguard hook uninstall  # remove hook
```

See [Git Hooks](/guides/git-hooks) for a full guide.

---

### `tileguard rules`

Inspect configured rules.

```bash
tileguard rules list
```

Shows all registered rules with: ID, default severity, description, source plugin.

---

### `tileguard doctor`

Health check: verify configuration, rules, parser, and reporters are working.

```bash
tileguard doctor
```

Checks: Node.js version, core loaded, tile rules registered, style rules registered, config discovery, reporter availability.

---

### `tileguard init`

Create a starter `tileguard.config.ts` in the current directory.

```bash
tileguard init
```

Generates a config file with all recommended rules at default severities. Won't overwrite an existing config.

---

### `tileguard ver`

Display detailed version information for all packages.

```bash
tileguard ver
```

Shows: CLI version, Node.js version, platform, and all `@tileguard/*` package versions.

---

## Global Options

| Option | Description |
|:-------|:------------|
| `--version` / `-V` | Print version number |
| `--help` / `-h` | Show help for any command |

```bash
tileguard --version
tileguard check --help
tileguard report --help
```

---

## Exit Codes

| Code | Meaning |
|:-----|:--------|
| `0` | Success — no errors (warnings may be present) |
| `1` | Failure — one or more `error`-level diagnostics found |

::: tip
Only `error` severity affects the exit code. Warnings are reported but don't fail the build. To fail on warnings, set the relevant rules to `'error'` severity in your config.
:::

---

## Configuration

The CLI automatically discovers `tileguard.config.ts` (or `.mjs`/`.js`) from the working directory. No flag needed.

Override with `--config`:

```bash
tileguard check ./tiles/ --config ./configs/strict.config.ts
```

The `--reporter` flag overrides the config file's `reporter` setting, useful for using `text` locally but `json` in CI.
