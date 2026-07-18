/**
 * Unit tests for src/commands/check.ts
 *
 * Tests runCheck() as a pure function by mocking the I/O-performing
 * dependencies (loadConfig, createEngine). No subprocess is spawned —
 * this is the primary benefit of Decision D3: the entire command logic
 * is exercisable in-process against a mock engine.
 *
 * Coverage:
 *   - Each exit-code branch (0, 1, 2)
 *   - Config load failure → exit 2
 *   - Empty sources after expansion → exit 2
 *   - Unknown reporter → exit 2
 *   - CLI --reporter flag overrides config.reporter (D4 integration)
 *   - Startup banner written to stderr, not stdout (D9)
 *   - process.exit is never called (D3 enforcement)
 *   - Result is always a plain serializable object
 */

import type { RunResult } from '@tileguard/core';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks — must be declared before any imports that use them ──────
vi.mock('@tileguard/config', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('@tileguard/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tileguard/core')>();
  return { ...actual, createEngine: vi.fn() };
});

import { loadConfig } from '@tileguard/config';
import { createEngine } from '@tileguard/core';
import { runCheck } from '../src/commands/check.js';

// ── Typed mock handles ────────────────────────────────────────────────────
const mockLoadConfig = loadConfig as Mock;
const mockCreateEngine = createEngine as Mock;

// ── Helpers ───────────────────────────────────────────────────────────────

/** Build a fake engine whose run() resolves with a passing or failing result. */
function makeFakeEngine(pass: boolean, errorCount = 0): { run: Mock } {
  const runResult: RunResult = {
    diagnostics:
      errorCount > 0
        ? [
            {
              ruleId: 'artifact/no-provider',
              severity: 'error' as const,
              message: 'no provider for this source',
              artifact: { type: 'VectorTile' as const, source: 'tile.pbf' },
            },
          ]
        : [],
    summary: {
      errors: errorCount,
      warnings: 0,
      infos: 0,
      sourceCount: 1,
      artifactCount: 1,
      ruleExecutions: 0,
      duration: 1,
      pass,
    },
  };
  return { run: vi.fn().mockResolvedValue(runResult) };
}

// ── Test suite ────────────────────────────────────────────────────────────

describe('runCheck', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress real I/O in unit tests. Integration tests verify actual output.
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.clearAllMocks();
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  // ── Exit code 2: usage/operational errors ────────────────────────────

  it('returns exitCode 2 when loadConfig throws', async () => {
    mockLoadConfig.mockRejectedValueOnce(new Error('config file not found'));

    const result = await runCheck(['tile.pbf'], {});

    expect(result.exitCode).toBe(2);
  });

  it('returns exitCode 2 when no sources remain after expansion', async () => {
    mockLoadConfig.mockResolvedValueOnce({ config: {} });
    // Empty sources array → expandSources([]) → [] → empty-sources branch
    const result = await runCheck([], {});

    expect(result.exitCode).toBe(2);
  });

  it('returns exitCode 2 when the resolved reporter ID is unknown', async () => {
    mockLoadConfig.mockResolvedValueOnce({ config: { reporter: 'sarif' } });
    // Nonexistent path passes through expandSources unchanged
    const result = await runCheck(['/nonexistent/tile.pbf'], {});

    expect(result.exitCode).toBe(2);
  });

  // ── Exit code 0: pass ────────────────────────────────────────────────

  it('returns exitCode 0 when the engine run passes', async () => {
    mockLoadConfig.mockResolvedValueOnce({ config: { reporter: 'text' } });
    mockCreateEngine.mockReturnValueOnce(makeFakeEngine(true));

    const result = await runCheck(['/nonexistent/tile.pbf'], { reporter: 'text' });

    expect(result.exitCode).toBe(0);
    expect(result.summary?.pass).toBe(true);
  });

  // ── Exit code 1: validation failure ─────────────────────────────────

  it('returns exitCode 1 when the engine run fails', async () => {
    mockLoadConfig.mockResolvedValueOnce({ config: { reporter: 'text' } });
    mockCreateEngine.mockReturnValueOnce(makeFakeEngine(false, 1));

    const result = await runCheck(['/nonexistent/tile.pbf'], { reporter: 'text' });

    expect(result.exitCode).toBe(1);
    expect(result.summary?.pass).toBe(false);
    expect(result.diagnostics?.length).toBeGreaterThan(0);
  });

  // ── D4: CLI flags override config-file values ────────────────────────

  it('CLI --reporter flag wins over config.reporter (D4)', async () => {
    // Config file specifies 'json' but CLI passes 'text' via flags
    mockLoadConfig.mockResolvedValueOnce({ config: { reporter: 'json' } });
    const fakeEngine = makeFakeEngine(true);
    mockCreateEngine.mockReturnValueOnce(fakeEngine);

    const result = await runCheck(['/nonexistent/tile.pbf'], { reporter: 'text' });

    // Run should succeed — 'text' is a valid reporter, 'json' was overridden
    expect(result.exitCode).toBe(0);
    // Verify createEngine was called (engine ran with merged config)
    expect(mockCreateEngine).toHaveBeenCalledOnce();
  });

  // ── D9: startup banner goes to stderr, never stdout ─────────────────

  it('writes the startup banner to stderr and not to stdout (D9)', async () => {
    mockLoadConfig.mockResolvedValueOnce({ config: { reporter: 'text' } });
    mockCreateEngine.mockReturnValueOnce(makeFakeEngine(true));

    await runCheck(['/nonexistent/tile.pbf'], { reporter: 'text' });

    // Banner must appear on stderr
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('TileGuard'));
    // stdout must not contain the banner
    const stdoutCalls = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stdoutCalls).not.toContain('TileGuard');
  });

  // ── D3: process lifecycle ────────────────────────────────────────────

  it('never calls process.exit (D3 enforcement)', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit must not be called from runCheck');
    });

    mockLoadConfig.mockResolvedValueOnce({ config: { reporter: 'text' } });
    mockCreateEngine.mockReturnValueOnce(makeFakeEngine(true));

    await runCheck(['/nonexistent/tile.pbf'], { reporter: 'text' });

    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('always returns a plain serializable object', async () => {
    mockLoadConfig.mockRejectedValueOnce(new Error('load failed'));

    const result = await runCheck(['tile.pbf'], {});

    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
    expect(result).not.toBeInstanceOf(Error);
    expect(typeof result.exitCode).toBe('number');
  });
});
