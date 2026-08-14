/**
 * @tileguard/tile-rules — Decoder Diagnostics
 *
 * Structured error class for MVT/PBF decode failures. When thrown during
 * artifact loading, the engine inspects the structured `diagnosticData`
 * and `location` fields to produce richer diagnostics than a plain error
 * message string.
 *
 * ## Error Recovery
 *
 * DecodeError is **not recoverable** — when thrown, it means the tile
 * cannot be decoded at all and no rules will execute against it. The engine
 * emits an `artifact/decode-failed` diagnostic and continues with other sources.
 *
 * ## Consumer Guidance
 *
 * Consumers should prefer the structured `diagnosticData` field over parsing
 * the human-readable error message. The message format is not stable; the
 * diagnostic data fields are part of the public API contract.
 *
 * @example
 * ```ts
 * try {
 *   const content = decodeMvt(bytes);
 * } catch (err) {
 *   if (err instanceof DecodeError) {
 *     console.log(err.diagnosticData.byteOffset); // e.g., 42
 *     console.log(err.diagnosticData.layer);      // e.g., 'buildings'
 *   }
 * }
 * ```
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
