# @tileguard/shared

Shared utilities used across multiple TileGuard packages.

## Status
<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

**Image Description / Generation Prompt:** A UML Component Diagram representing the monorepo package dependency structure of TileGuard. Draw the following components as boxes: `tileguard (cli)` (at the top), `@tileguard/config` (middle-left), `@tileguard/core` (middle-right), `@tileguard/reporters` (middle-bottom), `@tileguard/tile-rules` (bottom-left), `@tileguard/style-rules` (bottom-right), and `@tileguard/shared` (bottom-middle). Draw solid arrows pointing from `tileguard (cli)` to `@tileguard/config`, `@tileguard/core`, `@tileguard/reporters`, `@tileguard/tile-rules`, and `@tileguard/style-rules`. Draw solid arrows pointing from `@tileguard/tile-rules` and `@tileguard/style-rules` to `@tileguard/core` and `@tileguard/shared`. Draw arrows pointing from `@tileguard/config` and `@tileguard/reporters` to `@tileguard/core`. Draw an arrow pointing from `@tileguard/shared` to `@tileguard/core`. Mark the arrows indicating that imports flow strictly inward, showing `@tileguard/core` as the independent kernel at the core of the dependency graph.


📋 **Pending implementation.** See [`docs/engineering/MIGRATION_PLAN.md`](../../docs/engineering/MIGRATION_PLAN.md).

## Intended contents
<!-- TODO: INSERT DIAGRAM 9: Shoelace Algorithm Math Solver -->

**Image Description / Generation Prompt:** A geometric matrix diagram visualizing the Shoelace algorithm calculation for signed area.
1. Show a 2D coordinate grid with a 4-vertex polygon: P0(x0, y0), P1(x1, y1), P2(x2, y2), and P3(x3, y3).
2. Render the Shoelace matrix:
   - Column 1: x0, x1, x2, x3, x0
   - Column 2: y0, y1, y2, y3, y0
3. Draw diagonal arrows:
   - Downward-right diagonal green arrows indicating positive term multiplications: x0 * y1, x1 * y2, x2 * y3, x3 * y0.
   - Downward-left diagonal red arrows indicating negative term multiplications: y0 * x1, y1 * x2, y2 * x3, y3 * x0.
4. Equation Box: Show the area formula: Area = 1/2 * sum(x_i * y_{i+1} - x_{i+1} * y_i). Indicate that a positive value means clockwise winding (outer ring), and a negative value means counter-clockwise winding (inner hole).

<!-- TODO: INSERT DIAGRAM 10: Segment Orientation Self-Intersection Check -->

**Image Description / Generation Prompt:** A vector geometry diagram explaining the segment orientation tests used to determine if two line segments AB and CD intersect without using float division.
1. Show two intersecting line segments AB and CD on a 2D plane.
2. Write the 2D cross-product orientation formula: val = (B_y - A_y)(C_x - B_x) - (B_x - A_x)(C_y - B_y).
3. Render three diagrams representing the three possible orientation outputs:
   - val > 0: Clockwise curvature.
   - val < 0: Counter-clockwise curvature.
   - val = 0: Collinear segments.
4. Intersection Condition: Show that segments AB and CD intersect if and only if the orientation of (A, B, C) and (A, B, D) have different signs, AND the orientation of (C, D, A) and (C, D, B) have different signs.


- Geometry utilities (coordinate math, ring validation helpers) extracted from legacy validation logic
- File format detection helpers
- Common test fixtures and helpers

## Dependency rule

`@tileguard/shared` may depend only on `@tileguard/core`. Domain packages (`tile-rules`, `style-rules`) may depend on `@tileguard/shared`. `@tileguard/shared` must never depend on any domain package.
