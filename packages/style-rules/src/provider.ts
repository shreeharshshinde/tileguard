import { readFile } from 'node:fs/promises';
import type { ArtifactProvider, ProviderOptions } from '@tileguard/core';
import {
  type AnyStyleArtifact,
  EMPTY_STYLE_ARTIFACT_TYPE,
  type EmptyStyleArtifact,
  INVALID_STYLE_ARTIFACT_TYPE,
  type InvalidStyleArtifact,
  isRecord,
  STYLE_ARTIFACT_TYPE,
  type StyleArtifact,
  type StyleSpecificationContent,
} from './types.js';

const STYLE_EXTENSIONS = ['.json', '.style', '.style.json'];

export const styleProvider: ArtifactProvider = {
  id: 'style-specification',
  artifactTypes: [STYLE_ARTIFACT_TYPE, INVALID_STYLE_ARTIFACT_TYPE, EMPTY_STYLE_ARTIFACT_TYPE],

  canHandle(source) {
    const normalized = source.trim().toLowerCase();
    if (looksLikeJson(source)) return true;
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return STYLE_EXTENSIONS.some((extension) => normalized.endsWith(extension));
    }
    return STYLE_EXTENSIONS.some((extension) => normalized.endsWith(extension));
  },

  async load(source: string, options?: ProviderOptions): Promise<AnyStyleArtifact> {
    const raw = looksLikeJson(source) ? source : await readTextSource(source, options);

    if (raw.trim() === '') {
      return makeEmptyArtifact(source, raw);
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const content: StyleSpecificationContent = isRecord(parsed) ? parsed : { value: parsed };
      return makeStyleArtifact(source, content, raw);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return makeInvalidArtifact(source, raw, error);
    }
  },
};

async function readTextSource(source: string, options?: ProviderOptions): Promise<string> {
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
      return await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return readFile(source, 'utf8');
}

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function makeStyleArtifact(
  source: string,
  content: StyleSpecificationContent,
  raw: string,
): StyleArtifact {
  return {
    type: STYLE_ARTIFACT_TYPE,
    ref: { type: STYLE_ARTIFACT_TYPE, source },
    content,
    metadata: { bytes: Buffer.byteLength(raw, 'utf8') },
  };
}

function makeInvalidArtifact(source: string, raw: string, error: string): InvalidStyleArtifact {
  return {
    type: INVALID_STYLE_ARTIFACT_TYPE,
    ref: { type: INVALID_STYLE_ARTIFACT_TYPE, source },
    content: { raw, error },
    metadata: { bytes: Buffer.byteLength(raw, 'utf8') },
  };
}

function makeEmptyArtifact(source: string, raw: string): EmptyStyleArtifact {
  return {
    type: EMPTY_STYLE_ARTIFACT_TYPE,
    ref: { type: EMPTY_STYLE_ARTIFACT_TYPE, source },
    content: { raw },
    metadata: { bytes: 0, emptyPlaceholder: true },
  };
}
