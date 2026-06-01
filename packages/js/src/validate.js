import { gunzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { decodeMvt } from './utils/pbf-decoder.js';
import { validateFeatureGeometry } from './utils/geometry.js';

export async function validateTile(source, options = {}) {
  const startTime = Date.now();
  const errors = [];
  const warnings = [];

  let tileData;
  try {
    tileData = await fetchTileBytes(source, options);
  } catch (err) {
    return fail(source, startTime, 'FETCH_ERROR', err.message);
  }

  if (tileData.length === 0) {
    return fail(source, startTime, 'EMPTY_SOURCE', 'Tile source returned 0 bytes');
  }

  let buffer = tileData;
  if (isGzipped(buffer)) {
    try {
      buffer = gunzipSync(buffer);
    } catch (err) {
      return fail(source, startTime, 'DECOMPRESS_ERROR', `Tile appears gzipped but failed to decompress: ${err.message}`);
    }
  }

  let tile;
  try {
    tile = decodeMvt(buffer);
  } catch (err) {
    return fail(source, startTime, 'DECODE_ERROR', `Failed to decode .pbf: ${err.message}`);
  }

  const availableLayers = Object.keys(tile.layers);
  const layerResults = {};
  let totalFeatures = 0;

  for (const requiredLayer of options.requiredLayers || []) {
    if (!tile.layers[requiredLayer]) {
      errors.push({
        code: 'MISSING_LAYER',
        message: `Required layer "${requiredLayer}" not found`,
        available: availableLayers
      });
    }
  }

  for (const [layerName, layer] of Object.entries(tile.layers)) {
    const featureCount = layer.features.length;
    const geometryErrors = [];
    const propertyErrors = [];
    const layerErrors = [];
    totalFeatures += featureCount;

    const layerConfig = options.layerConfig?.[layerName] || {};
    if (isSet(layerConfig.minFeatures) && featureCount < layerConfig.minFeatures) {
      layerErrors.push({
        code: 'LOW_LAYER_FEATURES',
        message: `Layer "${layerName}" has ${featureCount} features, expected at least ${layerConfig.minFeatures}`
      });
    }
    if (isSet(layerConfig.maxFeatures) && featureCount > layerConfig.maxFeatures) {
      layerErrors.push({
        code: 'HIGH_LAYER_FEATURES',
        message: `Layer "${layerName}" has ${featureCount} features, expected at most ${layerConfig.maxFeatures}`
      });
    }

    if (options.checkGeometry !== false) {
      for (let featureIndex = 0; featureIndex < layer.features.length; featureIndex++) {
        const feature = layer.features[featureIndex];
        const featureErrors = validateFeatureGeometry(feature, layer.extent);
        for (const geometryError of featureErrors) {
          geometryErrors.push({ featureIndex, ...geometryError });
        }
      }
    }

    const requiredProperties = options.requiredProperties?.[layerName] || [];
    if (requiredProperties.length) {
      for (let featureIndex = 0; featureIndex < layer.features.length; featureIndex++) {
        const props = layer.features[featureIndex].properties || {};
        for (const property of requiredProperties) {
          if (!Object.prototype.hasOwnProperty.call(props, property)) {
            propertyErrors.push({
              code: 'MISSING_PROPERTY',
              featureIndex,
              property,
              message: `Feature ${featureIndex} in "${layerName}" is missing property "${property}"`
            });
          }
        }
      }
    }

    errors.push(...layerErrors.map((error) => ({ ...error, layer: layerName })));
    if (geometryErrors.length) {
      errors.push({
        code: 'GEOMETRY_INVALID',
        layer: layerName,
        message: `${geometryErrors.length} geometry issue(s) in layer "${layerName}"`,
        details: geometryErrors.slice(0, options.maxDetails ?? 10)
      });
    }
    if (propertyErrors.length) {
      errors.push({
        code: 'MISSING_PROPERTY',
        layer: layerName,
        message: `${propertyErrors.length} required propert${propertyErrors.length === 1 ? 'y is' : 'ies are'} missing in layer "${layerName}"`,
        details: propertyErrors.slice(0, options.maxDetails ?? 10)
      });
    }

    layerResults[layerName] = {
      featureCount,
      extent: layer.extent,
      version: layer.version,
      valid: layerErrors.length === 0 && geometryErrors.length === 0 && propertyErrors.length === 0,
      geometryErrors,
      propertyErrors
    };
  }

  if (isSet(options.minFeatures) && totalFeatures < options.minFeatures) {
    errors.push({
      code: 'LOW_TOTAL_FEATURES',
      message: `Tile has ${totalFeatures} features total, expected at least ${options.minFeatures}`
    });
  }
  if (isSet(options.maxFeatures) && totalFeatures > options.maxFeatures) {
    errors.push({
      code: 'HIGH_TOTAL_FEATURES',
      message: `Tile has ${totalFeatures} features total, expected at most ${options.maxFeatures}`
    });
  }
  if (totalFeatures === 0 && !options.allowEmpty) {
    warnings.push({ code: 'EMPTY_TILE', message: 'Tile contains 0 features' });
  }

  return {
    pass: errors.length === 0,
    source,
    layers: layerResults,
    availableLayers,
    totalFeatures,
    errors,
    warnings,
    duration: Date.now() - startTime
  };
}

export async function validateBatch(sources, options = {}) {
  const list = Array.isArray(sources) ? sources : await readSourceList(sources);
  const results = [];
  for (const source of list) {
    if (source.trim()) results.push(await validateTile(source.trim(), options));
  }
  return results;
}

async function readSourceList(path) {
  const text = await readFile(path, 'utf8');
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
}

async function fetchTileBytes(source, options) {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const timeout = options.timeout ?? 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(source, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return Buffer.from(await response.arrayBuffer());
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (source.endsWith('.mbtiles')) {
    throw new Error('MBTiles sources require a tile extraction adapter; pass a .pbf file or URL for now');
  }

  return readFile(source);
}

function fail(source, startTime, code, message) {
  return {
    pass: false,
    source,
    layers: {},
    availableLayers: [],
    totalFeatures: 0,
    errors: [{ code, message }],
    warnings: [],
    duration: Date.now() - startTime
  };
}

function isGzipped(buffer) {
  return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

function isSet(value) {
  return value !== undefined && value !== null;
}
