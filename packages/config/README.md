# @tileguard/config

Configuration file discovery, loading, schema validation, and error reporting for TileGuard. This package handles everything that happens *before* the engine runs: finding the config file, parsing it, and validating its shape.

> **Package boundary:** Depends only on `@tileguard/core` (for the `TileGuardConfig` type) and `jiti` (for TypeScript/ESM config loading). Does not depend on domain packages or reporters.

---

## Installation

```bash
npm install @tileguard/config @tileguard/core
```

---

## Quick Start

```typescript
import { loadConfig } from '@tileguard/config';

// Discover, load, and validate config — the full pipeline
const { config, configPath, warnings } = await loadConfig({
  cwd: process.cwd(),
});

console.log(configPath);   // '/path/to/tileguard.config.ts' or undefined
console.log(config.rules); // { 'tile/required-layers': 'error', ... }
console.log(warnings);     // e.g., [{ key: 'unknownKey', severity: 'warning', ... }]
```

---

## How It Works

```
Working directory
      │
      ▼
┌─────────────────┐
│   findConfigFile │  Walk upward searching for config files
└─────────────────┘
      │ path (or undefined)
      ▼
┌─────────────────┐
│  loadConfigFile  │  Parse .json / dynamically import .ts/.js/.mjs via jiti
└─────────────────┘
      │ raw object
      ▼
┌─────────────────┐
│  validateConfig  │  Check shape against TileGuardConfig schema
└─────────────────┘
      │ validated config + warnings
      ▼
   LoadConfigResult
```

### File Discovery

Searches **upward** from the starting directory. At each level, checks all supported filenames before moving to the parent:

| Priority | Filename |
|:---------|:---------|
| 1 | `tileguard.config.ts` |
| 2 | `tileguard.config.js` |
| 3 | `tileguard.config.mjs` |
| 4 | `tileguard.config.json` |

**Directory proximity beats format priority.** A `.json` file in the project root is found before a `.ts` file two directories above.

### Schema Validation

The validator is **non-short-circuiting** — it collects all issues in a single pass rather than stopping at the first error. This gives users a complete picture of what needs fixing.

Validated fields:
- `plugins` — must not be specified in JSON configs (code imports not possible)
- `rules` — severity strings (`'error'`, `'warning'`, `'info'`, `'off'`) or `[severity, options]` tuples
- `reporter` — string ID or `[id, options]` tuple
- `overrides` — file glob patterns with rule override maps
- Unknown top-level keys generate warnings (not errors)

---

## API Reference

### `loadConfig(options?): Promise<LoadConfigResult>`

Primary entry point. Discovers, loads, and validates configuration.

```typescript
interface LoadConfigOptions {
  cwd?: string;        // Starting directory (default: process.cwd())
  configPath?: string; // Explicit path — skips discovery
}

interface LoadConfigResult {
  config: TileGuardConfig;           // Validated configuration
  configPath: string | undefined;    // Resolved file path (undefined if no file found)
  warnings: readonly ValidationIssue[]; // Warning-severity issues
}
```

When no config file is found and no explicit path is given, returns an empty config (engine uses all defaults).

### `findConfigFile(cwd, options?): string | undefined`

Lower-level discovery function. Returns the absolute path to the nearest config file, or `undefined`.

```typescript
findConfigFile('/path/to/project', { stopAt: '/path/to' });
```

### `validateConfig(raw, options?): ValidateConfigResult`

Lower-level validation. Validates a raw object against the config schema.

```typescript
interface ValidateConfigResult {
  config: TileGuardConfig;
  warnings: readonly ValidationIssue[];
}
```

Throws `ConfigValidationError` if there are error-severity issues.

### `isValidRuleConfig(value): boolean`

Utility to check if a value is a valid rule configuration entry.

### Error Classes

| Error | When |
|:------|:-----|
| `ConfigNotFoundError` | Explicit `--config` path doesn't exist |
| `ConfigLoadError` | File exists but can't be parsed/imported |
| `ConfigValidationError` | Object loaded but has schema violations |

All errors include human-readable messages with visual prefixes (`✗` for errors, `⚠` for warnings).

### Constants

```typescript
import { CONFIG_FILENAMES } from '@tileguard/config';
// ['tileguard.config.ts', 'tileguard.config.js', 'tileguard.config.mjs', 'tileguard.config.json']
```

---

## Common Mistakes

| Mistake | What happens |
|:--------|:-------------|
| Specifying `plugins` in `.json` config | Error — JSON cannot import code modules |
| Missing `export default` in `.ts`/`.js` | `ConfigLoadError` — named exports are not resolved |
| Typo in top-level key (e.g., `plguins`) | Warning — unknown key detected, plugins won't load |
| Invalid severity string (e.g., `'warn'`) | Error — must be `'error'`, `'warning'`, `'info'`, or `'off'` |

---

## Testing

```bash
# Run config tests
pnpm --filter @tileguard/config test

# Watch mode
pnpm --filter @tileguard/config test:watch
```

**103 tests** across 5 suites:

| Suite | Covers |
|:------|:-------|
| `errors.test.ts` | Error class construction, cause chaining, message formatting |
| `finder.test.ts` | Upward traversal, priority ordering, stopAt boundary, edge cases |
| `loader.test.ts` | JSON parsing, jiti TypeScript loading, missing default export, malformed files |
| `validator.test.ts` | Schema validation for all fields, non-short-circuiting, warnings |
| `integration.test.ts` | Full pipeline (discover → load → validate) against physical fixtures |

---

## Dependencies

| Dependency | Purpose |
|:-----------|:--------|
| `@tileguard/core` | `TileGuardConfig` type contract |
| `jiti` | Runtime TypeScript/ESM module loading without compilation |

---

## Related Packages

| Package | Relationship |
|:--------|:-------------|
| `@tileguard/core` | Defines the `TileGuardConfig` schema this package validates against |
| `@tileguard/cli` | Primary consumer — calls `loadConfig()` before engine instantiation |
