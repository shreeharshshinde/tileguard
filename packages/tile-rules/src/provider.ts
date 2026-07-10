import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import type { ArtifactProvider, ProviderOptions } from '@tileguard/core';
import { decodeMvt } from './pbf-decoder.js';
import { VECTOR_TILE_ARTIFACT_TYPE, type VectorTileArtifact } from './types.js';

const TILE_EXTENSIONS = ['.pbf', '.mvt', '.vector.pbf', '.mbtiles'];

export const tileProvider: ArtifactProvider = {
  id: 'vector-tile',
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  canHandle(source) {
    const normalized = source.trim().toLowerCase();
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return TILE_EXTENSIONS.some((extension) => normalized.endsWith(extension));
    }
    return TILE_EXTENSIONS.some((extension) => normalized.endsWith(extension));
  },

  async load(source: string, options?: ProviderOptions): Promise<VectorTileArtifact> {
    if (source.toLowerCase().endsWith('.mbtiles')) {
      throw new Error(
        'MBTiles sources require an archive provider; pass a .pbf or .mvt tile for now',
      );
    }

    const rawBytes = await readTileBytes(source, options);
    if (rawBytes.length === 0) {
      throw new Error('Tile source returned 0 bytes');
    }

    const gzipped = isGzipped(rawBytes);
    const bytes = gzipped ? gunzipSync(rawBytes) : rawBytes;
    const content = decodeMvt(bytes);

    return {
      type: VECTOR_TILE_ARTIFACT_TYPE,
      ref: { type: VECTOR_TILE_ARTIFACT_TYPE, source },
      content,
      metadata: {
        bytes: rawBytes.length,
        decodedBytes: bytes.length,
        gzipped,
      },
    };
  },
};

async function readTileBytes(source: string, options?: ProviderOptions): Promise<Uint8Array> {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const timeout = options?.timeout ?? 30_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const requestInit: RequestInit = { signal: controller.signal };
      if (options?.headers !== undefined) requestInit.headers = options.headers;

      const response = await fetch(source, requestInit);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return readFile(source);
}

function isGzipped(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}
