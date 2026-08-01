/**
 * @tileguard/inspector — Toolbar (Milestone 6 — Step 4)
 *
 * Adds:
 *   - Wired Settings button (navigates to settings tab)
 *   - Reset View button (R shortcut)
 *   - Removed disabled state from Settings button
 */

import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  PanelLeftClose,
  PanelRightClose,
  RotateCcw,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import { type ChangeEvent, type RefObject, useRef } from 'react';
import { useInspectorContext } from '../context/InspectorContext.js';
import { useLifecycle } from '../hooks/use-store.js';
import type { SearchResult } from '../services/SearchService.js';

export interface ToolbarProps {
  readonly leftCollapsed: boolean;
  readonly rightCollapsed: boolean;
  readonly onToggleLeft: () => void;
  readonly onToggleRight: () => void;
  readonly onFileSelected?: (file: File) => void;
  readonly onResetView?: () => void;
  readonly onOpenSettings?: () => void;
  // Search
  readonly searchQuery?: string;
  readonly onSearchChange?: (query: string) => void;
  readonly searchResults?: readonly SearchResult[];
  readonly onSelectSearchResult?: (result: SearchResult) => void;
  readonly searchInputRef?: RefObject<HTMLInputElement | null>;
}

export function Toolbar({
  leftCollapsed,
  rightCollapsed,
  onToggleLeft,
  onToggleRight,
  onFileSelected,
  onResetView,
  onOpenSettings,
  searchQuery = '',
  onSearchChange,
  searchResults = [],
  onSelectSearchResult,
}: ToolbarProps): JSX.Element {
  const { store } = useInspectorContext();
  const lifecycle = useLifecycle(store);
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file !== undefined) onFileSelected?.(file);
    event.target.value = '';
  };

  const fileName =
    lifecycle.status === 'loaded' ? lifecycle.filePath : 'No tile loaded';

  const btn =
    'inline-flex h-8 items-center gap-2 rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-[var(--tg-space-md)] text-xs font-medium text-[var(--tg-text-primary)] transition hover:bg-[var(--tg-bg-hover)] disabled:cursor-not-allowed disabled:opacity-45';

  const iconBtn =
    'inline-flex h-8 w-8 items-center justify-center rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)] disabled:cursor-not-allowed disabled:opacity-45';

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <header
      className="flex h-[var(--tg-toolbar-height)] shrink-0 items-center gap-[var(--tg-space-md)] border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-lg)]"
      aria-label="Inspector toolbar"
    >
      {/* Open file */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={btn}
        aria-label="Open tile file"
      >
        <FolderOpen className="h-4 w-4" />
        Open Tile
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pbf"
        className="hidden"
        onChange={onChange}
        aria-hidden="true"
      />

      {/* File name */}
      <span
        className="max-w-64 truncate text-xs text-[var(--tg-text-secondary)]"
        title={lifecycle.status === 'loaded' ? lifecycle.filePath : undefined}
      >
        {fileName}
      </span>

      <span className="flex-1" />

      {/* Search input */}
      <div className="relative hidden lg:block">
        <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-[var(--tg-text-muted)]" />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search features…"
          className="h-8 w-56 rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] pl-8 pr-7 text-xs text-[var(--tg-text-primary)] outline-none focus:border-[var(--tg-accent)] placeholder:text-[var(--tg-text-muted)]"
          aria-label="Search features"
          aria-expanded={isSearchActive && searchResults.length > 0}
          aria-haspopup="listbox"
          role="combobox"
          autoComplete="off"
        />
        {isSearchActive && (
          <button
            type="button"
            className="absolute right-1.5 top-1.5 p-0.5 text-[var(--tg-text-muted)] hover:text-[var(--tg-text-primary)]"
            onClick={() => onSearchChange?.('')}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Results dropdown */}
        {isSearchActive && searchResults.length > 0 && (
          <ul
            role="listbox"
            aria-label="Search results"
            className="absolute left-0 top-full z-50 mt-1 max-h-64 w-72 overflow-y-auto rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] shadow-[var(--tg-shadow-md)]"
          >
            {searchResults.map((result, i) => (
              <li key={i} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-[var(--tg-bg-hover)] focus:bg-[var(--tg-bg-hover)] focus:outline-none"
                  onClick={() => onSelectSearchResult?.(result)}
                >
                  <div className="truncate text-xs font-medium text-[var(--tg-text-primary)]">
                    {result.feature.layerName} #{result.feature.featureIndex}
                  </div>
                  <div className="truncate text-[11px] text-[var(--tg-text-muted)]">
                    {result.matchReason}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {isSearchActive && searchResults.length === 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3 py-2 text-xs text-[var(--tg-text-muted)] shadow-[var(--tg-shadow-md)]">
            No features found
          </div>
        )}
      </div>

      {/* Reset View (R shortcut) */}
      <button
        type="button"
        title="Reset view (R)"
        aria-label="Reset view"
        className={iconBtn}
        onClick={onResetView}
        disabled={lifecycle.status !== 'loaded'}
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {/* Panel toggles */}
      <button
        type="button"
        title="Toggle diagnostics panel"
        aria-label="Toggle diagnostics panel"
        className={iconBtn}
        onClick={onToggleLeft}
      >
        {leftCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        title="Toggle feature inspector panel"
        aria-label="Toggle feature inspector panel"
        className={iconBtn}
        onClick={onToggleRight}
      >
        {rightCollapsed ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <PanelRightClose className="h-4 w-4" />
        )}
      </button>

      {/* Settings — now wired */}
      <button
        type="button"
        title="Settings (Ctrl+,)"
        aria-label="Open settings"
        className={iconBtn}
        onClick={onOpenSettings}
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </header>
  );
}
