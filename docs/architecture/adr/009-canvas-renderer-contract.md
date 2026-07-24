# ADR-009: Canvas Renderer Contract

## Status

**Accepted** — 2026-07-23

## Context

TileGuard Inspector requires a rendering engine capable of visualising immutable decoded vector tile artifacts for debugging, inspection, and validation.

Earlier milestones established:

- immutable geometry primitives (`geometry/`)
- immutable viewport engine (`viewport/`)
- deterministic coordinate transformations (2×3 affine matrix)
- shared geometry traversal (`traversal/`)
- structured diagnostic abstraction (`@tileguard/core`)

The renderer is the first subsystem responsible for converting these abstractions into pixels.

Without a clearly defined contract, rendering engines naturally accumulate unrelated responsibilities over time:

- interaction logic (mouse, keyboard, gestures)
- hit testing and feature picking
- selection and hover state determination
- overlay evaluation and diagnostic mapping
- viewport and transform management
- application state and undo history
- geometry caching and normalisation
- geometry mutation

Each of these violates separation of concerns, increases coupling, and makes future subsystem replacement significantly more difficult.

ADR-008 established the five-subsystem Inspector architecture and named the renderer as Subsystem 2. This ADR formally defines the renderer's responsibilities and architectural boundaries so that all subsequent milestones — overlays, hit testing, selection, React UI, headless CLI — can build against a stable, unambiguous contract.

---

## Decision

The Canvas Renderer shall be implemented as a **deterministic, stateless, immediate-mode rendering engine**.

It consumes immutable inputs, renders a complete frame to a Canvas 2D context, and produces no observable side effects other than drawing pixels.

The renderer shall never own application state, perform coordinate mathematics independently of the Viewport, traverse geometry independently of the shared traversal subsystem, or carry out any non-rendering responsibility.

---

## Render Pipeline

The following diagram shows the complete data flow from decoded geometry to pixels. Selection and hover states arrive as `OverlayDescriptor` entries or as flags in `RenderOptions` — they are visual states prepared by the store, not decisions made by the renderer.

```text
VectorTileArtifact
        │
        ▼
  Geometry Traversal (traversal/)
        │
        ▼
  CanvasRenderer
        │
        ├── Base Geometry         (polygons → lines → points → vertex markers)
        └── OverlayDescriptors    (diagnostic overlays, selection, hover)
        │
        ▼
     Canvas 2D
```

All rendering — including selection highlights and hover reticles — is expressed through this single pipeline. There is no rendering path that bypasses `OverlayDescriptor` or `RenderOptions`.

---

## Design Principles

### 1. Stateless

The renderer owns no persistent rendering state between frames.

Every frame is rendered entirely from the provided inputs.

**Allowed inputs:**

```text
VectorTileArtifact   — the decoded tile geometry
Viewport             — current transform matrix
OverlayDescriptor[]  — prepared visual markers (including selection and hover)
RenderOptions        — display flags (showVertices, selectedFeatureIndex, …)
```

**Forbidden state:**

```text
renderer.selectedFeature
renderer.hoveredFeature
renderer.lastMousePosition
renderer.cachedGeometry
renderer.zoom
renderer.pan
```

The renderer must never remember anything between frames. State of this kind belongs to the `InspectorStore` (Subsystem 5), which computes it and passes it in as inputs on each frame.

---

### 2. Deterministic

Rendering is a pure function of its inputs.

For identical inputs — `VectorTileArtifact`, `Viewport`, `OverlayDescriptor[]`, `RenderOptions` — the renderer must produce identical pixels.

No dependence on:

- time or `Date.now()`
- randomness (`Math.random()`)
- animation frame count
- browser-specific state
- event history

This property enables snapshot testing, reproducible bug reports, and deterministic CI golden-image comparisons (Milestone 8).

---

### 3. Immediate Mode

The renderer redraws the complete scene every frame. The render order is:

```text
clear()
  ↓
draw tile boundary
  ↓
draw polygon fills
  ↓
draw polygon outlines
  ↓
draw linestrings
  ↓
draw points
  ↓
draw vertex markers (if enabled)
  ↓
draw diagnostic overlays
  ↓
draw selection overlay
  ↓
draw hover overlay
  ↓
frame complete
```

No retained scene graph. No display list. No incremental dirty-rectangle updates. The Canvas 2D context itself is the frame buffer — `clear()` resets it at the start of every pass.

Selection and hover appear at the top of the draw stack (rendered last) so they are always visually above base geometry. They are drawn from `OverlayDescriptor` entries or `RenderOptions` flags — the renderer draws whichever visual state it is given, without deciding what that state should be.

---

### 4. Immutable Inputs

