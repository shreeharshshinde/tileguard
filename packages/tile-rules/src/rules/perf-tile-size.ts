/**
 * Rule: `perf/tile-size`
 *
 * Validates that the raw and/or compressed (gzip) byte size of the tile does
 * not exceed configurable thresholds.
 *
 * @remarks
 * Tile byte size is one of the most direct performance indicators for vector
 * tile rendering:
 *
 * - **Raw size**: controls how long the browser's PBF decoder spends
 *   parsing the tile before any geometry can be rendered.
 * - **Gzip size**: controls the actual bytes transferred over the network,
 *   directly affecting Time-to-First-Tile on mobile connections.
 *
 * The provider already attaches `metadata.bytes` (raw, after decompression
 * is resolved) and `metadata.gzipped` on every `VectorTileArtifact`.
 * This rule reads that existing metadata — no new I/O is required.
 *
 * The rule is opt-in by design: hard-coded byte thresholds that pass one
 * tile set will fail legitimate high-density building-footprint tiles at z15.
 * Enable it and configure thresholds explicitly once you understand your
 * tile pipeline's budget.
 *
 * @example
 * ```ts
 * rules: {
 *   'perf/tile-size': ['warning', { maxBytes: 500_000, maxGzipBytes: 150_000 }]
 * }
 * ```
 *
 * @see {@link TileSizeOptions} for configuration
 */
import type { Rule } from '@tileguard/core';
import { VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

/**
 * Configuration options for the `perf/tile-size` rule.
 */
export interface TileSizeOptions {
  /**
   * Maximum raw (uncompressed) tile size in bytes.
   *
   * A common budget for z14 tiles is 500 KB (512_000 bytes).
   * Tiles exceeding this budget will stall the PBF parser and
   * slow geometry decoding.
   */
  readonly maxBytes?: number;

  /**
   * Maximum gzip-compressed tile size in bytes.
   *
   * Only checked when the tile was loaded from a gzip-compressed source
   * (i.e., `artifact.metadata.gzipped === true`). A common budget for
   * network-delivered tiles is 150 KB (153_600 bytes).
   *
   * If the tile was not gzip-compressed, this threshold is silently skipped.
   */
  readonly maxGzipBytes?: number;
}

export const perfTileSizeRule: Rule<TileSizeOptions> = {
  id: 'perf/tile-size',
  meta: {
    description:
      'Tile raw and compressed byte sizes must not exceed configured performance budgets.',
    defaultSeverity: 'warning',
    docsUrl: 'https://tileguard.dev/rules/perf/tile-size',
    recommended: true,
    since: '0.6.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const { maxBytes, maxGzipBytes } = context.options ?? {};
    if (maxBytes === undefined && maxGzipBytes === undefined) return;

    const meta = context.artifact.metadata as {
      bytes?: number;
      decodedBytes?: number;
      gzipped?: boolean;
    };

    // Raw size check — `metadata.bytes` is the size of the bytes read from
    // disk/network (before decompression). Use decodedBytes as fallback so
    // the rule works for uncompressed tiles too.
    const rawBytes = meta.bytes ?? meta.decodedBytes ?? 0;

    if (maxBytes !== undefined && rawBytes > maxBytes) {
      context.report({
        message: `Tile raw size is ${rawBytes.toLocaleString()} bytes, exceeding the ${maxBytes.toLocaleString()}-byte budget.`,
        suggestion:
          'Reduce tile complexity by simplifying geometries, reducing feature density at this zoom level, or splitting into sub-tiles.',
        data: { bytes: rawBytes, maxBytes },
      });
    }

    // Gzip size check — only meaningful when the tile was actually compressed.
    if (maxGzipBytes !== undefined && meta.gzipped === true) {
      // When gzipped: metadata.bytes = compressed size, metadata.decodedBytes = raw size
      const gzipBytes = meta.bytes ?? 0;
      if (gzipBytes > maxGzipBytes) {
        context.report({
          message: `Tile gzip-compressed size is ${gzipBytes.toLocaleString()} bytes, exceeding the ${maxGzipBytes.toLocaleString()}-byte budget.`,
          suggestion:
            'Reduce tile byte size — simplify geometries, drop low-value properties, or apply better tile generation settings.',
          data: { gzipBytes, maxGzipBytes },
        });
      }
    }
  },
};
