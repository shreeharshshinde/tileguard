/**
 * @tileguard/inspector — EvidenceBuilder (Milestone 7 — Step 2)
 *
 * Transforms raw FeatureComparison data into structured RegressionEvidence[]
 * and RegressionReason[] that the RegressionEngine uses to build candidates.
 *
 * Design:
 *   - Each build*() method is independent and deterministic.
 *   - Evidence and reasons are derived only from what actually changed.
 *   - No UI imports, no side effects.
 *
 * Boundary: imports only from comparison/models and analysis/models/regression.
 */

import type { Diagnostic } from '@tileguard/core';
import type {
  FeatureComparison,
  GeometryDiff,
  PropertyDiff,
  TileComparison,
} from './models/comparison.js';
import {
  AREA_CHANGE_THRESHOLD,
  CENTROID_SHIFT_THRESHOLD,
  HIGH_SIGNAL_PROPERTIES,
  LOW_SIGNAL_PROPERTIES,
  type RegressionEvidence,
  type RegressionReason,
  type RegressionRecommendation,
  type TimelineStep,
} from './models/regression.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface BuiltEvidence {
  readonly reasons: readonly RegressionReason[];
  readonly evidence: readonly RegressionEvidence[];
  readonly timeline: readonly TimelineStep[];
  readonly recommendations: readonly RegressionRecommendation[];
}

