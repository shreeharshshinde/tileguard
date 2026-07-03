// @tileguard/tile-rules — Vector tile provider + validation rules
//
// Will export:
//   tilePlugin        — plugin object registering provider + all rules
//   TileProvider      — ArtifactProvider for .pbf files
//
// Rules to be extracted from legacy/js/src/validate.js and legacy/python/tileguard/validate.py:
//   tile/required-layers
//   tile/coordinate-range
//   tile/geometry-validity
//   tile/feature-count
//   tile/required-properties
//
// Implementation pending — see docs/engineering/MIGRATION_PLAN.md