All renderer inputs are read-only. The renderer shall never modify:

- `VectorTileArtifact` or any nested geometry array
- `Viewport` state
- `OverlayDescriptor` objects
- `RenderOptions`

No normalisation. No in-place caching on model objects. Geometry arrays decoded from the protobuf are already frozen before reaching the renderer (ADR-008, VectorTileArtifact Immutability Guarantee).

---

### 5. Coordinate Authority

The renderer never performs coordinate mathematics independently.

All tile-to-screen conversion must go through:

```typescript
Viewport.tileToScreen(point: TilePoint): ScreenPoint
```

The renderer shall never compute `screenX = tileX * zoom + panX` inline. That formula lives exclusively in `viewport/viewport.ts`, derived from the cached affine matrix.

This prevents mathematical drift between subsystems and ensures that resizing, zooming, and panning are reflected consistently across every rendering call without renderer-side bookkeeping.

---

### 6. Geometry Authority

The renderer never traverses raw MVT geometry directly.

Geometry traversal must go through the shared traversal subsystem (`traversal/`), not through direct array indexing into `VectorTileArtifact.layers[].features[].geometry`.

```text
Renderer
  ↓
traversal/
  ↓
Geometry
```

Not:

```text
Renderer
  ↓
feature.geometry[ringIndex][pointIndex]
```

This ensures consistent ring ordering, coordinate unwrapping, and geometry-type handling across the renderer, hit-tester, and overlay adapter — all three read the same traversal output in the same order.

---

### 7. Rendering Responsibility

The renderer is responsible solely for converting prepared geometric descriptions into pixels.

**In scope:**

- canvas paths, fills, and strokes
- point circles and vertex markers
- tile boundary and buffer grid guides
- overlay primitives (rings, segments, bounding boxes, point markers)
- visual states that have already been determined externally: selection highlight, hover reticle, active overlay emphasis

**Out of scope:**

- determining which feature is selected or hovered
- feature queries or hit testing
- validation or topology checks
- diagnostic creation or evaluation
- application state management
- React integration

The renderer does not decide what is selected or hovered. It renders the visual representation of selection and hover state that the `InspectorStore` has already computed and passed in.

---

### 8. Layer Independence

The renderer understands drawable primitives, not business rules.

It does not branch on validation concepts. Instead of:

```text
Renderer
  ↓
if (diagnostic.ruleId === 'tile/self-intersection') { draw intersection highlight }
```

The renderer receives:

```text
OverlayDescriptor { kind: 'segment-highlight', targets: […], severity: 'error' }
  ↓
draw segment highlight
```

The `OverlayAdapter` (Subsystem 3) is responsible for translating rule-specific `Diagnostic` objects into geometry-only `OverlayDescriptor` objects before they reach the renderer.

Adding a new validation rule must never require a change to the renderer. Branching on `ruleId`, `diagnosticId`, or any validation concept inside the renderer is a contract violation.

---

### 9. Extensibility

New rendering capabilities shall be introduced by adding new drawing helpers or new `OverlayKind` values — not by adding rule-specific branches to existing rendering paths.

The permitted extension points are:

- **New `OverlayKind`:** extend the `OverlayKind` union type and add a corresponding `draw*` helper. The renderer's overlay dispatch switches on `kind`, not on rule identity.
- **New drawing helper:** a pure function `(ctx: CanvasRenderingContext2D, points: ScreenPoint[], …) => void` placed in `renderer/shapes.ts`. Helpers must wrap state in `save()`/`restore()` and have no knowledge of tiles, rules, or overlays.
- **New `RenderOptions` flag:** a readonly boolean or optional index that the renderer reads to conditionally include an existing draw pass. Adding a flag does not justify adding business logic to the renderer.

The following are not permitted extension points:

- branching on rule ID, diagnostic ID, layer name, or feature property inside any rendering path
- storing computed geometry between frames as a rendering optimisation
- importing from packages outside the renderer's declared dependency boundary

---

### 10. Fixed Render Order

Rendering order is fixed and not configurable at runtime.

The order defined in Principle 3 is the canonical order for all frames. No runtime sorting, no layer reordering, no z-index concept.

Fixed ordering prevents visual inconsistencies across frames and makes snapshot tests reliable: two renders with the same inputs always produce the same layering.

---

### 11. Canvas State Isolation

Canvas 2D state must never leak between drawing helpers.

Every helper that modifies canvas state wraps its work in `save()`/`restore()`:

```typescript
ctx.save();
// … configure strokeStyle, lineWidth, fillStyle, globalAlpha, etc.
// … issue path commands
ctx.restore();
```

