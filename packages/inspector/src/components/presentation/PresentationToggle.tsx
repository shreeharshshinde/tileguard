/**
 * @tileguard/inspector — PresentationToggle (Milestone 7.5 — Step D)
 *
 * A toolbar button that activates/deactivates Presentation Mode.
 * Shows a projector icon with a tooltip.
 *
 * Shortcut: Ctrl+Shift+P (registered in ShortcutService)
 */

import { Monitor, MonitorOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getPresentationService } from '../../services/PresentationService.js';

interface PresentationToggleProps {
  /** Optional extra className for positioning within a toolbar. */
  readonly className?: string;
}

export function PresentationToggle({ className = '' }: PresentationToggleProps): JSX.Element {
  const service = getPresentationService();
  const [active, setActive] = useState(service.isActive());

  useEffect(() => {
    const unsub = service.subscribe((next) => setActive(next));
    return unsub;
  }, [service]);

  const handleClick = () => {
    service.toggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1.5 rounded-[var(--tg-border-radius)] px-[var(--tg-space-sm)] py-1 text-xs font-medium transition ${
        active
          ? 'bg-[var(--tg-accent)] text-white'
          : 'text-[var(--tg-text-secondary)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]'
      } ${className}`}
      aria-pressed={active}
      aria-label={active ? 'Disable presentation mode (Ctrl+Shift+P)' : 'Enable presentation mode (Ctrl+Shift+P)'}
      title={active ? 'Exit Presentation Mode' : 'Presentation Mode (Ctrl+Shift+P)'}
    >
      {active ? (
        <MonitorOff className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Monitor className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="hidden xl:inline">
        {active ? 'Exit Presentation' : 'Present'}
      </span>
    </button>
  );
}
