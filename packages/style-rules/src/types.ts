import type { Artifact } from '@tileguard/core';

export const STYLE_ARTIFACT_TYPE = 'StyleSpecification';
export const INVALID_STYLE_ARTIFACT_TYPE = 'InvalidStyleSpecification';
export const EMPTY_STYLE_ARTIFACT_TYPE = 'EmptyStyleSpecification';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

export interface StyleLayer {
  readonly id?: unknown;
  readonly type?: unknown;
  readonly source?: unknown;
  readonly minzoom?: unknown;
  readonly maxzoom?: unknown;
  readonly ref?: unknown;
  readonly [key: string]: unknown;
}

export interface StyleSpecificationContent {
  readonly version?: unknown;
  readonly sources?: unknown;
  readonly layers?: unknown;
  readonly [key: string]: unknown;
}

export interface InvalidStyleSpecificationContent {
  readonly raw: string;
  readonly error: string;
}

export interface EmptyStyleSpecificationContent {
  readonly raw: string;
}

export type StyleArtifact = Artifact<typeof STYLE_ARTIFACT_TYPE, StyleSpecificationContent>;

export type InvalidStyleArtifact = Artifact<
  typeof INVALID_STYLE_ARTIFACT_TYPE,
  InvalidStyleSpecificationContent
>;

export type EmptyStyleArtifact = Artifact<
  typeof EMPTY_STYLE_ARTIFACT_TYPE,
  EmptyStyleSpecificationContent
>;

export type AnyStyleArtifact = StyleArtifact | InvalidStyleArtifact | EmptyStyleArtifact;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getStyleObject(artifact: Artifact): StyleSpecificationContent {
  return artifact.content as StyleSpecificationContent;
}

export function getStyleLayers(style: StyleSpecificationContent): readonly StyleLayer[] {
  if (!Array.isArray(style.layers)) return [];
  return style.layers.filter(isRecord) as readonly StyleLayer[];
}

export function getLayerId(layer: StyleLayer): string | undefined {
  return typeof layer.id === 'string' && layer.id.length > 0 ? layer.id : undefined;
}
