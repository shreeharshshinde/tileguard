/**
 * Demo runner for @tileguard/reporters.
 *
 * Runs the real TileGuard Engine on real bad fixtures (style/tile)
 * and formats the output using the text and JSON reporters.
 */

// Note: In a real integration, you would import these from the published packages:
// import { createEngine } from '@tileguard/core';
// import { stylePlugin } from '@tileguard/style-rules';
// import { tilePlugin } from '@tileguard/tile-rules';
// import { textReporter, jsonReporter } from '@tileguard/reporters';
import { createEngine } from '../packages/core/dist/index.js';
import { stylePlugin, styleRules } from '../packages/style-rules/dist/index.js';
import { tilePlugin, tileRules } from '../packages/tile-rules/dist/index.js';
import { textReporter, jsonReporter } from '../packages/reporters/dist/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../');

// Resolve path to some real validation fixtures
const invalidStylePath = path.join(rootDir, 'fixtures/bad/deprecated-ref.json');
const invalidTilePath = path.join(rootDir, 'fixtures/bad/invalid-tile-self-intersection.pbf');

async function runDemo() {
  console.log('================================================================');
  console.log('   Running TileGuard Engine on real invalid fixtures...   ');
  console.log('================================================================\n');

  // 1. Create engine loaded with style and tile plugins
  const engine = createEngine({
    plugins: [stylePlugin, tilePlugin],
    // The engine itself handles orchestrating rules and collecting results.
    // It accepts a reporter configuration, but we will run the report method
    // manually to demonstrate both output styles in this demo.
  });

  // 2. Execute validation on both files
  const runResult = await engine.run([invalidStylePath, invalidTilePath]);

  // 3. Construct ReporterContext manually to invoke reporters
  // Note: This manual reconstruction is acceptable for this demo to show
  // both reporters sequentially without running the engine twice.
  // In a real application, the Engine internally constructs the full context
  // and passes it directly to the configured reporter.
  const totalRulesCount = styleRules.length + tileRules.length;
  
  const context = {
    duration: runResult.summary.duration,
    sources: [invalidStylePath, invalidTilePath],
    ruleCount: totalRulesCount, // Used total loaded rules, not ruleExecutions
    artifactCount: runResult.summary.artifactCount,
    summary: {
      errors: runResult.summary.errors,
      warnings: runResult.summary.warnings,
      infos: runResult.summary.infos,
      pass: runResult.summary.pass,
    },
    config: {},
  };

  // 4. Format and print using the Text Reporter
  console.log('--- 1. TEXT REPORTER OUTPUT (Human Readable) ---');
  textReporter.report(runResult.diagnostics, context);

  console.log('\n----------------------------------------------------------------\n');

  // 5. Format and print using the JSON Reporter
  console.log('--- 2. JSON REPORTER OUTPUT (Machine Readable) ---');
  jsonReporter.report(runResult.diagnostics, context);
}

runDemo().catch((err) => {
  console.error('Demo failed:', err);
  process.exitCode = 1;
});
