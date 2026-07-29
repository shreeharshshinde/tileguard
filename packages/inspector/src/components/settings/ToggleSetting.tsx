/**
 * @tileguard/inspector — ToggleSetting
 *
 * A checkbox-based boolean setting row.
 * Label + optional description + checkbox toggle.
 */
import './ToggleSetting.css';

export interface ToggleSettingProps {
  readonly label: string;
  readonly description?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
}

export function ToggleSetting({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleSettingProps): JSX.Element {
  return (
    <label
      className={`toggle-setting${disabled ? ' toggle-setting--disabled' : ''}`}
    >
      <div className="toggle-setting__text">
        <span className="toggle-setting__label">{label}</span>
        {description !== undefined && (
          <span className="toggle-setting__description">{description}</span>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="toggle-setting__checkbox"
        aria-label={label}
      />
      <span className="toggle-setting__track" aria-hidden="true">
        <span className="toggle-setting__thumb" />
      </span>
    </label>
  );
}
