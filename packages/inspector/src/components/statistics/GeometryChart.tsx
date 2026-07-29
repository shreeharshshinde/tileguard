/**
 * @tileguard/inspector — GeometryChart
 *
 * A lightweight SVG donut chart showing geometry type distribution.
 * No external charting libraries.
 */
import './GeometryChart.css';

export interface GeometryChartProps {
  readonly point: number;
  readonly line: number;
  readonly polygon: number;
}

interface Segment {
  label: string;
  value: number;
  color: string;
  cssVar: string;
}

const SEGMENTS: Omit<Segment, 'value'>[] = [
  { label: 'Points',   color: '#3b82f6', cssVar: '--tg-info' },
  { label: 'Lines',    color: '#22c55e', cssVar: '--tg-success' },
  { label: 'Polygons', color: '#f59e0b', cssVar: '--tg-warning' },
];

/** Build SVG arc path for a donut segment. */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end   = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function GeometryChart({
  point,
  line,
  polygon,
}: GeometryChartProps): JSX.Element {
  const values = [point, line, polygon];
  const total  = values.reduce((s, v) => s + v, 0);

  if (total === 0) {
    return (
      <div className="geometry-chart geometry-chart--empty">
        <span className="geometry-chart__empty-text">No geometry data</span>
      </div>
    );
  }

  const cx = 50;
  const cy = 50;
  const outerR = 40;
  const innerR = 24;
  let currentAngle = 0;

  const arcs = SEGMENTS.map((seg, i) => {
    const value    = values[i] ?? 0;
    const sweep    = (value / total) * 360;
    const start    = currentAngle;
    currentAngle  += sweep;

    if (sweep === 0) return null;

    return {
      ...seg,
      value,
      outerPath: describeArc(cx, cy, outerR, start, currentAngle),
      innerPath: describeArc(cx, cy, innerR, currentAngle, start),
      sweep,
    };
  });

  return (
    <div className="geometry-chart">
      <svg
        viewBox="0 0 100 100"
        className="geometry-chart__svg"
        aria-label="Geometry type distribution donut chart"
        role="img"
      >
        {arcs.map((arc) => {
          if (arc === null) return null;
          const d = `${arc.outerPath} L ${
            polarToCartesian(cx, cy, innerR, currentAngle - arc.sweep).x
          } ${
            polarToCartesian(cx, cy, innerR, currentAngle - arc.sweep).y
          } ${arc.innerPath} Z`;
          // Build the correct closed path for the donut segment
          const startOuter = polarToCartesian(cx, cy, outerR, arcs.indexOf(arc) === 0
            ? 0
            : arcs.slice(0, arcs.indexOf(arc)).reduce((s, a) => s + (a?.sweep ?? 0), 0));
          const endOuter   = polarToCartesian(cx, cy, outerR,
            arcs.slice(0, arcs.indexOf(arc) + 1).reduce((s, a) => s + (a?.sweep ?? 0), 0));
          const startInner = polarToCartesian(cx, cy, innerR,
            arcs.slice(0, arcs.indexOf(arc) + 1).reduce((s, a) => s + (a?.sweep ?? 0), 0));
          const endInner   = polarToCartesian(cx, cy, innerR, arcs.indexOf(arc) === 0
            ? 0
            : arcs.slice(0, arcs.indexOf(arc)).reduce((s, a) => s + (a?.sweep ?? 0), 0));
          const large      = arc.sweep > 180 ? 1 : 0;
          const pathD      = [
            `M ${startOuter.x} ${startOuter.y}`,
            `A ${outerR} ${outerR} 0 ${large} 1 ${endOuter.x} ${endOuter.y}`,
            `L ${startInner.x} ${startInner.y}`,
            `A ${innerR} ${innerR} 0 ${large} 0 ${endInner.x} ${endInner.y}`,
            'Z',
          ].join(' ');
          return (
            <path
              key={arc.label}
              d={pathD}
              fill={arc.color}
              opacity={0.85}
            >
              <title>{`${arc.label}: ${arc.value.toLocaleString()} (${Math.round((arc.value / total) * 100)}%)`}</title>
            </path>
          );
        })}
        {/* Centre label */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="geometry-chart__center-value"
          fontSize="10"
          fill="currentColor"
        >
          {total.toLocaleString()}
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          className="geometry-chart__center-label"
          fontSize="5"
          fill="currentColor"
        >
          features
        </text>
      </svg>
      <ul className="geometry-chart__legend" aria-label="Geometry legend">
        {SEGMENTS.map((seg, i) => {
          const val = values[i] ?? 0;
          if (val === 0) return null;
          return (
            <li key={seg.label} className="geometry-chart__legend-item">
              <span
                className="geometry-chart__legend-dot"
                style={{ backgroundColor: seg.color }}
                aria-hidden="true"
              />
              <span className="geometry-chart__legend-label">{seg.label}</span>
              <span className="geometry-chart__legend-value">
                {val.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
