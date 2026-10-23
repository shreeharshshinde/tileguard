/**
 * Tests for src/read-stdin.ts
 *
 * readStdinPaths() is tested by injecting a mock Readable stream —
 * no process.stdin patching required.
 */

import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { readStdinPaths } from '../src/read-stdin.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a Readable that emits a fixed string then ends. */
function makeStream(content: string): Readable {
  return Readable.from([content]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('readStdinPaths', () => {
  it('returns an empty array for an empty stream', async () => {
    const stream = makeStream('');
    const paths = await readStdinPaths(stream);
    expect(paths).toEqual([]);
  });

  it('returns a single path from a one-line stream', async () => {
    const stream = makeStream('/tiles/a.pbf\n');
    const paths = await readStdinPaths(stream);
    expect(paths).toEqual(['/tiles/a.pbf']);
  });

  it('returns multiple paths, one per line', async () => {
    const stream = makeStream('/tiles/a.pbf\n/tiles/b.pbf\n/tiles/c.pbf\n');
    const paths = await readStdinPaths(stream);
    expect(paths).toEqual(['/tiles/a.pbf', '/tiles/b.pbf', '/tiles/c.pbf']);
  });

  it('skips blank lines', async () => {
    const stream = makeStream('/tiles/a.pbf\n\n/tiles/b.pbf\n\n');
    const paths = await readStdinPaths(stream);
    expect(paths).toEqual(['/tiles/a.pbf', '/tiles/b.pbf']);
  });

  it('skips whitespace-only lines', async () => {
    const stream = makeStream('/tiles/a.pbf\n   \n/tiles/b.pbf\n\t\n');
    const paths = await readStdinPaths(stream);
    expect(paths).toEqual(['/tiles/a.pbf', '/tiles/b.pbf']);
  });

  it('trims leading and trailing whitespace from each path', async () => {
    const stream = makeStream('  /tiles/a.pbf  \n  /tiles/b.pbf\n');
    const paths = await readStdinPaths(stream);
    expect(paths).toEqual(['/tiles/a.pbf', '/tiles/b.pbf']);
  });

  it('handles a stream with no trailing newline', async () => {
    const stream = makeStream('/tiles/a.pbf');
    const paths = await readStdinPaths(stream);
    expect(paths).toEqual(['/tiles/a.pbf']);
  });

  it('handles Windows-style CRLF line endings', async () => {
    const stream = makeStream('/tiles/a.pbf\r\n/tiles/b.pbf\r\n');
    const paths = await readStdinPaths(stream);
    // \r is trimmed as whitespace by String.prototype.trim()
    expect(paths).toEqual(['/tiles/a.pbf', '/tiles/b.pbf']);
  });

  it('handles a stream with many paths', async () => {
    const manyPaths = Array.from({ length: 500 }, (_, i) => `/tiles/${i}.pbf`);
    const stream = makeStream(manyPaths.join('\n') + '\n');
    const paths = await readStdinPaths(stream);
    expect(paths).toHaveLength(500);
    expect(paths[0]).toBe('/tiles/0.pbf');
    expect(paths[499]).toBe('/tiles/499.pbf');
  });

  it('handles multi-chunk streams (data event fires multiple times)', async () => {
    // Simulate a slow pipe by sending data in two chunks
    const stream = new Readable({ read() {} });
    const promise = readStdinPaths(stream);
    stream.push('/tiles/a.pbf\n');
    stream.push('/tiles/b.pbf\n');
    stream.push(null); // EOF
    const paths = await promise;
    expect(paths).toEqual(['/tiles/a.pbf', '/tiles/b.pbf']);
  });
});
