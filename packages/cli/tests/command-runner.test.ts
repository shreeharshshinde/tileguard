import { describe, expect, it } from 'vitest';
import { getDefaultConfig } from '../src/config/ConfigLoader.js';
import { createLogger } from '../src/logging/Logger.js';
import {
  type CommandContext,
  type CommandFn,
  type ExitCode,
  runCommand,
} from '../src/runner/CommandRunner.js';

function createMockContext(
  level: 'quiet' | 'normal' | 'verbose' | 'debug' = 'normal',
): {
  ctx: CommandContext;
  output: string[];
} {
  const output: string[] = [];
  const logger = createLogger({ level, write: (text) => output.push(text) });
  const ctx: CommandContext = {
    logger,
    config: getDefaultConfig(),
    cwd: '/tmp/test',
  };
  return { ctx, output };
}

describe('runCommand', () => {
  it('successful command returns result with durationMs', async () => {
    const { ctx } = createMockContext();
    const fn: CommandFn = async () => ({ exitCode: 0, message: 'done' });

    const result = await runCommand({ name: 'test', args: {}, ctx, fn });
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeTypeOf('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('successful command preserves original result fields', async () => {
    const { ctx } = createMockContext();
    const fn: CommandFn = async () => ({
      exitCode: 0,
      message: 'all clear',
      output: 'payload',
    });

    const result = await runCommand({ name: 'test', args: {}, ctx, fn });
    expect(result.message).toBe('all clear');
    expect(result.output).toBe('payload');
  });

  it('failed command (throws) returns exitCode 3', async () => {
    const { ctx } = createMockContext();
    const fn: CommandFn = async () => {
      throw new Error('kaboom');
    };

    const result = await runCommand({ name: 'broken', args: {}, ctx, fn });
    expect(result.exitCode).toBe(3);
  });

  it('failed command includes error message', async () => {
    const { ctx } = createMockContext();
    const fn: CommandFn = async () => {
      throw new Error('file not found');
    };

    const result = await runCommand({ name: 'broken', args: {}, ctx, fn });
    expect(result.message).toContain('file not found');
  });

  it('failed command message includes [tileguard] prefix', async () => {
    const { ctx } = createMockContext();
    const fn: CommandFn = async () => {
      throw new Error('oops');
    };

    const result = await runCommand({ name: 'broken', args: {}, ctx, fn });
    expect(result.message).toContain('[tileguard]');
  });

  it('command timing is recorded for both success and failure', async () => {
    const { ctx } = createMockContext();
    const fn: CommandFn = async () => {
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 5) {
        /* busy wait */
      }
      return { exitCode: 0 };
    };

    const result = await runCommand({ name: 'slow', args: {}, ctx, fn });
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('failed command also records durationMs', async () => {
    const { ctx } = createMockContext();
    const fn: CommandFn = async () => {
      throw new Error('crash');
    };

    const result = await runCommand({ name: 'crash', args: {}, ctx, fn });
    expect(result.durationMs).toBeTypeOf('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('logger debug shows stack trace on error in debug mode', async () => {
    const { ctx, output } = createMockContext('debug');
    const fn: CommandFn = async () => {
      throw new Error('debug-error');
    };

    await runCommand({ name: 'debug-test', args: {}, ctx, fn });
    const debugLines = output.filter((l) => l.includes('[debug]'));
    const hasStack = debugLines.some(
      (l) => l.includes('Error') || l.includes('at '),
    );
    expect(hasStack).toBe(true);
  });

  it('logger does not show stack trace in normal mode', async () => {
    const { ctx, output } = createMockContext('normal');
    const fn: CommandFn = async () => {
      throw new Error('normal-error');
    };

    await runCommand({ name: 'normal-test', args: {}, ctx, fn });
    const debugLines = output.filter((l) => l.includes('[debug]'));
    expect(debugLines).toHaveLength(0);
  });

  it('logs error message to logger on failure', async () => {
    const { ctx, output } = createMockContext('normal');
    const fn: CommandFn = async () => {
      throw new Error('visible error');
    };

    await runCommand({ name: 'fail-cmd', args: {}, ctx, fn });
    const errorLines = output.filter((l) => l.startsWith('✗'));
    expect(errorLines.length).toBeGreaterThan(0);
    expect(errorLines[0]).toContain('visible error');
  });

  it('handles non-Error thrown values gracefully', async () => {
    const { ctx } = createMockContext();
    const fn: CommandFn = async () => {
      throw 'string error'; // eslint-disable-line no-throw-literal
    };

    const result = await runCommand({ name: 'odd-throw', args: {}, ctx, fn });
    expect(result.exitCode).toBe(3);
    expect(result.message).toContain('Unknown internal error');
  });

  it('passes args and ctx to the command function', async () => {
    const { ctx } = createMockContext();
    let receivedArgs: unknown;
    let receivedCtx: unknown;
    const fn: CommandFn<{ file: string }> = async (args, context) => {
      receivedArgs = args;
      receivedCtx = context;
      return { exitCode: 0 };
    };

    await runCommand({
      name: 'passthrough',
      args: { file: 'test.pbf' },
      ctx,
      fn,
    });
    expect(receivedArgs).toEqual({ file: 'test.pbf' });
    expect(receivedCtx).toBe(ctx);
  });
});

describe('ExitCode type', () => {
  it('allows 0, 1, 2, 3 as valid exit codes', () => {
    const codes: ExitCode[] = [0, 1, 2, 3];
    expect(codes).toEqual([0, 1, 2, 3]);
  });

  it('exit code 0 represents success', async () => {
    const { ctx } = createMockContext();
    const fn: CommandFn = async () => ({ exitCode: 0 as ExitCode });
    const result = await runCommand({ name: 'ok', args: {}, ctx, fn });
    expect(result.exitCode).toBe(0);
  });

  it('exit code 2 represents validation errors', async () => {
    const { ctx } = createMockContext();
    const fn: CommandFn = async () => ({
      exitCode: 2 as ExitCode,
      message: 'errors found',
    });
    const result = await runCommand({ name: 'err', args: {}, ctx, fn });
    expect(result.exitCode).toBe(2);
  });
});
