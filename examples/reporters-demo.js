/**
 * reporters-demo.js
 *
 * Runs the TileGuard engine against real invalid fixtures and demonstrates
 * both built-in reporters: text (human-readable) and JSON (machine-readable).
 *
 * Usage:
 *   node examples/reporters-demo.js
 *
 * Requires packages to be built first:
 *   pnpm build
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '../packages/core/dist/index.js';
import { createJsonReporter, createTextReporter } from '../packages/reporters/dist/index.js';
import { stylePlugin } from '../packages/style-rules/dist/index.js';
import { tilePlugin } from '../packages/tile-rules/dist/index.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const sources = [
  path.join(rootDir, 'fixtures/bad/deprecated-ref.json'),
  path.join(rootDir, 'fixtures/bad/invalid-tile-self-intersection.pbf'),
];

const engine = createEngine({ plugins: [stylePlugin, tilePlugin] });
const result = await engine.run(sources);

const context = {
  duration: result.summary.duration,
  sources,
  ruleCount: result.summary.ruleExecutions,
  artifactCount: result.summary.artifactCount,
  summary: {
    errors: result.summary.errors,
    warnings: result.summary.warnings,
    infos: result.summary.infos,
    pass: result.summary.pass,
  },
  config: {},
};

// ── Text reporter ──────────────────────────────────────────────────────────

const separator = '─'.repeat(60);

process.stdout.write(`${separator}\n Text reporter\n${separator}\n`);
createTextReporter().report(result.diagnostics, context);

// ── JSON reporter ──────────────────────────────────────────────────────────

process.stdout.write(`\n${separator}\n JSON reporter\n${separator}\n`);
createJsonReporter({ indent: 2 }).report(result.diagnostics, context);
