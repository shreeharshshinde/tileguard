/**
 * Tests for the `analyze` command.
 */

import { describe, expect, it, vi } from 'vitest';
import { getDefaultConfig } from '../src/config/ConfigLoader.js';
import { createLogger } from '../src/logging/Logger.js';
import type { CommandContext } from '../src/runner/CommandRunner.js';

// Mock the analysis adapter
vi.mock('../src/analysis/AnalysisAdapter.js', () => ({
  loadTileSnapshot: vi.fn().mockImplementation(async (filePath: string) => ({
    filePath,
    layers: [{ name: 'buildings', featureCount: 20, extent: 4096 }],
    features: Array.from({ length: 20 }, (_, i) => ({
      layerName: 'buildings',
      featureIndex: i,
      id: i,
      geometryType: 'Polygon',
      properties: { height: 10 + i },
      vertexCount: 8,
    })),
    diagnostics: [],
    stats: {
      layerCount: 1,
      featureCount: 20,
      vertexCount: 160,
      diagnosticCount: 0,
    },
  })),
  compareTiles: vi.fn().mockImplementation((a, b) => ({
    snapshotA: a,
    snapshotB: b,
    isIdentical: false,
    features: { added: 1, removed: 0, modified: 5, unchanged: 14 },
    layers: { added: 0, removed: 0, modified: 1 },
    asReportInput: {
      sourceTile: 'before.pbf',
      targetTile: 'after.pbf',
      isIdentical: false,
      features: { added: 1, removed: 0, modified: 5, unchanged: 14 },
      layers: { added: 0, removed: 0, modified: 1 },
      diagnosticsA: { errors: 0, warnings: 0, info: 0 },
      diagnosticsB: { errors: 1, warnings: 0, info: 0 },
      newDiagnostics: [
        {
          ruleId: 'tile/self-intersection',
          severity: 'error',
          message: 'Self-intersecting ring',
        },
      ],
      resolvedDiagnostics: [],
      stats: {
        layersA: 1,
        layersB: 1,
        featuresA: 20,
        featuresB: 21,
        verticesA: 160,
        verticesB: 168,
        diagnosticsA: 0,
        diagnosticsB: 1,
      },
    },
  })),
  analyzeRegression: vi.fn().mockImplementation(() => ({
    isClean: false,
    totalCandidates: 2,
    overallConfidence: 0.85,
    dominantKind: 'geometry-shift',
    candidates: [
      {
        layerName: 'buildings',
        featureId: 3,
        kind: 'geometry-shift',
        confidence: 0.92,
        reason: 'Vertex count changed: 8→5',
        evidence: ['Vertex count changed: 8→5', 'Shape simplified'],
      },
      {
        layerName: 'buildings',
        featureId: undefined,
        kind: 'diagnostic-regression',
        confidence: 0.78,
        reason: '1 new diagnostic(s) introduced',
        evidence: ['tile/self-intersection: Self-intersecting ring'],
      },
    ],
    asReportInput: {
      isClean: false,
      totalFeatures: 40,
      totalCandidates: 2,
      overallConfidence: 0.85,
      dominantKind: 'geometry-shift',
      candidates: [],
    },
  })),
}));

import { runAnalyze } from '../src/commands/analyze.js';

function makeCtx(): CommandContext {
  return {
    logger: createLogger({ level: 'quiet' }),
    config: getDefaultConfig(),
    cwd: process.cwd(),
  };
}

describe('analyze command', () => {
  it('returns a result with exitCode', async () => {
    const result = await runAnalyze(
      { before: 'before.pbf', after: 'after.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.exitCode).toBeDefined();
  });

  it('returns exitCode 2 when regressions found', async () => {
    const result = await runAnalyze(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.exitCode).toBe(2);
  });

  it('text output includes comparison status', async () => {
    const result = await runAnalyze(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('CHANGED');
  });

  it('text output includes regression analysis section', async () => {
    const result = await runAnalyze(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('Regression Analysis');
  });

  it('text output shows candidate count', async () => {
    const result = await runAnalyze(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('2');
  });

  it('text output shows overall confidence', async () => {
    const result = await runAnalyze(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('85%');
  });

  it('text output shows dominant kind', async () => {
    const result = await runAnalyze(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('geometry-shift');
  });

  it('text output includes regression candidates section', async () => {
    const result = await runAnalyze(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('Regression Candidates');
    expect(result.output).toContain('buildings');
  });

  it('json format returns valid JSON', async () => {
    const result = await runAnalyze(
      { before: 'a.pbf', after: 'b.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.comparison).toBeDefined();
    expect(parsed.regression).toBeDefined();
  });

  it('json output includes comparison section', async () => {
    const result = await runAnalyze(
      { before: 'a.pbf', after: 'b.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.comparison.features.modified).toBe(5);
  });

  it('json output includes regression section', async () => {
    const result = await runAnalyze(
      { before: 'a.pbf', after: 'b.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.regression.totalCandidates).toBe(2);
    expect(parsed.regression.overallConfidence).toBe(0.85);
  });

  it('json output includes candidate details', async () => {
    const result = await runAnalyze(
      { before: 'a.pbf', after: 'b.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.regression.candidates).toHaveLength(2);
    expect(parsed.regression.candidates[0].kind).toBe('geometry-shift');
    expect(parsed.regression.candidates[0].confidence).toBe(0.92);
  });
});
