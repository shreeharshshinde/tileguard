/**
 * Tests for the SARIF 2.1.0 reporter.
 *
 * Uses an injectable `write` function to capture output without filesystem I/O.
 * Validates SARIF envelope shape, severity mapping, rule deduplication,
 * location embedding, and suggestion rendering.
 */
import type { Diagnostic, ReporterContext } from '@tileguard/core';
import { describe, expect, it, vi } from 'vitest';
import { createSarifReporter } from '../src/sarif-reporter.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface SarifLog {
  version: string;
  $schema: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: { driver: { name: string; version: string; rules: SarifRule[] } };
  results: SarifResult[];
}

interface SarifRule {
  id: string;
  name?: string;
  helpUri?: string;
}

interface SarifResult {
  ruleId: string;
  level: string;
  message: { text: string };
  locations: { physicalLocation: { artifactLocation: { uri: string } } }[];
  fixes?: { description: { text: string } }[];
}

/** Capture SARIF JSON via injectable write fn and parse it. */
function captureSarif(
  diagnostics: readonly Diagnostic[],
  context?: Partial<ReporterContext>,
): { path: string; log: SarifLog } {
  let capturedPath = '';
  let capturedContent = '';

  const reporter = createSarifReporter({
    write: (p, c) => {
      capturedPath = p;
      capturedContent = c;
    },
  });

  reporter.report(diagnostics, makeContext(context));

  return {
    path: capturedPath,
    log: JSON.parse(capturedContent) as SarifLog,
  };
}

/** Build a minimal ReporterContext for tests. */
function makeContext(overrides: Partial<ReporterContext> = {}): ReporterContext {
  return {
    duration: overrides.duration ?? 100,
    sources: overrides.sources ?? ['tile.pbf'],
    ruleCount: overrides.ruleCount ?? 1,
    artifactCount: overrides.artifactCount ?? 1,
    summary: overrides.summary ?? {
      errors: 0,
      warnings: 0,
      infos: 0,
      pass: true,
    },
    config: overrides.config ?? {},
  };
}

