/**
 * Tests for the JSON reporter.
 *
 * Validates the output shape defined in docs/architecture/05-reporter-system.md:
 *   - Top-level { diagnostics, summary } structure
 *   - Diagnostic serialization (all fields present/absent correctly)
 *   - Summary statistics accuracy
 *   - Indentation control
 *   - Valid JSON output
 */

import type { Diagnostic, ReporterContext } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import type { JsonReporterOutput } from '../src/json-reporter.js';
import { createJsonReporter } from '../src/json-reporter.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Capture JSON output and parse it. */
function captureJson(
  diagnostics: readonly Diagnostic[],
  context: ReporterContext,
  indent?: number,
): JsonReporterOutput {
  const chunks: string[] = [];
  const reporter = createJsonReporter({
    write: (text) => chunks.push(text),
    indent,
  });
  reporter.report(diagnostics, context);
  return JSON.parse(chunks.join('')) as JsonReporterOutput;
}

/** Capture raw JSON string output. */
function captureRaw(
  diagnostics: readonly Diagnostic[],
  context: ReporterContext,
  indent?: number,
): string {
  const chunks: string[] = [];
  const reporter = createJsonReporter({
    write: (text) => chunks.push(text),
    indent,
  });
  reporter.report(diagnostics, context);
  return chunks.join('');
}

/** Build a minimal ReporterContext. */
function makeContext(overrides: Partial<ReporterContext> = {}): ReporterContext {
  return {
    duration: overrides.duration ?? 47,
    sources: overrides.sources ?? ['test.pbf', 'style.json'],
    ruleCount: overrides.ruleCount ?? 12,
    artifactCount: overrides.artifactCount ?? 2,
    summary: overrides.summary ?? { errors: 2, warnings: 1, infos: 0, pass: false },
    config: overrides.config ?? {},
  };
}

