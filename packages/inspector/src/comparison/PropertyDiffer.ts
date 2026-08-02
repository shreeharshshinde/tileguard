/**
 * @tileguard/inspector — PropertyDiffer (Milestone 7 — Step 1)
 *
 * Compares the properties of two FeatureSnapshots and produces a detailed
 * PropertyDiff describing added, removed, and modified properties.
 *
 * Change detection:
 *   - Added:    key present in B but not in A
 *   - Removed:  key present in A but not in B
 *   - Modified: key present in both but value changed (by JSON equality)
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import type {
  FeatureSnapshot,
  PropertyDiff,
  PropertyDiffEntry,
} from './models.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Deep equality check for property values.
 * Uses JSON serialization for reliable structural comparison.
 * Handles undefined, null, numbers, booleans, strings, objects, arrays.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // Handle NaN
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
  }
  // Deep structural comparison via JSON for objects/arrays
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    // Circular references or non-serialisable — fall back to reference equality
    return false;
  }
}

// ---------------------------------------------------------------------------
// PropertyDiffer Interface
// ---------------------------------------------------------------------------

export interface PropertyDiffer {
  /**
   * Compare the properties of two features and return a detailed diff.
   *
   * @param featureA The "before" feature snapshot.
   * @param featureB The "after" feature snapshot.
   */
  diff(featureA: FeatureSnapshot, featureB: FeatureSnapshot): PropertyDiff;

  /**
   * Compare two property records directly.
   * Useful when comparing properties outside a full feature context.
   */
  diffProperties(
    propsA: Readonly<Record<string, unknown>>,
    propsB: Readonly<Record<string, unknown>>,
  ): PropertyDiff;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PropertyDifferImpl implements PropertyDiffer {
  diff(featureA: FeatureSnapshot, featureB: FeatureSnapshot): PropertyDiff {
    return this.diffProperties(featureA.properties, featureB.properties);
  }

  diffProperties(
    propsA: Readonly<Record<string, unknown>>,
    propsB: Readonly<Record<string, unknown>>,
  ): PropertyDiff {
    const keysA = new Set(Object.keys(propsA));
    const keysB = new Set(Object.keys(propsB));
    const allKeys = new Set([...keysA, ...keysB]);

    const entries: PropertyDiffEntry[] = [];
    let addedCount = 0;
    let removedCount = 0;
    let modifiedCount = 0;

    // Sort keys for deterministic output
    const sortedKeys = [...allKeys].sort();

    for (const key of sortedKeys) {
      const inA = keysA.has(key);
      const inB = keysB.has(key);

      if (inA && !inB) {
        entries.push(
          Object.freeze({ kind: 'removed' as const, key, valueA: propsA[key] }),
        );
        removedCount++;
      } else if (!inA && inB) {
        entries.push(
          Object.freeze({ kind: 'added' as const, key, valueB: propsB[key] }),
        );
        addedCount++;
      } else if (inA && inB) {
        if (!valuesEqual(propsA[key], propsB[key])) {
          entries.push(
            Object.freeze({
              kind: 'modified' as const,
              key,
              valueA: propsA[key],
              valueB: propsB[key],
            }),
          );
          modifiedCount++;
        }
      }
    }

    const changed = entries.length > 0;

    return Object.freeze({
      changed,
      entries: Object.freeze(entries),
      addedCount,
      removedCount,
      modifiedCount,
    });
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a PropertyDiffer instance.
 *
 * @example
 *   const differ = createPropertyDiffer();
 *   const diff = differ.diff(featureA, featureB);
 *   for (const entry of diff.entries) {
 *     if (entry.kind === 'modified') { ... }
 *   }
 */
export function createPropertyDiffer(): PropertyDiffer {
  return new PropertyDifferImpl();
}
