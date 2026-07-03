from __future__ import annotations

import json

from .validate import ValidationResult


def print_validation(result: ValidationResult, fmt: str = "text") -> None:
    if fmt == "json":
        print(json.dumps(result.to_dict(), indent=2))
        return

    print(f"{'PASS' if result.pass_ else 'FAIL'} {result.source} ({result.duration}ms)")
    print(f"Layers: {len(result.available_layers)}  Features: {result.total_features}")
    for name, layer in result.layers.items():
        marker = "ok" if layer.valid else "xx"
        print(f"  {marker} {name}: {layer.feature_count}")
    for error in result.errors:
        print(f"ERROR {error['code']}: {error['message']}")
    for warning in result.warnings:
        print(f"WARN {warning['code']}: {warning['message']}")


def print_validation_batch(results: list[ValidationResult], fmt: str = "text") -> None:
    if fmt == "json":
        print(json.dumps([result.to_dict() for result in results], indent=2))
        return
    passed = sum(1 for result in results if result.pass_)
    print(f"TileGuard batch: {passed}/{len(results)} passing")
    for result in results:
        print_validation(result, fmt="text")
