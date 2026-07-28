import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  PanelLeftClose,
  PanelRightClose,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import { type ChangeEvent, type RefObject, useRef } from 'react';
import type { SearchResult } from '../services/SearchService.js';
import { useInspectorContext } from '../context/InspectorContext.js';
import { useLifecycle } from '../hooks/use-store.js';

export interface ToolbarProps {
  readonly leftCollapsed: boolean;
  readonly rightCollapsed: boolean;
  readonly onToggleLeft: () => void;
  readonly onToggleRight: () => void;
  readonly onFileSelected?: (file: File) => void;
  // Step 2 search props
  readonly searchQuery?: string;
  readonly onSearchChange?: (query: string) => void;
  readonly searchResults?: readonly SearchResult[];
  readonly onSelectSearchResult?: (result: SearchResult) => void;
  // Step 3: external ref so ShortcutService can focus the input
  readonly searchInputRef?: RefObject<HTMLInputElement | null>;
}

/** The operational toolbar shown in the loaded inspector workspace. */
export function Toolbar({
  leftCollapsed,
  rightCollapsed,
  onToggleLeft,
  onToggleRight,
  onFileSelected,
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

  const buttonClass =
    'inline-flex h-8 items-center gap-2 rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-[var(--tg-space-md)] text-xs font-medium text-[var(--tg-text-primary)] transition hover:bg-[var(--tg-bg-hover)] disabled:cursor-not-allowed disabled:opacity-45';

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <header className="flex h-[var(--tg-toolbar-height)] shrink-0 items-center gap-[var(--tg-space-md)] border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-lg)]">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={buttonClass}
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
      />
      <span className="max-w-64 truncate text-xs text-[var(--tg-text-secondary)]">
        {fileName}
      </span>
      <span className="flex-1" />

      {/* Search input — active in Step 2 */}
      <div className="relative hidden lg:block">
        <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-[var(--tg-text-muted)]" />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search features..."
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

        {/* Search results dropdown */}
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
                  <div className="text-xs font-medium text-[var(--tg-text-primary)] truncate">
                    {result.feature.layerName} #{result.feature.featureIndex}
                  </div>
                  <div className="text-[11px] text-[var(--tg-text-muted)] truncate">
                    {result.matchReason}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* No results indicator */}
        {isSearchActive && searchResults.length === 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3 py-2 text-xs text-[var(--tg-text-muted)] shadow-[var(--tg-shadow-md)]">
            No features found
          </div>
        )}
      </div>

      <button
        type="button"
        title="Toggle diagnostics panel"
        aria-label="Toggle diagnostics panel"
        className={buttonClass}
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
        className={buttonClass}
        onClick={onToggleRight}
      >
        {rightCollapsed ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <PanelRightClose className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        disabled
        title="Settings are available in Step 3"
        aria-label="Settings"
        className={buttonClass}
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </header>
  );
}
