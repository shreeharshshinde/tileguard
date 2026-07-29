/**
 * @tileguard/inspector — Section
 *
 * Collapsible section container for SettingsPanel categories.
 */
import type { ReactNode } from 'react';
import './Section.css';

export interface SectionProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
}

export function Section({
  title,
  children,
  defaultOpen = true,
}: SectionProps): JSX.Element {
  return (
    <details className="settings-section" open={defaultOpen}>
      <summary className="settings-section__summary">
        <span className="settings-section__title">{title}</span>
        <span className="settings-section__chevron" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="settings-section__content">{children}</div>
    </details>
  );
}
