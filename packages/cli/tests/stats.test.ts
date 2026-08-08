/**
 * Tests for the `stats` command.
 */

import { describe, expect, it, vi } from 'vitest';
import { getDefaultConfig } from '../src/config/ConfigLoader.js';
import { createLogger } from '../src/logging/Logger.js';
import type { CommandContext } from '../src/runner/CommandRunner.js';

// Mock the analysis adapter
vi.mock('../src/analysis/AnalysisAdapter.js', () => ({
  loadTileSnapshot: vi.fn().mockImplementation(async (filePath: string) => ({
    filePath,
    statistics: {
      totalLayers: 3,
      totalFeatures: 50,
      geometryCounts: { point: 0, line: 15, polygon: 35 },
      diagnostics: { errors: 2, warnings: 1, info: 0 },
      layers: [
        {
          name: 'water',
          featureCount: 5,
          geometryCounts: { point: 0, line: 0, polygon: 5 },
          diagnosticCount: 0,
        },
        {
          name: 'roads',
          featureCount: 15,
          geometryCounts: { point: 0, line: 15, polygon: 0 },
          diagnosticCount: 0,
        },
        {
          name: 'buildings',
          featureCount: 30,
          geometryCounts: { point: 0, line: 0, polygon: 30 },
          diagnosticCount: 0,
        },
      ],
    },
    layers: [
      {
        name: 'water',
        featureCount: 5,
        geometryCounts: { point: 0, line: 0, polygon: 5 },
        extent: 4096,
      },
      {
        name: 'roads',
        featureCount: 15,
        geometryCounts: { point: 0, line: 15, polygon: 0 },
        extent: 4096,
      },
      {
        name: 'buildings',
        featureCount: 30,
        geometryCounts: { point: 0, line: 0, polygon: 30 },
        extent: 4096,
      },
    ],
    features: [
      ...Array.from({ length: 5 }, (_, i) => ({
        layerName: 'water',
        featureIndex: i,
        id: i,
        geometryType: 'Polygon',
        properties: {},
        geometry: [Array.from({ length: 20 }, (__, j) => ({ x: j, y: j }))],
      })),
      ...Array.from({ length: 15 }, (_, i) => ({
        layerName: 'roads',
        featureIndex: i,
        id: i + 5,
        geometryType: 'LineString',
        properties: { name: `road_${i}` },
        geometry: [Array.from({ length: 10 }, (__, j) => ({ x: j, y: j }))],
      })),
      ...Array.from({ length: 30 }, (_, i) => ({
        layerName: 'buildings',
        featureIndex: i,
        id: i + 20,
        geometryType: 'Polygon',
        properties: { height: i * 3 },
        geometry: [Array.from({ length: 8 }, (__, j) => ({ x: j, y: j }))],
      })),
    ],
    diagnostics: [
      {
        ruleId: 'tile/self-intersection',
        severity: 'error',
        message: 'Ring intersects',
        location: {},
      },
      {
        ruleId: 'tile/unclosed-ring',
        severity: 'warning',
        message: 'Ring not closed',
        location: {},
      },
      {
        ruleId: 'tile/self-intersection',
        severity: 'error',
        message: 'Another intersection',
        location: {},
      },
    ],
  })),
  getSnapshotStats: vi.fn().mockImplementation(() => ({
    layerCount: 3,
    featureCount: 50,
    vertexCount: 490,
    diagnosticCount: 3,
  })),
}));

import { runStats } from '../src/commands/stats.js';

function makeCtx(): CommandContext {
  return {
    logger: createLogger({ level: 'quiet' }),
    config: getDefaultConfig(),
    cwd: process.cwd(),
  };
}

describe('stats command', () => {
  it('returns exitCode 0', async () => {
    const result = await runStats(
      { file: 'test.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.exitCode).toBe(0);
  });

  it('text output shows layer count', async () => {
    const result = await runStats(
      { file: 'test.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('3');
  });

  it('text output shows feature count', async () => {
    const result = await runStats(
      { file: 'test.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('50');
  });

  it('text output shows vertex count', async () => {
    const result = await runStats(
      { file: 'test.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('490');
  });

  it('text output shows geometry breakdown', async () => {
    const result = await runStats(
      { file: 'test.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('Points');
    expect(result.output).toContain('Lines');
    expect(result.output).toContain('Polygons');
  });

  it('text output shows diagnostic severity counts', async () => {
    const result = await runStats(
      { file: 'test.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('Errors');
    expect(result.output).toContain('Warnings');
  });

  it('text output shows layer details table', async () => {
    const result = await runStats(
      { file: 'test.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('water');
    expect(result.output).toContain('roads');
    expect(result.output).toContain('buildings');
  });

  it('text output shows rule summary', async () => {
    const result = await runStats(
      { file: 'test.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('tile/self-intersection');
    expect(result.output).toContain('tile/unclosed-ring');
  });

  it('json format returns valid JSON', async () => {
    const result = await runStats(
      { file: 'test.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.layers).toBe(3);
    expect(parsed.features).toBe(50);
    expect(parsed.vertices).toBe(490);
  });

  it('json output includes geometry counts', async () => {
    const result = await runStats(
      { file: 'test.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.geometry.polygon).toBe(35);
    expect(parsed.geometry.line).toBe(15);
    expect(parsed.geometry.point).toBe(0);
  });

  it('json output includes layerDetails', async () => {
    const result = await runStats(
      { file: 'test.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.layerDetails).toHaveLength(3);
    expect(parsed.layerDetails[0].name).toBe('water');
    expect(parsed.layerDetails[1].features).toBe(15);
  });

  it('json output includes severity breakdown', async () => {
    const result = await runStats(
      { file: 'test.pbf', format: 'json' },
      makeCtx(),
    );
    const parsed = JSON.parse(result.output!);
    expect(parsed.severity.errors).toBe(2);
    expect(parsed.severity.warnings).toBe(1);
    expect(parsed.severity.info).toBe(0);
  });

  it('text output contains file name', async () => {
    const result = await runStats(
      { file: 'my-tile.pbf', format: 'text' },
      makeCtx(),
    );
    expect(result.output).toContain('my-tile.pbf');
  });
});
