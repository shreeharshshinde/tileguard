/**
 * @tileguard/inspector — SliderSetting
 *
 * A range-input setting row with label, current value display, and
 * min/max/step config.
 */
import './SliderSetting.css';

export interface SliderSettingProps {
  readonly label: string;
  readonly description?: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (value: number) => void;
  /** Optional formatter for the displayed value (default: number as-is). */
  readonly format?: (v: number) => string;
  readonly disabled?: boolean;
}

export function SliderSetting({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
  format,
  disabled = false,
}: SliderSettingProps): JSX.Element {
  const displayed = format !== undefined ? format(value) : String(value);

  return (
    <div
      className={`slider-setting${disabled ? ' slider-setting--disabled' : ''}`}
    >
      <div className="slider-setting__header">
        <div className="slider-setting__text">
          <span className="slider-setting__label">{label}</span>
          {description !== undefined && (
            <span className="slider-setting__description">{description}</span>
          )}
        </div>
        <span className="slider-setting__value" aria-live="polite">
          {displayed}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-setting__range"
        aria-label={`${label}: ${displayed}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
    </div>
  );
}