/** Build a minimal Diagnostic. */
function makeDiagnostic(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    ruleId: overrides.ruleId ?? 'tile/required-layers',
    severity: overrides.severity ?? 'error',
    message: overrides.message ?? 'Required layer "buildings" is not present in the tile.',
    artifact: overrides.artifact ?? { type: 'VectorTile', source: 'test.pbf' },
    ...(overrides.location !== undefined && { location: overrides.location }),
    ...(overrides.suggestion !== undefined && { suggestion: overrides.suggestion }),
    ...(overrides.docsUrl !== undefined && { docsUrl: overrides.docsUrl }),
    ...(overrides.data !== undefined && { data: overrides.data }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('jsonReporter', () => {
  describe('output structure', () => {
    it('produces valid JSON with diagnostics and summary keys', () => {
      const output = captureJson([], makeContext());
      expect(output).toHaveProperty('diagnostics');
      expect(output).toHaveProperty('summary');
    });

    it('produces valid JSON when parsing the raw output', () => {
      const raw = captureRaw([makeDiagnostic()], makeContext());
      expect(() => JSON.parse(raw)).not.toThrow();
    });
  });

  describe('empty diagnostics', () => {
    it('produces an empty diagnostics array', () => {
      const output = captureJson(
        [],
        makeContext({ summary: { errors: 0, warnings: 0, infos: 0, pass: true } }),
      );
      expect(output.diagnostics).toHaveLength(0);
      expect(output.summary.pass).toBe(true);
    });
  });

  describe('diagnostic serialization', () => {
    it('includes all required diagnostic fields', () => {
      const diag = makeDiagnostic();
      const output = captureJson([diag], makeContext());
      const serialized = output.diagnostics[0]!;
      expect(serialized.ruleId).toBe('tile/required-layers');
      expect(serialized.severity).toBe('error');
      expect(serialized.message).toBe('Required layer "buildings" is not present in the tile.');
      expect(serialized.artifact.type).toBe('VectorTile');
      expect(serialized.artifact.source).toBe('test.pbf');
    });

    it('includes optional location when present', () => {
      const diag = makeDiagnostic({
        location: { layer: 'buildings', featureIndex: 3 },
      });
      const output = captureJson([diag], makeContext());
      const loc = output.diagnostics[0]!.location!;
      expect(loc.layer).toBe('buildings');
      expect(loc.featureIndex).toBe(3);
    });

    it('excludes optional location when absent', () => {
      const diag = makeDiagnostic();
      const output = captureJson([diag], makeContext());
      expect(output.diagnostics[0]!.location).toBeUndefined();
    });

    it('includes suggestion when present', () => {
      const diag = makeDiagnostic({
        suggestion: 'Add the buildings layer.',
      });
      const output = captureJson([diag], makeContext());
      expect(output.diagnostics[0]!.suggestion).toBe('Add the buildings layer.');
    });

    it('includes docsUrl when present', () => {
      const diag = makeDiagnostic({
        docsUrl: 'https://tileguard.dev/rules/tile/required-layers',
      });
      const output = captureJson([diag], makeContext());
      expect(output.diagnostics[0]!.docsUrl).toBe(
        'https://tileguard.dev/rules/tile/required-layers',
      );
    });

    it('includes data when present', () => {
      const diag = makeDiagnostic({
        data: { requiredLayer: 'buildings', availableLayers: ['water', 'roads'] },
      });
      const output = captureJson([diag], makeContext());
      const data = output.diagnostics[0]!.data!;
      expect(data.requiredLayer).toBe('buildings');
      expect(data.availableLayers).toEqual(['water', 'roads']);
    });

    it('serializes multiple diagnostics in order', () => {
      const d1 = makeDiagnostic({ ruleId: 'tile/required-layers' });
      const d2 = makeDiagnostic({ ruleId: 'tile/unclosed-ring', severity: 'warning' });
      const output = captureJson([d1, d2], makeContext());
      expect(output.diagnostics).toHaveLength(2);
      expect(output.diagnostics[0]!.ruleId).toBe('tile/required-layers');
      expect(output.diagnostics[1]!.ruleId).toBe('tile/unclosed-ring');
    });
  });

  describe('summary statistics', () => {
    it('includes correct summary counts', () => {
      const ctx = makeContext({
        duration: 123,
        sources: ['a.pbf', 'b.pbf', 'c.json'],
        ruleCount: 15,
        summary: { errors: 3, warnings: 2, infos: 1, pass: false },
      });
      const output = captureJson([makeDiagnostic()], ctx);
      expect(output.summary.errors).toBe(3);
      expect(output.summary.warnings).toBe(2);
      expect(output.summary.infos).toBe(1);
      expect(output.summary.pass).toBe(false);
      expect(output.summary.sources).toBe(3);
      expect(output.summary.rules).toBe(15);
      expect(output.summary.duration).toBe(123);
    });

    it('reports pass: true when no errors', () => {
      const ctx = makeContext({
        summary: { errors: 0, warnings: 5, infos: 0, pass: true },
      });
      const output = captureJson([], ctx);
      expect(output.summary.pass).toBe(true);
    });
  });

  describe('formatting options', () => {
    it('produces indented output by default (indent=2)', () => {
      const raw = captureRaw([makeDiagnostic()], makeContext());
      // Indented JSON has newlines
      expect(raw).toContain('\n');
      // The default indentation is 2 spaces
      expect(raw).toContain('  "diagnostics"');
    });

    it('produces compact output when indent is 0', () => {
      const raw = captureRaw([makeDiagnostic()], makeContext(), 0);
      // Compact JSON should not have leading spaces after newlines
      // (it's all on one line before the trailing newline)
      const jsonPart = raw.trim();
      expect(jsonPart).not.toContain('\n');
    });

    it('produces custom indentation', () => {
      const raw = captureRaw([makeDiagnostic()], makeContext(), 4);
      expect(raw).toContain('    "diagnostics"');
    });
  });
});
