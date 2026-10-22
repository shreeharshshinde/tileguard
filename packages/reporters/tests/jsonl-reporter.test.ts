/**
 * Tests for the JSONL reporter.
 *
 * Validates:
 *   - One JSON line per diagnostic (compact, parseable)
 *   - Trailing summary line with _type: "summary" discriminant
 *   - All diagnostic fields serialised correctly
 *   - Empty-diagnostics run still emits a summary line
 *   - Each line is independently parseable (no trailing commas, no wrapper)
 */

import type { Diagnostic, ReporterContext } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import type {
  JsonlDiagnosticLine,
  JsonlSummaryLine,
} from '../src/jsonl-reporter.js';
import { createJsonlReporter } from '../src/jsonl-reporter.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Capture all raw JSONL output lines. */
function captureLines(
  diagnostics: readonly Diagnostic[],
  context: ReporterContext,
): string[] {
  const chunks: string[] = [];
  const reporter = createJsonlReporter({
    write: (text) => chunks.push(text),
  });
  reporter.report(diagnostics, context);
  // Split on newlines, filter out the final empty string after trailing \n
  return chunks.join('').split('\n').filter((l) => l.length > 0);
}

/** Parse all lines and return typed objects. */
function parseLines(
  diagnostics: readonly Diagnostic[],
  context: ReporterContext,
): (JsonlDiagnosticLine | JsonlSummaryLine)[] {
  return captureLines(diagnostics, context).map(
    (line) => JSON.parse(line) as JsonlDiagnosticLine | JsonlSummaryLine,
  );
}

/** Build a minimal ReporterContext. */
function makeContext(
  overrides: Partial<ReporterContext> = {},
): ReporterContext {
  return {
    duration: overrides.duration ?? 42,
    sources: overrides.sources ?? ['test.pbf'],
    ruleCount: overrides.ruleCount ?? 5,
    artifactCount: overrides.artifactCount ?? 1,
    summary: overrides.summary ?? {
      errors: 1,
      warnings: 0,
      infos: 0,
      pass: false,
    },
    config: overrides.config ?? {},
  };
}

