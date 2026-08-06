/**
 * @tileguard/inspector — Breadcrumb (Phase 2 — Step 4)
 *
 * Renders a breadcrumb trail from a string array.
 * The last entry is the current page (bold, no chevron after it).
 *
 * Usage:
 *   <Breadcrumb path={['Home', 'Workspace', 'Compare']} />
 *
 * Renders:
 *   Home  >  Workspace  >  Compare
 */
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbProps {
  readonly path: readonly string[];
}

export function Breadcrumb({ path }: BreadcrumbProps): JSX.Element {
  if (path.length === 0) return <></>;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {path.map((segment, index) => {
          const isLast = index === path.length - 1;
          return (
            <li key={`${segment}-${index}`} className="flex items-center gap-1">
              <span
                className={[
                  'text-xs',
                  isLast
                    ? 'font-medium text-[var(--tg-text-primary)]'
                    : 'text-[var(--tg-text-muted)]',
                ].join(' ')}
              >
                {segment}
              </span>
              {!isLast && (
                <ChevronRight
                  className="h-3 w-3 text-[var(--tg-text-muted)]"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
