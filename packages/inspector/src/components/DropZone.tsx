import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';

export interface DropZoneProps {
  readonly onFileSelected: (file: File) => void;
}

/** Browser-safe vector tile file loader used for dropping and file selection. */
export function DropZone({ onFileSelected }: DropZoneProps): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chooseFile = () => inputRef.current?.click();
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file !== undefined) {
      onFileSelected(file);
    }
    event.target.value = '';
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file !== undefined) {
      onFileSelected(file);
    }
  };
  return (
    <section
      className="absolute inset-0 z-10 grid place-items-center bg-[var(--tg-bg-primary)]/85 p-[var(--tg-space-2xl)]"
      aria-label="Vector tile file drop zone"
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
    >
      <div
        className={`grid w-full max-w-xl justify-items-center gap-[var(--tg-space-md)] border border-dashed bg-[var(--tg-bg-secondary)] p-[var(--tg-space-2xl)] text-center ${isDragOver ? 'border-[var(--tg-accent)] shadow-[var(--tg-shadow-lg)]' : 'border-[var(--tg-border)]'}`}
      >
        <span className="text-4xl text-[var(--tg-accent)]" aria-hidden="true">
          []
        </span>
        <h2 className="text-lg font-medium text-[var(--tg-text-primary)]">
          Drag &amp; Drop a vector tile file here
        </h2>
        <p className="text-sm text-[var(--tg-text-secondary)]">
          Supports .pbf files
        </p>
        <span className="text-xs text-[var(--tg-text-muted)]">or</span>
        <button
          type="button"
          onClick={chooseFile}
          className="rounded-[var(--tg-border-radius)] bg-[var(--tg-accent)] px-[var(--tg-space-lg)] py-[var(--tg-space-md)] text-sm font-medium text-[var(--tg-text-primary)] hover:bg-[var(--tg-accent-hover)]"
        >
          Open Tile File...
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pbf"
          className="hidden"
          onChange={onChange}
        />
      </div>
    </section>
  );
}
