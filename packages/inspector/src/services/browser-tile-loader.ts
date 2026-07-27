import {
  decodeMvt,
  type VectorTileArtifact,
} from '@tileguard/tile-rules/browser';

/** Decodes a browser-provided vector tile without using Node-only providers. */
export async function decodeBrowserTile(
  file: File,
): Promise<VectorTileArtifact> {
  let bytes = new Uint8Array(await file.arrayBuffer());
  try {
    return createArtifact(file.name, bytes);
  } catch (error) {
    if (typeof DecompressionStream === 'undefined') throw error;
    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    return createArtifact(file.name, bytes);
  }
}

function createArtifact(source: string, bytes: Uint8Array): VectorTileArtifact {
  return {
    type: 'VectorTile',
    ref: { type: 'VectorTile', source },
    content: decodeMvt(bytes),
  };
}
