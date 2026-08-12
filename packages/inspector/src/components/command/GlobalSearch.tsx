/**
 * @tileguard/inspector — GlobalSearch (Phase 4 — Step 4)
 *
 * Universal search modal built with cmdk. Searches:
 *   - Features (by layer name, ID, properties)
 *   - Layers (tile layers)
 *   - Diagnostics (by rule ID, message)
 *   - Style layers (by layer ID, type)
 *   - Sources (source references)
 *   - Properties (feature property keys/values)
 *
 * Triggered by Ctrl+/ or clicking the search icon in the header.
 * Results are categorized and actionable — selecting a result navigates
 * to the appropriate workspace and selects the entity.
 */
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Database,
  Layers,
  MapPin,
  Palette,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInspectorContext } from '../../context/InspectorContext.js';
import { useInvestigationActions } from '../../context/InvestigationContext.js';
import type { WorkspacePage } from '../../services/NavigationService.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResultItem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly category:
    | 'feature'
    | 'layer'
    | 'diagnostic'
    | 'style'
    | 'source'
    | 'property';
  readonly icon: LucideIcon;
  readonly action: () => void;
}

export interface GlobalSearchProps {
  /** Whether the search dialog is open. */
  readonly open: boolean;
  /** Called when the dialog should close. */
  readonly onClose: () => void;
  /** Navigate to a workspace page. */
  readonly onNavigate?: ((page: WorkspacePage) => void) | undefined;
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<
  SearchResultItem['category'],
  { label: string; icon: LucideIcon }
> = {
  feature: { label: 'Features', icon: MapPin },
  layer: { label: 'Layers', icon: Layers },
  diagnostic: { label: 'Diagnostics', icon: AlertTriangle },
  style: { label: 'Style Layers', icon: Palette },
  source: { label: 'Sources', icon: Database },
  property: { label: 'Properties', icon: Tag },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlobalSearch({
  open,
  onClose,
  onNavigate,
}: GlobalSearchProps): JSX.Element | null {
  const { store, inspector } = useInspectorContext();
  const actions = useInvestigationActions();
  const [query, setQuery] = useState('');

  // Reset query when opened
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  // Build search results from loaded tile data
  const results = useMemo<SearchResultItem[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const items: SearchResultItem[] = [];

    // ── Search features ───────────────────────────────────────────────────
    const lifecycle = store.lifecycle;
    if (lifecycle.status === 'loaded') {
      const artifact = lifecycle.artifact;
      const content = artifact.content;
      const layerEntries = Object.entries(content.layers);

      // Search layers
      for (const [layerName, layer] of layerEntries) {
        if (layerName.toLowerCase().includes(q)) {
          items.push({
            id: `layer-${layerName}`,
            label: layerName,
            description: `${layer.features.length} features`,
            category: 'layer',
            icon: Layers,
            action: () => {
              actions.setActiveLayer(layerName);
              onNavigate?.('inspector');
              onClose();
            },
          });
        }

        // Search individual features
        for (
          let fi = 0;
          fi < layer.features.length && items.length < 50;
          fi++
        ) {
          const feature = layer.features[fi];
          if (!feature) continue;

          // Match by feature index
          const featureLabel = `${layerName} #${fi}`;
          const idStr = String(feature.id ?? fi);

          let matched = false;
          let matchReason = '';

          if (idStr.includes(q) || featureLabel.toLowerCase().includes(q)) {
            matched = true;
            matchReason = `ID: ${idStr}`;
          }

          // Match by properties
          if (!matched && feature.properties) {
            for (const [key, value] of Object.entries(feature.properties)) {
              const valStr = String(value ?? '').toLowerCase();
              const keyStr = key.toLowerCase();
              if (keyStr.includes(q) || valStr.includes(q)) {
                matched = true;
                matchReason = `${key}: ${value}`;
                break;
              }
            }
          }

          if (matched) {
            items.push({
              id: `feature-${layerName}-${fi}`,
              label: featureLabel,
              description: matchReason,
              category: 'feature',
              icon: MapPin,
              action: () => {
                actions.selectFeature({ layerName, featureIndex: fi });
                store.select(layerName, fi);
                onNavigate?.('inspector');
                onClose();
              },
            });
          }
        }
      }

      // ── Search diagnostics ────────────────────────────────────────────────
      const diagnostics = lifecycle.diagnostics;
      for (let di = 0; di < diagnostics.length && items.length < 60; di++) {
        const d = diagnostics[di];
        if (!d) continue;
        const ruleId = d.ruleId ?? '';
        const message = d.message ?? '';
        if (
          ruleId.toLowerCase().includes(q) ||
          message.toLowerCase().includes(q)
        ) {
          items.push({
            id: `diagnostic-${di}`,
            label: ruleId,
            description: message.slice(0, 80),
            category: 'diagnostic',
            icon: AlertTriangle,
            action: () => {
              actions.setActiveDiagnostic({ ruleId, diagnosticIndex: di });
              onNavigate?.('diagnostics');
              onClose();
            },
          });
        }
      }
    }

    return items.slice(0, 30);
  }, [query, store, actions, onNavigate, onClose]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups = new Map<SearchResultItem['category'], SearchResultItem[]>();
    for (const item of results) {
      const existing = groups.get(item.category) ?? [];
      existing.push(item);
      groups.set(item.category, existing);
    }
    return groups;
  }, [results]);

