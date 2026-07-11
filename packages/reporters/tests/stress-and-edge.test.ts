/**
 * Stress and edge-case tests for reporters.
 *
 * Covers scenarios not addressed in the primary test suites:
 *   - Large diagnostic sets (output correctness, not performance)
 *   - Unicode / emoji / RTL text in messages and rule IDs
 *   - Extremely long paths and messages
 *   - Boundary context values (zero duration, zero sources)
 *   - No-process (browser) runtime fallback
 *   - Diagnostic mutation safety
 *   - Deterministic / idempotent output
 */

import type { Diagnostic, ReporterContext } from '@tileguard/core';
import { describe, expect, it, vi } from 'vitest';
import type { JsonReporterOutput } from '../src/json-reporter.js';
import { createJsonReporter } from '../src/json-reporter.js';
import { createTextReporter } from '../src/text-reporter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<ReporterContext> = {}): ReporterContext {
  return {
    duration: overrides.duration ?? 47,
    sources: overrides.sources ?? ['test.pbf'],
    ruleCount: overrides.ruleCount ?? 12,
    artifactCount: overrides.artifactCount ?? 2,
    summary: overrides.summary ?? { errors: 2, warnings: 1, infos: 0, pass: false },
    config: overrides.config ?? {},
  };
}

function makeDiagnostic(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    ruleId: overrides.ruleId ?? 'tile/required-layers',
    severity: overrides.severity ?? 'error',
    message: overrides.message ?? 'Required layer is missing.',
    artifact: overrides.artifact ?? { type: 'VectorTile', source: 'test.pbf' },
    ...(overrides.location !== undefined && { location: overrides.location }),
    ...(overrides.suggestion !== undefined && { suggestion: overrides.suggestion }),
    ...(overrides.docsUrl !== undefined && { docsUrl: overrides.docsUrl }),
    ...(overrides.data !== undefined && { data: overrides.data }),
  };
}

function captureText(diags: readonly Diagnostic[], ctx: ReporterContext, color = false): string {
  const chunks: string[] = [];
  createTextReporter({ write: (t) => chunks.push(t), color }).report(diags, ctx);
  return chunks.join('');
}

