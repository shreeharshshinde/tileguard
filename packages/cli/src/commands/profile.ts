/**
 * @tileguard/cli — `profile` command
 *
 * Decodes a vector tile and prints a performance cost breakdown:
 * raw/gzip size, layer count, feature count, total vertices, per-layer
 * vertex distribution, and actionable performance warnings.
 *
 * This is a read-only, zero-rule analysis command. It does NOT invoke the
 * rule engine — it directly uses the tile provider to load the tile and
 * computes profiling statistics from the decoded content.
 *
 * Usage:
 *   tileguard profile <file> [--json] [--top-n <n>]
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { decodeMvt } from '@tileguard/tile-rules';
import type { VectorTileFeature } from '@tileguard/tile-rules';
import type { OutputFormat } from '../output/OutputFormatter.js';
import { createOutputFormatter } from '../output/OutputFormatter.js';
import type { CliCommandResult, CommandContext } from '../runner/CommandRunner.js';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

export interface ProfileArgs {
  readonly file: string;
  readonly format: OutputFormat;
  /** Show top N layers by vertex count (default: 5). */
  readonly topN: number;
}

// ---------------------------------------------------------------------------
// Internal profiling model
// ---------------------------------------------------------------------------

interface LayerProfile {
  readonly name: string;
  readonly features: number;
  readonly vertices: number;
  readonly vertexFraction: number;
  readonly estimatedBytes: number;
}

interface WorstFeature {
  readonly layer: string;
  readonly featureIndex: number;
  readonly vertexCount: number;
}

interface TileProfile {
  readonly file: string;
  readonly bytes: number;
  readonly gzipBytes: number | null;
  readonly gzipped: boolean;
  readonly layerCount: number;
  readonly totalFeatures: number;
  readonly totalVertices: number;
  readonly layers: readonly LayerProfile[];
  readonly worstFeature: WorstFeature | null;
}

// ---------------------------------------------------------------------------
// Vertex counter
// ---------------------------------------------------------------------------

