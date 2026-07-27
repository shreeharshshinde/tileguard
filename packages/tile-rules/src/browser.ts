/**
 * Browser-safe TileGuard tile APIs.
 *
 * This entry deliberately excludes the Node file-system tile provider so a
 * browser host can decode File API bytes without bundling node:fs or zlib.
 */

export { tileRules } from './browser-rules.js';
export { decodeMvt, PbfReader } from './pbf-decoder.js';
export type { VectorTileArtifact } from './types.js';
