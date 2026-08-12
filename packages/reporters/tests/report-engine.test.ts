/**
 * Unit tests for the Engineering Report subsystem:
 *   - ReportEngine
 *   - MarkdownReporter (renderMarkdown)
 *   - HtmlReporter (renderHtml)
 *   - JsonReporter (renderJson)
 *   - ReporterRegistry
 */

import { describe, expect, it } from 'vitest';
import type {
  ComparisonInput,
  EngineeringReport,
  FormatRenderer,
  RegressionInput,
} from '../src/report/index.js';
import {
  createReportEngine,
  createReporterRegistry,
  renderHtml,
  renderJson,
  renderMarkdown,
} from '../src/report/index.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeComparisonInput(
  overrides: Partial<ComparisonInput> = {},
): ComparisonInput {
  return {
    sourceTile: 'before.pbf',
    targetTile: 'after.pbf',
    isIdentical: false,
    features: { added: 2, removed: 1, modified: 3, unchanged: 10 },
    layers: { added: 1, removed: 0, modified: 1 },
    diagnosticsA: { errors: 1, warnings: 2, info: 0 },
    diagnosticsB: { errors: 2, warnings: 1, info: 1 },
    newDiagnostics: [
      {
        ruleId: 'tile/self-intersection',
        severity: 'error',
        message: 'Ring self-intersects at vertex 5',
      },
    ],
    resolvedDiagnostics: [
      {
        ruleId: 'tile/no-empty',
        severity: 'warning',
        message: 'Empty tile detected',
      },
    ],
    stats: {
      layersA: 3,
      layersB: 4,
      featuresA: 100,
      featuresB: 105,
      verticesA: 2000,
      verticesB: 2100,
      diagnosticsA: 3,
      diagnosticsB: 4,
    },
    ...overrides,
  };
}

function makeRegressionInput(
  overrides: Partial<RegressionInput> = {},
): RegressionInput {
  return {
    isClean: false,
    totalFeatures: 16,
    totalCandidates: 2,
    overallConfidence: 0.78,
    dominantKind: 'geometry-shift',
    candidates: [
      {
        layerName: 'roads',
        featureId: 42,
        confidence: 0.92,
        kind: 'geometry-shift',
        topReason: 'Centroid moved >50px',
        evidenceLabels: ['Centroid shift: 63px', 'Vertex count changed: 12→8'],
        timelineLabels: ['Feature simplified', 'Boundary shifted west'],
        recommendations: ['Review geometry simplification settings'],
      },
      {
        layerName: 'buildings',
        featureId: undefined,
        confidence: 0.65,
        kind: 'property-change',
        topReason: 'Key property removed',
        evidenceLabels: ['Property "height" removed'],
        timelineLabels: ['Property schema changed'],
        recommendations: ['Check upstream data pipeline'],
      },
    ],
    ...overrides,
  };
}

