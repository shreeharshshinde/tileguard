import type { Artifact } from '@tileguard/core';

export const VECTOR_TILE_ARTIFACT_TYPE = 'VectorTile';

export type GeometryType = 0 | 1 | 2 | 3;

export type GeometryTypeName = 'Unknown' | 'Point' | 'LineString' | 'Polygon';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type TileValue = string | number | boolean | null;

export type VectorTileGeometry = readonly Point[] | readonly (readonly Point[])[];

export interface VectorTileFeature {
  readonly id?: number;
  readonly type: GeometryType;
  readonly geometryType: GeometryTypeName;
  readonly properties: Readonly<Record<string, TileValue>>;
  readonly geometry: VectorTileGeometry;
}

export interface VectorTileLayer {
  readonly name: string;
  readonly version: number | null;
  readonly extent: number;
  readonly keys: readonly string[];
  readonly values: readonly TileValue[];
  readonly features: readonly VectorTileFeature[];
}

export interface VectorTileContent {
  readonly layers: Readonly<Record<string, VectorTileLayer>>;
}

export type VectorTileArtifact = Artifact<typeof VECTOR_TILE_ARTIFACT_TYPE, VectorTileContent>;

export interface LayerFeatureBounds {
  readonly min?: number;
  readonly max?: number;
  readonly minFeatures?: number;
  readonly maxFeatures?: number;
}

export function getVectorTile(artifact: Artifact): VectorTileContent {
  return artifact.content as VectorTileContent;
}

export function getFeatureParts(feature: VectorTileFeature): readonly (readonly Point[])[] {
  if (feature.type === 1) {
    return [feature.geometry as readonly Point[]];
  }
  return feature.geometry as readonly (readonly Point[])[];
}

export function totalFeatureCount(tile: VectorTileContent): number {
  return Object.values(tile.layers).reduce((total, layer) => total + layer.features.length, 0);
}
