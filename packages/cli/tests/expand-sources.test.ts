/**
 * Unit tests for src/expand-sources.ts
 *
 * Covers all three input categories:
 *   - Glob patterns → fast-glob expansion
 *   - Directories (including ".") → recursive search by known extension
 *   - Everything else → pass-through to the engine
 *
 * Fixtures are committed under tests/fixtures/expand-sources/ and require
 * no runtime generation. The directory layout is:
 *
 *   expand-sources/
 *     tile.pbf          ← artifact (expected in results)
 *     style.json        ← artifact (expected in results)
 *     README.md         ← non-artifact (must NOT appear in results)
 *     notes.txt         ← non-artifact (must NOT appear in results)
 *     nested/
 *       deep.pbf        ← artifact (expected in results)
 *       deep.json       ← artifact (expected in results)
 *       ignore.ts       ← non-artifact (must NOT appear in results)
 *
 * The "." test case is an explicitly named, required test per Decision D7.
 */

import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expandSources } from '../src/expand-sources.js';

const FIXTURE_DIR = join(import.meta.dirname, 'fixtures', 'expand-sources');

describe('expandSources', () => {
  it('expands a directory path to all known-extension files, recursively', async () => {
    const result = await expandSources([FIXTURE_DIR]);

    // Artifact files must be present
    expect(result.some((f) => f.endsWith('tile.pbf'))).toBe(true);
    expect(result.some((f) => f.endsWith('style.json'))).toBe(true);
    expect(result.some((f) => f.endsWith('deep.pbf'))).toBe(true);
    expect(result.some((f) => f.endsWith('deep.json'))).toBe(true);

    // Non-artifact extensions must be absent
    expect(result.some((f) => f.endsWith('README.md'))).toBe(false);
    expect(result.some((f) => f.endsWith('notes.txt'))).toBe(false);
    expect(result.some((f) => f.endsWith('ignore.ts'))).toBe(false);
  });

  it('expands "." to known-extension files in the current directory — D7 explicit case', async () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(FIXTURE_DIR);
      const result = await expandSources(['.']);

      expect(result.some((f) => f.endsWith('tile.pbf'))).toBe(true);
      expect(result.some((f) => f.endsWith('style.json'))).toBe(true);
      expect(result.some((f) => f.endsWith('README.md'))).toBe(false);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('expands a single-directory glob pattern', async () => {
    const result = await expandSources([join(FIXTURE_DIR, '*.pbf')]);

    expect(result.length).toBe(1);
    expect(result[0]).toContain('tile.pbf');
  });

  it('expands a recursive glob pattern', async () => {
    const result = await expandSources([join(FIXTURE_DIR, '**/*.pbf')]);

    expect(result.length).toBe(2);
    expect(result.some((f) => f.endsWith('tile.pbf'))).toBe(true);
    expect(result.some((f) => f.endsWith('deep.pbf'))).toBe(true);
  });

  it('passes a plain file path through unchanged', async () => {
    const filePath = join(FIXTURE_DIR, 'tile.pbf');
    const result = await expandSources([filePath]);

    expect(result).toEqual([filePath]);
  });

  it('passes a nonexistent path through unchanged (engine handles validation)', async () => {
    const result = await expandSources(['/nonexistent/path.pbf']);

    expect(result).toEqual(['/nonexistent/path.pbf']);
  });

  it('handles mixed source types in a single call', async () => {
    const result = await expandSources([
      join(FIXTURE_DIR, 'tile.pbf'), // plain file — passes through
      FIXTURE_DIR,                    // directory — expanded recursively
      '/nonexistent/path.pbf',        // nonexistent — passes through
    ]);

    expect(result.some((f) => f.endsWith('tile.pbf'))).toBe(true);
    expect(result.some((f) => f.endsWith('style.json'))).toBe(true);
    expect(result.includes('/nonexistent/path.pbf')).toBe(true);
  });

  it('returns an empty array for empty input', async () => {
    const result = await expandSources([]);
    expect(result).toEqual([]);
  });

  it('returns absolute paths for all expanded entries', async () => {
    const result = await expandSources([FIXTURE_DIR]);

    for (const filePath of result) {
      expect(filePath.startsWith('/')).toBe(true);
    }
  });

  it('deduplicates paths when multiple inputs resolve to the same file — Proposal 3', async () => {
    // A directory expansion and an explicit glob can both resolve the same
    // file (e.g. `tileguard check . **/*.pbf`). Each file must appear exactly
    // once in the output regardless of how many expressions matched it.
    const filePath = join(FIXTURE_DIR, 'tile.pbf');
    const globPattern = join(FIXTURE_DIR, '*.pbf');

    const result = await expandSources([
      filePath,       // explicit pass-through
      FIXTURE_DIR,    // directory expansion — tile.pbf will appear again
      globPattern,    // glob expansion — tile.pbf will appear a third time
    ]);

    const tileCount = result.filter((f) => f.endsWith('tile.pbf')).length;
    expect(tileCount).toBe(1);
  });
});
