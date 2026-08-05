/**
 * @tileguard/inspector — QuickActions
 *
 * Three primary entry-point actions on the Home screen:
 *   - Load Tile     — react-dropzone drag-and-drop zone + click to pick
 *   - Load Style    — OS file picker for a MapLibre .json style
 *   - Open Demo     — scrolls to / triggers the demo gallery
 *
 * Libraries:
 *   - react-dropzone   reliable cross-browser drag-and-drop with MIME filtering
 *   - framer-motion    entrance stagger + hover lift + drag-state icon animation
 *   - @radix-ui/react-tooltip  accessible keyboard shortcut hints on each button
 *   - sonner           toast on rejected file type
 */
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { FileJson, PlayCircle, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

export interface QuickActionsProps {
  readonly onFileSelected: (file: File) => void;
  readonly onOpenDemo: () => void;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const card = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
};

// ---------------------------------------------------------------------------
// ActionTooltip — wraps any trigger in a Radix accessible tooltip
// ---------------------------------------------------------------------------

function ActionTooltip({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}): JSX.Element {
  return (
    <Tooltip.Root delayDuration={350}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          className="z-50 rounded-lg border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-2.5 py-1.5 text-[11px] text-[var(--tg-text-secondary)] shadow-xl"
        >
          {label}
          <Tooltip.Arrow className="fill-[var(--tg-border)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// ---------------------------------------------------------------------------
// TileDropZone — drag-and-drop + click to open .pbf / .mvt tiles
// ---------------------------------------------------------------------------

function TileDropZone({
  onFileSelected,
}: {
  onFileSelected: (f: File) => void;
}): JSX.Element {
  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      // Accept any binary file with .pbf or .mvt extension.
      // We use '*' as the MIME because browsers often send
      // 'application/octet-stream' or '' for these binary formats.
      accept: {
        '*/*': ['.pbf', '.mvt'],
      },
      maxFiles: 1,
      onDropAccepted: (files) => {
        const file = files[0];
        if (file !== undefined) onFileSelected(file);
      },
      onDropRejected: () => {
        toast.error('Invalid file type', {
          description: 'Drop a .pbf or .mvt vector tile file.',
          duration: 4000,
        });
      },
    });

  const borderColor = isDragReject
    ? 'border-[var(--tg-error)] bg-[var(--tg-error)]/5 text-[var(--tg-error)]'
    : isDragActive
      ? 'border-[var(--tg-accent)] bg-[var(--tg-accent)]/10 text-[var(--tg-accent)]'
      : 'border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] text-[var(--tg-text-primary)] hover:border-[var(--tg-accent)]/60 hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-accent)]';

  const { onClick, onKeyDown, onFocus, onBlur, onDragEnter, onDragLeave, onDragOver, onDrop, tabIndex, role, ...restRootProps } = getRootProps();

  return (
    <ActionTooltip label="Click or drag & drop a .pbf / .mvt tile file">
      <motion.div variants={card} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
        {/* Wrapper div carries dropzone events — motion.div carries Framer props only */}
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
          {...restRootProps}
          className={`flex h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--tg-panel-radius)] border-2 border-dashed px-6 py-6 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)] ${borderColor}`}
          aria-label="Load a vector tile — click or drag and drop a .pbf file"
        >
          <input {...getInputProps()} />

          <motion.span
            animate={
              isDragActive
                ? { scale: 1.2, rotate: -10 }
                : { scale: 1, rotate: 0 }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="block"
          >
            <Upload className="h-6 w-6" aria-hidden="true" />
          </motion.span>

          <span className="font-semibold">
            {isDragActive ? 'Drop to load…' : 'Load Tile'}
          </span>
          <span className="text-[10px] font-normal text-[var(--tg-text-muted)]">
            .pbf · .mvt
          </span>
        </div>
      </motion.div>
    </ActionTooltip>
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
    if (file !== undefined) onFileSelected(file);
    e.target.value = '';
  };

  const btnBase =
    'flex flex-col items-center justify-center gap-2 rounded-[var(--tg-panel-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-6 py-6 text-sm font-medium text-[var(--tg-text-primary)] transition-colors hover:border-[var(--tg-accent)]/60 hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)] w-full';

  return (
    <Tooltip.Provider>
      <section aria-labelledby="quick-actions-heading" className="mb-10">
        <h2
          id="quick-actions-heading"
          className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]"
        >
          Quick Actions
        </h2>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-3"
        >
          {/* Tile — dropzone */}
          <TileDropZone onFileSelected={onFileSelected} />

          {/* Style — OS file picker */}
          <ActionTooltip label="Load a MapLibre GL / Mapbox style (.json)">
            <motion.button
              type="button"
              variants={card}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              className={btnBase}
              onClick={() => styleInputRef.current?.click()}
              aria-label="Load a MapLibre style (.json)"
            >
              <FileJson className="h-6 w-6" aria-hidden="true" />
              <span className="font-semibold">Load Style</span>
              <span className="text-[10px] font-normal text-[var(--tg-text-muted)]">
                .json
              </span>
            </motion.button>
          </ActionTooltip>

          {/* Open Demo */}
          <ActionTooltip label="Browse offline demo datasets — no internet required">
            <motion.button
              type="button"
              variants={card}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              className={btnBase}
              onClick={onOpenDemo}
              aria-label="Browse demo datasets"
            >
              <PlayCircle className="h-6 w-6" aria-hidden="true" />
              <span className="font-semibold">Open Demo</span>
              <span className="text-[10px] font-normal text-[var(--tg-text-muted)]">
                guided tour
              </span>
            </motion.button>
          </ActionTooltip>
        </motion.div>

        {/* Hidden style file input */}
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
