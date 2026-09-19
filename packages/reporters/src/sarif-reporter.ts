/**
 * @tileguard/reporters — SARIF Reporter
 *
 * Produces a SARIF 2.1.0 JSON file that can be uploaded to GitHub Code
 * Scanning via `github/codeql-action/upload-sarif`, surfacing TileGuard
 * findings inline on pull request diff views.
 *
 * SARIF (Static Analysis Results Interchange Format) is the standard
 * accepted by GitHub, Azure DevOps, and most modern CI platforms for
 * structured static analysis output.
 *
 * TileGuard → SARIF mapping:
 *
 * | TileGuard          | SARIF                                            |
 * |--------------------|--------------------------------------------------|
 * | `ruleId`           | `result.ruleId` + `tool.driver.rules[].id`       |
 * | `severity`         | `result.level` (error/warning/note)              |
 * | `message`          | `result.message.text`                            |
 * | `artifact.source`  | `result.locations[].physicalLocation.uri`        |
 * | `location.layer`   | embedded in `result.message.text` (SARIF has no  |
 * |                    |   tile-specific extension point)                 |
 * | `docsUrl`          | `tool.driver.rules[].helpUri`                    |
 * | `suggestion`       | `result.fixes[].description.text`                |
 *
 * The reporter writes to a file (default: `./tileguard-results.sarif`).
 * It does NOT write to stdout — the SARIF file is the only output.
 *
 * @example
 * ```ts
 * // Via CLI:
 * // tileguard check ./tiles/ --reporter sarif
 *
 * // Programmatically:
 * import { createSarifReporter } from '@tileguard/reporters';
 * const reporter = createSarifReporter({ outputPath: 'out/results.sarif' });
 * ```
 *
 * @packageDocumentation
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Diagnostic, Reporter, ReporterContext, Severity } from '@tileguard/core';

// ---------------------------------------------------------------------------
// Public API types
// ---------------------------------------------------------------------------

export interface SarifReporterOptions {
  /**
   * File path where the SARIF JSON will be written.
   * Relative paths are resolved from `process.cwd()`.
   * Default: `'./tileguard-results.sarif'`
   */
  readonly outputPath?: string;

  /**
   * Tool version embedded in the SARIF envelope `tool.driver.version`.
   * Default: `'0.6.0'`
   */
  readonly toolVersion?: string;

  /**
   * Injectable write function for testing. When provided, the reporter
   * calls this instead of `fs.writeFileSync`. The function receives the
   * resolved output path and the SARIF JSON string.
   */
  readonly write?: (outputPath: string, content: string) => void;
}

// ---------------------------------------------------------------------------
// SARIF 2.1.0 structural types (minimal subset needed for TileGuard output)
// ---------------------------------------------------------------------------

interface SarifMessage {
  readonly text: string;
}

interface SarifArtifactLocation {
  readonly uri: string;
  readonly uriBaseId?: string;
}

interface SarifPhysicalLocation {
  readonly artifactLocation: SarifArtifactLocation;
}

interface SarifLocation {
  readonly physicalLocation: SarifPhysicalLocation;
  readonly message?: SarifMessage;
}

interface SarifFix {
  readonly description: SarifMessage;
}

interface SarifResult {
  readonly ruleId: string;
  readonly level: 'error' | 'warning' | 'note';
  readonly message: SarifMessage;
  readonly locations: readonly SarifLocation[];
  readonly fixes?: readonly SarifFix[];
}

interface SarifReportingDescriptor {
  readonly id: string;
  readonly name?: string;
  readonly shortDescription?: SarifMessage;
  readonly helpUri?: string;
}

interface SarifToolDriver {
  readonly name: string;
  readonly version: string;
  readonly informationUri: string;
  readonly rules: readonly SarifReportingDescriptor[];
}

interface SarifTool {
  readonly driver: SarifToolDriver;
}

interface SarifRun {
  readonly tool: SarifTool;
  readonly results: readonly SarifResult[];
}

interface SarifLog {
  readonly version: '2.1.0';
  readonly $schema: string;
  readonly runs: readonly SarifRun[];
}

