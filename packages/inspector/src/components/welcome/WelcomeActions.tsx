/**
 * @tileguard/inspector — WelcomeActions (Milestone 7.5 — Step C)
 *
 * The primary file-open actions on the Welcome page:
 *   - Drag & drop zone
 *   - "Open Tile File…" button
 *
 * Extracted from WelcomeView to keep the redesigned welcome page clean.
 */

import { FileCode2, FolderOpen } from 'lucide-react';
import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';

interface WelcomeActionsProps {
  readonly onFileSelected: (file: File) => void;
}

export function WelcomeActions({ onFileSelected }: WelcomeActionsProps): JSX.Element {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const choose = () => inputRef.current?.click();

  const accept = (file: File | undefined) => {
    if (file !== undefined) onFileSelected(file);
  };

  return (
    <section
      aria-label="Open a vector tile file"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        setDragging(false);
        accept(e.dataTransfer.files[0]);
      }}
      className={`grid min-h-48 place-items-center rounded-[var(--tg-panel-radius)] border border-dashed p-[var(--tg-space-xl)] transition ${
        dragging
          ? 'border-[var(--tg-accent)] bg-[var(--tg-bg-hover)]'
          : 'border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]'
      }`}
    >
      <div className="grid justify-items-center text-center">
        <div className="relative mb-[var(--tg-space-lg)] rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] p-[var(--tg-space-md)]">
          <FileCode2 className="h-8 w-8 text-[var(--tg-accent)]" />
          <span className="absolute -bottom-2.5 -right-3.5 rounded-[var(--tg-border-radius)] bg-[var(--tg-accent)] px-1.5 py-0.5 text-[10px] font-semibold">
            .pbf
          </span>
        </div>
        <p className="text-sm font-medium text-[var(--tg-text-primary)]">
          Drag &amp; drop a vector tile here
        </p>
        <p className="mt-[var(--tg-space-xs)] text-xs text-[var(--tg-text-secondary)]">
          Supports .pbf files
        </p>
        <span className="my-[var(--tg-space-md)] text-[10px] text-[var(--tg-text-muted)]">
          or
        </span>
        <button
          type="button"
          onClick={choose}
          className="inline-flex items-center gap-[var(--tg-space-sm)] rounded-[var(--tg-border-radius)] bg-[var(--tg-accent)] px-[var(--tg-space-lg)] py-[var(--tg-space-sm)] text-sm font-medium transition hover:bg-[var(--tg-accent-hover)]"
        >
          <FolderOpen className="h-4 w-4" />
          Open Tile File…
        </button>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept=".pbf"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            accept(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </section>
  );
}
