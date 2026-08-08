/**
 * @tileguard/inspector — RuleInspector (Phase 3 — Diagnose Workspace)
 *
 * Right panel for the Diagnose workspace.
 * Shows the selected diagnostic's rule explanation, affected feature,
 * fix recommendation, and related links.
 */

import type { Diagnostic } from '@tileguard/core';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Info,
  Lightbulb,
  ScanSearch,
  Wrench,
} from 'lucide-react';
import {
  EmptyWorkspace,
  PanelDivider,
  PanelHeader,
  PanelSection,
  WorkspaceBadge,
  WorkspacePanel,
} from '../shared/index.js';

// ---------------------------------------------------------------------------
// Rule knowledge base — short explanations and recommendations per rule ID
// ---------------------------------------------------------------------------

interface RuleInfo {
  readonly explanation: string;
  readonly recommendation: string;
  readonly docsPath?: string;
}

const RULE_INFO: Record<string, RuleInfo> = {
  'tile/self-intersection': {
    explanation:
      'A polygon ring crosses itself, creating an invalid geometry that renderers may display incorrectly or silently drop.',
    recommendation:
      'Simplify or re-snap the geometry in the source data. Use a topology repair tool such as ST_MakeValid in PostGIS before encoding the tile.',
  },
  'tile/unclosed-ring': {
    explanation:
      'A polygon ring does not close — the first and last vertex are not equal. This violates the MVT specification.',
    recommendation:
      'Close all rings before encoding. Most encoder libraries (e.g. vt-pbf) do this automatically. Check your encoder configuration.',
  },
  'tile/zero-area': {
    explanation:
      'A polygon has zero computed area, indicating degenerate geometry (a line or single point stored as a polygon).',
    recommendation:
      'Remove degenerate polygons in your data pipeline or increase geometry precision before tile generation.',
  },
  'tile/coordinate-range': {
    explanation:
      'One or more coordinates fall outside the valid tile extent (0–4096 by default). This typically indicates a projection or clipping bug.',
    recommendation:
      'Verify your tile encoder clips geometries to the tile extent. Check the `extent` field in the tile header.',
  },
  'tile/no-empty': {
    explanation:
      'The tile contains no features. This may be intentional (ocean tiles) or a data pipeline error.',
    recommendation:
      'If empty tiles are expected, suppress this rule with `"tile/no-empty": "off"` in your config.',
  },
  'tile/required-layers': {
    explanation:
      'Expected layer(s) are absent from this tile. Critical layers missing at the expected zoom level.',
    recommendation:
      'Check your tile generation pipeline for layer filtering rules. Verify zoom-range configuration for the missing layer.',
  },
  'tile/required-properties': {
    explanation:
      'Features in this layer are missing one or more declared required properties.',
    recommendation:
      'Ensure the source data contains these properties and that your encoder is not dropping them.',
  },
  'tile/feature-count': {
    explanation:
      'The feature count for this tile is outside the configured bounds (too many or too few features).',
    recommendation:
      'Review zoom-level generalisation settings. Consider adjusting the `minFeatures`/`maxFeatures` rule options.',
  },
  'style/zoom-range': {
    explanation:
      'A layer has minzoom greater than maxzoom, which makes it invisible at all zoom levels.',
    recommendation:
      'Swap the minzoom and maxzoom values, or remove one. Check for copy-paste errors in the style JSON.',
  },
  'style/known-source': {
    explanation:
      "A layer references a source that is not declared in the style's `sources` object.",
    recommendation:
      'Add the missing source declaration, or correct the source name in the layer definition.',
  },
};

function getRuleInfo(ruleId: string): RuleInfo {
  return (
    RULE_INFO[ruleId] ?? {
      explanation: `Rule \`${ruleId}\` fired on this feature. See the TileGuard documentation for details.`,
      recommendation:
        'Review the rule documentation and check the affected feature in the source data.',
    }
  );
}

// ---------------------------------------------------------------------------
// RuleInspector
// ---------------------------------------------------------------------------

