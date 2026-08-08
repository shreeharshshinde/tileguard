/**
 * @tileguard/inspector — RuleDetailsPanel (Milestone 7.5 — Step A)
 *
 * The right sidebar panel for the Diagnostics tab.
 * Answers: "What is wrong and why?"
 *
 * Shown when a diagnostic is selected. Displays:
 *   - Rule ID and severity
 *   - Human-readable explanation
 *   - Suggested fix
 *   - Feature location (layer, feature index, geometry type)
 *   - Link to rule documentation (future)
 */

import type { Diagnostic } from '@tileguard/core';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Info,
  Lightbulb,
  MapPin,
  XCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Rule knowledge base — friendly descriptions for known rule IDs
// ---------------------------------------------------------------------------

interface RuleKnowledge {
  readonly title: string;
  readonly explanation: string;
  readonly category: string;
}

const RULE_KB: Record<string, RuleKnowledge> = {
  'tile/self-intersection': {
    title: 'Self-Intersecting Geometry',
    explanation:
      'A polygon or line geometry crosses itself. This violates the Simple Features specification and causes unpredictable rendering behavior in MapLibre and other rendering engines.',
    category: 'Geometry',
  },
  'tile/unclosed-ring': {
    title: 'Unclosed Polygon Ring',
    explanation:
      'A polygon ring does not have its first vertex equal to its last vertex. Vector tile decoders may reject this tile or silently produce incorrect geometry.',
    category: 'Geometry',
  },
  'tile/zero-area': {
    title: 'Zero-Area Polygon',
    explanation:
      'A polygon has no meaningful area — all vertices are collinear or the geometry degenerates to a point or line. These polygons are invisible and waste tile space.',
    category: 'Geometry',
  },
  'tile/degenerate-geometry': {
    title: 'Degenerate Geometry',
    explanation:
      'A feature contains fewer vertices than required for its declared geometry type (e.g. a polygon with only one point). This is structurally invalid.',
    category: 'Geometry',
  },
  'tile/coordinate-range': {
    title: 'Coordinate Out of Range',
    explanation:
      'A vertex coordinate falls outside the valid tile extent (0 to 4096 by default). Out-of-range coordinates can cause rendering artifacts and are rejected by strict decoders.',
    category: 'Coordinates',
  },
  'tile/required-layers': {
    title: 'Missing Required Layer',
    explanation:
      'A layer that your tileguard.config.ts marks as required is absent from this tile. This suggests a pipeline error or an incomplete tile export.',
    category: 'Structure',
  },
  'tile/required-properties': {
    title: 'Missing Required Property',
    explanation:
      'A feature is missing a property that your configuration declares as required. Style expressions referencing this property will silently evaluate to null.',
    category: 'Properties',
  },
  'tile/feature-count': {
    title: 'Feature Count Violation',
    explanation:
      'The number of features in this tile (or in a specific layer) falls outside the configured threshold. This may indicate truncated data or an exploded tile.',
    category: 'Content',
  },
  'tile/no-empty': {
    title: 'Empty Tile',
    explanation:
      'The tile contains zero features. This may be intentional for ocean tiles, but is flagged when not explicitly allowed by configuration.',
    category: 'Content',
  },
  'style/version': {
    title: 'Invalid Style Version',
    explanation:
      'The style version field must be exactly 8. Other values are not supported by the MapLibre GL JS specification.',
    category: 'Style Structure',
  },
  'style/known-source': {
    title: 'Unknown Source Reference',
    explanation:
      'A layer references a source that is not declared in the style\'s "sources" object. This layer will never render.',
    category: 'Style Structure',
  },
  'style/source-layer': {
    title: 'Missing source-layer',
    explanation:
      'A vector layer does not specify a "source-layer". Without this, MapLibre cannot determine which layer of the vector tile to use.',
    category: 'Style Structure',
  },
  'style/duplicate-layer-id': {
    title: 'Duplicate Layer ID',
    explanation:
      'Two layers share the same ID. MapLibre will silently use only one of them; the other will never render. This is a common copy-paste bug.',
    category: 'Style Integrity',
  },
  'style/zoom-range': {
    title: 'Invalid Zoom Range',
    explanation:
      "A layer's minzoom is greater than its maxzoom. The layer will never be visible at any zoom level.",
    category: 'Style Integrity',
  },
};

const FALLBACK_RULE: RuleKnowledge = {
  title: 'Validation Rule',
  explanation:
    'This diagnostic was produced by a TileGuard validation rule. Refer to your tileguard.config.ts for rule configuration details.',
  category: 'Validation',
};

// ---------------------------------------------------------------------------
// Severity icon helper
// ---------------------------------------------------------------------------

