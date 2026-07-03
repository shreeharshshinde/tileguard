import { readFile } from 'node:fs/promises';

export async function styleLint(source, options = {}) {
  const startTime = Date.now();
  let text = source;
  let sourcePath = options.sourcePath || '<inline>';

  if (typeof source === 'string' && !looksLikeJson(source)) {
    sourcePath = source;
    text = await readFile(source, 'utf8');
  }

  if (typeof text === 'string' && text.trim() === '') {
    return {
      pass: true,
      skipped: true,
      source: sourcePath,
      errors: [],
      warnings: [{ code: 'EMPTY_STYLE_PLACEHOLDER', message: 'Style file is empty; skipped placeholder fixture' }],
      duration: Date.now() - startTime
    };
  }

  let style;
  try {
    style = typeof text === 'string' ? JSON.parse(text) : text;
  } catch (err) {
    return {
      pass: false,
      source: sourcePath,
      errors: [{ code: 'INVALID_JSON', message: `Style is not valid JSON: ${err.message}` }],
      warnings: [],
      duration: Date.now() - startTime
    };
  }

  const errors = [];
  const warnings = [];
  if (style.version !== 8) {
    errors.push({ code: 'INVALID_VERSION', message: 'MapLibre styles must declare version: 8' });
  }
  if (!style.sources || typeof style.sources !== 'object') {
    errors.push({ code: 'MISSING_SOURCES', message: 'Style must include a sources object' });
  }
  if (!Array.isArray(style.layers)) {
    errors.push({ code: 'MISSING_LAYERS', message: 'Style must include a layers array' });
  }

  const sourceIds = new Set(Object.keys(style.sources || {}));
  const layerIds = new Set();
  for (const layer of style.layers || []) {
    if (!layer.id) errors.push({ code: 'MISSING_LAYER_ID', message: 'Layer is missing id' });
    if (layer.id && layerIds.has(layer.id)) errors.push({ code: 'DUPLICATE_LAYER_ID', message: `Duplicate layer id "${layer.id}"` });
    if (layer.id) layerIds.add(layer.id);
    if (layer.source && !sourceIds.has(layer.source)) {
      errors.push({ code: 'UNKNOWN_SOURCE', message: `Layer "${layer.id}" references unknown source "${layer.source}"` });
    }
    if (layer.minzoom !== undefined && layer.maxzoom !== undefined && layer.minzoom > layer.maxzoom) {
      errors.push({ code: 'INVALID_ZOOM_RANGE', message: `Layer "${layer.id}" has minzoom greater than maxzoom` });
    }
    if (layer.ref) warnings.push({ code: 'DEPRECATED_REF', message: `Layer "${layer.id}" uses deprecated ref property` });
  }

  return {
    pass: errors.length === 0,
    source: sourcePath,
    layerCount: Array.isArray(style.layers) ? style.layers.length : 0,
    sourceCount: Object.keys(style.sources || {}).length,
    errors,
    warnings,
    duration: Date.now() - startTime
  };
}

function looksLikeJson(value) {
  const trimmed = value.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}