function captureJson(
  diags: readonly Diagnostic[],
  ctx: ReporterContext,
  indent = 2,
): JsonReporterOutput {
  const chunks: string[] = [];
  createJsonReporter({ write: (t) => chunks.push(t), indent }).report(diags, ctx);
  return JSON.parse(chunks.join('')) as JsonReporterOutput;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('reporters stress and edge-cases', () => {
  // -------------------------------------------------------------------------
  // Large volume — verifies correctness of output, not speed
  // -------------------------------------------------------------------------
  describe('large volume diagnostics', () => {
    it('serializes and renders large diagnostic sets correctly', () => {
      const diags: Diagnostic[] = [];
      for (let i = 0; i < 2000; i++) {
        diags.push(
          makeDiagnostic({
            ruleId: `rule/${i}`,
            message: `Layer "roads" is missing required property at index ${i}.`,
            artifact: { type: 'VectorTile', source: `file-${i % 5}.pbf` },
          }),
        );
      }

      const ctx = makeContext({
        sources: ['file-0.pbf', 'file-1.pbf', 'file-2.pbf', 'file-3.pbf', 'file-4.pbf'],
        summary: { errors: 2000, warnings: 0, infos: 0, pass: false },
      });

      // Text: output contains first and last rule, correct summary
      const text = captureText(diags, ctx);
      expect(text).toContain('file-0.pbf');
      expect(text).toContain('rule/1999');
      expect(text).toContain('2000 errors');

      // JSON: all diagnostics serialized, summary correct
      const json = captureJson(diags, ctx, 0);
      expect(json.diagnostics).toHaveLength(2000);
      expect(json.summary.errors).toBe(2000);
      expect(json.summary.pass).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Unicode and international content
  // -------------------------------------------------------------------------
  describe('unicode and edge character payloads', () => {
    it('preserves emojis, RTL text, and multi-byte characters verbatim', () => {
      const diag = makeDiagnostic({
        ruleId: '🌐/🗺-required-layers',
        message: 'Missing layer name: "建筑物" / "buildings" 🏢. RTL: السلام عليكم.',
        suggestion: 'Please add 📐 / format layout.',
      });

      const text = captureText([diag], makeContext());
      expect(text).toContain('🌐/🗺-required-layers');
      expect(text).toContain('建筑物');
      expect(text).toContain('🏢');
      expect(text).toContain('السلام عليكم');

      const json = captureJson([diag], makeContext());
      expect(json.diagnostics[0]!.message).toBe(
        'Missing layer name: "建筑物" / "buildings" 🏢. RTL: السلام عليكم.',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Extreme payload sizes
  // -------------------------------------------------------------------------
  describe('extremely long inputs', () => {
    it('renders extremely long file paths and messages without truncation', () => {
      const longPath = `${'tiles/region/'.repeat(50)}test.pbf`;
      const longMessage = 'Layer "roads" is missing required property "name". '.repeat(100).trim();
      const diag = makeDiagnostic({
        message: longMessage,
        artifact: { type: 'VectorTile', source: longPath },
      });

      const text = captureText([diag], makeContext({ sources: [longPath] }));
      expect(text).toContain(longPath);
      expect(text).toContain(longMessage);
    });
  });

  // -------------------------------------------------------------------------
  // Boundary ReporterContext values
  // -------------------------------------------------------------------------
  describe('boundary ReporterContext values', () => {
    it('handles zero duration, zero sources, zero rules correctly', () => {
      const ctx = makeContext({
        duration: 0,
        ruleCount: 0,
        sources: [],
        summary: { errors: 0, warnings: 0, infos: 0, pass: true },
      });

      const text = captureText([], ctx);
      expect(text).toContain('0ms');
      expect(text).toContain('0 sources');
      expect(text).toContain('PASS');
    });

    it('handles extremely large numeric context values without formatting errors', () => {
      const ctx = makeContext({
        duration: 999999999,
        ruleCount: 123456789,
        sources: ['a.pbf'],
        summary: { errors: 0, warnings: 0, infos: 0, pass: true },
      });

      const text = captureText([], ctx);
      expect(text).toContain('999999999ms');
    });
  });

  // -------------------------------------------------------------------------
  // Mutation safety — reporters must not modify the diagnostics array
  // -------------------------------------------------------------------------
  describe('diagnostic mutation safety', () => {
    it('text reporter does not mutate the diagnostics array', () => {
      const diags: Diagnostic[] = [
        makeDiagnostic({ severity: 'error' }),
        makeDiagnostic({ severity: 'warning', ruleId: 'tile/no-empty' }),
        makeDiagnostic({ severity: 'info', ruleId: 'tile/feature-count' }),
      ];
      const original = structuredClone(diags);
      const ctx = makeContext({ summary: { errors: 1, warnings: 1, infos: 1, pass: false } });

      captureText(diags, ctx);

      expect(diags).toEqual(original);
    });

    it('json reporter does not mutate the diagnostics array', () => {
      const diags: Diagnostic[] = [
        makeDiagnostic({ severity: 'error' }),
        makeDiagnostic({ severity: 'warning', ruleId: 'tile/no-empty' }),
      ];
      const original = structuredClone(diags);
      const ctx = makeContext({ summary: { errors: 1, warnings: 1, infos: 0, pass: false } });

      captureJson(diags, ctx);

      expect(diags).toEqual(original);
    });
  });

  // -------------------------------------------------------------------------
  // Determinism — same input must always produce identical output
  // -------------------------------------------------------------------------
  describe('deterministic output', () => {
    it('text reporter produces identical output on repeated calls with same input', () => {
      const diags = [
        makeDiagnostic({ severity: 'error', ruleId: 'tile/required-layers' }),
        makeDiagnostic({ severity: 'warning', ruleId: 'tile/no-empty' }),
      ];
      const ctx = makeContext({ summary: { errors: 1, warnings: 1, infos: 0, pass: false } });

      const first = captureText(diags, ctx);
      const second = captureText(diags, ctx);

      expect(first).toBe(second);
    });

    it('json reporter produces identical output on repeated calls with same input', () => {
      const diags = [
        makeDiagnostic({ severity: 'error', ruleId: 'tile/required-layers' }),
        makeDiagnostic({ severity: 'warning', ruleId: 'tile/no-empty' }),
      ];
      const ctx = makeContext({ summary: { errors: 1, warnings: 1, infos: 0, pass: false } });

      const chunks1: string[] = [];
      const chunks2: string[] = [];
      createJsonReporter({ write: (t) => chunks1.push(t) }).report(diags, ctx);
      createJsonReporter({ write: (t) => chunks2.push(t) }).report(diags, ctx);

      expect(chunks1.join('')).toBe(chunks2.join(''));
    });
  });

  // -------------------------------------------------------------------------
  // Browser portability — no process global
  // -------------------------------------------------------------------------
  describe('default write fallback / browser simulation (no process)', () => {
    it('routes output to console when process is not defined', () => {
      const originalProcess = globalThis.process;

      // biome-ignore lint/performance/noDelete: simulating browser environment
      delete (globalThis as any).process;

      const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      const spyInfo = vi.spyOn(console, 'info').mockImplementation(() => {});

      try {
        const textReporter = createTextReporter();
        const jsonReporter = createJsonReporter();

        expect(() => textReporter.report([], makeContext())).not.toThrow();
        expect(() => jsonReporter.report([], makeContext())).not.toThrow();

        // textReporter logs "✔ PASS No problems found..." and the timing/source summary
        expect(spyLog).toHaveBeenCalledTimes(2);
        // jsonReporter logs the stringified JSON payload and the trailing newline
        expect(spyInfo).toHaveBeenCalledTimes(2);
      } finally {
        globalThis.process = originalProcess;
        spyLog.mockRestore();
        spyInfo.mockRestore();
      }
    });
  });
});