export interface RuleInspectorProps {
  readonly diagnostic: Diagnostic | null;
}

export function RuleInspector({ diagnostic }: RuleInspectorProps): JSX.Element {
  if (diagnostic === null) {
    return (
      <EmptyWorkspace
        icon={ScanSearch}
        title="No diagnostic selected"
        description="Select a diagnostic from the left panel to see the rule explanation and fix recommendation."
      />
    );
  }

  const sev = diagnostic.severity;
  const SevIcon =
    sev === 'error' ? AlertCircle : sev === 'warning' ? AlertTriangle : Info;
  const sevVariant =
    sev === 'error' ? 'error' : sev === 'warning' ? 'warning' : 'info';
  const info = getRuleInfo(diagnostic.ruleId);

  return (
    <WorkspacePanel
      label="Rule Inspector"
      header={<PanelHeader title="Rule Inspector" icon={BookOpen} />}
    >
      {/* Rule identity */}
      <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
        <div className="flex items-center gap-2 mb-2">
          <SevIcon
            className={`h-4 w-4 shrink-0 ${sev === 'error' ? 'text-[var(--tg-error)]' : sev === 'warning' ? 'text-[var(--tg-warning)]' : 'text-[var(--tg-info)]'}`}
            aria-hidden
          />
          <code className="text-xs font-mono font-semibold text-[var(--tg-text-primary)]">
            {diagnostic.ruleId}
          </code>
          <WorkspaceBadge label={sev} variant={sevVariant} />
        </div>
        <p className="text-xs text-[var(--tg-text-secondary)] leading-relaxed">
          {diagnostic.message}
        </p>
      </div>

      <PanelDivider />

      {/* Affected feature */}
      {(diagnostic.location?.layer ??
        diagnostic.location?.featureIndex !== undefined) && (
        <>
          <PanelSection title="Affected Feature">
            <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                {diagnostic.location?.layer && (
                  <>
                    <span className="text-[var(--tg-text-muted)]">Layer</span>
                    <code className="font-mono text-[var(--tg-text-secondary)]">
                      {diagnostic.location.layer}
                    </code>
                  </>
                )}
                {diagnostic.location?.featureIndex !== undefined && (
                  <>
                    <span className="text-[var(--tg-text-muted)]">Feature</span>
                    <code className="font-mono text-[var(--tg-text-secondary)]">
                      #{diagnostic.location.featureIndex}
                    </code>
                  </>
                )}
                {diagnostic.location?.jsonPath && (
                  <>
                    <span className="text-[var(--tg-text-muted)]">Path</span>
                    <code className="font-mono text-[9px] text-[var(--tg-text-secondary)] break-all">
                      {diagnostic.location.jsonPath}
                    </code>
                  </>
                )}
              </div>
            </div>
          </PanelSection>
          <PanelDivider />
        </>
      )}

      {/* Explanation */}
      <PanelSection title="What this means">
        <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
          <p className="text-xs leading-relaxed text-[var(--tg-text-secondary)]">
            {info.explanation}
          </p>
        </div>
      </PanelSection>

      <PanelDivider />

      {/* Recommendation */}
      <PanelSection title="Fix Recommendation">
        <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
          <div className="flex items-start gap-2">
            <Lightbulb
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tg-warning)]"
              aria-hidden
            />
            <p className="text-xs leading-relaxed text-[var(--tg-text-secondary)]">
              {info.recommendation}
            </p>
          </div>
        </div>
      </PanelSection>

      {/* Suggestion from diagnostic if present */}
      {diagnostic.suggestion && (
        <>
          <PanelDivider />
          <PanelSection title="Suggestion">
            <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
              <div className="flex items-start gap-2">
                <Wrench
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tg-accent)]"
                  aria-hidden
                />
                <p className="text-xs leading-relaxed text-[var(--tg-text-secondary)]">
                  {diagnostic.suggestion}
                </p>
              </div>
            </div>
          </PanelSection>
        </>
      )}
    </WorkspacePanel>
  );
}
