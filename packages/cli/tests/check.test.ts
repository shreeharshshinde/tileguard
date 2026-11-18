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
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
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
    mockLoadConfig.mockResolvedValueOnce({
      config: {},
      configPath: '/proj/tileguard.config.ts',
    });
    // Empty sources array → expandSources([]) → [] → empty-sources branch
    const result = await runCheck([], {});

    expect(result.exitCode).toBe(2);
  });

  it('returns exitCode 2 when the resolved reporter ID is unknown', async () => {
    mockLoadConfig.mockResolvedValueOnce({
      config: { reporter: 'junit' },
      configPath: '/proj/tileguard.config.ts',
    });
    // Nonexistent path passes through expandSources unchanged
    const result = await runCheck(['/nonexistent/tile.pbf'], {});

    expect(result.exitCode).toBe(2);
  });

  // ── Exit code 0: pass ────────────────────────────────────────────────

  it('returns exitCode 0 when the engine run passes', async () => {
    mockLoadConfig.mockResolvedValueOnce({
      config: { reporter: 'text' },
      configPath: '/proj/tileguard.config.ts',
    });
    mockCreateEngine.mockReturnValueOnce(makeFakeEngine(true));

    const result = await runCheck(['/nonexistent/tile.pbf'], {
      reporter: 'text',
    });

    expect(result.exitCode).toBe(0);
    expect(result.summary?.pass).toBe(true);
  });

  // ── Exit code 1: validation failure ─────────────────────────────────

  it('returns exitCode 1 when the engine run fails', async () => {
    mockLoadConfig.mockResolvedValueOnce({
      config: { reporter: 'text' },
      configPath: '/proj/tileguard.config.ts',
    });
    mockCreateEngine.mockReturnValueOnce(makeFakeEngine(false, 1));

    const result = await runCheck(['/nonexistent/tile.pbf'], {
      reporter: 'text',
    });

    expect(result.exitCode).toBe(1);
    expect(result.summary?.pass).toBe(false);
    expect(result.diagnostics?.length).toBeGreaterThan(0);
  });

  // ── D4: CLI flags override config-file values ────────────────────────

  it('CLI --reporter flag wins over config.reporter (D4)', async () => {
    // Config file specifies 'json' but CLI passes 'text' via flags
    mockLoadConfig.mockResolvedValueOnce({
      config: { reporter: 'json' },
      configPath: '/proj/tileguard.config.ts',
    });
    const fakeEngine = makeFakeEngine(true);
    mockCreateEngine.mockReturnValueOnce(fakeEngine);

    const result = await runCheck(['/nonexistent/tile.pbf'], {
      reporter: 'text',
    });

    // Run should succeed — 'text' is a valid reporter, 'json' was overridden
    expect(result.exitCode).toBe(0);
    // Verify createEngine was called (engine ran with merged config)
    expect(mockCreateEngine).toHaveBeenCalledOnce();
  });

  // ── D9: startup banner goes to stderr, never stdout ─────────────────

  it('writes the startup banner to stderr and not to stdout (D9)', async () => {
    mockLoadConfig.mockResolvedValueOnce({
      config: { reporter: 'text' },
      configPath: '/proj/tileguard.config.ts',
    });
    mockCreateEngine.mockReturnValueOnce(makeFakeEngine(true));

    await runCheck(['/nonexistent/tile.pbf'], { reporter: 'text' });

    // Banner must appear on stderr
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('TileGuard'),
    );
    // stdout must not contain the banner
    const stdoutCalls = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stdoutCalls).not.toContain('TileGuard');
  });

  // ── D3: process lifecycle ────────────────────────────────────────────

  it('never calls process.exit (D3 enforcement)', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit must not be called from runCheck');
    });

    mockLoadConfig.mockResolvedValueOnce({
      config: { reporter: 'text' },
      configPath: '/proj/tileguard.config.ts',
    });
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

  // ── --stdin flag ─────────────────────────────────────────────────────

  it('reads source paths from stdin when --stdin is set', async () => {
    mockLoadConfig.mockResolvedValueOnce({
      config: { reporter: 'text' },
      configPath: '/proj/tileguard.config.ts',
    });
    const fakeEngine = makeFakeEngine(true);
    mockCreateEngine.mockReturnValueOnce(fakeEngine);

    // Provide a mock Readable that emits one path then ends
    const { Readable } = await import('node:stream');
    const mockStream = Readable.from(['/nonexistent/from-stdin.pbf\n']);

    const result = await runCheck(
      [],
      { reporter: 'text', stdin: true },
      mockStream,
    );

    // Engine was called — the stdin path was discovered and handed over
    expect(mockCreateEngine).toHaveBeenCalledOnce();
    expect(result.exitCode).toBe(0);
  });

  it('merges positional sources and stdin sources', async () => {
    mockLoadConfig.mockResolvedValueOnce({
      config: { reporter: 'text' },
      configPath: '/proj/tileguard.config.ts',
    });
    const fakeEngine = makeFakeEngine(true);
    mockCreateEngine.mockReturnValueOnce(fakeEngine);

    const { Readable } = await import('node:stream');
    const mockStream = Readable.from(['/nonexistent/from-stdin.pbf\n']);

    // Both positional + stdin sources together should reach the engine
    const result = await runCheck(
      ['/nonexistent/positional.pbf'],
      { reporter: 'text', stdin: true },
      mockStream,
    );

    expect(result.exitCode).toBe(0);
    expect(mockCreateEngine).toHaveBeenCalledOnce();
  });

  it('returns exitCode 2 when --stdin is set and no paths are found anywhere', async () => {
    mockLoadConfig.mockResolvedValueOnce({
      config: {},
      configPath: '/proj/tileguard.config.ts',
    });

    const { Readable } = await import('node:stream');
    // Empty stream — no paths from stdin, no positional args
    const mockStream = Readable.from(['']);

    const result = await runCheck([], { stdin: true }, mockStream);

    expect(result.exitCode).toBe(2);
    expect(result.message).toContain('--stdin');
  });

  it('resolves "jsonl" as a valid reporter', async () => {
    mockLoadConfig.mockResolvedValueOnce({
      config: {},
      configPath: '/proj/tileguard.config.ts',
    });
    mockCreateEngine.mockReturnValueOnce(makeFakeEngine(true));

    const result = await runCheck(['/nonexistent/tile.pbf'], {
      reporter: 'jsonl',
    });

    expect(result.exitCode).toBe(0);
  });

  // ── Auto-init: config created on first run (Mac Xiang item 1) ────────

  it('writes tileguard.config.ts and prints a hint when no config file exists', async () => {
    // First loadConfig call returns no configPath → triggers auto-init
    mockLoadConfig.mockResolvedValueOnce({ config: {}, configPath: undefined });
    // Second call (after auto-init write) returns a usable config
    mockLoadConfig.mockResolvedValueOnce({
      config: { reporter: 'text' },
      configPath: '/tmp/tileguard.config.ts',
    });
    mockCreateEngine.mockReturnValueOnce(makeFakeEngine(true));

    // Injectable fs ops — capture what was written without touching disk
    const writtenFiles: Array<[string, string]> = [];
    const fakeFsOps = {
      existsSync: (_p: string) => false,
      writeFileSync: (p: string, data: string, _enc: BufferEncoding) => {
        writtenFiles.push([p, data]);
      },
    };

    const result = await runCheck(
      ['/nonexistent/tile.pbf'],
      { reporter: 'text' },
      process.stdin,
      fakeFsOps,
    );

    // Should write the config template once
    expect(writtenFiles).toHaveLength(1);
    expect(writtenFiles[0][1]).toContain('tilePlugin');
    // Should print the hint to stderr
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringMatching(/No .*tileguard\.config\.ts.* found/),
    );
    // Should proceed normally and pass
    expect(result.exitCode).toBe(0);
  });

  it('does NOT auto-init when configPath is returned (config already exists)', async () => {
    // loadConfig returned a configPath → file exists, no auto-init
    mockLoadConfig.mockResolvedValueOnce({
      config: { reporter: 'text' },
      configPath: '/proj/tileguard.config.ts',
    });
    mockCreateEngine.mockReturnValueOnce(makeFakeEngine(true));

    const writtenFiles: string[] = [];
    const fakeFsOps = {
      existsSync: (_p: string) => true,
      writeFileSync: (p: string, _d: string, _e: BufferEncoding) => {
        writtenFiles.push(p);
      },
    };

    await runCheck(
      ['/nonexistent/tile.pbf'],
      { reporter: 'text' },
      process.stdin,
      fakeFsOps,
    );

    expect(writtenFiles).toHaveLength(0);
    // No "No tileguard.config.ts found" hint should appear
    const stderrMessages = stderrSpy.mock.calls
      .map((c) => String(c[0]))
      .join('');
    expect(stderrMessages).not.toContain('No tileguard.config.ts found');
  });

  it('does NOT auto-init when --config flag is explicitly passed', async () => {
    // When --config is passed, loadConfig uses that explicit path.
    // Even if configPath is undefined (file missing), we do NOT auto-init —
    // an explicit missing path is a user error, not a first-run situation.
    mockLoadConfig.mockResolvedValueOnce({
      config: { reporter: 'text' },
      configPath: '/explicit/path.ts',
    });
    mockCreateEngine.mockReturnValueOnce(makeFakeEngine(true));

    const writtenFiles: string[] = [];
    const fakeFsOps = {
      existsSync: (_p: string) => false,
      writeFileSync: (p: string, _d: string, _e: BufferEncoding) => {
        writtenFiles.push(p);
      },
    };

    await runCheck(
      ['/nonexistent/tile.pbf'],
      { reporter: 'text', config: '/explicit/path.ts' },
      process.stdin,
      fakeFsOps,
    );

    // Auto-init must NOT fire because flags.config was set
    expect(writtenFiles).toHaveLength(0);
  });

  it('continues gracefully when auto-init write fails (read-only fs)', async () => {
    mockLoadConfig.mockResolvedValueOnce({ config: {}, configPath: undefined });
    // After failed write, reload still returns a usable config
    mockLoadConfig.mockResolvedValueOnce({
      config: { reporter: 'text' },
      configPath: undefined,
    });
    mockCreateEngine.mockReturnValueOnce(makeFakeEngine(true));

    // Simulate a read-only filesystem error on write
    const fakeFsOps = {
      existsSync: (_p: string) => false,
      writeFileSync: (_p: string, _d: string, _e: BufferEncoding): void => {
        throw new Error('EROFS: read-only file system');
      },
    };

    // Should not throw — graceful degradation
    const result = await runCheck(
      ['/nonexistent/tile.pbf'],
      { reporter: 'text' },
      process.stdin,
      fakeFsOps,
    );

    // Still prints the hint (we notify the user even if write failed)
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringMatching(/No .*tileguard\.config\.ts.* found/),
    );
    // And proceeds with whatever config was reloaded
    expect(result.exitCode).toBe(0);
  });
});
