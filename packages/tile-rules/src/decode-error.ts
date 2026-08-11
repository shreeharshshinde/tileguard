/**
 * @tileguard/tile-rules — Decoder Diagnostics
 *
 * Structured error class for MVT/PBF decode failures. When thrown during
 * artifact loading, the engine can inspect the `data` and `location` fields
 * to produce richer diagnostics than a plain error message string.
 *
 * Design: DecodeError extends Error so it works with existing catch blocks.
 * The engine checks for a `data` property on caught errors and includes it
 * in the artifact/decode-failed diagnostic when present.
 */

import type { Location } from '@tileguard/core';

// ---------------------------------------------------------------------------
// DecodeDiagnosticData
// ---------------------------------------------------------------------------

/**
 * Structured data attached to decoder errors. Every field is optional because
 * context availability depends on where in the decode pipeline the failure
 * occurs — a varint error at byte 4 has no layer/feature context.
 */
export interface DecodeDiagnosticData {
  /** Byte offset in the (decompressed) PBF where the error occurred. */
  readonly byteOffset?: number;

  /** Protobuf field number being parsed when the error occurred. */
  readonly fieldNumber?: number;

  /** Protobuf wire type that triggered the error. */
  readonly wireType?: number;

  /** Layer name, if known at the time of failure. */
  readonly layer?: string;

  /** Feature index within the layer, if known. */
  readonly featureIndex?: number;

  /** Which string table was being accessed (for bounds errors). */
  readonly table?: 'keys' | 'values';

  /** The out-of-bounds index that was requested. */
  readonly requestedIndex?: number;

  /** The actual length of the string table. */
  readonly tableLength?: number;
}

// ---------------------------------------------------------------------------
// DecodeError
// ---------------------------------------------------------------------------

/**
 * A structured decode error carrying both a human-readable message and
 * machine-readable diagnostic data.
 *
 * The engine detects this via the `diagnosticData` property (duck-typing,
 * no cross-package instanceof required).
 */
export class DecodeError extends Error {
  /** Structured diagnostic data for this decode failure. */
  readonly diagnosticData: DecodeDiagnosticData;

  /** Optional location hint for the diagnostic. */
  readonly location: Location | undefined;

  constructor(
    message: string,
    data: DecodeDiagnosticData,
    location?: Location,
  ) {
    // Build a human-readable message that includes key context
    const parts = [message];
    if (data.byteOffset !== undefined) {
      parts.push(`at byte offset ${data.byteOffset}`);
    }
    super(parts.join(' '));

    this.name = 'DecodeError';
    this.diagnosticData = data;
    this.location = location;
  }
}
