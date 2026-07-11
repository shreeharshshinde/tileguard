/**
 * Tests for the text reporter.
 *
 * Validates the output format defined in docs/architecture/05-reporter-system.md:
 *   - Severity icons (✗, ⚠, ℹ)
 *   - Rule ID rendering
 *   - Location breadcrumbs
 *   - Suggestion rendering
 *   - Source grouping
 *   - Summary line
 *   - No-problems message
 *   - Color vs no-color modes
 */

import type { Diagnostic, ReporterContext } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { createTextReporter } from '../src/text-reporter.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Capture all text output from a reporter call. */
function capture(
  diagnostics: readonly Diagnostic[],
  context: ReporterContext,
  color = false,
): string {
  const chunks: string[] = [];
  const reporter = createTextReporter({
    write: (text) => chunks.push(text),
    color,
  });
  reporter.report(diagnostics, context);
  return chunks.join('');
}

/** Build a minimal ReporterContext. */
function makeContext(overrides: Partial<ReporterContext> = {}): ReporterContext {
  return {
    duration: overrides.duration ?? 42,
    sources: overrides.sources ?? ['test.pbf'],
    ruleCount: overrides.ruleCount ?? 1,
    artifactCount: overrides.artifactCount ?? 1,
    summary: overrides.summary ?? { errors: 0, warnings: 0, infos: 0, pass: true },
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

describe('textReporter', () => {
  describe('no-problems output', () => {
    it('prints a success message when there are no diagnostics', () => {
      const output = capture([], makeContext({ sources: ['a.pbf', 'b.json'] }));
      expect(output).toContain('PASS');
      expect(output).toContain('No problems found');
      expect(output).toContain('2 sources');
      expect(output).toContain('42ms');
    });

    it('uses singular "source" for a single source', () => {
      const output = capture([], makeContext({ sources: ['a.pbf'] }));
      expect(output).toContain('1 source,');
    });
  });

  describe('severity rendering', () => {
    it('renders error icon for error diagnostics', () => {
      const diag = makeDiagnostic({ severity: 'error' });
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx);
      expect(output).toContain('✗');
      expect(output).toContain('tile/required-layers');
    });

    it('renders warning icon for warning diagnostics', () => {
      const diag = makeDiagnostic({ severity: 'warning', ruleId: 'tile/no-empty' });
      const ctx = makeContext({ summary: { errors: 0, warnings: 1, infos: 0, pass: true } });
      const output = capture([diag], ctx);
      expect(output).toContain('⚠');
      expect(output).toContain('tile/no-empty');
    });

    it('renders info icon for info diagnostics', () => {
      const diag = makeDiagnostic({ severity: 'info', ruleId: 'tile/feature-count' });
      const ctx = makeContext({ summary: { errors: 0, warnings: 0, infos: 1, pass: true } });
      const output = capture([diag], ctx);
      expect(output).toContain('ℹ');
      expect(output).toContain('tile/feature-count');
    });
  });

  describe('message and source grouping', () => {
    it('groups diagnostics under the source file heading', () => {
      const diag = makeDiagnostic({
        artifact: { type: 'VectorTile', source: './fixtures/test.pbf' },
      });
      const ctx = makeContext({
        summary: { errors: 1, warnings: 0, infos: 0, pass: false },
      });
      const output = capture([diag], ctx);
      expect(output).toContain('./fixtures/test.pbf');
      expect(output).toContain('Required layer "buildings" is not present in the tile.');
    });

    it('renders multiple source groups', () => {
      const d1 = makeDiagnostic({
        artifact: { type: 'VectorTile', source: 'a.pbf' },
        ruleId: 'tile/required-layers',
      });
      const d2 = makeDiagnostic({
        artifact: { type: 'StyleSpecification', source: 'style.json' },
        ruleId: 'style/version',
        severity: 'warning',
      });
      const ctx = makeContext({
        sources: ['a.pbf', 'style.json'],
        summary: { errors: 1, warnings: 1, infos: 0, pass: false },
      });
      const output = capture([d1, d2], ctx);
      expect(output).toContain('a.pbf');
      expect(output).toContain('style.json');
    });
  });

  describe('location breadcrumbs', () => {
    it('renders layer location', () => {
      const diag = makeDiagnostic({
        location: { layer: 'buildings' },
      });
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx);
      expect(output).toContain('layer: buildings');
    });

    it('renders layer, feature, and part location', () => {
      const diag = makeDiagnostic({
        location: { layer: 'water', featureIndex: 7, partIndex: 0 },
      });
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx);
      expect(output).toContain('layer: water, feature: 7, part: 0');
    });

    it('renders jsonPath location for style diagnostics', () => {
      const diag = makeDiagnostic({
        location: { jsonPath: 'layers[3].paint.fill-color' },
      });
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx);
      expect(output).toContain('layers[3].paint.fill-color');
    });

    it('renders line and column location', () => {
      const diag = makeDiagnostic({
        location: { line: 12, column: 5 },
      });
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx);
      expect(output).toContain('line: 12, column: 5');
    });

    it('skips location line when location has no renderable fields', () => {
      const diag = makeDiagnostic({
        location: {},
      });
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx);
      expect(output).not.toContain('at test.pbf →');
    });

    it('renders region location for render diagnostics', () => {
      const diag = makeDiagnostic({
        location: { region: { x: 100, y: 200, width: 32, height: 32 } },
      });
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx);
      expect(output).toContain('region: 100,200 32×32');
    });
  });

  describe('suggestions and docs URLs', () => {
    it('renders a suggestion line', () => {
      const diag = makeDiagnostic({
        suggestion: 'Add a "buildings" layer to your tile generation pipeline.',
      });
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx);
      expect(output).toContain('Add a "buildings" layer to your tile generation pipeline.');
    });

    it('renders a docs URL', () => {
      const diag = makeDiagnostic({
        docsUrl: 'https://tileguard.dev/rules/tile/required-layers',
      });
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx);
      expect(output).toContain('https://tileguard.dev/rules/tile/required-layers');
    });
  });

  describe('summary line', () => {
    it('renders FAILED verdict when errors exist', () => {
      const diag = makeDiagnostic({ severity: 'error' });
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx);
      expect(output).toContain('FAILED');
    });

    it('renders PASS verdict when only warnings exist', () => {
      const diag = makeDiagnostic({ severity: 'warning', ruleId: 'tile/no-empty' });
      const ctx = makeContext({ summary: { errors: 0, warnings: 1, infos: 0, pass: true } });
      const output = capture([diag], ctx);
      expect(output).toContain('PASS');
    });

    it('renders error and warning counts', () => {
      const diags = [
        makeDiagnostic({ severity: 'error' }),
        makeDiagnostic({ severity: 'warning', ruleId: 'tile/no-empty' }),
      ];
      const ctx = makeContext({
        sources: ['a.pbf', 'b.pbf'],
        summary: { errors: 1, warnings: 1, infos: 0, pass: false },
      });
      const output = capture(diags, ctx);
      expect(output).toContain('1 error');
      expect(output).toContain('1 warning');
      expect(output).toContain('2 sources');
    });

    it('pluralizes correctly for multiple errors', () => {
      const diags = [
        makeDiagnostic({ severity: 'error', ruleId: 'r1' }),
        makeDiagnostic({ severity: 'error', ruleId: 'r2' }),
      ];
      const ctx = makeContext({
        summary: { errors: 2, warnings: 0, infos: 0, pass: false },
      });
      const output = capture(diags, ctx);
      expect(output).toContain('2 errors');
    });

    it('includes duration in summary', () => {
      const diag = makeDiagnostic();
      const ctx = makeContext({
        duration: 123,
        summary: { errors: 1, warnings: 0, infos: 0, pass: false },
      });
      const output = capture([diag], ctx);
      expect(output).toContain('123ms');
    });

    it('renders separator line', () => {
      const diag = makeDiagnostic();
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx);
      expect(output).toContain('─'.repeat(40));
    });
  });

  describe('color support', () => {
    it('includes ANSI codes when color is enabled', () => {
      const diag = makeDiagnostic();
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx, true);
      // ANSI escape code for red
      expect(output).toContain('\x1b[31m');
    });

    it('excludes ANSI codes when color is disabled', () => {
      const diag = makeDiagnostic();
      const ctx = makeContext({ summary: { errors: 1, warnings: 0, infos: 0, pass: false } });
      const output = capture([diag], ctx, false);
      expect(output).not.toContain('\x1b[');
    });
  });
});
