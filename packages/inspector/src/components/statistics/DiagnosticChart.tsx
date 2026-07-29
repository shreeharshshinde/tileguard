/**
 * @tileguard/inspector — DiagnosticChart
 *
 * Horizontal bar chart showing diagnostic severity distribution.
 * Pure SVG — no external charting library.
 */
import './DiagnosticChart.css';

export interface DiagnosticChartProps {
  readonly errors: number;
  readonly warnings: number;
  readonly info: number;
}

interface Bar {
  label: string;
  value: number;
  color: string;
  icon: string;
}

export function DiagnosticChart({
  errors,
  warnings,
  info,
}: DiagnosticChartProps): JSX.Element {
  const total = errors + warnings + info;

  if (total === 0) {
    return (
      <div className="diagnostic-chart diagnostic-chart--empty">
        <span className="diagnostic-chart__empty-text">✓ No diagnostics</span>
      </div>
    );
  }

  const bars: Bar[] = [
    { label: 'Errors', value: errors, color: 'var(--tg-error)', icon: '❌' },
    {
      label: 'Warnings',
      value: warnings,
      color: 'var(--tg-warning)',
      icon: '⚠',
    },
    { label: 'Info', value: info, color: 'var(--tg-info)', icon: 'ℹ' },
  ];

  return (
    <div
      className="diagnostic-chart"
      role="list"
      aria-label="Diagnostic severity chart"
    >
      {bars.map((bar) => {
        const pct = total > 0 ? (bar.value / total) * 100 : 0;
        return (
          <div
            key={bar.label}
            className="diagnostic-chart__row"
            role="listitem"
            aria-label={`${bar.label}: ${bar.value}`}
          >
            <span className="diagnostic-chart__icon" aria-hidden="true">
              {bar.icon}
            </span>
            <span className="diagnostic-chart__label">{bar.label}</span>
            <div className="diagnostic-chart__track" aria-hidden="true">
              <div
                className="diagnostic-chart__bar"
                style={{ width: `${pct}%`, backgroundColor: bar.color }}
              />
            </div>
            <span className="diagnostic-chart__count">
              {bar.value.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
