/**
 * Tests for the `compare` command.
 */

import { describe, expect, it, vi } from 'vitest';
import { getDefaultConfig } from '../src/config/ConfigLoader.js';
import { createLogger } from '../src/logging/Logger.js';
import type { CommandContext } from '../src/runner/CommandRunner.js';

// Mock the analysis adapter
vi.mock('../src/analysis/AnalysisAdapter.js', () => ({
  loadTileSnapshot: vi.fn().mockImplementation(async (filePath: string) => ({
    filePath,
    layers: [{ name: 'roads', featureCount: 10, extent: 4096 }],
    features: Array.from({ length: 10 }, (_, i) => ({
      layerName: 'roads',
      featureIndex: i,
      id: i,
      geometryType: 'LineString',
      properties: { name: `road_${i}` },
      vertexCount: 5,
    })),
    diagnostics: [],
    stats: {
      layerCount: 1,
      featureCount: 10,
      vertexCount: 50,
      diagnosticCount: 0,
    },
  })),
  compareTiles: vi.fn().mockImplementation((a, b) => ({
    snapshotA: a,
    snapshotB: b,
    isIdentical: false,
    features: { added: 2, removed: 1, modified: 3, unchanged: 4 },
    layers: { added: 0, removed: 0, modified: 1 },
    asReportInput: {
      sourceTile: 'before.pbf',
      targetTile: 'after.pbf',
      isIdentical: false,
      features: { added: 2, removed: 1, modified: 3, unchanged: 4 },
      layers: { added: 0, removed: 0, modified: 1 },
      diagnosticsA: { errors: 0, warnings: 0, info: 0 },
      diagnosticsB: { errors: 0, warnings: 0, info: 0 },
      newDiagnostics: [],
      resolvedDiagnostics: [],
      stats: {
        layersA: 1,
        layersB: 1,
        featuresA: 10,
        featuresB: 11,
        verticesA: 50,
        verticesB: 55,
        diagnosticsA: 0,
        diagnosticsB: 0,
      },
    },
  })),
}));

import { runCompare } from '../src/commands/compare.js';

function makeCtx(): CommandContext {
  return {
    logger: createLogger({ level: 'quiet' }),
    config: getDefaultConfig(),
    cwd: process.cwd(),
  };
}

describe('compare command', () => {
  it('returns a CliCommandResult', async () => {
    const result = await runCompare(
      { before: 'before.pbf', after: 'after.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.exitCode).toBeDefined();
    expect(result.output).toBeDefined();
  });

  it('text output contains feature change counts', async () => {
    const result = await runCompare(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('Added');
    expect(result.output).toContain('2');
    expect(result.output).toContain('Removed');
    expect(result.output).toContain('Modified');
  });

  it('text output contains layer changes', async () => {
    const result = await runCompare(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('Layer Changes');
  });

  it('text output shows CHANGED status when not identical', async () => {
    const result = await runCompare(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('CHANGED');
  });

  it('returns exitCode 1 when tiles differ', async () => {
    const result = await runCompare(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.exitCode).toBe(1);
  });

  it('json format returns valid JSON', async () => {
    const result = await runCompare(
      { before: 'a.pbf', after: 'b.pbf', format: 'json' },
      makeCtx(),
    );
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.output!);
    expect(parsed.features).toBeDefined();
    expect(parsed.features.added).toBe(2);
  });

  it('json output includes stats', async () => {
    const result = await runCompare(
      { before: 'a.pbf', after: 'b.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.stats).toBeDefined();
    expect(parsed.stats.featuresA).toBe(10);
    expect(parsed.stats.featuresB).toBe(11);
  });

  it('json output includes isIdentical field', async () => {
    const result = await runCompare(
      { before: 'a.pbf', after: 'b.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.isIdentical).toBe(false);
  });

  it('json output includes layers', async () => {
    const result = await runCompare(
      { before: 'a.pbf', after: 'b.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.layers.modified).toBe(1);
  });

  it('text output includes statistics delta', async () => {
    const result = await runCompare(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('Statistics Delta');
    expect(result.output).toContain('+5');
  });

  it('text output heading says TileGuard Comparison', async () => {
    const result = await runCompare(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('TileGuard Comparison');
  });

  it('text output shows both file names', async () => {
    const result = await runCompare(
      { before: 'a.pbf', after: 'b.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('a.pbf');
    expect(result.output).toContain('b.pbf');
  });
});
