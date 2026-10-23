/**
 * @tileguard/cli — Stdin path reader
 *
 * Reads artifact source paths from standard input, one path per line.
 *
 * This is the backing implementation for the `--stdin` flag on `tileguard
 * check`. It intentionally has no knowledge of the check command — it is a
 * pure async function that reads from any Readable stream and returns a list
 * of non-empty, trimmed lines.
 *
 * Consumers:
 *   - `runCheck()` (src/commands/check.ts) — passes `process.stdin` in
 *     production and a mock stream in tests.
 *
 * Design notes:
 *   - Reads to EOF before returning. This is correct because the engine
 *     requires the complete source list upfront; there is no incremental
 *     dispatch in the current Reporter interface.
 *   - Empty lines and whitespace-only lines are silently skipped, so
 *     `find . -name "*.pbf" | tileguard check --stdin` works even if
 *     the shell pipes a trailing newline.
 *   - The function never throws. If stdin is already closed (e.g., the
 *     process is not connected to a terminal or pipe), it returns an
 *     empty array.
 */

import type { Readable } from 'node:stream';

/**
 * Reads lines from a Readable stream, returning them as an array of
 * non-empty, trimmed strings.
 *
 * @param stream - The readable stream to consume (typically `process.stdin`).
 * @returns A promise that resolves to the list of paths read from the stream.
 */
export async function readStdinPaths(stream: Readable): Promise<string[]> {
  // Guard: if stdin is a TTY (interactive terminal) and there is no pipe,
  // reading would block forever. Callers should check stream.isTTY before
  // calling this function, but we handle it defensively here by returning
  // immediately when the stream is already closed / ended.
  const asAny = stream as unknown as { readableEnded?: boolean };
  if (asAny.readableEnded === true) {
    return [];
  }

  return new Promise<string[]>((resolve) => {
    const chunks: Buffer[] = [];

    stream.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      const paths = raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      resolve(paths);
    });

    // If the stream errors (e.g., stdin closed mid-read), resolve with
    // whatever we collected rather than rejecting — a partial list is
    // still better than aborting the run entirely.
    stream.on('error', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      const paths = raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      resolve(paths);
    });
  });
}
