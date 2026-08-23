/**
 * @tileguard/inspector — QuickActions (Phase 2 redesign)
 *
 * Three primary entry-point cards. Larger, more visual, with descriptions
 * and animated drop zones. Professional VS Code / Figma aesthetic.
 */
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, FileJson, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

export interface QuickActionsProps {
  readonly onFileSelected: (file: File) => void;
  readonly onOpenDemo?: () => void;
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
      accept: { 'application/octet-stream': ['.pbf', '.mvt'], 'application/x-protobuf': ['.pbf', '.mvt'] },
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

  const wrapperBorderCls = {
    reject: 'from-[var(--tg-error)]',
    active: 'from-[var(--tg-accent)]',
    idle: 'from-white/15 group-hover:from-[var(--tg-accent)]',
  }[state];

  const innerBgCls = {
    reject: 'bg-[var(--tg-error)]/5',
    active: 'bg-[var(--tg-accent)]/5',
    idle: 'bg-[#09090b]',
  }[state];

  const iconColor = {
    reject: 'text-[var(--tg-error)]',
    active: 'text-[var(--tg-accent)]',
    idle: 'text-white group-hover:text-[var(--tg-accent)]',
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
      whileTap={{ scale: 0.98 }}
      className="md:col-span-2 lg:col-span-2 lg:row-span-2 h-full"
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
        className="group relative flex h-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl bg-[#09090b] p-[1px] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(163,255,0,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)]"
        aria-label="Load a vector tile — click or drag and drop"
      >
        <input {...getInputProps()} />

        {/* Ultra-thin gradient border wrapper */}
        <div
          className={`absolute inset-0 z-0 bg-gradient-to-b to-transparent transition-all duration-500 ${isDragActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'} ${wrapperBorderCls}`}
        />

        {/* Inner card container */}
        <div
          className={`relative z-10 flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden rounded-[23px] px-8 py-20 text-center shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)] transition-colors duration-500 ${innerBgCls}`}
        >
          {/* Subtle radial glow on hover / active */}
          <div
            className={`absolute left-1/2 top-1/2 z-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--tg-accent)] blur-[120px] transition-opacity duration-700 ${isDragActive ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'}`}
          />

          <div
            className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-black ring-1 ring-white/5 shadow-[inset_0_1px_0px_rgba(255,255,255,0.1)] transition-all duration-500 ${isDragActive ? 'scale-110 ring-[var(--tg-accent)]/50 shadow-[0_0_30px_rgba(163,255,0,0.3)]' : 'group-hover:scale-110 group-hover:ring-[var(--tg-accent)]/40 group-hover:shadow-[0_0_20px_rgba(163,255,0,0.2)]'}`}
          >
            <motion.div
              animate={
                isDragActive
                  ? { scale: 1.15, rotate: -10 }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            >
              <Upload
                className={`h-8 w-8 transition-colors ${iconColor}`}
                aria-hidden="true"
              />
            </motion.div>
          </div>
          <div className="relative z-10 mt-2">
            <p className="text-3xl font-bold tracking-tight text-white transition-colors duration-500 group-hover:text-[var(--tg-accent)]">
              {isDragActive ? 'Drop to load…' : 'Load Vector Tile'}
            </p>
            <p className="mt-4 text-base leading-relaxed text-[var(--tg-text-secondary)] transition-colors duration-500 group-hover:text-white/70 max-w-sm mx-auto">
              Drag &amp; drop or click to browse for a .pbf or .mvt file
            </p>
          </div>
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
    onClick: () => void,
    ariaLabel: string,
    className?: string,
  ) => (
    <motion.button
      type="button"
      variants={card}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group relative flex h-full w-full flex-col items-start justify-between overflow-hidden rounded-3xl bg-[#09090b] p-[1px] text-left transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(163,255,0,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)] ${className || ''}`}
    >
      {/* Ultra-thin gradient border wrapper */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/15 to-transparent opacity-50 transition-opacity duration-500 group-hover:from-[var(--tg-accent)] group-hover:opacity-100" />

      {/* Inner card container */}
      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden rounded-[23px] bg-[#09090b] p-6 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]">
        {/* Subtle radial glow on hover */}
        <div className="absolute -left-10 -top-10 z-0 h-32 w-32 rounded-full bg-[var(--tg-accent)] opacity-0 blur-[50px] transition-opacity duration-700 group-hover:opacity-15" />

        {/* Top row: Icon */}
        <div className="relative z-10 mb-8 flex items-start">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black ring-1 ring-white/10 shadow-[inset_0_1px_0px_rgba(255,255,255,0.1)] text-white transition-all duration-500 group-hover:scale-110 group-hover:ring-[var(--tg-accent)]/40 group-hover:text-[var(--tg-accent)] group-hover:shadow-[0_0_20px_rgba(163,255,0,0.2)]">
            {icon}
          </div>
        </div>

        {/* Bottom row: Title and Description */}
        <div className="relative z-10 mt-auto flex flex-col gap-2">
          <h3 className="text-xl font-bold tracking-tight text-white transition-colors duration-500 group-hover:text-[var(--tg-accent)]">
            {label}
          </h3>
          <p className="text-[15px] leading-relaxed text-[var(--tg-text-secondary)] transition-colors duration-500 group-hover:text-white/80">
            {description}
          </p>
        </div>
      </div>
    </motion.button>
  );

  return (
    <Tooltip.Provider>
      <section aria-label="Quick Actions">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2"
        >
          <TileDropZone onFileSelected={onFileSelected} />

          {secondaryCard(
            <FileJson className="h-6 w-6" aria-hidden="true" />,
            'Load Style',
            'Validate a MapLibre style spec',
            () => styleInputRef.current?.click(),
            'Load a MapLibre style (.json)',
            'md:col-span-1 lg:col-span-1 lg:row-span-1',
          )}

          {secondaryCard(
            <div className="relative">
              <BookOpen className="h-6 w-6" aria-hidden="true" />
              <ExternalLink className="absolute -right-1 -top-1 h-3 w-3 opacity-60" aria-hidden="true" />
            </div>,
            'View Docs',
            'Quick-start guide & rule reference',
            () => window.open('https://shreeharshshinde.github.io/tileguard/', '_blank', 'noopener,noreferrer'),
            'Open TileGuard documentation',
            'md:col-span-2 lg:col-span-1 lg:row-span-1',
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
