# @tileguard/config

Configuration file discovery, loading, and validation. Finds and parses `tileguard.config.ts` (or `.mjs`, `.js`) from the project root.

```bash
npm install @tileguard/config @tileguard/core
```

---

## Loading Configuration

| Export | Type | Description |
|:-------|:-----|:------------|
| `loadConfig` | Function | Discover and load config file (async) |
| `findConfigFile` | Function | Find config file path without loading |
| `CONFIG_FILENAMES` | Constant | Supported file names in priority order |

```typescript
import { loadConfig, findConfigFile, CONFIG_FILENAMES } from '@tileguard/config';
import type { LoadConfigResult, LoadConfigOptions } from '@tileguard/config';

// Discover and load config from cwd
const result: LoadConfigResult = await loadConfig({ cwd: process.cwd() });
console.log(result.config);     // TileGuardConfig object
console.log(result.filePath);   // '/path/to/tileguard.config.ts'

// Just find the file (no loading)
const path = findConfigFile({ cwd: process.cwd() });
// '/path/to/tileguard.config.ts' or null
```

### LoadConfigOptions

```typescript
interface LoadConfigOptions {
  cwd?: string;         // Directory to search from (default: process.cwd())
  configPath?: string;  // Explicit path (skips discovery)
}
```

### LoadConfigResult

```typescript
interface LoadConfigResult {
  config: TileGuardConfig;
  filePath: string;
}
```

### Config File Names (Priority Order)

```typescript
const CONFIG_FILENAMES = [
  'tileguard.config.ts',
  'tileguard.config.mts',
  'tileguard.config.mjs',
  'tileguard.config.js',
];
```

---

## Validation

| Export | Type | Description |
|:-------|:-----|:------------|
| `validateConfig` | Function | Validate a config object against the schema |
| `isValidRuleConfig` | Function | Check if a single rule config value is valid |
| `ValidationIssue` | Interface | Validation error (path + message) |

```typescript
import { validateConfig, isValidRuleConfig } from '@tileguard/config';
import type { ValidationIssue } from '@tileguard/config';

const issues: ValidationIssue[] = validateConfig(myConfig);
if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`${issue.path}: ${issue.message}`);
  }
}

// Check a single rule value
isValidRuleConfig('error');                           // true
isValidRuleConfig('off');                             // true
isValidRuleConfig(['warning', { max: 100 }]);        // true
isValidRuleConfig('invalid');                         // false
isValidRuleConfig(42);                               // false
```

---

## TileGuardConfig Schema

| Export | Type | Description |
|:-------|:-----|:------------|
| `TileGuardConfig` | Interface | Full configuration schema |

```typescript
import type { TileGuardConfig } from '@tileguard/config';

interface TileGuardConfig {
  /** Plugins to load (provide rules + providers) */
  plugins: Plugin[];

  /** Rule severity overrides and options */
  rules?: Record<string, RuleConfig>;

  /** Reporter for CLI output */
  reporter?: Reporter | 'text' | 'json';
}

// RuleConfig can be:
type RuleConfig =
  | 'error'                    // severity only
  | 'warning'
  | 'info'
  | 'off'                     // disable the rule
  | [Severity, object];       // severity + options
```

### Example Config File

```typescript
// tileguard.config.ts
import type { TileGuardConfig } from '@tileguard/config';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const config: TileGuardConfig = {
  plugins: [tilePlugin, stylePlugin],
  rules: {
    // Simple severity
    'tile/self-intersection': 'error',
    'tile/no-empty': 'off',

    // Severity + options
    'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }],
    'tile/feature-count': ['warning', { max: 100000 }],
    'tile/coordinate-range': ['error', { buffer: 128 }],

    // Style rules
    'style/known-source': 'error',
    'style/zoom-range': 'warning',
  },
  reporter: 'text',
};

export default config;
```

---

## Programmatic Usage

Use the config package to build tools that respect TileGuard configuration:

```typescript
import { loadConfig } from '@tileguard/config';
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';

// Load user's config
const { config } = await loadConfig({ cwd: '/path/to/project' });

// Create engine with user's rules
const engine = createEngine({
  plugins: [tilePlugin],
  rules: config.rules,
});

const result = await engine.run(['./tiles/']);
```
