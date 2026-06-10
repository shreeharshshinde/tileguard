#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { renderAll, renderCompare } from '../src/render-compare.js';
import { styleLint } from '../src/style-lint.js';
import { validateBatch, validateTile } from '../src/validate.js';
import { Reporter } from '../src/reporter.js';

const [, , command, ...args] = process.argv;

if (!command || ['-h', '--help'].includes(command)) {
  printHelp();
  process.exit(0);
}

if (command === 'style-lint') {
  const { source, options } = parseSimpleArgs(args);
  if (!source) {
    console.error('Provide a style JSON path');
    process.exit(2);
  }
  const reporter = new Reporter(options.format);
  const result = await styleLint(source);
  reporter.printLint(result);
  process.exit(result.pass ? 0 : 1);
}

if (command === 'render') {
  const { options } = parseSimpleArgs(args);
  const reporter = new Reporter(options.format);
  if (options.fixture) {
    const result = await renderCompare(options.fixture, options);
    reporter.printRender(result);
    process.exit(result.pass ? 0 : 1);
  }
  if (options.fixtures) {
    const results = await renderAll(options.fixtures, options);
    reporter.printRenderSummary(results);
    process.exit(results.every((result) => result.pass) ? 0 : 1);
  }
  console.error('Provide --fixture <path> or --fixtures <path>');
  process.exit(2);
}

if (command !== 'validate') {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(2);
}

const { source, options } = await parseValidateArgs(args);
const reporter = new Reporter(options.format);
const results = options.batch
  ? await validateBatch(options.batch, options)
  : [await validateTile(source, options)];

if (results.length === 1) reporter.printValidation(results[0]);
else reporter.printValidationBatch(results);

process.exit(results.every((result) => result.pass) ? 0 : 1);

async function parseValidateArgs(argsToParse) {
  const options = {
    requiredLayers: [],
    requiredProperties: {},
    layerConfig: {},
    format: 'text'
  };
  let source = null;

  for (let i = 0; i < argsToParse.length; i++) {
    const arg = argsToParse[i];
    if (arg === '--layers') {
      while (argsToParse[i + 1] && !argsToParse[i + 1].startsWith('--')) {
        options.requiredLayers.push(argsToParse[++i]);
      }
    } else if (arg === '--required-properties') {
      Object.assign(options.requiredProperties, parseRequiredProperties(argsToParse[++i]));
    } else if (arg === '--config') {
      Object.assign(options, JSON.parse(await readFile(argsToParse[++i], 'utf8')));
    } else if (arg === '--min-features') {
      options.minFeatures = Number(argsToParse[++i]);
    } else if (arg === '--max-features') {
      options.maxFeatures = Number(argsToParse[++i]);
    } else if (arg === '--skip-geometry') {
      options.checkGeometry = false;
    } else if (arg === '--allow-empty') {
      options.allowEmpty = true;
    } else if (arg === '--format') {
      options.format = argsToParse[++i];
    } else if (arg === '--batch') {
      options.batch = argsToParse[++i];
    } else if (!arg.startsWith('--') && !source) {
      source = arg;
    } else {
      throw new Error(`Unknown or misplaced argument: ${arg}`);
    }
  }

  if (!source && !options.batch) {
    console.error('Provide a tile source or --batch <file>');
    process.exit(2);
  }

  return { source, options };
}

function parseRequiredProperties(value) {
  const result = {};
  for (const spec of value.split(',')) {
    const [layer, props] = spec.split(':');
    if (layer && props) result[layer] = props.split('|').filter(Boolean);
  }
  return result;
}

function parseSimpleArgs(argsToParse) {
  const options = { format: 'text' };
  let source = null;
  for (let i = 0; i < argsToParse.length; i++) {
    const arg = argsToParse[i];
    if (arg === '--format') options.format = argsToParse[++i];
    else if (arg === '--fixture') options.fixture = argsToParse[++i];
    else if (arg === '--fixtures') options.fixtures = argsToParse[++i];
    else if (arg === '--output') options.output = argsToParse[++i];
    else if (arg === '--update') options.update = true;
    else if (!arg.startsWith('--') && !source) source = arg;
    else throw new Error(`Unknown or misplaced argument: ${arg}`);
  }
  return { source, options };
}

function printHelp() {
  console.log(`TileGuard

Usage:
  tileguard validate <tile.pbf|url> [options]
  tileguard validate --batch sources.txt [options]
  tileguard style-lint <style.json> [--format text|json]
  tileguard render --fixture <dir> [--format text|json]
  tileguard render --fixtures <dir> [--format text|json]

Options:
  --layers <names...>                 Required layer names
  --required-properties layer:a|b     Required properties, comma-separated by layer
  --min-features <n>                  Minimum total feature count
  --max-features <n>                  Maximum total feature count
  --skip-geometry                     Skip geometry validation
  --allow-empty                       Do not warn when a tile has no features
  --config <path>                     JSON config merged into options
  --format text|json                  Output format
`);
}