No helper assumes the context arrives in a known state. No helper leaves modified styles behind for the next helper to inherit. This makes helpers independently testable and composable in any order.

---

### 12. Error Handling

Invalid renderer inputs indicate programmer error. The renderer shall:

**Skip silently:**

- empty layers (no features)
- empty polygons (no rings)
- empty rings (no coordinates)
- features with coordinate arrays of length < 2 for lines

**Throw immediately:**

- impossible internal invariants (e.g. `applyMatrix` receiving a non-finite coordinate)
- geometry types not covered by the renderer's type switch (new MVT geometry types require explicit renderer support)
- a null or detached canvas context

The renderer must not silently repair invalid data. Silent repair hides bugs in upstream subsystems. A thrown error with a clear message is easier to diagnose than a blank canvas.

---

### 13. Performance Philosophy

Correctness precedes optimisation.

The renderer shall initially:

- transform coordinates on demand via `Viewport.tileToScreen()`
- allocate minimal temporary objects
- avoid premature caching of transformed geometry

Optimisations are permitted only when justified by empirical profiling on real tile fixtures. At that point the following are acceptable additions:

- viewport bounding-box culling (skip features whose tile-space bbox falls entirely outside the screen)
- path batching for points and line segments (single `stroke()` / `fill()` per geometry type per layer)
- `OffscreenCanvas` blit for heavy background layers during continuous pan

Caching transformed coordinates inside `VectorTileArtifact` or `OverlayDescriptor` objects is permanently prohibited — it violates the immutability guarantee.

---

## Public API

The renderer API is intentionally minimal and shall remain stable across milestones:

```typescript
export interface RenderOptions {
  readonly showTileExtent: boolean;
  readonly showBufferGrid: boolean;
  readonly showVertices: boolean;
  readonly showVertexNumbers: boolean;
  /**
   * Feature index to render with a selection highlight.
   * Determined externally by the InspectorStore — the renderer draws it,
   * it does not decide it.
   */
  readonly selectedFeatureIndex?: number;
  /**
   * ID of the active diagnostic overlay to emphasise.
   * Determined externally by the InspectorStore — the renderer draws it,
   * it does not decide it.
   */
  readonly activeOverlayId?: string;
}

export interface Renderer {
  /** Attach (or re-attach) the canvas this renderer will draw to. */
  attachCanvas(canvas: HTMLCanvasElement): void;

  /** Update the canvas dimensions. Does not trigger a redraw. */
  resize(width: number, height: number): void;

  /** Clear the canvas. Called at the start of every render pass. */
  clear(): void;

  /**
   * Render a complete frame.
   *
   * Deterministic: identical inputs produce identical pixels.
   * Stateless: does not modify artifact, viewport, overlays, or options.
   */
  render(
    artifact: VectorTileArtifact,
    overlays: OverlayDescriptor[],
    options: RenderOptions,
  ): void;
}
```

`render()`, `clear()`, `attachCanvas()`, and `resize()` are frozen. Future additions to this interface require architectural review.

---

## Dependency Rules

The renderer imports from:

```text
geometry/         — TilePoint, ScreenPoint, BoundingBox, helper functions
viewport/         — Viewport interface (for tileToScreen calls)
traversal/        — shared geometry iteration
overlay/          — OverlayDescriptor type (consumed, never produced)
```

The renderer shall not import from any package that contains business logic, validation rules, interaction logic, or application state. Concretely, the following imports are permanently prohibited inside `src/renderer/`:

```text
@tileguard/core          — Diagnostic, Engine, Rule
@tileguard/tile-rules    — rule implementations
@tileguard/style-rules   — rule implementations
src/hittest/             — HitTester, HitResult
src/store/               — InspectorStore, InspectorState
React / ReactDOM
```

This one-way dependency graph means the renderer can be instantiated in headless Node.js environments (Milestone 7 server-side rendering, Milestone 8 golden-image CI) without pulling in any browser framework, state library, or rule package.

---

## Compliance Criteria

A renderer implementation complies with ADR-009 if it satisfies all of the following:

1. **Stateless** — holds no mutable fields that persist between `render()` calls.
2. **Immutable inputs** — does not modify `VectorTileArtifact`, `Viewport`, `OverlayDescriptor[]`, or `RenderOptions`.
3. **Coordinate authority** — performs all tile-to-screen conversion exclusively through `Viewport.tileToScreen()`.
4. **Geometry authority** — iterates geometry exclusively through the shared `traversal/` subsystem.
5. **Deterministic output** — identical inputs produce identical pixel output.
6. **No hit testing or validation** — contains no feature-query logic, topology checks, or diagnostic creation.
7. **No rule-specific branching** — does not branch on `ruleId`, `diagnosticId`, layer name, or any validation concept.
8. **Fixed render order** — draws passes in the order defined in Principle 3, without runtime reordering.
9. **Canvas state isolation** — every drawing helper that modifies canvas state wraps it in `save()`/`restore()`.
10. **Dependency boundary** — imports nothing from the prohibited package list in the Dependency Rules section.

