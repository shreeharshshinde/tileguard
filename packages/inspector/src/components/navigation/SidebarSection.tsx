/**
 * @tileguard/inspector — SidebarSection (Phase 2 — Step 2)
 *
 * A labelled group of SidebarItems with a horizontal separator above it.
 * Renders the section title and its children items.
 */
interface SidebarSectionProps {
  readonly label?: string;
  readonly children: React.ReactNode;
  /** If true, adds a top border separator before this section. */
  readonly withDivider?: boolean;
}

export function SidebarSection({
  label,
  children,
  withDivider = false,
}: SidebarSectionProps): JSX.Element {
  return (
    <div className={withDivider ? 'pt-3' : 'pt-1'}>
      {withDivider && (
        <div
          className="mx-2 mb-2 h-px bg-[var(--tg-border)]"
          aria-hidden="true"
        />
      )}
      {label && (
        <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]">
          {label}
        </p>
      )}
      <div className="space-y-0.5 px-1">{children}</div>
    </div>
  );
}
