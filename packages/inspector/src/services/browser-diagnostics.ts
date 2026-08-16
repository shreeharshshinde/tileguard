/**
 * Browser-safe tile diagnostics runner.
 *
 * Runs all browser-compatible tile validation rules against a pre-decoded
 * VectorTileArtifact without requiring file-system providers or Node APIs.
 *
 * This bridges the gap between the Inspector (browser, File API) and the
 * TileGuard engine (Node, file paths). Rules execute identically — only the
 * artifact loading mechanism differs.
 */
import type { Diagnostic } from '@tileguard/core';
import {
  tileRules,
  type VectorTileArtifact,
} from '@tileguard/tile-rules/browser';

interface DiagnosticDescriptor {
  message: string;
  location?: Record<string, unknown>;
  suggestion?: string;
  data?: Record<string, unknown>;
}

/**
 * Runs all browser-safe tile validation rules against a decoded artifact.
 *
 * @param artifact - A fully decoded VectorTileArtifact from decodeBrowserTile().
 * @returns An array of Diagnostic objects, same shape as engine.run() produces.
 */
export function runBrowserDiagnostics(
  artifact: VectorTileArtifact,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const rule of tileRules) {
    // Skip rules that don't handle VectorTile artifacts
    if (
      rule.artifactTypes &&
      rule.artifactTypes.length > 0 &&
      !rule.artifactTypes.includes(artifact.type)
    ) {
      continue;
    }

    try {
      const context = {
        artifact,
        options: undefined,
        report(descriptor: DiagnosticDescriptor) {
          diagnostics.push({
            ruleId: rule.id,
            severity: rule.meta.defaultSeverity,
            message: descriptor.message,
            artifact: artifact.ref,
            ...(descriptor.location !== undefined && {
              location: descriptor.location,
            }),
            ...(descriptor.suggestion !== undefined && {
              suggestion: descriptor.suggestion,
            }),
            ...(descriptor.data !== undefined && { data: descriptor.data }),
            ...(rule.meta.docsUrl !== undefined && {
              docsUrl: rule.meta.docsUrl,
            }),
          });
        },
      };

      const result = rule.create(context);
      // Rules may be sync or async — handle both
      if (result instanceof Promise) {
        // In the browser runner we don't await — all tile rules are synchronous
        // If async rules are added in the future, this should be awaited
      }
    } catch {
      // Rule threw — skip it, don't break the entire diagnostics pipeline
      diagnostics.push({
        ruleId: 'engine/rule-error',
        severity: 'error',
        message: `Rule "${rule.id}" threw an unexpected error during browser validation.`,
        artifact: artifact.ref,
      });
    }
  }

  return diagnostics;
}
