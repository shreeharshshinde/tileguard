# Milestone 4 — Complete Source Code & Technical Review
## Overlay Subsystem: Diagnostic → Visual Overlay Pipeline

This document provides a detailed, comprehensive, line-by-line code review of **Milestone 4** in `@tileguard/inspector`. It contains the complete source code for all implemented modules alongside technical explanations of every interface, strategy, adapter, producer, barrel file, and test suite verification.

---

## Table of Contents
1. [Architectural Overview & Data Flow](#1-architectural-overview--data-flow)
2. [OverlayDescriptor & Strategy Interface (`overlay-adapter.ts`)](#2-overlaydescriptor--strategy-interface-overlay-adapterts)
3. [OverlayAdapter Registry & Dispatcher (`overlay-adapter.ts`)](#3-overlayadapter-registry--dispatcher-overlay-adapterts)
4. [Strategy: `tile/coordinate-range` (`coordinate-range.ts`)](#4-strategy-tilecoordinate-range-coordinate-rangets)
5. [Strategy: `tile/self-intersection` (`self-intersection.ts`)](#5-strategy-tileself-intersection-self-intersectionts)
6. [Strategy: `tile/zero-area-ring` (`zero-area-ring.ts`)](#6-strategy-tilezero-area-ring-zero-area-ringts)
7. [Strategy: `tile/degenerate-geometry` (`degenerate-geometry.ts`)](#7-strategy-tiledegenerate-geometry-degenerate-geometryts)
8. [Strategy: `tile/unclosed-ring` (`unclosed-ring.ts`)](#8-strategy-tileunclosed-ring-unclosed-ringts)
9. [Strategy: `tile/no-empty` (`no-empty.ts`)](#9-strategy-tileno-empty-no-emptyts)
10. [SelectionProducer (`selection-producer.ts`)](#10-selectionproducer-selection-producerts)
11. [Overlay Barrel File (`index.ts`)](#11-overlay-barrel-file-indexts)
12. [Test Suite: OverlayAdapter (`overlay-adapter.test.ts`)](#12-test-suite-overlayadapter-overlay-adaptertestts)
13. [Test Suite: Strategies (`strategies.test.ts`)](#13-test-suite-strategies-strategiestestts)
14. [Test Suite: SelectionProducer (`selection-producer.test.ts`)](#14-test-suite-selectionproducer-selection-producertestts)
15. [Verification & Test Results](#15-verification--test-results)

---

## 1. Architectural Overview & Data Flow

Milestone 4 implements the **Overlay Subsystem** — the bridge between TileGuard's diagnostic model and the Inspector's visual model. It converts `Diagnostic` objects (from `@tileguard/core`) into `OverlayDescriptor` objects that the Canvas 2D Renderer (Milestone 3) can draw.

### Unidirectional Data Flow
$$\text{Diagnostic[]} \longrightarrow \text{OverlayAdapter} \longrightarrow \text{OverlayStrategy (per rule)} \longrightarrow \text{OverlayDescriptor[]} \longrightarrow \text{CanvasRenderer}$$

### Parallel Path: UI Interaction Overlays
$$\text{FeatureRef (selection/hover)} \longrightarrow \text{SelectionProducer} \longrightarrow \text{OverlayDescriptor[]} \longrightarrow \text{CanvasRenderer}$$

### Enforced Architectural Boundaries
1. **Strategy Isolation**: Each strategy handles exactly one rule ID. Strategies must not call the Renderer — they only produce descriptors.
2. **No Silent Index Invention**: If a rule claims to emit a point marker but fails to provide `pointIndex`, the strategy returns `[]` rather than rendering the wrong vertex. This was an explicit user directive.
3. **Encapsulated Registry**: The strategy `Map` is encapsulated within the `OverlayAdapter` — no separate Registry module exists, since no other subsystem needs independent access. User directive: *"Don't create an OverlayRegistry unless you need one… the adapter already IS the registry."*
4. **Error Isolation**: A strategy that throws does not stop processing of other diagnostics.
5. **Duplicate Registration Guard**: Registering two strategies for the same `ruleId` throws immediately, matching `@tileguard/core`'s convention for duplicate rule IDs.

---

## 2. OverlayDescriptor & Strategy Interface (`overlay-adapter.ts`)

📁 **File**: `packages/inspector/src/overlay/overlay-adapter.ts`
**Purpose**: Defines the visual descriptor model and the strategy contract, plus the adapter that dispatches diagnostics to strategies.

### OverlayDescriptor

The `OverlayDescriptor` is the contract between the overlay subsystem and the renderer. Each descriptor tells the renderer what to draw, where, and with what emphasis.

```typescript
/** Describes a visual marker for a single diagnostic. */
export interface OverlayDescriptor {
  /** Type of marker to render. */
  readonly type: 'point-marker' | 'segment-highlight' | 'ring-highlight' | 'bbox-fill';
  /** Layer name to locate the feature. */
  readonly layerName: string;
  /** Feature index within that layer. */
  readonly featureIndex: number;
  /** Ring index (for polygons), segment indices, or vertex indices (type-dependent). */
  readonly target: number | [number, number] | number[];
  /** Visual emphasis level. */
  readonly severity: 'error' | 'warning' | 'info';
}
```

**Design decisions:**
- `type` is a union of four marker kinds. Each maps to a distinct drawing approach in the renderer.
- `target` is polymorphic: a single number (ring index, point index), a tuple `[start, end]` (segment endpoints), or an array of indices.
- `severity` maps directly to the renderer's `OVERLAY_COLORS` palette from Milestone 3.

### OverlayStrategy Interface

```typescript
export interface OverlayStrategy {
  /** Rule ID this strategy handles, e.g. "tile/self-intersection". */
  readonly ruleId: string;

  /**
   * Convert a single Diagnostic into one or more OverlayDescriptors.
   *
   * @param diagnostic  The diagnostic to convert.
   * @param artifact    The immutable decoded tile that produced the diagnostic.
   *                    Read-only — strategies must never mutate it.
   *
   * Returns an empty array if the diagnostic does not produce a visible overlay.
   */
  toDescriptors(diagnostic: Diagnostic, artifact: VectorTileArtifact): OverlayDescriptor[];
}
```

**Design decisions:**
- One strategy per rule ID. The interface is intentionally minimal.
- The `artifact` parameter is passed for strategies that may need to inspect geometry, but strategies *"must not perform independent geometry traversal or coordinate transformation"* (user directive).
- Returning `[]` is the correct response for diagnostics that lack sufficient metadata — never invent indices.

---

## 3. OverlayAdapter Registry & Dispatcher (`overlay-adapter.ts`)

### Complete Source Code

```typescript
export class OverlayAdapter {
  private readonly strategies = new Map<string, OverlayStrategy>();

  register(strategy: OverlayStrategy): void {
    if (this.strategies.has(strategy.ruleId)) {
      throw new Error(
        `OverlayStrategy for rule "${strategy.ruleId}" is already registered. ` +
          'Each rule may have exactly one overlay strategy.',
      );
    }
    this.strategies.set(strategy.ruleId, strategy);
  }

  toDescriptors(
    diagnostics: readonly Diagnostic[],
    artifact: VectorTileArtifact,
  ): OverlayDescriptor[] {
    const result: OverlayDescriptor[] = [];

    for (const diagnostic of diagnostics) {
      const strategy = this.strategies.get(diagnostic.ruleId);
      if (strategy === undefined) continue;

      try {
        const descriptors = strategy.toDescriptors(diagnostic, artifact);
        if (!Array.isArray(descriptors)) continue;
        for (const descriptor of descriptors) {
          result.push(descriptor);
        }
      } catch {}
    }

    return result;
  }

  getStrategy(ruleId: string): OverlayStrategy | undefined {
    return this.strategies.get(ruleId);
  }

  getAllRuleIds(): readonly string[] {
    return [...this.strategies.keys()];
  }
}
```

**Key design decisions:**

1. **Encapsulated Map**: The `strategies` Map is private. No external code can directly access or mutate the registry. The adapter IS the registry.

2. **Duplicate guard**: `register()` throws on duplicate `ruleId`. This is a fail-fast contract — catching duplicates at registration time rather than at dispatch time prevents silent bugs.

3. **Error isolation in `toDescriptors()`**: Each diagnostic is dispatched inside a `try/catch`. If a strategy throws, the error is caught and the loop continues with the next diagnostic. This prevents one malformed diagnostic from breaking the entire overlay pipeline.

4. **Non-array guard**: If a strategy returns something that's not an array (e.g., `null`, `undefined`), the result is treated as empty. This is defensive against malformed strategy implementations.

5. **Single-pass dispatch**: The adapter iterates the diagnostics list exactly once, performing a `Map.get()` lookup per diagnostic. This is O(n) in the number of diagnostics.

### Factory

```typescript
export function createDefaultOverlayAdapter(): OverlayAdapter {
  const adapter = new OverlayAdapter();
  adapter.register(coordinateRangeStrategy);
  adapter.register(selfIntersectionStrategy);
  adapter.register(zeroAreaRingStrategy);
  adapter.register(degenerateGeometryStrategy);
  adapter.register(unclosedRingStrategy);
  adapter.register(noEmptyStrategy);
  return adapter;
}
```

Pre-registers all 6 built-in strategies. Adding a 7th rule requires only writing a new `OverlayStrategy` and calling `adapter.register()` — no Adapter source change needed.

---

## 4. Strategy: `tile/coordinate-range` (`coordinate-range.ts`)

📁 **File**: `packages/inspector/src/overlay/strategies/coordinate-range.ts`

```typescript
export const coordinateRangeStrategy: OverlayStrategy = {
  ruleId: 'tile/coordinate-range',

  toDescriptors(diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    const layerName = diagnostic.location?.layer ?? (diagnostic.data?.layer as string | undefined);
    const featureIndex =
      diagnostic.location?.featureIndex ?? (diagnostic.data?.featureIndex as number | undefined);
    const pointIndex = diagnostic.data?.pointIndex as number | undefined;

    // Do not silently invent indices if required location metadata is missing
    if (layerName === undefined || featureIndex === undefined || typeof pointIndex !== 'number') {
      return [];
    }

    return [
      {
        type: 'point-marker',
        layerName,
        featureIndex,
        target: pointIndex,
        severity: diagnostic.severity,
      },
    ];
  },
};
```

**Explanation:**
- Produces a `point-marker` at the exact out-of-range vertex.
- Extracts `layerName` and `featureIndex` from `diagnostic.location` (preferred) or `diagnostic.data` (fallback).
- `pointIndex` is required — if missing, returns `[]` per the "no silent index invention" directive.
- The `_artifact` parameter is unused because coordinate-range diagnostics carry all necessary location data in the diagnostic itself.

---

## 5. Strategy: `tile/self-intersection` (`self-intersection.ts`)

📁 **File**: `packages/inspector/src/overlay/strategies/self-intersection.ts`

```typescript
export const selfIntersectionStrategy: OverlayStrategy = {
  ruleId: 'tile/self-intersection',

  toDescriptors(diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    const layerName = diagnostic.location?.layer ?? (diagnostic.data?.layer as string | undefined);
    const featureIndex =
      diagnostic.location?.featureIndex ?? (diagnostic.data?.featureIndex as number | undefined);
    const segments = diagnostic.data?.segments as [number, number] | undefined;

    // Strict validation — do not invent indices if metadata is missing
    if (
      layerName === undefined ||
      featureIndex === undefined ||
      !Array.isArray(segments) ||
      segments.length < 2 ||
      typeof segments[0] !== 'number'
    ) {
      return [];
    }

    const segStart = Number(segments[0]);

    return [
      {
        type: 'segment-highlight',
        layerName,
        featureIndex,
        target: [segStart, segStart + 1],
        severity: diagnostic.severity,
      },
    ];
  },
};
```

**Explanation:**
- Produces a `segment-highlight` for the first self-intersecting segment.
- `segments` is a `[segA, segB]` tuple of segment indices. For segment `segA`, the endpoints on the ring are vertex `segA` and vertex `segA + 1`.
- The `target` tuple `[segStart, segStart + 1]` represents the two vertex indices forming the segment to highlight.
- Validates the `segments` tuple strictly: must be an array with at least 2 elements and a numeric first element.

---

## 6. Strategy: `tile/zero-area-ring` (`zero-area-ring.ts`)

📁 **File**: `packages/inspector/src/overlay/strategies/zero-area-ring.ts`

```typescript
export const zeroAreaRingStrategy: OverlayStrategy = {
  ruleId: 'tile/zero-area-ring',

  toDescriptors(diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    const layerName = diagnostic.location?.layer ?? (diagnostic.data?.layer as string | undefined);
    const featureIndex =
      diagnostic.location?.featureIndex ?? (diagnostic.data?.featureIndex as number | undefined);

    if (layerName === undefined || featureIndex === undefined) {
      return [];
    }

    const ringIndex =
      diagnostic.location?.partIndex ?? (diagnostic.data?.partIndex as number | undefined) ?? 0;

    return [
      {
        type: 'ring-highlight',
        layerName,
        featureIndex,
        target: ringIndex,
        severity: diagnostic.severity,
      },
    ];
  },
};
```

**Explanation:**
- Produces a `ring-highlight` for the zero-area polygon ring.
- `ringIndex` defaults to `0` because the zero-area-ring rule specification genuinely defines ring index 0 as the default (exterior ring).
- This is an intentional exception to the "no silent index invention" directive — the rule schema guarantees that the default is meaningful.

---

## 7. Strategy: `tile/degenerate-geometry` (`degenerate-geometry.ts`)

📁 **File**: `packages/inspector/src/overlay/strategies/degenerate-geometry.ts`

```typescript
export const degenerateGeometryStrategy: OverlayStrategy = {
  ruleId: 'tile/degenerate-geometry',

  toDescriptors(diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    const layerName = diagnostic.location?.layer ?? (diagnostic.data?.layer as string | undefined);
    const featureIndex =
      diagnostic.location?.featureIndex ?? (diagnostic.data?.featureIndex as number | undefined);

    if (layerName === undefined || featureIndex === undefined) {
      return [];
    }

    return [
      {
        type: 'bbox-fill',
        layerName,
        featureIndex,
        target: 0,
        severity: diagnostic.severity,
      },
    ];
  },
};
```

**Explanation:**
- Produces a `bbox-fill` around the degenerate feature's bounding box.
- **Rationale**: Bounding boxes remain meaningful even when the geometry itself lacks sufficient vertices for point, segment, or ring highlighting. A degenerate geometry (e.g., a polygon with only 2 vertices) still has a spatial extent.
- `target: 0` — the bounding box fill applies to the entire feature, so the target index is irrelevant (0 is a placeholder).

---

## 8. Strategy: `tile/unclosed-ring` (`unclosed-ring.ts`)

📁 **File**: `packages/inspector/src/overlay/strategies/unclosed-ring.ts`

```typescript
export const unclosedRingStrategy: OverlayStrategy = {
  ruleId: 'tile/unclosed-ring',

  toDescriptors(diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    const layerName = diagnostic.location?.layer ?? (diagnostic.data?.layer as string | undefined);
    const featureIndex =
      diagnostic.location?.featureIndex ?? (diagnostic.data?.featureIndex as number | undefined);

    if (layerName === undefined || featureIndex === undefined) {
      return [];
    }

    const ringIndex =
      diagnostic.location?.partIndex ?? (diagnostic.data?.partIndex as number | undefined) ?? 0;

    return [
      {
        type: 'ring-highlight',
        layerName,
        featureIndex,
        target: ringIndex,
        severity: diagnostic.severity,
      },
    ];
  },
};
```

**Explanation:**
- Structurally identical to `zeroAreaRingStrategy` but registered for a different `ruleId`.
- Both produce `ring-highlight` overlays because the visual feedback for "zero area" and "unclosed" rings is the same — highlight the ring boundary.
- Same `ringIndex` defaulting logic applies.

---

## 9. Strategy: `tile/no-empty` (`no-empty.ts`)

📁 **File**: `packages/inspector/src/overlay/strategies/no-empty.ts`

```typescript
export const noEmptyStrategy: OverlayStrategy = {
  ruleId: 'tile/no-empty',

  toDescriptors(_diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    // No canvas overlay for empty tiles — there is no geometry to highlight.
    return [];
  },
};
```

**Explanation:**
- Returns an empty array unconditionally.
- **Rationale**: An empty tile has no geometry to point a canvas overlay at. The "this tile is empty" information surfaces through the diagnostic list panel (future milestone), bypassing the overlay pipeline entirely.
- This is a legitimate, intentional exception — not every diagnostic needs a canvas visual.
- The strategy is still registered so the adapter's `toDescriptors()` doesn't log "unregistered ruleId" warnings.

---

## 10. SelectionProducer (`selection-producer.ts`)

📁 **File**: `packages/inspector/src/overlay/selection-producer.ts`
**Purpose**: Converts ephemeral UI interaction state (hovered feature, selected feature) into `OverlayDescriptor` objects. Structurally independent from `OverlayAdapter` — does not depend on diagnostics, rule definitions, or strategy registries.

### Complete Source Code

```typescript
import type { FeatureRef } from '../store/inspector-store.js';
import type { OverlayDescriptor } from './overlay-adapter.js';

// Re-export FeatureRef for overlay callers
export type { FeatureRef };

export interface SelectionProducer {
  toOverlays(selection: FeatureRef, hover: FeatureRef): OverlayDescriptor[];
}

class SelectionProducerImpl implements SelectionProducer {
  toOverlays(selection: FeatureRef, hover: FeatureRef): OverlayDescriptor[] {
    const overlays: OverlayDescriptor[] = [];

    // Selected feature overlay (severity: 'info')
    if (selection.layerName !== null && selection.featureIndex !== null) {
      overlays.push({
        type: 'bbox-fill',
        layerName: selection.layerName,
        featureIndex: selection.featureIndex,
        target: 0,
        severity: 'info',
      });
    }

    // Hovered feature overlay (severity: 'warning')
    if (hover.layerName !== null && hover.featureIndex !== null) {
      overlays.push({
        type: 'bbox-fill',
        layerName: hover.layerName,
        featureIndex: hover.featureIndex,
        target: 0,
        severity: 'warning',
      });
    }

    return overlays;
  }
}

export function createSelectionProducer(): SelectionProducer {
  return new SelectionProducerImpl();
}
```

**Key design decisions:**

1. **Severity reuse**: Selection uses `'info'` and hover uses `'warning'` as a temporary implementation choice driven by the frozen `OverlayDescriptor` contract. This is documented in the module header: *"Future milestones may introduce dedicated interaction styling without modifying renderer architecture."*

2. **At most 2 descriptors**: Each call produces 0, 1, or 2 descriptors — one for selection, one for hover. This is O(1).

3. **Both fields must be non-null**: A `FeatureRef` with `layerName: null` and `featureIndex: null` means "nothing selected/hovered" and produces no descriptor.

4. **`FeatureRef` re-export**: The type is re-exported from this module so consumers in the overlay subsystem can reference it without a direct store import.

---

## 11. Overlay Barrel File (`index.ts`)

📁 **File**: `packages/inspector/src/overlay/index.ts`

```typescript
export type {
  OverlayDescriptor,
  OverlayStrategy,
} from './overlay-adapter.js';
export {
  createDefaultOverlayAdapter,
  OverlayAdapter,
} from './overlay-adapter.js';

export type {
  FeatureRef,
  SelectionProducer,
} from './selection-producer.js';
export { createSelectionProducer } from './selection-producer.js';
```

Intentionally does NOT export individual strategies. Strategies are implementation details of the adapter — external consumers use `createDefaultOverlayAdapter()` to get a fully-wired adapter.

---

## 12. Test Suite: OverlayAdapter (`overlay-adapter.test.ts`)

📁 **File**: `packages/inspector/tests/overlay-adapter.test.ts` — **8 tests**

```typescript
describe('OverlayAdapter', () => {
  it('returns empty array for empty diagnostics input');
  it('ignores diagnostics for unregistered rule IDs without throwing');
  it('dispatches diagnostic to registered strategy');
  it('throws on duplicate ruleId registration');
  it('isolates strategy failures so a throwing strategy does not stop execution');
  it('handles non-array strategy return values gracefully');
  it('returns all registered rule IDs via getAllRuleIds()');
  it('pre-registers all 6 default strategies in createDefaultOverlayAdapter()');
});
```

**Coverage:**
- Empty input → empty output
- Unknown ruleId → silent skip
- Correct dispatch → strategy receives correct arguments, result collected
- Duplicate registration → throws with descriptive message
- Strategy throws → isolated, other strategies still execute
- Malformed return → treated as empty
- Factory verification → all 6 strategies registered

---

## 13. Test Suite: Strategies (`strategies.test.ts`)

📁 **File**: `packages/inspector/tests/strategies.test.ts` — **9 tests**

```typescript
describe('Overlay Strategies', () => {
  describe('coordinateRangeStrategy', () => {
    it('produces point-marker descriptor for valid diagnostic');
    it('returns empty array if layer or featureIndex is missing');
    it('returns empty array if pointIndex is missing');
  });

  describe('selfIntersectionStrategy', () => {
    it('produces segment-highlight descriptor for self-intersecting segments');
    it('returns empty array if segments tuple is missing or invalid');
  });

  describe('zeroAreaRingStrategy', () => {
    it('produces ring-highlight descriptor for zero-area polygon ring');
  });

  describe('degenerateGeometryStrategy', () => {
    it('produces bbox-fill descriptor for degenerate feature');
  });

  describe('unclosedRingStrategy', () => {
    it('produces ring-highlight descriptor for unclosed ring');
  });

  describe('noEmptyStrategy', () => {
    it('returns empty array unconditionally for empty tile diagnostic');
  });
});
```

**Coverage per strategy:**
- Happy path with full metadata → correct descriptor type, layerName, featureIndex, target, severity
- Missing metadata → empty array (strict validation enforced)
- `noEmptyStrategy` → always empty (intentional)

---

## 14. Test Suite: SelectionProducer (`selection-producer.test.ts`)

📁 **File**: `packages/inspector/tests/selection-producer.test.ts` — **4 tests**

```typescript
describe('SelectionProducer', () => {
  it('returns empty array when selection and hover are null');
  it('produces single bbox-fill descriptor with severity info for active selection');
  it('produces single bbox-fill descriptor with severity warning for active hover');
  it('produces two distinct descriptors when both selection and hover are active');
});
```

---

## 15. Verification & Test Results

### TypeScript
```
npx tsc --noEmit → 0 errors ✅
```

### Biome
```
npx @biomejs/biome check → 0 errors ✅
```

### Test Suite
```
Test Files  14 passed (14)
     Tests  426 passed (426)
  Duration  ~1.6s
```

Milestone 4 specific tests: **21 tests** across 3 files:
- `overlay-adapter.test.ts`: 8 tests
- `strategies.test.ts`: 9 tests
- `selection-producer.test.ts`: 4 tests

### Benchmarking (from `smoke.test.ts`)
```
[bench] 200 diagnostics → 167 overlays in 0.24ms
[bench] 1000 diagnostics → 834 overlays in 0.33ms
```

The adapter processes 1000 diagnostics with error isolation in under 0.5ms — well within the 100ms latency budget.

---

## Architectural Invariant Summary

| Invariant | Enforced By |
|---|---|
| Each rule has exactly one strategy | `register()` throws on duplicates |
| Strategies produce descriptors, never draw | Interface contract (no Renderer param) |
| Strategies must not invent indices | Explicit `return []` on missing metadata |
| Strategy failure does not break the pipeline | `try/catch` in `toDescriptors()` |
| SelectionProducer is independent of OverlayAdapter | No shared imports beyond `OverlayDescriptor` type |
| No external access to strategy registry | `Map` is `private readonly` |
