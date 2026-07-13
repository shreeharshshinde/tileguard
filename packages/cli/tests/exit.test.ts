/**
 * Unit tests for src/exit.ts
 *
 * The most important test here is the process.exit spy — it provides
 * mechanical, automated enforcement of Decision D3: "exit-code decision
 * functions must never terminate the process." The stderr spy verifies the
 * companion invariant added in the Proposal 1 architectural refinement:
 * "exit-code decision functions must never write to any stream."
 *
 * Both invariants together guarantee that every function in this module is
 * completely side-effect-free and safe to call in any host context.
 */

import { describe, expect, it, vi } from 'vitest';
import { toRunResult, toUsageResult } from '../src/exit.js';
import type { RunSummary } from '@tileguard/core';

// A minimal RunSummary fixture used across multiple tests.
const summaryFixture: RunSummary = {
  errors: 0,
  warnings: 1,
  infos: 0,
  sourceCount: 2,
  artifactCount: 2,
  ruleExecutions: 10,
  duration: 42,
  pass: true,
};

describe('exit decision functions', () => {
  it('never calls process.exit — D3 enforcement', () => {
    // Any call to process.exit from these functions is a bug.
    // The mock makes it throw so the test fails loudly rather than silently
    // exiting the test process.
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit must not be called from exit.ts');
    });

    toRunResult(true, [], summaryFixture);
    toUsageResult(new Error('boom'));

    expect(exitSpy).not.toHaveBeenCalled();

    exitSpy.mockRestore();
  });

  it('never writes to stderr or stdout — Proposal 1 I/O purity enforcement', () => {
    // Any stream write from these functions is a bug — bin.ts owns all I/O.
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    toRunResult(true, [], summaryFixture);
    toUsageResult(new Error('boom'));

    expect(stderrSpy).not.toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();

    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  describe('toRunResult', () => {
    it('returns exitCode 0 when pass is true', () => {
      const result = toRunResult(true, [], summaryFixture);
      expect(result.exitCode).toBe(0);
    });

    it('returns exitCode 1 when pass is false', () => {
      const failSummary: RunSummary = { ...summaryFixture, pass: false, errors: 1 };
      const result = toRunResult(false, [], failSummary);
      expect(result.exitCode).toBe(1);
    });

    it('attaches diagnostics and summary to the result', () => {
      const diagnostics = [
        {
          ruleId: 'tile/no-empty',
          severity: 'error' as const,
          message: 'tile has zero features',
          artifact: { type: 'VectorTile' as const, source: 'test.pbf' },
        },
      ];

      const result = toRunResult(false, diagnostics, summaryFixture);

      expect(result.diagnostics).toBe(diagnostics);
      expect(result.summary).toBe(summaryFixture);
    });
  });

  describe('toUsageResult', () => {
    it('returns exitCode 2', () => {
      const result = toUsageResult(new Error('bad input'));
      expect(result.exitCode).toBe(2);
    });

    it('returns the error message in result.message instead of writing to stderr', () => {
      const result = toUsageResult(new Error('config not found'));
      // Message is in the result — bin.ts decides where to present it.
      expect(result.message).toContain('config not found');
    });

    it('prefixes the message with [tileguard] for consistent CLI output', () => {
      const result = toUsageResult(new Error('bad flag'));
      expect(result.message).toMatch(/^\[tileguard\]/);
    });

    it('handles non-Error thrown values by converting to string', () => {
      const result = toUsageResult('plain string error');

      expect(result.exitCode).toBe(2);
      expect(result.message).toContain('plain string error');
    });
  });
});