function countFeatureVertices(feature: VectorTileFeature): number {
  const geometry = feature.geometry;
  if (feature.type === 1) {
    return (geometry as { x: number; y: number }[]).length;
  }
  const rings = geometry as { x: number; y: number }[][];
  let total = 0;
  for (const ring of rings) {
    total += ring.length;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Profile builder
// ---------------------------------------------------------------------------

function buildProfile(filePath: string, topN: number): TileProfile {
  const rawBuffer = readFileSync(filePath);
  const rawBytes = new Uint8Array(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.byteLength);

  const gzipped = rawBytes.length >= 2 && rawBytes[0] === 0x1f && rawBytes[1] === 0x8b;
  const bytes = gzipped ? gunzipSync(rawBytes) : rawBytes;
  const gzipBytes = gzipped ? rawBytes.length : null;

  const tile = decodeMvt(bytes);

  // Per-layer stats
  let totalVertices = 0;
  let totalFeatures = 0;
  const layerStats: { name: string; features: number; vertices: number }[] = [];
  let worst: WorstFeature | null = null;

  for (const [layerName, layer] of Object.entries(tile.layers)) {
    let layerVertices = 0;
    for (let i = 0; i < layer.features.length; i++) {
      const feature = layer.features[i]!;
      const v = countFeatureVertices(feature as unknown as VectorTileFeature);
      layerVertices += v;
      if (worst === null || v > worst.vertexCount) {
        worst = { layer: layerName, featureIndex: i, vertexCount: v };
      }
    }
    layerStats.push({ name: layerName, features: layer.features.length, vertices: layerVertices });
    totalVertices += layerVertices;
    totalFeatures += layer.features.length;
  }

  // Sort by vertices descending, take topN
  layerStats.sort((a, b) => b.vertices - a.vertices);
  const topLayers = layerStats.slice(0, topN);

  const layers: LayerProfile[] = topLayers.map((l) => {
    const fraction = totalVertices > 0 ? l.vertices / totalVertices : 0;
    const estimatedBytes = Math.round(bytes.length * fraction);
    return {
      name: l.name,
      features: l.features,
      vertices: l.vertices,
      vertexFraction: Math.round(fraction * 1000) / 1000,
      estimatedBytes,
    };
  });

  return {
    file: filePath,
    bytes: bytes.length,
    gzipBytes,
    gzipped,
    layerCount: Object.keys(tile.layers).length,
    totalFeatures,
    totalVertices,
    layers,
    worstFeature: worst,
  };
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function formatTextOutput(profile: TileProfile): string {
  const fmt = createOutputFormatter('text');
  const sections: string[] = [];
  const title = `TileGuard Profile — ${basename(profile.file)}`;

  sections.push(fmt.heading(title));

  // Overview
  const sizeDisplay = profile.gzipBytes !== null
    ? `${formatBytes(profile.bytes)} (gzip: ${formatBytes(profile.gzipBytes)})`
    : formatBytes(profile.bytes);

  sections.push(
    fmt.summary('Overview', [
      ['Tile Size', sizeDisplay],
      ['Layers', profile.layerCount],
      ['Features', profile.totalFeatures.toLocaleString()],
      ['Vertices', profile.totalVertices.toLocaleString()],
    ]),
  );

  // Layer breakdown table
  sections.push('\n Layer Breakdown (by vertex count)\n' + ' ' + '─'.repeat(72) + '\n');
  sections.push(
    fmt.table(
      ['Layer', 'Features', 'Vertices', 'Share', 'Est. Size'],
      profile.layers.map((l) => [
        l.name,
        l.features.toLocaleString(),
        l.vertices.toLocaleString(),
        `${(l.vertexFraction * 100).toFixed(1)}%`,
        formatBytes(l.estimatedBytes),
      ]),
    ),
  );

  // Actionable warnings
  const warnings: string[] = [];
  for (const layer of profile.layers) {
    if (layer.vertexFraction > 0.4) {
      warnings.push(
        `  ⚠  ${layer.name} is ${(layer.vertexFraction * 100).toFixed(1)}% of tile — consider simplification`,
      );
    }
  }
  if (profile.worstFeature !== null && profile.worstFeature.vertexCount > 3000) {
    warnings.push(
      `  ⚠  Feature #${profile.worstFeature.featureIndex} in "${profile.worstFeature.layer}"` +
        ` has ${profile.worstFeature.vertexCount.toLocaleString()} vertices — exceeds 3,000 recommended`,
    );
  }

  if (warnings.length > 0) {
    sections.push('\n' + warnings.join('\n') + '\n');
  }

  return fmt.envelope(sections);
}

function formatJsonOutput(profile: TileProfile): string {
  return (
    JSON.stringify(
      {
        file: profile.file,
        bytes: profile.bytes,
        gzipBytes: profile.gzipBytes,
        gzipped: profile.gzipped,
        layerCount: profile.layerCount,
        totalFeatures: profile.totalFeatures,
        totalVertices: profile.totalVertices,
        layers: profile.layers,
        worstFeature: profile.worstFeature,
      },
      null,
      2,
    ) + '\n'
  );
}

// ---------------------------------------------------------------------------
// Command entry point
// ---------------------------------------------------------------------------

export async function runProfile(
  args: ProfileArgs,
  ctx: CommandContext,
): Promise<CliCommandResult> {
  const { logger } = ctx;

  logger.phase('Loading tile');

  let profile: TileProfile;
  try {
    profile = buildProfile(args.file, args.topN);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      exitCode: 1,
      message: `Error loading tile "${args.file}": ${msg}`,
    };
  }

  const output =
    args.format === 'json'
      ? formatJsonOutput(profile)
      : formatTextOutput(profile);

  return { exitCode: 0, output };
}