function makeReport(): EngineeringReport {
  const engine = createReportEngine({ tileguardVersion: '1.0.0-test' });
  const result = engine.generate(
    makeComparisonInput(),
    makeRegressionInput(),
    'json',
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.value.report;
}

// ---------------------------------------------------------------------------
// ReporterRegistry
// ---------------------------------------------------------------------------

describe('ReporterRegistry', () => {
  it('ships with markdown, html, json built-in', () => {
    const registry = createReporterRegistry();
    expect(registry.has('markdown')).toBe(true);
    expect(registry.has('html')).toBe(true);
    expect(registry.has('json')).toBe(true);
  });

  it('formats() returns all registered format names', () => {
    const registry = createReporterRegistry();
    const fmts = registry.formats();
    expect(fmts).toContain('markdown');
    expect(fmts).toContain('html');
    expect(fmts).toContain('json');
    expect(fmts.length).toBe(3);
  });

  it('resolve() returns a render function for known formats', () => {
    const registry = createReporterRegistry();
    expect(typeof registry.resolve('markdown')).toBe('function');
    expect(typeof registry.resolve('html')).toBe('function');
    expect(typeof registry.resolve('json')).toBe('function');
  });

  it('resolve() returns undefined for unknown formats', () => {
    const registry = createReporterRegistry();
    expect(registry.resolve('xml')).toBeUndefined();
    expect(registry.resolve('')).toBeUndefined();
  });

  it('register() adds a new format', () => {
    const registry = createReporterRegistry();
    const custom: FormatRenderer = () => 'custom output';
    registry.register('custom', custom);
    expect(registry.has('custom')).toBe(true);
    expect(registry.resolve('custom')).toBe(custom);
    expect(registry.formats()).toContain('custom');
  });

  it('register() overwrites an existing format', () => {
    const registry = createReporterRegistry();
    const override: FormatRenderer = () => 'overridden';
    registry.register('json', override);
    expect(registry.resolve('json')).toBe(override);
  });
});

// ---------------------------------------------------------------------------
// ReportEngine
// ---------------------------------------------------------------------------

describe('ReportEngine', () => {
  it('returns ok result with valid inputs for markdown', () => {
    const engine = createReportEngine({ tileguardVersion: '0.5.0' });
    const result = engine.generate(
      makeComparisonInput(),
      makeRegressionInput(),
      'markdown',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.format).toBe('markdown');
      expect(result.value.content.length).toBeGreaterThan(0);
      expect(result.value.report.metadata.tileguardVersion).toBe('0.5.0');
    }
  });

  it('returns ok result with valid inputs for html', () => {
    const engine = createReportEngine();
    const result = engine.generate(
      makeComparisonInput(),
      makeRegressionInput(),
      'html',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.format).toBe('html');
      expect(result.value.content).toContain('<html');
    }
  });

  it('returns ok result with valid inputs for json', () => {
    const engine = createReportEngine();
    const result = engine.generate(
      makeComparisonInput(),
      makeRegressionInput(),
      'json',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.format).toBe('json');
      const parsed = JSON.parse(result.value.content);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.overview).toBeDefined();
    }
  });

  it('returns MISSING_COMPARISON when comparison is null', () => {
    const engine = createReportEngine();
    const result = engine.generate(
      null as any,
      makeRegressionInput(),
      'markdown',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MISSING_COMPARISON');
    }
  });

  it('returns MISSING_REGRESSION when regression is null', () => {
    const engine = createReportEngine();
    const result = engine.generate(
      makeComparisonInput(),
      null as any,
      'markdown',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MISSING_REGRESSION');
    }
  });

  it('returns UNSUPPORTED_FORMAT for unknown format', () => {
    const engine = createReportEngine();
    const result = engine.generate(
      makeComparisonInput(),
      makeRegressionInput(),
      'xml',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNSUPPORTED_FORMAT');
      expect(result.error.message).toContain('xml');
    }
  });

  it('uses custom registry if provided in options', () => {
    const registry = createReporterRegistry();
    registry.register('custom', () => 'CUSTOM_OUTPUT');
    const engine = createReportEngine({ registry });
    const result = engine.generate(
      makeComparisonInput(),
      makeRegressionInput(),
      'custom',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.content).toBe('CUSTOM_OUTPUT');
    }
  });

  it('returns SERIALIZATION_ERROR if renderer throws', () => {
    const registry = createReporterRegistry();
    registry.register('broken', () => {
      throw new Error('renderer exploded');
    });
    const engine = createReportEngine({ registry });
    const result = engine.generate(
      makeComparisonInput(),
      makeRegressionInput(),
      'broken',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SERIALIZATION_ERROR');
      expect(result.error.message).toContain('renderer exploded');
    }
  });

  it('populates report metadata correctly', () => {
    const engine = createReportEngine({
      tileguardVersion: '1.2.3',
      totalDurationMs: 999,
    });
    const result = engine.generate(
      makeComparisonInput(),
      makeRegressionInput(),
      'json',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const { metadata } = result.value.report;
      expect(metadata.tileguardVersion).toBe('1.2.3');
      expect(metadata.totalDurationMs).toBe(999);
      expect(metadata.sourceTile).toBe('before.pbf');
      expect(metadata.targetTile).toBe('after.pbf');
      expect(metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('builds overview section from inputs', () => {
    const engine = createReportEngine();
    const result = engine.generate(
      makeComparisonInput(),
      makeRegressionInput(),
      'json',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const { overview } = result.value.report;
      expect(overview.sourceTile).toBe('before.pbf');
      expect(overview.targetTile).toBe('after.pbf');
      expect(overview.isIdentical).toBe(false);
      expect(overview.totalCandidates).toBe(2);
      expect(overview.overallConfidence).toBe(0.78);
      expect(overview.dominantKind).toBe('geometry-shift');
    }
  });

  it('aggregates recommendations from candidates', () => {
    const engine = createReportEngine();
    const result = engine.generate(
      makeComparisonInput(),
      makeRegressionInput(),
      'json',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const recs = result.value.report.recommendations.items;
      expect(recs).toContain('Review geometry simplification settings');
      expect(recs).toContain('Check upstream data pipeline');
    }
  });

  it('handles clean regression (no candidates)', () => {
    const engine = createReportEngine();
    const regression = makeRegressionInput({
      isClean: true,
      totalCandidates: 0,
      candidates: [],
    });
    const result = engine.generate(
      makeComparisonInput(),
      regression,
      'markdown',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.report.regression.isClean).toBe(true);
      expect(result.value.report.regression.candidates).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// MarkdownReporter (renderMarkdown)
// ---------------------------------------------------------------------------

describe('renderMarkdown', () => {
  it('returns a non-empty string', () => {
    const report = makeReport();
    const md = renderMarkdown(report);
    expect(md.length).toBeGreaterThan(0);
  });

  it('starts with a top-level heading', () => {
    const report = makeReport();
    const md = renderMarkdown(report);
    expect(md).toMatch(/^# TileGuard Engineering Report/);
  });

  it('contains source and target tile names', () => {
    const report = makeReport();
    const md = renderMarkdown(report);
    expect(md).toContain('before.pbf');
    expect(md).toContain('after.pbf');
  });

  it('includes section headings for all major sections', () => {
    const report = makeReport();
    const md = renderMarkdown(report);
    expect(md).toContain('## Overview');
    expect(md).toContain('## Comparison');
    expect(md).toContain('## Regression Analysis');
    expect(md).toContain('## Diagnostics');
    expect(md).toContain('## Statistics');
    expect(md).toContain('## Recommendations');
  });

  it('renders regression candidates with confidence', () => {
    const report = makeReport();
    const md = renderMarkdown(report);
    expect(md).toContain('roads');
    expect(md).toContain('92%');
    expect(md).toContain('geometry-shift');
  });

  it('renders new diagnostics', () => {
    const report = makeReport();
    const md = renderMarkdown(report);
    expect(md).toContain('tile/self-intersection');
    expect(md).toContain('Ring self-intersects');
  });

  it('renders clean regression without candidate sections', () => {
    const engine = createReportEngine({ tileguardVersion: '1.0.0' });
    const regression = makeRegressionInput({
      isClean: true,
      totalCandidates: 0,
      candidates: [],
    });
    const result = engine.generate(
      makeComparisonInput(),
      regression,
      'markdown',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const md = result.value.content;
      expect(md).toContain('CLEAN');
      expect(md).not.toContain('Candidate 1');
    }
  });

  it('contains recommendations from candidates', () => {
    const report = makeReport();
    const md = renderMarkdown(report);
    expect(md).toContain('Review geometry simplification settings');
    expect(md).toContain('Check upstream data pipeline');
  });

  it('includes the TileGuard footer', () => {
    const report = makeReport();
    const md = renderMarkdown(report);
    expect(md).toContain('TileGuard');
    expect(md).toContain('github.com');
  });
});

// ---------------------------------------------------------------------------
// HtmlReporter (renderHtml)
// ---------------------------------------------------------------------------

describe('renderHtml', () => {
  it('returns a valid HTML document', () => {
    const report = makeReport();
    const html = renderHtml(report);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('sets the page title', () => {
    const report = makeReport();
    const html = renderHtml(report);
    expect(html).toContain('<title>TileGuard Engineering Report</title>');
  });

  it('includes source and target tile names', () => {
    const report = makeReport();
    const html = renderHtml(report);
    expect(html).toContain('before.pbf');
    expect(html).toContain('after.pbf');
  });

  it('contains section IDs for overview, comparison, regression', () => {
    const report = makeReport();
    const html = renderHtml(report);
    expect(html).toContain('id="overview"');
    expect(html).toContain('id="comparison"');
    expect(html).toContain('id="regression"');
    expect(html).toContain('id="diagnostics"');
    expect(html).toContain('id="statistics"');
    expect(html).toContain('id="recommendations"');
  });

  it('renders regression candidates', () => {
    const report = makeReport();
    const html = renderHtml(report);
    expect(html).toContain('roads');
    expect(html).toContain('92%');
    expect(html).toContain('geometry-shift');
  });

  it('renders new diagnostics in a table', () => {
    const report = makeReport();
    const html = renderHtml(report);
    expect(html).toContain('tile/self-intersection');
    expect(html).toContain('Ring self-intersects');
  });

  it('renders clean regression with CLEAN badge', () => {
    const engine = createReportEngine({ tileguardVersion: '1.0.0' });
    const regression = makeRegressionInput({
      isClean: true,
      totalCandidates: 0,
      candidates: [],
    });
    const result = engine.generate(makeComparisonInput(), regression, 'html');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const html = result.value.content;
      expect(html).toContain('CLEAN');
    }
  });

  it('embeds CSS (self-contained)', () => {
    const report = makeReport();
    const html = renderHtml(report);
    expect(html).toContain('<style');
  });

  it('escapes user-controlled text to prevent XSS', () => {
    const comparison = makeComparisonInput({
      sourceTile: '<script>alert("xss")</script>',
    });
    const engine = createReportEngine();
    const result = engine.generate(comparison, makeRegressionInput(), 'html');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.content).not.toContain('<script>alert');
      expect(result.value.content).toContain('&lt;script&gt;');
    }
  });
});

// ---------------------------------------------------------------------------
// JsonReporter (renderJson)
// ---------------------------------------------------------------------------

describe('renderJson', () => {
  it('produces valid JSON', () => {
    const report = makeReport();
    const json = renderJson(report);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('preserves all top-level report sections', () => {
    const report = makeReport();
    const parsed = JSON.parse(renderJson(report));
    expect(parsed.metadata).toBeDefined();
    expect(parsed.overview).toBeDefined();
    expect(parsed.comparison).toBeDefined();
    expect(parsed.regression).toBeDefined();
    expect(parsed.statistics).toBeDefined();
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.recommendations).toBeDefined();
  });

  it('metadata contains expected fields', () => {
    const report = makeReport();
    const parsed = JSON.parse(renderJson(report));
    expect(parsed.metadata.tileguardVersion).toBe('1.0.0-test');
    expect(parsed.metadata.sourceTile).toBe('before.pbf');
    expect(parsed.metadata.targetTile).toBe('after.pbf');
    expect(typeof parsed.metadata.generatedAt).toBe('string');
  });

  it('comparison section faithfully represents input', () => {
    const report = makeReport();
    const parsed = JSON.parse(renderJson(report));
    expect(parsed.comparison.features.added).toBe(2);
    expect(parsed.comparison.features.removed).toBe(1);
    expect(parsed.comparison.layers.added).toBe(1);
    expect(parsed.comparison.isIdentical).toBe(false);
  });

  it('regression section faithfully represents input', () => {
    const report = makeReport();
    const parsed = JSON.parse(renderJson(report));
    expect(parsed.regression.isClean).toBe(false);
    expect(parsed.regression.totalCandidates).toBe(2);
    expect(parsed.regression.candidates[0].layerName).toBe('roads');
    expect(parsed.regression.candidates[0].confidence).toBe(0.92);
  });

  it('uses indentation by default', () => {
    const report = makeReport();
    const json = renderJson(report);
    // Default indent = 2 spaces → multi-line output
    expect(json).toContain('\n');
    expect(json.split('\n').length).toBeGreaterThan(10);
  });

  it('supports compact output with indent 0', () => {
    const report = makeReport();
    const json = renderJson(report, { indent: 0 });
    // Compact → single line (no newlines from indentation)
    expect(json.split('\n').length).toBe(1);
  });

  it('handles identical comparison', () => {
    const comparison = makeComparisonInput({ isIdentical: true });
    const engine = createReportEngine();
    const result = engine.generate(comparison, makeRegressionInput(), 'json');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = JSON.parse(result.value.content);
      expect(parsed.overview.isIdentical).toBe(true);
    }
  });
});
