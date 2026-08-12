/**
 * @tileguard/cli — `version` command
 *
 * Displays version information and package details.
 *
 * Usage:
 *   tileguard version [--json]
 */

import type { OutputFormat } from '../output/OutputFormatter.js';
import type { CliCommandResult } from '../runner/CommandRunner.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILEGUARD_VERSION = '0.5.0';
const _NODE_MIN = '18.0.0';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

export interface VersionArgs {
  readonly format?: OutputFormat;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export function runVersion(args: VersionArgs = {}): CliCommandResult {
  const info = {
    tileguard: TILEGUARD_VERSION,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    packages: {
      core: TILEGUARD_VERSION,
      'tile-rules': TILEGUARD_VERSION,
      'style-rules': TILEGUARD_VERSION,
      reporters: TILEGUARD_VERSION,
      config: TILEGUARD_VERSION,
      cli: TILEGUARD_VERSION,
    },
  };

  if (args.format === 'json') {
    return {
      exitCode: 0,
      output: `${JSON.stringify(info, null, 2)}\n`,
    };
  }

  const lines = [
    `tileguard v${TILEGUARD_VERSION}`,
    `node     ${process.version}`,
    `platform ${process.platform} (${process.arch})`,
    '',
    'Packages:',
    `  @tileguard/core         ${TILEGUARD_VERSION}`,
    `  @tileguard/tile-rules   ${TILEGUARD_VERSION}`,
    `  @tileguard/style-rules  ${TILEGUARD_VERSION}`,
    `  @tileguard/reporters    ${TILEGUARD_VERSION}`,
    `  @tileguard/config       ${TILEGUARD_VERSION}`,
    `  @tileguard/cli          ${TILEGUARD_VERSION}`,
    '',
  ];

  return {
    exitCode: 0,
    output: lines.join('\n'),
  };
}

/** Get the current CLI version string. */
export function getVersion(): string {
  return TILEGUARD_VERSION;
}
