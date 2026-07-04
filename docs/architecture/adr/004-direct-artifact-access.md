# ADR-004: Direct Artifact Access Over Visitor Pattern

## Status

**Accepted** — 2026-07-02

## Context

The original project constitution describes a "Visitor system" for traversing
artifacts. The visitor pattern is well-established in linting tools:

- **ESLint** uses it extensively. Rules subscribe to AST node types
  (`FunctionDeclaration`, `IfStatement`), and the engine calls the
  subscriber when that node type is encountered during tree traversal.
- **Stylelint** similarly walks CSS AST nodes and invokes rule visitors.

The question is whether TileGuard should adopt this pattern for traversing
geospatial artifacts.

## Decision

TileGuard uses **direct artifact access** instead of the visitor pattern.
Rules receive the full decoded artifact and traverse it themselves. The
engine does not walk the artifact structure on behalf of rules.

```typescript
// Direct access (chosen)
create(context) {
  const tile = context.artifact.content;
  for (const [name, layer] of Object.entries(tile.layers)) {
    for (const feature of layer.features) {
      // rule logic here
    }
  }
}
```

```typescript
// Visitor pattern (not chosen)
create(context) {
  return {
    onFeature(feature, layer) {
      // rule logic here
    }
  };
}
```

## Rationale

### 1. Artifact structure is shallow

ASTs are deeply nested, recursive trees with dozens of node types. Visitor
traversal abstracts away the recursion and lets rules focus on specific
nodes without understanding the tree structure.

Vector tiles have a **flat, predictable hierarchy**:
```
Tile → Layers → Features → (Geometry, Properties)
```

There are only three levels. Every developer who writes a tile rule will
understand this structure within minutes. A visitor abstraction does not
meaningfully simplify traversal — it just adds a layer of indirection.

### 2. Rules need full context

Many tile rules need to inspect relationships that span the hierarchy.
The `tile/required-layers` rule needs the set of all layer names. The
`tile/feature-count` rule needs the total feature count across all layers.
The `tile/required-properties` rule needs both layer keys and feature
properties.

A visitor pattern that delivers individual features one at a time would
require rules to accumulate state across calls, making them more complex
rather than simpler.

### 3. Style specifications are even flatter

A MapLibre style JSON is a single object with `version`, `sources`, and
`layers` at the top level. A visitor pattern over this structure would be
trivial to the point of being meaningless.

### 4. Contributor accessibility

Contributing a rule should not require understanding a visitor protocol.
Direct artifact access uses standard language constructs (for loops,
object destructuring). The barrier to entry is minimal.

### 5. Performance control

With direct access, each rule controls its own traversal. A rule that
only needs layer names can skip feature iteration entirely. A rule that
only cares about polygons can skip non-polygon features.

With the visitor pattern, the engine must traverse the entire artifact
structure unless rules declare fine-grained subscriptions — which creates
a complex subscription system that essentially reimplements direct access
with extra steps.

## Trade-offs

### What we lose

1. **Engine-level traversal optimization.** If the engine traversed the
   artifact, it could batch multiple rules into a single pass over
   features. With direct access, N rules each iterate over features
   independently. For typical tile sizes and rule counts, this is not
   a measured problem.

2. **Enforced structure.** The visitor pattern guarantees that rules see
   data in a consistent order and format. With direct access, different
   rules may traverse the artifact differently, potentially leading to
   inconsistencies. In practice, the decoded artifact is a simple data
   structure — there is little room for inconsistency.

3. **Lazy loading opportunity.** A visitor pattern could defer geometry
   decoding until a rule actually visits geometry. With direct access,
   the provider decodes everything upfront. If geometry decoding becomes
   a performance bottleneck, the artifact provider can implement lazy
   decoding internally without changing the rule interface.

### What we keep

1. **Simplicity.** Rules are just functions that read data structures.
2. **Flexibility.** Rules can query the artifact in any order.
3. **Testability.** Rules can be tested by passing a plain object as the
   artifact — no visitor protocol to set up.
4. **Approachability.** New contributors write standard TypeScript code.

## Alternatives Considered

### Alternative 1: Full visitor pattern
Rules return an object mapping traversal events to handlers:
```typescript
create(context) {
  return {
    onLayer(layer) { /* ... */ },
    onFeature(feature, layer) { /* ... */ },
    onGeometry(geometry, feature, layer) { /* ... */ },
  };
}
```
Rejected because of the overhead-to-benefit ratio on shallow structures.

### Alternative 2: Hybrid — optional visitor for performance
Provide both direct access and an optional visitor interface. Rules can
choose which to use. The engine optimizes execution when all rules use
visitors. Rejected because maintaining two execution paths doubles
complexity and testing surface area.

### Alternative 3: Selector-based queries
Rules declare selectors (e.g., `"layers.*.features[type=3]"`) and receive
matching elements. Rejected because designing a query language for
geospatial artifacts is a research project, not a practical engineering
decision.

## Revisiting This Decision

This decision should be revisited if:
- The number of rules exceeds ~50 and performance degrades measurably
  due to redundant traversal
- A new artifact type has deeply nested or recursive structure that makes
  direct traversal impractical
- Community feedback consistently requests a visitor API

Until then, direct access is the right trade-off for TileGuard's current
and near-future artifact types.