function SeverityIcon({
  severity,
}: {
  severity: 'error' | 'warning' | 'info';
}): JSX.Element {
  if (severity === 'error')
    return (
      <XCircle className="h-4 w-4 text-[var(--tg-error)]" aria-hidden="true" />
    );
  if (severity === 'warning')
    return (
      <AlertTriangle
        className="h-4 w-4 text-[var(--tg-warning)]"
        aria-hidden="true"
      />
    );
  return <Info className="h-4 w-4 text-[var(--tg-info)]" aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RuleDetailsPanelProps {
  readonly diagnostic: Diagnostic | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RuleDetailsPanel({
  diagnostic,
}: RuleDetailsPanelProps): JSX.Element {
  if (diagnostic === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-[var(--tg-space-md)] p-[var(--tg-space-xl)] text-center">
        <BookOpen
          className="h-8 w-8 text-[var(--tg-text-muted)]"
          aria-hidden="true"
        />
        <p className="text-xs text-[var(--tg-text-muted)]">
          Select a diagnostic to see
          <br />
          rule details and a suggested fix.
        </p>
      </div>
    );
  }

  const ruleId = diagnostic.ruleId ?? 'unknown';
  const knowledge = RULE_KB[ruleId] ?? FALLBACK_RULE;
  const loc = diagnostic.location as
    | {
        layer?: string;
        featureIndex?: number;
        featureId?: number | string;
      }
    | undefined;

  const severityColour =
    diagnostic.severity === 'error'
      ? 'text-[var(--tg-error)] border-[var(--tg-error)]'
      : diagnostic.severity === 'warning'
        ? 'text-[var(--tg-warning)] border-[var(--tg-warning)]'
        : 'text-[var(--tg-info)] border-[var(--tg-info)]';

  return (
    <section
      className="flex h-full flex-col overflow-y-auto"
      aria-label="Rule Details"
    >
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--tg-border)] p-[var(--tg-space-md)]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8b5cf6]">
          Rule Details
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-[var(--tg-space-md)] space-y-[var(--tg-space-lg)]">
        {/* Severity + Rule ID */}
        <div className="flex items-center gap-[var(--tg-space-sm)]">
          <SeverityIcon severity={diagnostic.severity} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--tg-text-primary)]">
              {knowledge.title}
            </p>
            <p className="font-mono text-[10px] text-[var(--tg-text-muted)]">
              {ruleId}
            </p>
          </div>
          <span
            className={`ml-auto shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${severityColour}`}
          >
            {diagnostic.severity}
          </span>
        </div>

        {/* Diagnostic message */}
        <div className="rounded-[var(--tg-border-radius)] bg-[var(--tg-bg-surface)] p-[var(--tg-space-sm)]">
          <p className="text-xs text-[var(--tg-text-primary)]">
            {diagnostic.message}
          </p>
        </div>

        {/* Explanation */}
        <div>
          <div className="mb-[var(--tg-space-sm)] flex items-center gap-[var(--tg-space-sm)]">
            <BookOpen
              className="h-3.5 w-3.5 text-[var(--tg-text-secondary)]"
              aria-hidden="true"
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-secondary)]">
              Explanation
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[var(--tg-text-secondary)]">
            {knowledge.explanation}
          </p>
        </div>

        {/* Suggested fix */}
        {diagnostic.suggestion !== undefined && (
          <div>
            <div className="mb-[var(--tg-space-sm)] flex items-center gap-[var(--tg-space-sm)]">
              <Lightbulb
                className="h-3.5 w-3.5 text-[var(--tg-warning)]"
                aria-hidden="true"
              />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-secondary)]">
                Suggested Fix
              </span>
            </div>
            <div className="rounded-[var(--tg-border-radius)] border border-[var(--tg-warning)]/30 bg-[var(--tg-bg-surface)] p-[var(--tg-space-sm)]">
              <p className="text-xs leading-relaxed text-[var(--tg-text-primary)]">
                {diagnostic.suggestion}
              </p>
            </div>
          </div>
        )}

        {/* Location */}
        {(loc?.layer !== undefined || loc?.featureIndex !== undefined) && (
          <div>
            <div className="mb-[var(--tg-space-sm)] flex items-center gap-[var(--tg-space-sm)]">
              <MapPin
                className="h-3.5 w-3.5 text-[var(--tg-text-secondary)]"
                aria-hidden="true"
              />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-secondary)]">
                Location
              </span>
            </div>
            <dl className="space-y-1 text-xs">
              {loc?.layer !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-[var(--tg-text-muted)]">Layer</dt>
                  <dd className="font-mono text-[var(--tg-text-primary)]">
                    {loc.layer}
                  </dd>
                </div>
              )}
              {loc?.featureIndex !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-[var(--tg-text-muted)]">Feature</dt>
                  <dd className="font-mono text-[var(--tg-text-primary)]">
                    #{loc.featureIndex}
                  </dd>
                </div>
              )}
              {loc?.featureId !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-[var(--tg-text-muted)]">ID</dt>
                  <dd className="font-mono text-[var(--tg-text-primary)]">
                    {String(loc.featureId)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Category */}
        <div className="flex items-center gap-[var(--tg-space-sm)]">
          <CheckCircle2
            className="h-3.5 w-3.5 text-[var(--tg-text-muted)]"
            aria-hidden="true"
          />
          <span className="text-[10px] text-[var(--tg-text-muted)]">
            Category: {knowledge.category}
          </span>
        </div>
      </div>
    </section>
  );
}
