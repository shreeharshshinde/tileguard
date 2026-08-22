# @tileguard/core

The foundation of TileGuard. All other packages depend on these contracts. Zero runtime dependencies.

```bash
npm install @tileguard/core
```

---

## Engine

| Export | Type | Description |
|:-------|:-----|:------------|
| `createEngine` | Function | Create a validation engine with plugins and config |
| `Engine` | Interface | Engine instance. Exposes `run()` |
| `EngineOptions` | Interface | Configuration for `createEngine()` |
| `RunResult` | Interface | Full result of `engine.run()`: diagnostics + summary |
| `RunSummary` | Interface | Pass/fail, error/warning/info counts, duration |

```typescript
import { createEngine } from '@tileguard/core';
import type { Engine, EngineOptions, RunResult, RunSummary } from '@tileguard/core';

const engine = createEngine({
  plugins: [tilePlugin, stylePlugin],
  rules: { 'tile/self-intersection': 'error' },
});

const result: RunResult = await engine.run(['./tiles/']);
console.log(result.summary.pass);    // boolean
console.log(result.summary.errors);  // number
console.log(result.diagnostics);     // Diagnostic[]
```

### EngineOptions

```typescript
interface EngineOptions {
  plugins: Plugin[];
  rules?: Record<string, 'error' | 'warning' | 'info' | 'off' | [Severity, object]>;
  reporter?: Reporter | 'text' | 'json';
}
```

### RunResult

```typescript
interface RunResult {
  diagnostics: Diagnostic[];
  summary: RunSummary;
}

interface RunSummary {
  pass: boolean;        // true if zero errors
  errors: number;
  warnings: number;
  info: number;
  files: number;
  duration: number;     // milliseconds
}
```

---

## Diagnostic

| Export | Type | Description |
|:-------|:-----|:------------|
| `Diagnostic` | Interface | Structured validation finding |
| `Severity` | Type | `'error' \| 'warning' \| 'info'` |
| `DiagnosticLocation` | Interface | Where in the artifact |

```typescript
import type { Diagnostic, Severity } from '@tileguard/core';
```

### Diagnostic Interface

```typescript
interface Diagnostic {
  ruleId: string;
  severity: Severity;
  message: string;
  filePath: string;
  location?: {
    layer?: string;
    featureIndex?: number;
    partIndex?: number;
  };
  suggestion?: string;
  data?: Record<string, unknown>;
}
```

---

## Rule System

| Export | Type | Description |
|:-------|:-----|:------------|
| `Rule` | Interface | Validation rule contract |
| `RuleContext` | Interface | Context passed to `rule.create()` |
| `RuleMeta` | Interface | Rule metadata |
| `Plugin` | Interface | Package of providers + rules |

### Rule Interface

```typescript
interface Rule {
  id: string;
  meta: RuleMeta;
  artifactTypes: string[];
  create(context: RuleContext): void;
}

interface RuleMeta {
  description: string;
  defaultSeverity: Severity;
  recommended: boolean;
}

interface RuleContext {
  artifact: Artifact;
  options: Record<string, unknown>;
  report(diagnostic: Partial<Diagnostic>): void;
}
```

### Plugin Interface

```typescript
interface Plugin {
  name: string;
  providers?: Provider[];
  rules: Rule[];
}
```

---

## Artifact & Provider

| Export | Type | Description |
|:-------|:-----|:------------|
| `Artifact` | Interface | Decoded, typed, immutable source file |
| `Provider` | Interface | File decoder contract |

```typescript
interface Artifact {
  type: string;
  filePath: string;
  content: unknown;
}

interface Provider {
  extensions: string[];
  load(filePath: string): Promise<Artifact>;
}
```

---

## Reporter

| Export | Type | Description |
|:-------|:-----|:------------|
| `Reporter` | Interface | Output formatter contract |
| `ReporterContext` | Interface | Context reporters receive |

```typescript
interface Reporter {
  name: string;
  report(context: ReporterContext): void;
}

interface ReporterContext {
  diagnostics: Diagnostic[];
  summary: RunSummary;
  write: (text: string) => void;
}
```

### Custom Reporter Example

```typescript
import type { Reporter, ReporterContext } from '@tileguard/core';

const slackReporter: Reporter = {
  name: 'slack',
  report(context: ReporterContext) {
    if (!context.summary.pass) {
      sendToSlack(`TileGuard: ${context.summary.errors} errors found`);
    }
  },
};
```