/** Build a minimal Diagnostic for tests. */
function makeDiagnostic(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    ruleId: overrides.ruleId ?? 'tile/required-layers',
    severity: overrides.severity ?? 'error',
    message: overrides.message ?? 'Required layer "buildings" is missing.',
    artifact: overrides.artifact ?? { type: 'VectorTile', source: 'tile.pbf' },
    ...(overrides.location !== undefined && { location: overrides.location }),
    ...(overrides.suggestion !== undefined && { suggestion: overrides.suggestion }),
    ...(overrides.docsUrl !== undefined && { docsUrl: overrides.docsUrl }),
    ...(overrides.data !== undefined && { data: overrides.data }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sarifReporter', () => {
  describe('SARIF envelope shape', () => {
    it('produces valid JSON', () => {
      const reporter = createSarifReporter({ write: vi.fn() });
      const write = vi.fn();
      const r = createSarifReporter({ write });
      r.report([], makeContext());
      const [path, content] = write.mock.calls[0]!;
      expect(() => JSON.parse(content as string)).not.toThrow();
      expect(typeof path).toBe('string');
    });

    it('has version "2.1.0"', () => {
      const { log } = captureSarif([]);
      expect(log.version).toBe('2.1.0');
    });

    it('has $schema pointing to SARIF schema', () => {
      const { log } = captureSarif([]);
      expect(log.$schema).toContain('sarif-schema-2.1.0');
    });

    it('has exactly one run', () => {
      const { log } = captureSarif([]);
      expect(log.runs).toHaveLength(1);
    });

    it('tool driver name is "TileGuard"', () => {
      const { log } = captureSarif([]);
      expect(log.runs[0]?.tool.driver.name).toBe('TileGuard');
    });

    it('tool driver version defaults to "0.6.0"', () => {
      const { log } = captureSarif([]);
      expect(log.runs[0]?.tool.driver.version).toBe('0.6.0');
    });

    it('custom toolVersion is embedded in driver', () => {
      let content = '';
      const reporter = createSarifReporter({
        toolVersion: '1.2.3',
        write: (_, c) => { content = c; },
      });
      reporter.report([], makeContext());
      const log = JSON.parse(content) as SarifLog;
      expect(log.runs[0]?.tool.driver.version).toBe('1.2.3');
    });
  });

  describe('output path', () => {
    it('uses default path ./tileguard-results.sarif when not specified', () => {
      const write = vi.fn();
      const reporter = createSarifReporter({ write });
      reporter.report([], makeContext());
      const capturedPath = (write.mock.calls[0] as [string, string])[0];
      expect(capturedPath).toContain('tileguard-results.sarif');
    });

    it('uses custom outputPath when specified', () => {
      const write = vi.fn();
      const reporter = createSarifReporter({ outputPath: 'out/custom.sarif', write });
      reporter.report([], makeContext());
      const capturedPath = (write.mock.calls[0] as [string, string])[0];
      expect(capturedPath).toContain('custom.sarif');
    });
  });

  describe('results mapping', () => {
    it('empty diagnostics produces empty results array', () => {
      const { log } = captureSarif([]);
      expect(log.runs[0]?.results).toHaveLength(0);
    });

    it('maps single diagnostic to one SARIF result', () => {
      const { log } = captureSarif([makeDiagnostic()]);
      expect(log.runs[0]?.results).toHaveLength(1);
    });

    it('maps ruleId correctly', () => {
      const { log } = captureSarif([makeDiagnostic({ ruleId: 'perf/tile-size' })]);
      expect(log.runs[0]?.results[0]?.ruleId).toBe('perf/tile-size');
    });

    it('maps artifact source to physicalLocation uri', () => {
      const { log } = captureSarif([
        makeDiagnostic({ artifact: { type: 'VectorTile', source: 'tiles/city.pbf' } }),
      ]);
      const uri = log.runs[0]?.results[0]?.locations[0]?.physicalLocation.artifactLocation.uri;
      expect(uri).toBe('tiles/city.pbf');
    });

    it('includes message text', () => {
      const { log } = captureSarif([
        makeDiagnostic({ message: 'Tile is too large.' }),
      ]);
      expect(log.runs[0]?.results[0]?.message.text).toContain('Tile is too large.');
    });
  });

  describe('severity → level mapping', () => {
    it('maps "error" → "error"', () => {
      const { log } = captureSarif([makeDiagnostic({ severity: 'error' })]);
      expect(log.runs[0]?.results[0]?.level).toBe('error');
    });

    it('maps "warning" → "warning"', () => {
      const { log } = captureSarif([makeDiagnostic({ severity: 'warning' })]);
      expect(log.runs[0]?.results[0]?.level).toBe('warning');
    });

    it('maps "info" → "note"', () => {
      const { log } = captureSarif([makeDiagnostic({ severity: 'info' })]);
      expect(log.runs[0]?.results[0]?.level).toBe('note');
    });
  });

  describe('location embedding in message', () => {
    it('embeds layer name in message text when location.layer is present', () => {
      const { log } = captureSarif([
        makeDiagnostic({ location: { layer: 'buildings' } }),
      ]);
      expect(log.runs[0]?.results[0]?.message.text).toContain('layer: buildings');
    });

    it('embeds featureIndex in message text when present', () => {
      const { log } = captureSarif([
        makeDiagnostic({ location: { layer: 'roads', featureIndex: 42 } }),
      ]);
      const text = log.runs[0]?.results[0]?.message.text ?? '';
      expect(text).toContain('feature: 42');
    });

    it('does not append location bracket when no location present', () => {
      const { log } = captureSarif([
        makeDiagnostic({ message: 'Clean message.' }),
      ]);
      expect(log.runs[0]?.results[0]?.message.text).toBe('Clean message.');
    });
  });

  describe('suggestion → fixes', () => {
    it('maps suggestion to result.fixes[0].description.text', () => {
      const { log } = captureSarif([
        makeDiagnostic({ suggestion: 'Simplify geometries.' }),
      ]);
      expect(log.runs[0]?.results[0]?.fixes?.[0]?.description.text).toBe(
        'Simplify geometries.',
      );
    });

    it('omits fixes when no suggestion present', () => {
      const { log } = captureSarif([makeDiagnostic()]);
      // Our test diagnostic has no suggestion
      const result = log.runs[0]?.results[0];
      // Either undefined or empty array — both acceptable
      expect(!result?.fixes || result.fixes.length === 0).toBe(true);
    });
  });

  describe('tool.driver.rules deduplication', () => {
    it('populates rules from diagnostics', () => {
      const { log } = captureSarif([
        makeDiagnostic({ ruleId: 'tile/required-layers' }),
      ]);
      expect(log.runs[0]?.tool.driver.rules).toHaveLength(1);
      expect(log.runs[0]?.tool.driver.rules[0]?.id).toBe('tile/required-layers');
    });

    it('deduplicates rules — same ruleId appears only once', () => {
      const { log } = captureSarif([
        makeDiagnostic({ ruleId: 'perf/tile-size' }),
        makeDiagnostic({ ruleId: 'perf/tile-size' }),
        makeDiagnostic({ ruleId: 'perf/tile-size' }),
      ]);
      expect(log.runs[0]?.tool.driver.rules).toHaveLength(1);
    });

    it('includes multiple distinct ruleIds as separate rule entries', () => {
      const { log } = captureSarif([
        makeDiagnostic({ ruleId: 'tile/required-layers' }),
        makeDiagnostic({ ruleId: 'perf/tile-size' }),
        makeDiagnostic({ ruleId: 'tile/required-layers' }),
      ]);
      expect(log.runs[0]?.tool.driver.rules).toHaveLength(2);
      const ids = log.runs[0]?.tool.driver.rules.map((r) => r.id);
      expect(ids).toContain('tile/required-layers');
      expect(ids).toContain('perf/tile-size');
    });

    it('includes helpUri from docsUrl when present', () => {
      const { log } = captureSarif([
        makeDiagnostic({
          ruleId: 'perf/tile-size',
          docsUrl: 'https://tileguard.dev/rules/perf/tile-size',
        }),
      ]);
      expect(log.runs[0]?.tool.driver.rules[0]?.helpUri).toBe(
        'https://tileguard.dev/rules/perf/tile-size',
      );
    });

    it('omits helpUri when docsUrl is absent', () => {
      const { log } = captureSarif([makeDiagnostic()]);
      expect(log.runs[0]?.tool.driver.rules[0]?.helpUri).toBeUndefined();
    });
  });

  describe('multiple diagnostics', () => {
    it('serializes multiple diagnostics in order', () => {
      const { log } = captureSarif([
        makeDiagnostic({ ruleId: 'tile/required-layers', severity: 'error' }),
        makeDiagnostic({ ruleId: 'perf/tile-size', severity: 'warning' }),
        makeDiagnostic({ ruleId: 'tile/no-empty', severity: 'info' }),
      ]);
      const results = log.runs[0]?.results ?? [];
      expect(results).toHaveLength(3);
      expect(results[0]?.ruleId).toBe('tile/required-layers');
      expect(results[1]?.ruleId).toBe('perf/tile-size');
      expect(results[2]?.ruleId).toBe('tile/no-empty');
    });
  });
});
