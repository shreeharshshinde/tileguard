/**
 * @tileguard/inspector — QuickActions (Phase 2 redesign)
 *
 * Three primary entry-point cards. Larger, more visual, with descriptions
 * and animated drop zones. Professional VS Code / Figma aesthetic.
 */
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { FileJson, Globe, PlayCircle, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

export interface QuickActionsProps {
  readonly onFileSelected: (file: File) => void;
  readonly onOpenDemo: () => void;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.18 } },
};

const card = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: 'easeOut' as const },
  },
};

// ---------------------------------------------------------------------------
// TileDropZone
// ---------------------------------------------------------------------------

function TileDropZone({
  onFileSelected,
}: {
  onFileSelected: (f: File) => void;
}): JSX.Element {
  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      accept: { '*/*': ['.pbf', '.mvt'] },
      maxFiles: 1,
      onDropAccepted: (files) => {
        const f = files[0];
        if (f) onFileSelected(f);
      },
      onDropRejected: () => {
        toast.error('Invalid file type', {
          description: 'Drop a .pbf or .mvt vector tile.',
          duration: 4000,
        });
      },
    });

  const state = isDragReject ? 'reject' : isDragActive ? 'active' : 'idle';

  const borderCls = {
    reject: 'border-[var(--tg-error)]/70 bg-[var(--tg-error)]/6',
    active:
      'border-[var(--tg-accent)] bg-[var(--tg-accent)]/8 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]',
    idle: 'border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] hover:border-[var(--tg-accent)]/50 hover:bg-[var(--tg-bg-hover)]',
  }[state];

  const iconColor = {
    reject: 'text-[var(--tg-error)]',
    active: 'text-[var(--tg-accent)]',
    idle: 'text-[var(--tg-text-muted)] group-hover:text-[var(--tg-accent)]',
  }[state];

  const {
    onClick,
    onKeyDown,
    onFocus,
    onBlur,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    tabIndex,
    role,
    ...rest
  } = getRootProps();

  return (
    <motion.div
      variants={card}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="col-span-2 sm:col-span-1"
    >
      <div
        onClick={onClick}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        tabIndex={tabIndex}
        role={role}
        {...rest}
        className={`group flex cursor-pointer flex-col gap-3 rounded-xl border-2 border-dashed p-6 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)] ${borderCls}`}
        aria-label="Load a vector tile — click or drag and drop"
      >
        <input {...getInputProps()} />
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tg-bg-surface)] transition-colors ${isDragActive ? 'bg-[var(--tg-accent)]/15' : ''}`}
        >
          <motion.div
            animate={
              isDragActive
                ? { scale: 1.25, rotate: -8 }
                : { scale: 1, rotate: 0 }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            <Upload
              className={`h-5 w-5 transition-colors ${iconColor}`}
              aria-hidden="true"
            />
          </motion.div>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--tg-text-primary)] group-hover:text-[var(--tg-accent)]">
            {isDragActive ? 'Drop to load…' : 'Load Tile'}
          </p>
          <p className="mt-0.5 text-xs text-[var(--tg-text-muted)]">
            Drag &amp; drop or click to browse
          </p>
          <p className="mt-1 font-mono text-[10px] text-[var(--tg-text-muted)]">
            .pbf · .mvt
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// QuickActions
// ---------------------------------------------------------------------------

export function QuickActions({
  onFileSelected,
  onOpenDemo,
}: QuickActionsProps): JSX.Element {
  const styleInputRef = useRef<HTMLInputElement>(null);

  const handleStyleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = '';
  };

  const secondaryCard = (
    icon: React.ReactNode,
    label: string,
    description: string,
    sub: string,
    onClick: () => void,
    ariaLabel: string,
  ) => (
    <motion.button
      type="button"
      variants={card}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      aria-label={ariaLabel}
      className="group flex flex-col gap-3 rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-6 text-left transition-all hover:border-[var(--tg-accent)]/50 hover:bg-[var(--tg-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tg-bg-surface)] text-[var(--tg-text-muted)] transition-colors group-hover:bg-[var(--tg-accent)]/10 group-hover:text-[var(--tg-accent)]">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--tg-text-primary)] group-hover:text-[var(--tg-accent)]">
          {label}
        </p>
        <p className="mt-0.5 text-xs text-[var(--tg-text-muted)]">
          {description}
        </p>
        <p className="mt-1 font-mono text-[10px] text-[var(--tg-text-muted)]">
          {sub}
        </p>
      </div>
    </motion.button>
  );

  return (
    <Tooltip.Provider>
      <section aria-labelledby="quick-actions-heading">
        <div className="mb-4 flex items-center gap-2">
          <h2
            id="quick-actions-heading"
            className="text-xs font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]"
          >
            Quick Start
          </h2>
          <div
            className="h-px flex-1 bg-[var(--tg-border)]"
            aria-hidden="true"
          />
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          <TileDropZone onFileSelected={onFileSelected} />

          {secondaryCard(
            <FileJson className="h-5 w-5" aria-hidden="true" />,
            'Load Style',
            'Validate a MapLibre style spec',
            '.json',
            () => styleInputRef.current?.click(),
            'Load a MapLibre style (.json)',
          )}

          {secondaryCard(
            <PlayCircle className="h-5 w-5" aria-hidden="true" />,
            'Open Demo',
            'Explore curated Tokyo datasets',
            'guided tour',
            onOpenDemo,
            'Browse demo datasets',
          )}
        </motion.div>

        <input
          ref={styleInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleStyleChange}
        />
      </section>
    </Tooltip.Provider>
  );
}
