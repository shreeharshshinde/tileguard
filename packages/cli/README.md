# tileguard (CLI)

The command-line interface for TileGuard. Wires the configuration loader, engine, rule plugins, and reporters into a single installable `tileguard` binary. The package also exports every command function as a pure, embeddable TypeScript API — safe to call from tests, editors, or any host process without spawning a subprocess.

```bash
# Validate a vector tile
npx tileguard check ./tile.pbf

# Lint a MapLibre style
npx tileguard check ./style.json

# Validate everything in the current directory
npx tileguard check .

# Multiple sources and reporters
npx tileguard check ./tile.pbf ./style.json --reporter json

# Scaffold a starter config
npx tileguard init
```

## Status

✅ **Fully implemented and tested** — v0.5.0.

## Commands

### `check <sources...>`

Validates geospatial artifacts against configured rules.

`sources` accepts any combination of:
- Literal file paths: `./tile.pbf`, `./styles/map.json`
- Directory paths (recursively expanded): `./tiles/`, `.`
- Glob patterns: `tiles/**/*.pbf`, `styles/*.json`

**Options**

| Flag | Description |
|:-----|:------------|
| `-c, --config <path>` | Explicit config file path. Auto-discovered if omitted. |
| `-r, --reporter <id>` | Reporter: `text` (default) or `json`. |
| `--max-diagnostics <n>` | Cap total diagnostics collected across the run. |

**Exit codes**

| Code | Meaning |
|:-----|:--------|
| `0` | Run completed — zero error-severity diagnostics. |
| `1` | Run completed — one or more error-severity diagnostics found. |
| `2` | Usage or operational failure — bad flag value, config load error, no sources matched. |

### `init`

Scaffolds a starter `tileguard.config.ts` in the current working directory. Refuses to overwrite an existing file unless `--force` is given.

**Options**

| Flag | Description |
|:-----|:------------|
| `--force` | Overwrite an existing config file. |

### `rules list`

Lists all rules contributed by configured plugins — their IDs, default severities, recommended status, and descriptions. Output reflects the plugin definitions before user severity overrides are applied.

**Options**

| Flag | Description |
|:-----|:------------|
| `-c, --config <path>` | Explicit config file path. |
| `-f, --format <format>` | `text` (default) or `json`. |

### `rules explain <ruleId>` · `rules docs <ruleId>`

Reserved stubs — print a "coming in a future release" notice and exit 0. The namespace is declared now so `--help` output doesn't need restructuring later.

---

## Configuration

Create `tileguard.config.ts` at your project root (or run `tileguard init` to scaffold one):

```typescript
import type { TileGuardConfig } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const config: TileGuardConfig = {
  plugins: [tilePlugin, stylePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }],
    'tile/self-intersection': 'warning',
    'tile/no-empty': 'off',
    'style/known-source': 'error',
  },
  reporter: 'text',
};

export default config;
```

Rules accept `'error'`, `'warning'`, `'info'`, or `'off'`. Rules with options use the `[severity, options]` tuple. Without a config file, all recommended rules run at their default severities.

Config files are discovered by traversing upward from the working directory. Supported formats:

| Filename | Notes |
|:---------|:------|
| `tileguard.config.ts` | Preferred — full TypeScript, supports `plugins`. |
| `tileguard.config.js` | ESM. |
| `tileguard.config.mjs` | Explicit ESM. |
| `tileguard.config.json` | Data-only — `plugins` cannot be specified in JSON. |

---

## Programmatic Usage

Every command function is exported from the package root as a pure, embeddable function. None of them call `process.exit()`.

```typescript
import { runCheck, runInit, runRulesList } from 'tileguard';
import type { CommandResult } from 'tileguard';

// Run a validation check — returns a plain CommandResult, never exits
const result: CommandResult = await runCheck(
  ['./tiles/', './styles/map.json'],
  { reporter: 'json', maxDiagnostics: 500 },
);

console.log(result.exitCode);          // 0 | 1 | 2
console.log(result.summary?.pass);     // true | false
console.log(result.diagnostics?.length); // number of findings
```

Lower-level utilities are also exported for testing and embedding:

```typescript
import {
  expandSources,    // glob / directory / "." → absolute paths
  mergeConfig,      // merge CLI flags over config-file values
  resolveReporterById, // 'text' | 'json' → Reporter object
  toRunResult,      // (pass, diagnostics, summary) → CommandResult
  toUsageResult,    // (err) → CommandResult { exitCode: 2 }
  CliUsageError,    // thrown for all code-2 conditions
} from 'tileguard';
```

---

## Architecture

### Process boundary rule

`bin.ts` is the only file in the package that calls `process.exit()`. Every exported command function returns a `CommandResult` — a plain, serializable object:

```typescript
interface CommandResult {
  readonly exitCode: 0 | 1 | 2;
  readonly diagnostics?: readonly Diagnostic[]; // check only
  readonly summary?: RunSummary;               // check only
}
```

This means `runCheck()` is as safe to call from a VS Code extension as it is from a test — no unexpected process termination.

### Output streams

All presentation output (startup banner, progress, warnings about missing config) goes to **stderr**. Reporter output goes to **stdout**. This makes `tileguard check . --reporter json | jq .` work correctly — the banner never contaminates the JSON stream.

### Key design decisions

| Decision | Summary |
|:---------|:--------|
| D3 — pure command functions | Command functions return `CommandResult`; only `bin.ts` calls `process.exit()`. |
| D4 — CLI flags win | `--reporter` and `--max-diagnostics` override config-file equivalents unconditionally. |
| D5 — `Map`-based reporter registry | `new Map([['text', textReporter], ['json', jsonReporter]])` — `.set()` to extend; `[...keys()]` for dynamic help text. |
| D6 — `rules list` bypasses engine | Reads `config.plugins[].rules[]` directly; does not call `createEngine()`. |
| D7 — `expandSources` owns all I/O | Globs, directories, and `.` are resolved to absolute paths before the engine sees them. |
| D8 — `CliUsageError` for all code-2 | One error class, one catch site in `bin.ts`, one exit code. |
| D9 — banner on stderr | Startup banner is written to `stderr` unconditionally so `--reporter json` stdout is never polluted. |

---

## Testing

**49 tests, 8 test files** — all passing.

| File | What it covers |
|:-----|:---------------|
| `tests/exit.test.ts` | `toRunResult` / `toUsageResult` are pure — `process.exit` spy never fires (D3 enforcement). |
| `tests/expand-sources.test.ts` | Glob expansion, directory expansion, explicit `.` case (D7), plain path passthrough, empty input. |
| `tests/resolve-reporter.test.ts` | `Map`-based registry: known IDs, default fallback, unknown ID throws `CliUsageError`, dynamic key listing. |
| `tests/merge-config.test.ts` | CLI flags override config values, immutability, empty inputs, `plugins`/`rules` preservation. |
| `tests/check.test.ts` | `runCheck()` called directly via mocked `loadConfig` + `createEngine` — all exit-code branches without a subprocess. |
| `tests/integration/check.integration.test.ts` | Subprocess tests: exit codes 0/1/2, banner on stderr not stdout, JSON output is parseable, `.` expansion. |
| `tests/integration/init.integration.test.ts` | Subprocess tests: file creation, refuses without `--force`, overwrites with `--force`. |
| `tests/integration/rules.integration.test.ts` | Subprocess tests: `list` in text/json format, `explain`/`docs` stubs exit 0 with placeholder message. |

Run tests:

```bash
# From this package
npx vitest run

# Watch mode
npx vitest
```