// ---------------------------------------------------------------------------
// Severity mapping
// ---------------------------------------------------------------------------

const SEVERITY_TO_SARIF_LEVEL: Record<Severity, SarifResult['level']> = {
  error: 'error',
  warning: 'warning',
  info: 'note',
};

// ---------------------------------------------------------------------------
// Message builder — embeds tile-specific location context into SARIF message
// since SARIF has no tile-specific physical location model.
// ---------------------------------------------------------------------------

function buildResultMessage(diagnostic: Diagnostic): string {
  let text = diagnostic.message;

  if (diagnostic.location !== undefined) {
    const loc = diagnostic.location;
    const parts: string[] = [];
    if (loc.layer !== undefined) parts.push(`layer: ${loc.layer}`);
    if (loc.featureIndex !== undefined) parts.push(`feature: ${loc.featureIndex}`);
    if (loc.jsonPath !== undefined) parts.push(loc.jsonPath);
    if (parts.length > 0) {
      text += ` [${parts.join(', ')}]`;
    }
  }

  return text;
}

// ---------------------------------------------------------------------------
// Diagnostic → SARIF result mapper
// ---------------------------------------------------------------------------

function mapDiagnosticToResult(diagnostic: Diagnostic): SarifResult {
  const result: SarifResult = {
    ruleId: diagnostic.ruleId,
    level: SEVERITY_TO_SARIF_LEVEL[diagnostic.severity],
    message: { text: buildResultMessage(diagnostic) },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: diagnostic.artifact.source,
            uriBaseId: '%SRCROOT%',
          },
        },
      },
    ],
    ...(diagnostic.suggestion !== undefined && {
      fixes: [{ description: { text: diagnostic.suggestion } }],
    }),
  };

  return result;
}

// ---------------------------------------------------------------------------
// Rule descriptor builder — deduplicated from the diagnostic list
// ---------------------------------------------------------------------------

function buildRuleDescriptors(
  diagnostics: readonly Diagnostic[],
): SarifReportingDescriptor[] {
  const seen = new Map<string, SarifReportingDescriptor>();

  for (const d of diagnostics) {
    if (!seen.has(d.ruleId)) {
      seen.set(d.ruleId, {
        id: d.ruleId,
        name: d.ruleId,
        shortDescription: { text: d.message },
        ...(d.docsUrl !== undefined && { helpUri: d.docsUrl }),
      });
    }
  }

  return [...seen.values()];
}

// ---------------------------------------------------------------------------
// createSarifReporter
// ---------------------------------------------------------------------------

/**
 * Creates a SARIF 2.1.0 reporter that writes findings to a `.sarif` file.
 *
 * @param options - Optional configuration for output path, tool version,
 *   and injectable write function (for testing).
 * @returns A Reporter that writes a SARIF JSON file on each run.
 */
export function createSarifReporter(
  options: SarifReporterOptions = {},
): Reporter {
  const outputPath = options.outputPath ?? './tileguard-results.sarif';
  const toolVersion = options.toolVersion ?? '0.6.0';
  const writeFn = options.write ?? ((path, content) => {
    writeFileSync(resolve(path), content, 'utf-8');
  });

  return {
    id: 'sarif',

    report(diagnostics: readonly Diagnostic[], context: ReporterContext): void {
      const rules = buildRuleDescriptors(diagnostics);
      const results = diagnostics.map(mapDiagnosticToResult);

      const sarifLog: SarifLog = {
        version: '2.1.0',
        $schema:
          'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
        runs: [
          {
            tool: {
              driver: {
                name: 'TileGuard',
                version: toolVersion,
                informationUri: 'https://tileguard.dev',
                rules,
              },
            },
            results,
          },
        ],
      };

      // Use ruleCount from context to satisfy the linter; SARIF embeds it in rules[].
      void context.ruleCount;

      writeFn(outputPath, JSON.stringify(sarifLog, null, 2));
    },
  };
}

/**
 * Default SARIF reporter instance.
 * Writes to `./tileguard-results.sarif` in the current working directory.
 */
export const sarifReporter: Reporter = createSarifReporter();