/** Build a minimal Diagnostic. */
function makeDiagnostic(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    ruleId: overrides.ruleId ?? 'tile/self-intersection',
    severity: overrides.severity ?? 'error',
    message:
      overrides.message ?? 'Ring 0 in feature 7 crosses itself.',
    artifact: overrides.artifact ?? {
      type: 'VectorTile',
      source: 'test.pbf',
    },
    ...(overrides.location !== undefined && { location: overrides.location }),
    ...(overrides.suggestion !== undefined && {
      suggestion: overrides.suggestion,
    }),
    ...(overrides.docsUrl !== undefined && { docsUrl: overrides.docsUrl }),
    ...(overrides.data !== undefined && { data: overrides.data }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('jsonlReporter', () => {
  describe('line count', () => {
    it('emits exactly one line when diagnostics is empty (summary only)', () => {
      const lines = captureLines([], makeContext());
      expect(lines).toHaveLength(1);
    });

    it('emits N+1 lines for N diagnostics (N diagnostic lines + 1 summary)', () => {
      const diags = [makeDiagnostic(), makeDiagnostic(), makeDiagnostic()];
      const lines = captureLines(diags, makeContext());
      expect(lines).toHaveLength(4); // 3 diagnostics + 1 summary
    });
  });

  describe('each line is valid JSON', () => {
    it('all lines parse without throwing', () => {
      const diags = [makeDiagnostic(), makeDiagnostic()];
      const lines = captureLines(diags, makeContext());
      expect(() => lines.forEach((l) => JSON.parse(l))).not.toThrow();
    });

    it('each line is compact (no internal newlines)', () => {
      const lines = captureLines([makeDiagnostic()], makeContext());
      for (const line of lines) {
        expect(line).not.toContain('\n');
      }
    });
  });

  describe('diagnostic lines', () => {
    it('serialises all required diagnostic fields', () => {
      const diag = makeDiagnostic({
        ruleId: 'tile/winding-order',
        severity: 'warning',
        message: 'Ring 0 has incorrect winding order.',
        artifact: { type: 'VectorTile', source: 'tile.pbf' },
      });
      const parsed = parseLines([diag], makeContext());
      const first = parsed[0] as JsonlDiagnosticLine;

      expect(first.ruleId).toBe('tile/winding-order');
      expect(first.severity).toBe('warning');
      expect(first.message).toBe('Ring 0 has incorrect winding order.');
      expect(first.artifact.type).toBe('VectorTile');
      expect(first.artifact.source).toBe('tile.pbf');
    });

    it('includes optional location when present', () => {
      const diag = makeDiagnostic({
        location: { layer: 'buildings', featureIndex: 42, partIndex: 1 },
      });
      const parsed = parseLines([diag], makeContext());
      const first = parsed[0] as JsonlDiagnosticLine;

      expect(first.location?.layer).toBe('buildings');
      expect(first.location?.featureIndex).toBe(42);
      expect(first.location?.partIndex).toBe(1);
    });

    it('omits location key when absent', () => {
      const diag = makeDiagnostic();
      const parsed = parseLines([diag], makeContext());
      const first = parsed[0] as JsonlDiagnosticLine;
      expect(Object.prototype.hasOwnProperty.call(first, 'location')).toBe(false);
    });

    it('includes suggestion when present', () => {
      const diag = makeDiagnostic({ suggestion: 'Rebuild with corrected geometry.' });
      const parsed = parseLines([diag], makeContext());
      expect((parsed[0] as JsonlDiagnosticLine).suggestion).toBe(
        'Rebuild with corrected geometry.',
      );
    });

    it('includes docsUrl when present', () => {
      const diag = makeDiagnostic({
        docsUrl: 'https://tileguard.dev/rules/tile/self-intersection',
      });
      const parsed = parseLines([diag], makeContext());
      expect((parsed[0] as JsonlDiagnosticLine).docsUrl).toBe(
        'https://tileguard.dev/rules/tile/self-intersection',
      );
    });

    it('includes data when present', () => {
      const diag = makeDiagnostic({
        data: { segA: 3, segB: 7 },
      });
      const parsed = parseLines([diag], makeContext());
      const data = (parsed[0] as JsonlDiagnosticLine).data!;
      expect(data.segA).toBe(3);
      expect(data.segB).toBe(7);
    });

    it('does not include _type on diagnostic lines', () => {
      const diag = makeDiagnostic();
      const parsed = parseLines([diag], makeContext());
      expect(Object.prototype.hasOwnProperty.call(parsed[0], '_type')).toBe(false);
    });

    it('preserves input order for multiple diagnostics', () => {
      const d1 = makeDiagnostic({ ruleId: 'tile/required-layers' });
      const d2 = makeDiagnostic({ ruleId: 'tile/winding-order' });
      const d3 = makeDiagnostic({ ruleId: 'tile/no-empty' });
      const parsed = parseLines([d1, d2, d3], makeContext());

      expect((parsed[0] as JsonlDiagnosticLine).ruleId).toBe('tile/required-layers');
      expect((parsed[1] as JsonlDiagnosticLine).ruleId).toBe('tile/winding-order');
      expect((parsed[2] as JsonlDiagnosticLine).ruleId).toBe('tile/no-empty');
    });
  });

  describe('summary line', () => {
    it('last line has _type: "summary"', () => {
      const lines = captureLines([makeDiagnostic()], makeContext());
      const last = JSON.parse(lines[lines.length - 1]!) as JsonlSummaryLine;
      expect(last._type).toBe('summary');
    });

    it('summary carries correct counts from context', () => {
      const ctx = makeContext({
        duration: 123,
        sources: ['a.pbf', 'b.pbf'],
        ruleCount: 10,
        summary: { errors: 3, warnings: 2, infos: 1, pass: false },
      });
      const lines = captureLines([], ctx);
      const summary = JSON.parse(lines[0]!) as JsonlSummaryLine;

      expect(summary.errors).toBe(3);
      expect(summary.warnings).toBe(2);
      expect(summary.infos).toBe(1);
      expect(summary.pass).toBe(false);
      expect(summary.sources).toBe(2);
      expect(summary.rules).toBe(10);
      expect(summary.duration).toBe(123);
    });

    it('summary pass is true when no errors', () => {
      const ctx = makeContext({
        summary: { errors: 0, warnings: 3, infos: 0, pass: true },
      });
      const lines = captureLines([], ctx);
      const summary = JSON.parse(lines[0]!) as JsonlSummaryLine;
      expect(summary.pass).toBe(true);
    });
  });

  describe('reporter id', () => {
    it('reporter.id is "jsonl"', () => {
      const reporter = createJsonlReporter();
      expect(reporter.id).toBe('jsonl');
    });
  });
});
