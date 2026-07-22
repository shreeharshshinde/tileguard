/**
 * @tileguard/inspector — Local Static Server (Milestone 7)
 *
 * Launched by the `tileguard inspect <file>` CLI command. Finds a free TCP
 * port (starting at 3100), serves the pre-built Vite SPA assets from
 * `packages/inspector/dist/`, and exposes a single JSON API endpoint that
 * returns the decoded tile payload.
 *
 * Implemented in Milestone 7 (CLI Integration & Dynamic Local Server).
 *
 * Design constraints:
 *   - Zero third-party HTTP framework dependency — implemented using the
 *     Node.js built-in `node:http` module only.
 *   - Dynamic free-port discovery: bind attempts starting at DEFAULT_PORT,
 *     incrementing by 1 until the OS accepts the bind (EADDRINUSE retry loop).
 *   - The decoded tile JSON is cached in memory after the first request so that
 *     the SPA's `/api/tile` endpoint responds at sub-millisecond latency.
 *   - Graceful shutdown: SIGINT / SIGTERM close the server and release the port.
 *
 * Public surface (implemented in Milestone 7):
 *   - InspectorServer       — interface describing the running server instance
 *   - ServerOptions         — configuration object
 *   - startInspectorServer  — factory that binds to a free port and returns the instance
 */

import type { Server } from 'node:http';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Starting port for dynamic free-port discovery. */
export const DEFAULT_PORT = 3100;

/** Maximum number of port increment attempts before giving up. */
export const MAX_PORT_ATTEMPTS = 50;

// ---------------------------------------------------------------------------
// Types — implemented in Milestone 7
// ---------------------------------------------------------------------------

/** Configuration options for the inspector local server. */
export interface ServerOptions {
  /**
   * Absolute path to the `.pbf` tile file to serve.
   * The server decodes this file once and caches the result.
   */
  readonly tilePath: string;

  /**
   * Absolute path to the Vite-built SPA asset directory.
   * Defaults to `dist/` relative to this package.
   */
  readonly distDir?: string;

  /**
   * Starting port number for dynamic port discovery.
   * Defaults to DEFAULT_PORT (3100).
   */
  readonly preferredPort?: number;

  /**
   * If true, the server does NOT open the browser automatically after binding.
   * The `--no-open` CLI flag sets this to true.
   */
  readonly noOpen?: boolean;
}

/** Represents a running inspector server instance. */
export interface InspectorServer {
  /** The port the server successfully bound to. */
  readonly port: number;

  /** The full URL (e.g. "http://localhost:3100"). */
  readonly url: string;

  /** The underlying Node.js HTTP server. */
  readonly httpServer: Server;

  /**
   * Gracefully shut down the server and release the port.
   * Returns a promise that resolves when all connections are closed.
   */
  close(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Factory — implemented in Milestone 7
// ---------------------------------------------------------------------------

/**
 * Start the Inspector local server.
 *
 * Performs dynamic port discovery starting at `options.preferredPort`
 * (or DEFAULT_PORT), increments by 1 on EADDRINUSE until a free port is found.
 *
 * After binding, opens the SPA in the default browser unless `noOpen` is true.
 *
 * Full implementation delivered in Milestone 7.
 *
 * @throws Error if no free port is found within MAX_PORT_ATTEMPTS attempts.
 */
export async function startInspectorServer(
  _options: ServerOptions,
): Promise<InspectorServer> {
  throw new Error('startInspectorServer() — implemented in Milestone 7');
}