  const handleSelect = useCallback(
    (itemId: string) => {
      const item = results.find((r) => r.id === itemId);
      if (item) {
        item.action();
        actions.addTimelineEvent({
          action: 'Search Navigation',
          detail: `${item.category}: ${item.label}`,
          icon: 'zap',
        });
      }
    },
    [results, actions],
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Command
            label="Universal Search"
            shouldFilter={false}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 border-b border-[var(--tg-border)] px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-[var(--tg-text-muted)]" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search features, layers, diagnostics, styles..."
                className="flex-1 bg-transparent text-sm text-[var(--tg-text-primary)] placeholder:text-[var(--tg-text-muted)] focus:outline-none"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded p-0.5 text-[var(--tg-text-muted)] hover:text-[var(--tg-text-primary)]"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Results */}
            <Command.List className="max-h-[360px] overflow-y-auto p-2">
              {query.trim() && results.length === 0 && (
                <Command.Empty className="py-8 text-center text-sm text-[var(--tg-text-muted)]">
                  No results for "{query}"
                </Command.Empty>
              )}

              {!query.trim() && (
                <div className="py-8 text-center">
                  <Search className="mx-auto mb-2 h-8 w-8 text-[var(--tg-text-muted)] opacity-40" />
                  <p className="text-xs text-[var(--tg-text-muted)]">
                    Type to search across features, layers, diagnostics, and
                    styles
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--tg-text-muted)] opacity-60">
                    Ctrl+/ to open · Esc to close
                  </p>
                </div>
              )}

              {Array.from(groupedResults.entries()).map(([category, items]) => {
                const meta = CATEGORY_META[category];
                return (
                  <Command.Group
                    key={category}
                    heading={
                      <span className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-muted)]">
                        <meta.icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    }
                  >
                    {items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={handleSelect}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors data-[selected=true]:bg-[var(--tg-bg-hover)]"
                      >
                        <item.icon
                          className="h-4 w-4 shrink-0 text-[var(--tg-text-secondary)]"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-[var(--tg-text-primary)]">
                            {item.label}
                          </div>
                          <div className="truncate text-[10px] text-[var(--tg-text-muted)]">
                            {item.description}
                          </div>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}
            </Command.List>

            {/* Footer */}
            {results.length > 0 && (
              <div className="border-t border-[var(--tg-border)] px-4 py-2">
                <span className="text-[10px] text-[var(--tg-text-muted)]">
                  {results.length} result{results.length !== 1 ? 's' : ''} · ↑↓
                  navigate · Enter select · Esc close
                </span>
              </div>
            )}
          </Command>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
