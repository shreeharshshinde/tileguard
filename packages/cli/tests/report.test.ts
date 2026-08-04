/**
 * Tests for the `report` command.
 */

import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/logging/Logger.js';
import { getDefaultConfig } from '../src/config/ConfigLoader.js';
import type { CommandContext } from '../src/runner/CommandRunner.js';

// Mock the analysis adapter
vi.mock('../src/analysis/AnalysisAdapter.js', () => ({
  loadTileSnapshot: vi.fn().mockImplementation(async (filePath: string) => ({
    filePath,
    layers: [{ name: 'roads', featureCount: 10, extent: 4096 }],
    features: Array.from({ length: 10 }, (_, i) => ({
      layerName: 'roads', featureIndex: i, id: i,
      geometryType: 'LineString', properties: { name: `road_${i}` }, vertexCount: 5,
    })),
    diagnostics: [],
    stats: { layerCount: 1, featureCount: 10, vertexCount: 50, diagnosticCount: 0 },
  })),
  compareTiles: vi.fn().mockImplementation((a, b) => ({
    snapshotA: a,
    snapshotB: b,
    isIdentical: false,
    features: { added: 1, removed: 0, modified: 2, unchanged: 7 },
    layers: { added: 0, removed: 0, modified: 0 },
    asReportInput: {
      sourceTile: 'before.pbf',
      targetTile: 'after.pbf',
      isIdentical: false,
      features: { added: 1, removed: 0, modified: 2, unchanged: 7 },
      layers: { added: 0, removed: 0, modified: 0 },
      diagnosticsA: { errors: 0, warnings: 0, info: 0 },
      diagnosticsB: { errors: 0, warnings: 0, info: 0 },
      newDiagnostics: [],
      resolvedDiagnostics: [],
      stats: {
        layersA: 1, layersB: 1,
        featuresA: 10, featuresB: 11,
        verticesA: 50, verticesB: 55,
        diagnosticsA: 0, diagnosticsB: 0,
      },
    },
  })),
  analyzeRegression: vi.fn().mockImplementation(() => ({
    isClean: true,
    totalCandidates: 0,
    overallConfidence: 0,
    dominantKind: null,
    candidates: [],
    asReportInput: {
      isClean: true,
      totalFeatures: 20,
      totalCandidates: 0,
      overallConfidence: 0,
      dominantKind: null,
      candidates: [],
    },
  })),
}));

// Mock fs.writeFileSync to avoid writing files during tests
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    writeFileSync: vi.fn(),
  };
});

import { runReport } from '../src/commands/report.js';

function makeCtx(): CommandContext {
  return {
    logger: createLogger({ level: 'quiet' }),
    config: getDefaultConfig(),
    cwd: process.cwd(),
  };
}

describe('report command', () => {
  it('returns exitCode 0 when regression is clean', async () => {
    const result = await runReport(
      { before: 'a.pbf', after: 'b.pbf', format: 'markdown' },
      makeCtx(),
    );
    expect(result.exitCode).toBe(0);
  });

  it('generates markdown by default', async () => {
    const result = await runReport(
      { before: 'a.pbf', after: 'b.pbf', format: 'markdown' },
      makeCtx(),
    );
    expect(result.output).toContain('# TileGuard Engineering Report');
  });

  it('markdown output contains overview section', async () => {
    const result = await runReport(
      { before: 'a.pbf', after: 'b.pbf', format: 'markdown' },
      makeCtx(),
    );
    expect(result.output).toContain('## Overview');
  });

  it('markdown output contains comparison section', async () => {
    const result = await runReport(
      { before: 'a.pbf', after: 'b.pbf', format: 'markdown' },
      makeCtx(),
    );
    expect(result.output).toContain('## Comparison');
  });

  it('markdown output contains regression section', async () => {
    const result = await runReport(
      { before: 'a.pbf', after: 'b.pbf', format: 'markdown' },
      makeCtx(),
    );
    expect(result.output).toContain('## Regression Analysis');
  });

  it('html format produces HTML document', async () => {
    const result = await runReport(
      { before: 'a.pbf', after: 'b.pbf', format: 'html' },
      makeCtx(),
    );
    expect(result.output).toContain('<!DOCTYPE html>');
    expect(result.output).toContain('</html>');
  });

  it('json format produces valid JSON', async () => {
    const result = await runReport(
      { before: 'a.pbf', after: 'b.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.metadata).toBeDefined();
    expect(parsed.overview).toBeDefined();
    expect(parsed.comparison).toBeDefined();
  });

  it('json report contains metadata with tileguard version', async () => {
    const result = await runReport(
      { before: 'a.pbf', after: 'b.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.metadata.tileguardVersion).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('json report shows regression as clean', async () => {
    const result = await runReport(
      { before: 'a.pbf', after: 'b.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.regression.isClean).toBe(true);
  });

  it('writes to file when --output is provided', async () => {
    const { writeFileSync } = await import('node:fs');
    const result = await runReport(
      { before: 'a.pbf', after: 'b.pbf', format: 'markdown', output: '/tmp/report.md' },
      makeCtx(),
    );
    expect(writeFileSync).toHaveBeenCalled();
    expect(result.message).toContain('report.md');
  });

  it('output not written to stdout when --output is provided', async () => {
    const result = await runReport(
      { before: 'a.pbf', after: 'b.pbf', format: 'markdown', output: '/tmp/report.md' },
      makeCtx(),
    );
    expect(result.output).toBeUndefined();
  });

  it('markdown output references source files', async () => {
    const result = await runReport(
      { before: 'a.pbf', after: 'b.pbf', format: 'markdown' },
      makeCtx(),
    );
    expect(result.output).toContain('before.pbf');
    expect(result.output).toContain('after.pbf');
  });
});
