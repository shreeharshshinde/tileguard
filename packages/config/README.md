# @tileguard/config

**Configuration file discovery, loading, and validation for TileGuard.**

[![npm](https://img.shields.io/npm/v/@tileguard/config)](https://www.npmjs.com/package/@tileguard/config)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/shindeshreeharsh/tileguard/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Finds, loads, and validates `tileguard.config.ts` files. Handles TypeScript, ESM, CommonJS, and JSON config formats with clear, actionable error messages when something is wrong.

---

## Do I need this package?

| Use case | Install this? |
|:---------|:-------------|
| Using the CLI (`npx tileguard check`) | **No** — the CLI handles config automatically |
| Building a tool that loads TileGuard config | **Yes** |
| Writing tests that need config loading | **Yes** |
| Using `createEngine()` with hardcoded config | **No** — pass config directly to the engine |

> Most users never install this package directly. It's a dependency of `@tileguard/cli`.

---

## Installation

```bash
npm install @tileguard/config @tileguard/core
```

---

## Quick Start

```typescript
import { loadConfig } from '@tileguard/config';

const { config, configPath, warnings } = await loadConfig();

console.log(configPath);    // '/project/tileguard.config.ts' or undefined
console.log(config.rules);  // { 'tile/required-layers': 'error', ... }
console.log(warnings);      // [] or [{ path: '...', message: '...' }]
```

---

## What it does

```
Working directory
      │
      ▼
  findConfigFile()    ← walks upward looking for tileguard.config.{ts,js,mjs,json}
      │
      ▼
  loadConfigFile()    ← dynamically imports .ts/.js/.mjs or parses .json
      │
      ▼
  validateConfig()    ← checks shape against TileGuardConfig schema
      │
      ▼
  LoadConfigResult    ← { config, configPath, warnings }
```

---

## Error handling

Three specific error classes for precise error handling:

```typescript
import { loadConfig, ConfigNotFoundError, ConfigLoadError, ConfigValidationError } from '@tileguard/config';

try {
  const { config } = await loadConfig({ configPath: './my-config.ts' });
} catch (err) {
  if (err instanceof ConfigNotFoundError) {
    // Explicit --config path doesn't exist
  } else if (err instanceof ConfigLoadError) {
    // File exists but can't produce a config (syntax error, no default export)
  } else if (err instanceof ConfigValidationError) {
    // Loaded object has invalid shape
    console.log(err.issues); // [{ path: 'rules.x', message: '...' }]
  }
}
```

---

## API

| Export | Purpose |
|:-------|:--------|
| `loadConfig(options?)` | Primary API — discover, load, validate in one call |
| `findConfigFile(cwd)` | Lower-level: find config file path |
| `validateConfig(obj)` | Lower-level: validate a loaded object |
| `CONFIG_FILENAMES` | Array of recognized config file names |
| `ConfigNotFoundError` | Explicit path doesn't exist |
| `ConfigLoadError` | File exists but can't produce config |
| `ConfigValidationError` | Shape violates the schema |

---

## Part of the TileGuard ecosystem

| Package | Purpose |
|:--------|:--------|
| [`@tileguard/cli`](https://www.npmjs.com/package/@tileguard/cli) | CLI (uses this package internally) |
| [`@tileguard/core`](https://www.npmjs.com/package/@tileguard/core) | Framework contracts |
| **@tileguard/config** | Config loading (this package) |
| [`@tileguard/tile-rules`](https://www.npmjs.com/package/@tileguard/tile-rules) | Vector tile validation rules |
| [`@tileguard/style-rules`](https://www.npmjs.com/package/@tileguard/style-rules) | MapLibre style lint rules |
| [`@tileguard/reporters`](https://www.npmjs.com/package/@tileguard/reporters) | Text, JSON, Markdown, HTML reports |

---

## Documentation

- [Configuration Guide](https://github.com/shindeshreeharsh/tileguard/tree/main/docs/architecture/06-configuration.md)
- [API Reference](https://github.com/shindeshreeharsh/tileguard/tree/main/docs/api)
- [Repository](https://github.com/shindeshreeharsh/tileguard)

---

## License

[MIT](https://github.com/shindeshreeharsh/tileguard/blob/main/LICENSE) · Created by [Shreeharsh Shinde](https://github.com/shindeshreeharsh)
