/**
 * @tileguard/cli — Source path expansion
 *
 * Expands raw CLI source arguments into concrete, absolute file paths that
 * the engine can process. The engine never receives glob syntax or directory
 * paths — only literal, resolvable source strings.
 *
 * Three input categories are handled:
 *
 *   Glob patterns  → expanded via `fast-glob`
 *   Directories    → recursively searched for files with known extensions
 *   Everything else → passed through as-is; the engine's provider system
 *                     handles validation and emits `artifact/load-failed`
 *                     diagnostics for paths it cannot resolve
 *
 * The single-dot path `"."` is a directory and resolves through the directory
 * branch, making `tileguard check .` the idiomatic "validate everything here"
 * invocation — consistent with `eslint .`, `prettier .`, `ruff check .`.
 *
 * ---
 *
 * ## Future: Provider-Driven Artifact Discovery (post-v0.5.0)
 *
 * The current implementation hard-codes the list of supported file extensions
 * in the `KNOWN_EXTENSIONS` constant below. This is intentional for the
 * initial release: the set is small, stable, and known in advance.
 *
 * In a future release, extension knowledge should move out of the CLI and into
 * the artifact provider system. Each registered `ArtifactProvider` would
 * advertise the file extensions it can handle via a `supportedExtensions`
 * (or equivalent) property on the plugin or provider interface. `expandSources`
 * would receive the active plugin list from the resolved config and derive the
 * set of extensions dynamically, making this function provider-agnostic.
 *
 * The benefit: new providers (PMTiles, MBTiles, GeoJSON, FlatGeobuf, …) become
 * immediately discoverable without any change to the CLI package. The extension
 * list in `@tileguard/core` stays as the single source of truth.
 *
 * This enhancement is deferred beyond v0.5.0 to preserve implementation
 * simplicity while the plugin API stabilises.
 *
 * See Decision D7 in the CLI implementation plan.
 */

import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import fg from 'fast-glob';

/**
 * File extensions treated as TileGuard artifacts in the v0.5.0 release.
 *
 * This list is intentionally kept here rather than in `@tileguard/core`
 * because extension knowledge at this stage is a CLI-layer concern: the
 * engine itself accepts any path and lets providers decide whether they can
 * handle it. Directory and glob expansion simply need a filter to avoid
 * surfacing irrelevant files (README.md, .ts config files, etc.).
 *
 * ---
 *
 * Future: this constant is slated for removal once provider-driven discovery
 * is implemented (see module-level comment above). At that point the CLI will
 * derive the extension set from the registered plugins rather than maintaining
 * an explicit list. Until then, add new extensions here when new providers are
 * added to the framework.
 */
const KNOWN_EXTENSIONS = ['.pbf', '.json'];

/**
 * Expands CLI source arguments into a flat list of absolute file paths.
 *
 * Processes each source independently and concatenates results in input
 * order. Duplicate paths arising from overlapping arguments (e.g.
 * `tileguard check . **\/*.pbf`) are deduplicated before the list is
 * returned — each physical file appears exactly once regardless of how
 * many input expressions resolved to it.
 *
 * @param sources - Raw CLI arguments: file paths, directories, globs, or `"."`.
 * @returns Resolved absolute file paths ready to pass to `engine.run()`.
 *
 * @example
 * // Single directory (including ".")
 * await expandSources(['.']);
 * // → ['/project/tiles/a.pbf', '/project/styles/map.json', ...]
 *
 * @example
 * // Mixed sources
 * await expandSources(['./tile.pbf', './styles/', 'tiles/**\/*.pbf']);
 */
export async function expandSources(sources: string[]): Promise<string[]> {
  const seen = new Set<string>();
  const expanded: string[] = [];

  const add = (path: string) => {
    if (!seen.has(path)) {
      seen.add(path);
      expanded.push(path);
    }
  };

  for (const source of sources) {
    // ── Glob patterns — delegate entirely to fast-glob ──────────────────
    if (fg.isDynamicPattern(source)) {
      for (const p of await fg(source, { onlyFiles: true, absolute: true })) {
        add(p);
      }
      continue;
    }

    // ── Directories (including ".") — recursive search by extension ──────
    if (existsSync(source) && statSync(source).isDirectory()) {
      const pattern = join(source, '**', `*{${KNOWN_EXTENSIONS.join(',')}}`);
      for (const p of await fg(pattern, { onlyFiles: true, absolute: true })) {
        add(p);
      }
      continue;
    }

    // ── Plain file path, URL, or nonexistent path — pass through ─────────
    // Letting unresolvable paths reach the engine is intentional: the engine
    // emits a structured `artifact/load-failed` diagnostic rather than
    // aborting, which is more useful to the user than a pre-flight error.
    add(source);
  }

  return expanded;
}
