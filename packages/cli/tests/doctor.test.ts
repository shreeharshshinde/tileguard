/**
 * Tests for the `doctor` command.
 */

import { describe, expect, it } from 'vitest';
import { runDoctor } from '../src/commands/doctor.js';
import { createLogger } from '../src/logging/Logger.js';
import { getDefaultConfig } from '../src/config/ConfigLoader.js';
import type { CommandContext } from '../src/runner/CommandRunner.js';

function makeCtx(cwd = process.cwd()): CommandContext {
  return {
    logger: createLogger({ level: 'quiet' }),
    config: getDefaultConfig(),
    cwd,
  };
}

describe('doctor command', () => {
  it('returns exitCode 0 or 1 (not 3)', async () => {
    const result = await runDoctor({}, makeCtx());
    expect([0, 1]).toContain(result.exitCode);
  });

  it('output contains TileGuard Doctor heading', async () => {
    const result = await runDoctor({}, makeCtx());
    expect(result.output).toContain('TileGuard Doctor');
  });

  it('checks Node.js version', async () => {
    const result = await runDoctor({}, makeCtx());
    expect(result.output).toContain('Node.js');
    expect(result.output).toContain(process.version);
  });

  it('checks MVT Parser', async () => {
    const result = await runDoctor({}, makeCtx());
    expect(result.output).toContain('MVT Parser');
    expect(result.output).toContain('✓');
  });

  it('checks Reporters', async () => {
    const result = await runDoctor({}, makeCtx());
    expect(result.output).toContain('Reporters');
  });

  it('checks Rule Loading', async () => {
    const result = await runDoctor({}, makeCtx());
    expect(result.output).toContain('Rule Loading');
  });

  it('shows ✓ for passing checks', async () => {
    const result = await runDoctor({}, makeCtx());
    expect(result.output).toContain('✓');
  });

  it('checks Configuration', async () => {
    const result = await runDoctor({}, makeCtx());
    expect(result.output).toContain('Configuration');
  });

  it('checks YAML Config', async () => {
    const result = await runDoctor({}, makeCtx());
    expect(result.output).toContain('YAML Config');
  });

  it('output has final status message', async () => {
    const result = await runDoctor({}, makeCtx());
    // Should contain one of the final messages
    const hasStatus =
      result.output!.includes('All checks passed') ||
      result.output!.includes('Some checks failed');
    expect(hasStatus).toBe(true);
  });
});