export interface EvidenceBuilder {
  /**
   * Build complete evidence for one FeatureComparison.
   * Incorporates geometry, property, and diagnostic sub-builders.
   */
  buildForFeature(
    featureComparison: FeatureComparison,
    comparison: TileComparison,
  ): BuiltEvidence;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createEvidenceBuilder(): EvidenceBuilder {
  return { buildForFeature };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function buildForFeature(
  fc: FeatureComparison,
  comparison: TileComparison,
): BuiltEvidence {
  if (fc.kind === 'unchanged') {
    return { reasons: [], evidence: [], timeline: [], recommendations: [] };
  }

  const reasons: RegressionReason[] = [];
  const evidence: RegressionEvidence[] = [];
  const timelineSteps: TimelineStep[] = [];

  // ── Origin step ──────────────────────────────────────────────────────────
  const layerName =
    fc.featureA?.layerName ?? fc.featureB?.layerName ?? 'unknown';
  const featureId =
    fc.featureA?.id ?? fc.featureB?.id ?? fc.featureA?.featureIndex;
  const featureLabel =
    featureId !== undefined ? `Feature #${featureId}` : 'Feature';

  timelineSteps.push({
    label: `${featureLabel} in layer "${layerName}"`,
    detail: `kind=${fc.kind}`,
  });

  // ── Added / removed ──────────────────────────────────────────────────────
  if (fc.kind === 'added') {
    reasons.push({
      code: 'feature-added',
      description: 'Feature was not present in the original tile.',
      weight: 50,
      severity: 'high',
    });
    evidence.push({
      kind: 'geometry',
      label: 'Feature added',
      measuredValue: 'present in B only',
      confirms: true,
    });
    timelineSteps.push({ label: 'Feature added to tile B' });
    const recs = buildRecommendations(evidence, reasons);
    return {
      reasons,
      evidence,
      timeline: timelineSteps,
      recommendations: recs,
    };
  }

  if (fc.kind === 'removed') {
    reasons.push({
      code: 'feature-removed',
      description: 'Feature was removed from the tile.',
      weight: 50,
      severity: 'high',
    });
    evidence.push({
      kind: 'geometry',
      label: 'Feature removed',
      measuredValue: 'present in A only',
      confirms: true,
    });
    timelineSteps.push({ label: 'Feature removed from tile B' });
    const recs = buildRecommendations(evidence, reasons);
    return {
      reasons,
      evidence,
      timeline: timelineSteps,
      recommendations: recs,
    };
  }

  // ── Modified feature ─────────────────────────────────────────────────────
  const changes = fc.changes;
  if (!changes) {
    return { reasons: [], evidence: [], timeline: [], recommendations: [] };
  }

  // Geometry evidence
  if (changes.geometryChanged && fc.featureA && fc.featureB) {
    const geoDiff = computeGeometryDiff(fc);
    if (geoDiff) {
      buildGeometryEvidence(geoDiff, reasons, evidence, timelineSteps);
    }
  }

  // Property evidence
  if (changes.propertiesChanged && fc.featureA && fc.featureB) {
    const propDiff = computePropertyDiff(fc);
    if (propDiff) {
      buildPropertyEvidence(propDiff, reasons, evidence, timelineSteps);
    }
  }

  // Diagnostic evidence
  if (changes.diagnosticsChanged) {
    buildDiagnosticEvidence(fc, comparison, reasons, evidence, timelineSteps);
  }

  // Statistics evidence (vertex / ring counts)
  buildStatisticsEvidence(fc, reasons, evidence, timelineSteps);

  const recommendations = buildRecommendations(evidence, reasons);
  return {
    reasons,
    evidence,
    timeline: timelineSteps,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Geometry evidence
// ---------------------------------------------------------------------------

function buildGeometryEvidence(
  diff: ReturnType<typeof computeGeometryDiff> & object,
  reasons: RegressionReason[],
  evidence: RegressionEvidence[],
  timeline: TimelineStep[],
): void {
  if (diff.typeChanged) {
    reasons.push({
      code: 'geometry-type-changed',
      description: `Geometry type changed from ${diff.typeA} to ${diff.typeB}.`,
      weight: 30,
      severity: 'critical',
    });
    evidence.push({
      kind: 'geometry',
      label: 'Geometry type changed',
      measuredValue: diff.typeB,
      baselineValue: diff.typeA,
      confirms: true,
    });
    timeline.push({
      label: 'Geometry type changed',
      detail: `${diff.typeA} → ${diff.typeB}`,
    });
  }

  if (diff.centroidShift > CENTROID_SHIFT_THRESHOLD) {
    reasons.push({
      code: 'centroid-shift-large',
      description: `Centroid shifted by ${diff.centroidShift.toFixed(1)} tile units (threshold: ${CENTROID_SHIFT_THRESHOLD}).`,
      weight: 20,
      severity: 'high',
    });
    evidence.push({
      kind: 'geometry',
      label: 'Large centroid shift',
      measuredValue: `${diff.centroidShift.toFixed(1)} units`,
      baselineValue: `centroidA=(${diff.centroidA.x.toFixed(1)},${diff.centroidA.y.toFixed(1)})`,
      confirms: true,
    });
    timeline.push({
      label: 'Geometry position shifted',
      detail: `${diff.centroidShift.toFixed(1)} tile units`,
    });
  } else if (diff.centroidShift > 0) {
    reasons.push({
      code: 'centroid-shift-small',
      description: `Minor centroid shift of ${diff.centroidShift.toFixed(1)} tile units.`,
      weight: 5,
      severity: 'low',
    });
    evidence.push({
      kind: 'geometry',
      label: 'Minor centroid shift',
      measuredValue: `${diff.centroidShift.toFixed(1)} units`,
      confirms: true,
    });
  }

  // Area change (polygon only)
  if (diff.typeA === 'Polygon' || diff.typeA === 'MultiPolygon') {
    const areaA = computeApproxArea(diff.boundsA);
    const areaB = computeApproxArea(diff.boundsB);
    if (areaA > 0) {
      const areaChange = Math.abs(areaB - areaA) / areaA;
      if (areaChange > AREA_CHANGE_THRESHOLD) {
        reasons.push({
          code: 'area-changed-large',
          description: `Bounding box area changed by ${(areaChange * 100).toFixed(1)}% (threshold: ${AREA_CHANGE_THRESHOLD * 100}%).`,
          weight: 15,
          severity: 'high',
        });
        evidence.push({
          kind: 'geometry',
          label: 'Large area change',
          measuredValue: `${(areaChange * 100).toFixed(1)}%`,
          baselineValue: `${areaA.toFixed(0)} → ${areaB.toFixed(0)} sq units`,
          confirms: true,
        });
        timeline.push({
          label: 'Polygon area changed significantly',
          detail: `${(areaChange * 100).toFixed(1)}% change`,
        });
      }
    }
  }

  // General geometry modification
  if (!diff.typeChanged && diff.changed) {
    reasons.push({
      code: 'geometry-modified',
      description: 'Geometry coordinates were modified.',
      weight: 40,
      severity: 'medium',
    });
    evidence.push({
      kind: 'geometry',
      label: 'Geometry modified',
      measuredValue: `vertices: ${diff.vertexCountA} → ${diff.vertexCountB}`,
      confirms: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Property evidence
// ---------------------------------------------------------------------------

function buildPropertyEvidence(
  diff: NonNullable<ReturnType<typeof computePropertyDiff>>,
  reasons: RegressionReason[],
  evidence: RegressionEvidence[],
  timeline: TimelineStep[],
): void {
  let highSignalChanged = false;
  let lowSignalOnly = true;

  for (const entry of diff.entries) {
    const key = entry.kind === 'added' ? entry.key : entry.key;
    const isHighSignal = (HIGH_SIGNAL_PROPERTIES as readonly string[]).includes(
      key,
    );
    const isLowSignal = (LOW_SIGNAL_PROPERTIES as readonly string[]).includes(
      key,
    );

    if (isHighSignal) {
      highSignalChanged = true;
      lowSignalOnly = false;
      const valueA = entry.kind === 'modified' ? entry.valueA : undefined;
      const valueB =
        entry.kind === 'added' || entry.kind === 'modified'
          ? (entry.valueB ?? entry.valueA)
          : undefined;
      reasons.push({
        code: `property-high-signal-${key}`,
        description: `High-signal property "${key}" changed — likely affects rendering.`,
        weight: 15,
        severity: 'high',
      });
      evidence.push({
        kind: 'property',
        label: `Property "${key}" changed`,
        measuredValue: valueB,
        baselineValue: valueA,
        confirms: true,
      });
      timeline.push({
        label: `Property "${key}" changed`,
        detail:
          entry.kind === 'modified'
            ? `${String(valueA)} → ${String(valueB)}`
            : entry.kind,
      });
    } else if (!isLowSignal) {
      lowSignalOnly = false;
    }

    if (isLowSignal) {
      evidence.push({
        kind: 'property',
        label: `Low-signal property "${key}" changed`,
        measuredValue: entry.kind,
        confirms: false,
      });
    } else if (!isHighSignal) {
      evidence.push({
        kind: 'property',
        label: `Property "${key}" changed`,
        measuredValue: entry.kind,
        confirms: true,
      });
    }
  }

  if (!highSignalChanged) {
    reasons.push({
      code: 'property-changed',
      description: `${diff.entries.length} propert${diff.entries.length === 1 ? 'y' : 'ies'} changed.`,
      weight: lowSignalOnly ? 5 : 20,
      severity: lowSignalOnly ? 'low' : 'medium',
    });
  }
}

// ---------------------------------------------------------------------------
// Diagnostic evidence
// ---------------------------------------------------------------------------

function buildDiagnosticEvidence(
  fc: FeatureComparison,
  comparison: TileComparison,
  reasons: RegressionReason[],
  evidence: RegressionEvidence[],
  timeline: TimelineStep[],
): void {
  const featureLayer = fc.featureA?.layerName ?? fc.featureB?.layerName;

  // Find new diagnostics that relate to this feature's layer
  const relevantNew = comparison.diagnostics.newDiagnostics.filter(
    (d) => !featureLayer || diagnosticMatchesLayer(d, featureLayer),
  );

  if (relevantNew.length === 0) return;

  const errorCount = relevantNew.filter((d) => d.severity === 'error').length;

  reasons.push({
    code: 'new-diagnostic',
    description: `${relevantNew.length} new diagnostic${relevantNew.length > 1 ? 's' : ''} introduced (${errorCount} error${errorCount !== 1 ? 's' : ''}).`,
    weight: errorCount > 0 ? 45 : 30,
    severity: errorCount > 0 ? 'critical' : 'high',
  });

  evidence.push({
    kind: 'diagnostic',
    label: `${relevantNew.length} new diagnostic(s)`,
    measuredValue: relevantNew.map((d) => d.ruleId).join(', '),
    confirms: true,
  });

  timeline.push({
    label: 'New diagnostic introduced',
    detail: relevantNew.map((d) => d.ruleId).join(', '),
  });
}

// ---------------------------------------------------------------------------
// Statistics evidence
// ---------------------------------------------------------------------------

function buildStatisticsEvidence(
  fc: FeatureComparison,
  reasons: RegressionReason[],
  evidence: RegressionEvidence[],
  _timeline: TimelineStep[],
): void {
  if (!fc.featureA || !fc.featureB) return;

  const verticesA = countVertices(fc.featureA.geometry);
  const verticesB = countVertices(fc.featureB.geometry);
  const ringsA = fc.featureA.geometry.length;
  const ringsB = fc.featureB.geometry.length;

  if (verticesA !== verticesB || ringsA !== ringsB) {
    reasons.push({
      code: 'statistics-changed',
      description: `Vertex count changed from ${verticesA} to ${verticesB}; ring count from ${ringsA} to ${ringsB}.`,
      weight: 10,
      severity: 'low',
    });
    evidence.push({
      kind: 'statistics',
      label: 'Vertex/ring count changed',
      measuredValue: `vertices: ${verticesA}→${verticesB}, rings: ${ringsA}→${ringsB}`,
      confirms: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

function buildRecommendations(
  evidence: readonly RegressionEvidence[],
  reasons: readonly RegressionReason[],
): RegressionRecommendation[] {
  const recs: RegressionRecommendation[] = [];
  let priority = 0;

  const hasGeometryEvidence = evidence.some(
    (e) => e.kind === 'geometry' && e.confirms,
  );
  const hasPropertyEvidence = evidence.some(
    (e) => e.kind === 'property' && e.confirms,
  );
  const hasDiagnosticEvidence = evidence.some(
    (e) => e.kind === 'diagnostic' && e.confirms,
  );
  const hasStatisticsEvidence = evidence.some(
    (e) => e.kind === 'statistics' && e.confirms,
  );

  const hasTypeChange = reasons.some((r) => r.code === 'geometry-type-changed');
  const hasLargeCentroidShift = reasons.some(
    (r) => r.code === 'centroid-shift-large',
  );
  const hasHighSignalProp = reasons.some((r) =>
    r.code.startsWith('property-high-signal-'),
  );
  const isAdded = reasons.some((r) => r.code === 'feature-added');
  const isRemoved = reasons.some((r) => r.code === 'feature-removed');

  if (isAdded || isRemoved) {
    recs.push({
      action: 'Review tile generation pipeline',
      rationale:
        'A feature was added or removed, indicating a change in source data or tile generation.',
      evidenceIndices: evidence.map((_, i) => i),
      priority: priority++,
    });
  }

  if (hasTypeChange) {
    recs.push({
      action: 'Inspect source geometry type in upstream data',
      rationale:
        'The geometry type changed, which can silently break style expressions or rendering rules.',
      evidenceIndices: evidence.map((_, i) => i).slice(0, 2),
      priority: priority++,
    });
  }

  if (hasLargeCentroidShift) {
    recs.push({
      action: 'Verify geometry coordinates in source data',
      rationale:
        'A large centroid shift suggests the geometry was re-projected, resampled, or incorrectly encoded.',
      evidenceIndices: evidence.map((_, i) => i).slice(0, 3),
      priority: priority++,
    });
  }

  if (hasGeometryEvidence && !hasTypeChange && !hasLargeCentroidShift) {
    recs.push({
      action: 'Compare raw coordinates between tile versions',
      rationale:
        'Geometry coordinates changed. Review the tile generation output for this specific feature.',
      evidenceIndices: evidence.reduce<number[]>((acc, e, i) => {
        if (e.kind === 'geometry') acc.push(i);
        return acc;
      }, []),
      priority: priority++,
    });
  }

  if (hasHighSignalProp) {
    recs.push({
      action: 'Review attribute data for changed high-signal properties',
      rationale:
        'High-signal properties (class, type, highway, etc.) directly control rendering. Changes here are likely to cause visual regressions.',
      evidenceIndices: evidence.reduce<number[]>((acc, e, i) => {
        if (e.kind === 'property') acc.push(i);
        return acc;
      }, []),
      priority: priority++,
    });
  } else if (hasPropertyEvidence) {
    recs.push({
      action: 'Compare feature attributes between tile versions',
      rationale:
        'Feature properties changed. Verify attribute correctness in the source data.',
      evidenceIndices: evidence.reduce<number[]>((acc, e, i) => {
        if (e.kind === 'property') acc.push(i);
        return acc;
      }, []),
      priority: priority++,
    });
  }

  if (hasDiagnosticEvidence) {
    recs.push({
      action: 'Investigate new TileGuard diagnostics introduced in tile B',
      rationale:
        'New rule violations were detected. These may explain the visual regression.',
      evidenceIndices: evidence.reduce<number[]>((acc, e, i) => {
        if (e.kind === 'diagnostic') acc.push(i);
        return acc;
      }, []),
      priority: priority++,
    });
  }

  if (hasStatisticsEvidence) {
    recs.push({
      action: 'Check tile encoder for vertex simplification changes',
      rationale:
        'Vertex or ring counts differ, which may indicate a change in tolerance or simplification settings.',
      evidenceIndices: evidence.reduce<number[]>((acc, e, i) => {
        if (e.kind === 'statistics') acc.push(i);
        return acc;
      }, []),
      priority: priority++,
    });
  }

  if (recs.length === 0) {
    recs.push({
      action: 'Inspect the feature manually using the comparison explorer',
      rationale:
        'Automated analysis did not isolate a specific cause. Side-by-side inspection may reveal the issue.',
      evidenceIndices: [],
      priority: 0,
    });
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Helpers — geometry diff extraction
// ---------------------------------------------------------------------------

function computeGeometryDiff(fc: FeatureComparison): {
  changed: boolean;
  typeChanged: boolean;
  typeA: string;
  typeB: string;
  centroidShift: number;
  centroidA: { x: number; y: number };
  centroidB: { x: number; y: number };
  boundsA: { minX: number; minY: number; maxX: number; maxY: number };
  boundsB: { minX: number; minY: number; maxX: number; maxY: number };
  vertexCountA: number;
  vertexCountB: number;
} | null {
  if (!fc.featureA || !fc.featureB) return null;
  if (!fc.changes?.geometryChanged) return null;

  const geoA = fc.featureA.geometry;
  const geoB = fc.featureB.geometry;
  const typeA = fc.featureA.geometryType;
  const typeB = fc.featureB.geometryType;

  const centroidA = computeCentroid(geoA);
  const centroidB = computeCentroid(geoB);
  const dx = centroidB.x - centroidA.x;
  const dy = centroidB.y - centroidA.y;
  const centroidShift = Math.sqrt(dx * dx + dy * dy);

  const boundsA = computeBounds(geoA);
  const boundsB = computeBounds(geoB);

  return {
    changed: true,
    typeChanged: typeA !== typeB,
    typeA,
    typeB,
    centroidShift,
    centroidA,
    centroidB,
    boundsA,
    boundsB,
    vertexCountA: countVertices(geoA),
    vertexCountB: countVertices(geoB),
  };
}

type RingArray = readonly (readonly {
  readonly x: number;
  readonly y: number;
}[])[];

function countVertices(geo: RingArray): number {
  let n = 0;
  for (const ring of geo) n += ring.length;
  return n;
}

function computeCentroid(geo: RingArray): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const ring of geo) {
    for (const pt of ring) {
      sx += pt.x;
      sy += pt.y;
      n++;
    }
  }
  return n > 0 ? { x: sx / n, y: sy / n } : { x: 0, y: 0 };
}

function computeBounds(geo: RingArray): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const ring of geo) {
    for (const pt of ring) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

function computeApproxArea(bounds: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}): number {
  return (
    Math.max(0, bounds.maxX - bounds.minX) *
    Math.max(0, bounds.maxY - bounds.minY)
  );
}

// ---------------------------------------------------------------------------
// Helpers — property diff extraction
// ---------------------------------------------------------------------------

function computePropertyDiff(fc: FeatureComparison): {
  entries: Array<{
    kind: string;
    key: string;
    valueA?: unknown;
    valueB?: unknown;
  }>;
} | null {
  if (!fc.featureA || !fc.featureB) return null;
  if (!fc.changes?.propertiesChanged) return null;

  const propsA = fc.featureA.properties;
  const propsB = fc.featureB.properties;
  const entries: Array<{
    kind: 'added' | 'removed' | 'modified';
    key: string;
    valueA?: unknown;
    valueB?: unknown;
  }> = [];

  // Added / modified
  for (const [key, valueB] of Object.entries(propsB)) {
    if (!(key in propsA)) {
      entries.push({ kind: 'added', key, valueB });
    } else if (propsA[key] !== valueB) {
      entries.push({ kind: 'modified', key, valueA: propsA[key], valueB });
    }
  }

  // Removed
  for (const key of Object.keys(propsA)) {
    if (!(key in propsB)) {
      entries.push({ kind: 'removed', key, valueA: propsA[key] });
    }
  }

  return entries.length > 0 ? { entries } : null;
}

// ---------------------------------------------------------------------------
// Helpers — diagnostic matching
// ---------------------------------------------------------------------------

function diagnosticMatchesLayer(d: Diagnostic, layerName: string): boolean {
  // Best-effort: check if the diagnostic message or location references the layer
  const msg = d.message.toLowerCase();
  const loc = JSON.stringify(d.location ?? '').toLowerCase();
  return (
    msg.includes(layerName.toLowerCase()) ||
    loc.includes(layerName.toLowerCase())
  );
}
