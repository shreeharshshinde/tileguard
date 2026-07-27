import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  PanelLeftClose,
  PanelRightClose,
  Search,
  Settings2,
} from 'lucide-react';
import { type ChangeEvent, useRef } from 'react';
import { useInspectorContext } from '../context/InspectorContext.js';
import { useLifecycle } from '../hooks/use-store.js';

export interface ToolbarProps {
  readonly leftCollapsed: boolean;
  readonly rightCollapsed: boolean;
  readonly onToggleLeft: () => void;
  readonly onToggleRight: () => void;
  readonly onFileSelected?: (file: File) => void;
}

/** The operational toolbar shown in the loaded inspector workspace. */
export function Toolbar({
  leftCollapsed,
  rightCollapsed,
  onToggleLeft,
  onToggleRight,
  onFileSelected,
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
      <label className="relative hidden lg:block">
        <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-[var(--tg-text-muted)]" />
        <input
          disabled
          placeholder="Search features..."
          className="h-8 w-56 rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] pl-8 pr-3 text-xs text-[var(--tg-text-secondary)] outline-none"
        />
      </label>
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