These criteria are the checklist for code review. A PR that introduces a renderer change should be evaluated against each point. A violation of any criterion requires explicit architectural review before merge.

---

## Non-Goals

The renderer intentionally does not implement:

**Interaction** — mouse events, keyboard shortcuts, gesture recognition, pointer capture.

**Hit Testing** — point queries, feature picking, nearest-feature search. These belong to `HitTester` (Subsystem 4), which operates in tile coordinate space before any rendering occurs.

**Validation** — topology checks, geometry correctness, diagnostic generation. These belong to `@tileguard/core` and the rule packages.

**Overlay Evaluation** — the renderer draws `OverlayDescriptor` objects. It does not create them. The `OverlayAdapter` (Subsystem 3) is the sole translator between `Diagnostic[]` and `OverlayDescriptor[]`.

**Application State** — no selection model, no hover model, no undo/history, no React integration, no Zustand store. These belong to `InspectorStore` (Subsystem 5).

**Animation** — no animation scheduler, no transition interpolation, no easing. Frame scheduling is the responsibility of the caller (React's `useEffect` + `requestAnimationFrame`).

**Tile Loading** — no networking, no protobuf decoding, no tile cache, no Web Worker communication.

---

## Consequences

### Positive

- Independently testable with synthetic inputs — no DOM, no React, no engine required.
- Deterministic output enables golden-image snapshot testing in CI (Milestone 8).
- No hidden state means rendering bugs are reproducible from inputs alone.
- Swapping the rendering backend (Canvas 2D → WebGL → SVG) requires only a new `Renderer` implementation — no changes to rules, overlays, hit-tester, or store.
- Adding a new validation rule requires only a new `OverlayStrategy` — no renderer changes.
- The Compliance Criteria section provides a concrete review checklist, reducing reviewer ambiguity.
- The API surface is small enough to hold in one screen: four methods.

### Negative

- The entire scene redraws every frame. No dirty-rectangle or retained-mode optimisation.
- No transformed-coordinate cache. At high zoom on dense tiles, `tileToScreen()` is called once per visible vertex per frame.
- Some geometry work is repeated across the renderer, hit-tester, and overlay adapter rather than shared through a single pre-computed representation.

These trade-offs are acceptable because TileGuard Inspector prioritises correctness, clarity, and maintainability over maximum rendering throughput. The tile sizes targeted by the Inspector (single `.pbf` files for debugging) are well within the performance envelope of straightforward Canvas 2D rendering. Empirical profiling on real fixtures will determine whether any of the permitted optimisations (bbox culling, path batching, OffscreenCanvas blit) are warranted.

---

## Future Impact

This ADR establishes the renderer as a **pure presentation layer** within the Inspector pipeline. Subsequent milestones build on this contract without altering it:

- **Milestone 4 (Overlays):** The `OverlayAdapter` produces `OverlayDescriptor[]` from `Diagnostic[]` and passes them to `render()`. The renderer draws them. No renderer changes are required for any new overlay type that maps to an existing `OverlayKind`.
- **Milestone 5 (Hit Testing):** `HitTester` operates independently in tile space, returns a `HitResult`, and the store updates `selectedFeatureIndex` in `RenderOptions`. The renderer draws the selection highlight on the next frame. No renderer changes required.
- **Milestone 6 (React UI):** React owns application state via `InspectorStore` and schedules render calls via `requestAnimationFrame`. It does not embed rendering logic. The renderer is unaware of React.
- **Milestone 7 (CLI / Server):** The renderer runs in Node.js with a Canvas 2D polyfill (e.g. `canvas` npm package) for headless tile previews. Because the renderer has no browser-specific or framework-specific state, no specialisation is needed.
- **Milestone 8 (Regression Testing):** Deterministic rendering produces stable pixel output suitable for golden-image comparison. The renderer's stateless, pure-function contract is the prerequisite for this capability.

---

## Architectural Invariant

> **The Canvas Renderer is the final stage of the Inspector pipeline. It transforms immutable geometric descriptions into pixels, and pixels only. All interpretation, interaction, validation, and state management occur before rendering begins.**

This invariant is the litmus test for future changes: if a proposed feature is not about turning prepared drawing instructions into pixels, it belongs somewhere else in the pipeline.

---

*ADR-009 Architecture Version: 1.1 · Established: 2026-07-23 · Updated: 2026-07-23*
