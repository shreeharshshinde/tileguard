import { FileCode2, FolderOpen } from 'lucide-react';
import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';

interface WelcomeViewProps {
  readonly onFileSelected: (file: File) => void;
}

/** The initial file-loading workspace. */
export function WelcomeView({ onFileSelected }: WelcomeViewProps): JSX.Element {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const choose = () => inputRef.current?.click();
  const accept = (file: File | undefined) => {
    if (file !== undefined) onFileSelected(file);
  };

  return (
    <main className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_20rem] overflow-hidden bg-[var(--tg-bg-primary)]">
      <section className="mx-auto flex w-full max-w-4xl flex-col justify-center px-[var(--tg-space-2xl)]">
        <h1 className="text-3xl font-semibold">
          Welcome to <span className="text-[var(--tg-accent)]">TileGuard</span>{' '}
          Inspector
        </h1>
        <p className="mt-[var(--tg-space-sm)] text-base text-[var(--tg-text-secondary)]">
          Inspect vector tiles and explore the canvas workspace.
        </p>
        <section
          aria-label="Vector tile drop zone"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event: DragEvent<HTMLElement>) => {
            event.preventDefault();
            setDragging(false);
            accept(event.dataTransfer.files[0]);
          }}
          className={`mt-[var(--tg-space-2xl)] grid min-h-80 place-items-center border border-dashed p-[var(--tg-space-2xl)] transition ${dragging ? 'border-[var(--tg-accent)] bg-[var(--tg-bg-hover)]' : 'border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]'}`}
        >
          <div className="grid justify-items-center text-center">
            <div className="relative mb-[var(--tg-space-xl)] rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] p-[var(--tg-space-lg)]">
              <FileCode2 className="h-10 w-10 text-[var(--tg-accent)]" />
              <span className="absolute -bottom-3 -right-4 rounded-[var(--tg-border-radius)] bg-[var(--tg-accent)] px-2 py-1 text-xs font-semibold">
                .pbf
              </span>
            </div>
            <h2 className="text-lg font-medium">
              Drag &amp; Drop a vector tile file here
            </h2>
            <p className="mt-[var(--tg-space-xs)] text-sm text-[var(--tg-text-secondary)]">
              Supports .pbf files
            </p>
            <span className="my-[var(--tg-space-lg)] text-xs text-[var(--tg-text-muted)]">
              or
            </span>
            <button
              type="button"
              onClick={choose}
              className="inline-flex items-center gap-[var(--tg-space-sm)] rounded-[var(--tg-border-radius)] bg-[var(--tg-accent)] px-[var(--tg-space-lg)] py-[var(--tg-space-md)] text-sm font-medium transition hover:bg-[var(--tg-accent-hover)]"
            >
              <FolderOpen className="h-4 w-4" />
              Open Tile File...
            </button>
            <input
              ref={inputRef}
              className="hidden"
              type="file"
              accept=".pbf"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                accept(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>
        </section>
      </section>
      <aside className="border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-[var(--tg-space-xl)]">
        <h2 className="text-base font-semibold">Quick Start</h2>
        <ol className="mt-[var(--tg-space-xl)] space-y-[var(--tg-space-lg)] text-sm text-[var(--tg-text-secondary)]">
          <li>
            <strong className="block text-[var(--tg-text-primary)]">
              Open a Tile
            </strong>
            Load a vector tile file to begin inspection.
          </li>
          <li>
            <strong className="block text-[var(--tg-text-primary)]">
              Navigate the Canvas
            </strong>
            Drag to pan, scroll to zoom, and point to highlight features.
          </li>
          <li>
            <strong className="block text-[var(--tg-text-primary)]">
              Select Features
            </strong>
            Click a feature to create a selection overlay.
          </li>
        </ol>
      </aside>
    </main>
  );
}
