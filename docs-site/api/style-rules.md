# @tileguard/style-rules

Style provider + 9 lint rules + a full parse → resolve → validate pipeline for MapLibre Style Specification JSON files.

```bash
npm install @tileguard/style-rules @tileguard/core
```

---

## Plugin & Provider

| Export | Type | Description |
|:-------|:-----|:------------|
| `stylePlugin` | Plugin | All 9 rules + style provider |
| `styleRules` | `Rule[]` | All 9 rule objects as an array |
| `styleProvider` | Provider | Parses `.json` → `StyleSpecArtifact` |

```typescript
import { stylePlugin, styleProvider, styleRules } from '@tileguard/style-rules';
```

---

## Individual Rule Exports

| Export | Rule ID | Default Severity |
|:-------|:--------|:-----------------|
| `validJsonRule` | `style/valid-json` | error |
| `versionRule` | `style/version` | error |
| `sourcesPresentRule` | `style/sources-present` | error |
| `layersPresentRule` | `style/layers-present` | error |
| `layerIdRequiredRule` | `style/layer-id-required` | error |
| `uniqueLayerIdRule` | `style/unique-layer-id` | error |
| `knownSourceRule` | `style/known-source` | error |
| `zoomRangeRule` | `style/zoom-range` | error |
| `noDeprecatedRefRule` | `style/no-deprecated-ref` | warning |

```typescript
import { knownSourceRule, zoomRangeRule } from '@tileguard/style-rules';
```

---

## Style Analysis Pipeline

The package exposes a full pipeline for advanced integrations beyond rule-based validation:

```text
Raw JSON → parseStyle() → resolveLayer(s) → validateStyle()
```

### Parser

| Export | Type | Description |
|:-------|:-----|:------------|
| `parseStyle` | Function | Parse raw JSON string into typed `ParseResult` |
| `ParseResult` | Interface | Parsed style: version, sources, layers, metadata |

```typescript
import { parseStyle } from '@tileguard/style-rules';
import type { ParseResult } from '@tileguard/style-rules';

const parsed: ParseResult = parseStyle(rawJsonString);
console.log(parsed.version);     // 8
console.log(parsed.sources);     // Record<string, Source>
console.log(parsed.layers);      // ParsedLayer[]
```

### Resolver

| Export | Type | Description |
|:-------|:-----|:------------|
| `resolveLayer` | Function | Resolve a single layer's source/property references |
| `resolveLayers` | Function | Resolve all layers in a parsed style |
| `ResolvedLayer` | Interface | Layer with resolved source, type, paint, layout |

```typescript
import { resolveLayers } from '@tileguard/style-rules';
import type { ResolvedLayer } from '@tileguard/style-rules';

const resolved: ResolvedLayer[] = resolveLayers(parsed);
for (const layer of resolved) {
  console.log(`${layer.id} → source: ${layer.source}, type: ${layer.type}`);
}
```

### Validator

| Export | Type | Description |
|:-------|:-----|:------------|
| `validateStyle` | Function | Run all style rules against a parsed style |

```typescript
import { validateStyle } from '@tileguard/style-rules';

const diagnostics = validateStyle(parsed);
for (const d of diagnostics) {
  console.log(`${d.ruleId}: ${d.message}`);
}
```

### Expression Utilities

| Export | Type | Description |
|:-------|:-----|:------------|
| `isExpression` | Function | Check if a value is a MapLibre expression (array with operator) |
| `isLiteral` | Function | Check if a value is a literal (not an expression) |

```typescript
import { isExpression, isLiteral } from '@tileguard/style-rules';

isExpression(['get', 'name']);  // true
isExpression('#ff0000');        // false
isLiteral('#ff0000');           // true
isLiteral(['match', ...]);     // false
```
