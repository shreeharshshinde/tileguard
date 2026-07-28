/**
 * @tileguard/inspector — PropertyTable
 *
 * Renders the feature's properties as a key/value table.
 * Shows a placeholder message when no properties are present.
 */

import './PropertyTable.css';

export interface PropertyTableProps {
  readonly properties: Readonly<Record<string, unknown>>;
}

/** Format a property value for display in the table. */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/** Classify a value for syntax-like colouring. */
function valueClass(value: unknown): string {
  if (value === null || value === undefined)
    return 'property-table__value--null';
  if (typeof value === 'boolean')
    return 'property-table__value--boolean';
  if (typeof value === 'number')
    return 'property-table__value--number';
  return 'property-table__value--string';
}

export function PropertyTable({ properties }: PropertyTableProps): JSX.Element {
  const entries = Object.entries(properties);

  if (entries.length === 0) {
    return (
      <div className="property-table property-table--empty">
        <span className="property-table__empty-text">No properties</span>
      </div>
    );
  }

  return (
    <table className="property-table" aria-label="Feature properties">
      <thead className="property-table__head">
        <tr>
          <th className="property-table__th" scope="col">Key</th>
          <th className="property-table__th" scope="col">Value</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key} className="property-table__row">
            <td className="property-table__key" title={key}>
              {key}
            </td>
            <td
              className={`property-table__value ${valueClass(value)}`}
              title={formatValue(value)}
            >
              {formatValue(value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
