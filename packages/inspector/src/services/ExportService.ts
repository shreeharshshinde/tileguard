/**
 * @tileguard/inspector — ExportService (Milestone 6 — Step 4)
 *
 * Architecture stub for the tile inspection export pipeline.
 * Full implementation deferred to Milestone 7.
 *
 * Prepares the API surface so that:
 *   1. The Inspector facade can expose export methods in Step 4.
 *   2. Milestone 7 can provide concrete implementations without API changes.
 *
 * Supported export formats (planned):
 *   - PNG  — canvas screenshot with optional overlay
 *   - JSON — feature data dump as GeoJSON-like structure
 *   - PDF  — printable diagnostic report (requires headless rendering)
 *   - Markdown — human-readable inspection summary
 *
 * Boundary: Zero imports from renderer/, overlay/, or DOM APIs in this
 * stub. Concrete implementations in Milestone 7 will access the canvas.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ExportFormat = 'png' | 'json' | 'markdown';

export interface ExportOptions {
  /** Target format. */
  readonly format: ExportFormat;
  /** Whether to include the diagnostic overlay in PNG exports. */
  readonly includeOverlay?: boolean;
  /** Whether to include all features or only the selected feature in JSON exports. */
  readonly selectedOnly?: boolean;
  /** Title for markdown reports. */
  readonly title?: string;
}

export interface ExportResult {
  /** Export format that was produced. */
  readonly format: ExportFormat;
  /** Blob containing the exported data. */
  readonly blob: Blob;
  /** Suggested file name including extension. */
  readonly fileName: string;
  /** Size in bytes. */
  readonly sizeBytes: number;
}

// ---------------------------------------------------------------------------
// ExportService interface
// ---------------------------------------------------------------------------

export interface ExportService {
  /**
   * Export the current inspection state in the requested format.
   * Returns a rejected promise with ExportNotImplementedError when the
   * format is not yet implemented (Milestone 7).
   */
  export(options: ExportOptions): Promise<ExportResult>;

  /**
   * Returns the set of formats that this ExportService can produce.
   * In the Step 4 stub, this is always empty.
   */
  getSupportedFormats(): readonly ExportFormat[];
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ExportNotImplementedError extends Error {
  constructor(format: ExportFormat) {
    super(
      `Export format '${format}' is not yet implemented. ` +
        'Full export support will be available in Milestone 7.',
    );
    this.name = 'ExportNotImplementedError';
  }
}

// ---------------------------------------------------------------------------
// Stub implementation
// ---------------------------------------------------------------------------

class ExportServiceStub implements ExportService {
  getSupportedFormats(): readonly ExportFormat[] {
    // No formats implemented yet — Milestone 7 will fill this in.
    return [];
  }

  async export(options: ExportOptions): Promise<ExportResult> {
    throw new ExportNotImplementedError(options.format);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates an ExportService.
 *
 * In Step 4 this returns a stub that rejects all export calls with
 * ExportNotImplementedError. Milestone 7 will replace the implementation.
 *
 * @example
 *   const exporter = createExportService();
 *   const formats = exporter.getSupportedFormats(); // []
 *   // Use getSupportedFormats() to guard before calling export():
 *   if (formats.includes('json')) {
 *     const result = await exporter.export({ format: 'json' });
 *   }
 */
export function createExportService(): ExportService {
  return new ExportServiceStub();
}
