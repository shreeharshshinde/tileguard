from __future__ import annotations

import argparse
import sys

from .reporter import print_validation, print_validation_batch
from .validate import load_config, validate_batch, validate_tile


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="tileguard")
    subparsers = parser.add_subparsers(dest="command", required=True)
    validate_parser = subparsers.add_parser("validate", help="Validate a vector tile")
    validate_parser.add_argument("source", nargs="?")
    validate_parser.add_argument("--batch")
    validate_parser.add_argument("--layers", nargs="*", default=[])
    validate_parser.add_argument("--required-properties", default="")
    validate_parser.add_argument("--min-features", type=int)
    validate_parser.add_argument("--max-features", type=int)
    validate_parser.add_argument("--skip-geometry", action="store_true")
    validate_parser.add_argument("--allow-empty", action="store_true")
    validate_parser.add_argument("--config")
    validate_parser.add_argument("--format", choices=["text", "json"], default="text")

    args = parser.parse_args(argv)
    if args.command == "validate":
        options = {
            "required_layers": args.layers,
            "required_properties": _parse_required_properties(args.required_properties),
            "min_features": args.min_features,
            "max_features": args.max_features,
            "check_geometry": not args.skip_geometry,
            "allow_empty": args.allow_empty,
        }
        if args.config:
            options.update(_normalise_config(load_config(args.config)))
        if args.batch:
            results = validate_batch(args.batch, **options)
            print_validation_batch(results, args.format)
            return 0 if all(result.pass_ for result in results) else 1
        if not args.source:
            validate_parser.error("provide a source or --batch")
        result = validate_tile(args.source, **options)
        print_validation(result, args.format)
        return 0 if result.pass_ else 1
    return 2


def _parse_required_properties(value: str) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    if not value:
        return result
    for spec in value.split(","):
        layer, _, props = spec.partition(":")
        if layer and props:
            result[layer] = [prop for prop in props.split("|") if prop]
    return result


def _normalise_config(config: dict) -> dict:
    mapping = {
        "requiredLayers": "required_layers",
        "requiredProperties": "required_properties",
        "minFeatures": "min_features",
        "maxFeatures": "max_features",
        "checkGeometry": "check_geometry",
        "allowEmpty": "allow_empty",
        "layerConfig": "layer_config",
    }
    return {mapping.get(key, key): value for key, value in config.items()}


if __name__ == "__main__":
    sys.exit(main())
