/**
 * Tests for @tileguard/config config file discovery.
 *
 * Uses real temporary directories (mkdtempSync) rather than mocking fs,
 * because real directories catch real path-joining bugs.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CONFIG_FILENAMES, findConfigFile } from '../src/finder.js';

let testRoot: string;

beforeEach(() => {
  testRoot = mkdtempSync(join(tmpdir(), 'tileguard-finder-'));
});

afterEach(() => {
  rmSync(testRoot, { recursive: true, force: true });
});

/** Create an empty file at the given path. */
function touch(filePath: string): void {
  writeFileSync(filePath, '');
}

/** Create nested directories and return the deepest path. */
function mkNested(...segments: string[]): string {
  const dir = join(testRoot, ...segments);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('findConfigFile', () => {
  it('finds tileguard.config.ts in the current directory', () => {
    touch(join(testRoot, 'tileguard.config.ts'));
    const result = findConfigFile(testRoot);
    expect(result).toBe(join(testRoot, 'tileguard.config.ts'));
  });

  it('falls back to .js when .ts is absent', () => {
    touch(join(testRoot, 'tileguard.config.js'));
    const result = findConfigFile(testRoot);
    expect(result).toBe(join(testRoot, 'tileguard.config.js'));
  });

  it('falls back to .mjs when .ts and .js are absent', () => {
    touch(join(testRoot, 'tileguard.config.mjs'));
    const result = findConfigFile(testRoot);
    expect(result).toBe(join(testRoot, 'tileguard.config.mjs'));
  });

  it('falls back to .json when all other formats are absent', () => {
    touch(join(testRoot, 'tileguard.config.json'));
    const result = findConfigFile(testRoot);
    expect(result).toBe(join(testRoot, 'tileguard.config.json'));
  });

  it('respects priority order — .ts wins when all four exist', () => {
    for (const filename of CONFIG_FILENAMES) {
      touch(join(testRoot, filename));
    }
    const result = findConfigFile(testRoot);
    expect(result).toBe(join(testRoot, 'tileguard.config.ts'));
  });

  it('respects priority order — .js wins when .ts is absent but .js and .json both exist', () => {
    touch(join(testRoot, 'tileguard.config.js'));
    touch(join(testRoot, 'tileguard.config.json'));
    const result = findConfigFile(testRoot);
    expect(result).toBe(join(testRoot, 'tileguard.config.js'));
  });

  it('walks upward to a parent directory', () => {
    const child = mkNested('project', 'src');
    touch(join(testRoot, 'tileguard.config.ts'));
    const result = findConfigFile(child);
    expect(result).toBe(join(testRoot, 'tileguard.config.ts'));
  });

  it('walks upward through multiple nested directories', () => {
    const deep = mkNested('a', 'b', 'c');
    touch(join(testRoot, 'a', 'tileguard.config.js'));
    const result = findConfigFile(deep);
    expect(result).toBe(join(testRoot, 'a', 'tileguard.config.js'));
  });

  it('prefers the closest ancestor config', () => {
    const child = mkNested('project', 'src');
    touch(join(testRoot, 'tileguard.config.ts'));
    touch(join(testRoot, 'project', 'tileguard.config.json'));
    const result = findConfigFile(child);
    // The closer one (project/) is found first, even though it's .json
    expect(result).toBe(join(testRoot, 'project', 'tileguard.config.json'));
  });

  it('returns undefined when no config file exists anywhere below the boundary', () => {
    const empty = mkNested('empty', 'project');
    const result = findConfigFile(empty, testRoot);
    expect(result).toBeUndefined();
  });

  it('returns undefined for a completely empty directory below the boundary', () => {
    const isolated = mkNested('isolated', 'deep', 'nest', 'very', 'deep');
    const result = findConfigFile(isolated, testRoot);
    expect(result).toBeUndefined();
  });
});
