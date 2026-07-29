/**
 * @tileguard/inspector — StatisticsCard
 *
 * A single summary metric card: label + large value + optional subtitle.
 */
import './StatisticsCard.css';

export interface StatisticsCardProps {
  readonly label: string;
  readonly value: number | string;
  readonly subtitle?: string;
  readonly accent?: 'default' | 'error' | 'warning' | 'info' | 'success';
}

export function StatisticsCard({
  label,
  value,
  subtitle,
  accent = 'default',
}: StatisticsCardProps): JSX.Element {
  return (
    <div className={`statistics-card statistics-card--${accent}`}>
      <span className="statistics-card__label">{label}</span>
      <span className="statistics-card__value">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {subtitle !== undefined && (
        <span className="statistics-card__subtitle">{subtitle}</span>
      )}
    </div>
  );
}
