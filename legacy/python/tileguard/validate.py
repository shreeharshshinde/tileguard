from __future__ import annotations

import gzip
import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .utils.geometry import validate_feature_geometry
from .utils.pbf_decoder import decode_mvt


@dataclass
class LayerResult:
    feature_count: int
    extent: int
    version: int | None
    valid: bool
    geometry_errors: list[dict] = field(default_factory=list)
    property_errors: list[dict] = field(default_factory=list)


@dataclass
class ValidationResult:
    pass_: bool
    source: str
    layers: dict[str, LayerResult] = field(default_factory=dict)
    available_layers: list[str] = field(default_factory=list)
    total_features: int = 0
    errors: list[dict] = field(default_factory=list)
    warnings: list[dict] = field(default_factory=list)
    duration: int = 0

    @property
    def passed(self) -> bool:
        return self.pass_

    def to_dict(self) -> dict:
        data = asdict(self)
        data["pass"] = data.pop("pass_")
        return data


def validate_tile(
    source: str,
    required_layers: list[str] | None = None,
    min_features: int | None = None,
    max_features: int | None = None,
    check_geometry: bool = True,
    allow_empty: bool = False,
    required_properties: dict[str, list[str]] | None = None,
    layer_config: dict[str, dict] | None = None,
    timeout: int = 10,
    max_details: int = 10,
) -> ValidationResult:
    start = time.time()
    errors: list[dict] = []
    warnings: list[dict] = []
    required_layers = required_layers or []
    required_properties = required_properties or {}
    layer_config = layer_config or {}

    try:
        tile_bytes = _fetch_bytes(source, timeout)
    except Exception as exc:
        return _fail(source, start, "FETCH_ERROR", str(exc))

    if not tile_bytes:
        return _fail(source, start, "EMPTY_SOURCE", "Tile source returned 0 bytes")

    if tile_bytes[:2] == b"\x1f\x8b":
        try:
            tile_bytes = gzip.decompress(tile_bytes)
        except Exception as exc:
            return _fail(source, start, "DECOMPRESS_ERROR", f"Tile appears gzipped but failed to decompress: {exc}")

    try:
        tile = decode_mvt(tile_bytes)
    except Exception as exc:
        return _fail(source, start, "DECODE_ERROR", f"Failed to decode .pbf: {exc}")

    layers = tile["layers"]
    available_layers = list(layers.keys())
    layer_results: dict[str, LayerResult] = {}
    total_features = 0

    for layer_name in required_layers:
        if layer_name not in layers:
            errors.append({"code": "MISSING_LAYER", "message": f'Required layer "{layer_name}" not found', "available": available_layers})

    for layer_name, layer in layers.items():
        features = layer["features"]
        feature_count = len(features)
        total_features += feature_count
        geometry_errors: list[dict] = []
        property_errors: list[dict] = []
        layer_errors: list[dict] = []
        config = layer_config.get(layer_name, {})

        if config.get("minFeatures") is not None and feature_count < config["minFeatures"]:
            layer_errors.append({"code": "LOW_LAYER_FEATURES", "message": f'Layer "{layer_name}" has {feature_count} features, expected at least {config["minFeatures"]}'})
        if config.get("maxFeatures") is not None and feature_count > config["maxFeatures"]:
            layer_errors.append({"code": "HIGH_LAYER_FEATURES", "message": f'Layer "{layer_name}" has {feature_count} features, expected at most {config["maxFeatures"]}'})

        if check_geometry:
            for feature_index, feature in enumerate(features):
                for issue in validate_feature_geometry(feature, layer["extent"]):
                    geometry_errors.append({"feature_index": feature_index, **issue})

        for feature_index, feature in enumerate(features):
            properties = feature.get("properties", {})
            for prop in required_properties.get(layer_name, []):
                if prop not in properties:
                    property_errors.append({
                        "code": "MISSING_PROPERTY",
                        "feature_index": feature_index,
                        "property": prop,
                        "message": f'Feature {feature_index} in "{layer_name}" is missing property "{prop}"',
                    })

        errors.extend({**error, "layer": layer_name} for error in layer_errors)
        if geometry_errors:
            errors.append({"code": "GEOMETRY_INVALID", "layer": layer_name, "message": f'{len(geometry_errors)} geometry issue(s) in layer "{layer_name}"', "details": geometry_errors[:max_details]})
        if property_errors:
            plural = "y is" if len(property_errors) == 1 else "ies are"
            errors.append({"code": "MISSING_PROPERTY", "layer": layer_name, "message": f'{len(property_errors)} required propert{plural} missing in layer "{layer_name}"', "details": property_errors[:max_details]})

        layer_results[layer_name] = LayerResult(
            feature_count=feature_count,
            extent=layer["extent"],
            version=layer["version"],
            valid=not layer_errors and not geometry_errors and not property_errors,
            geometry_errors=geometry_errors,
            property_errors=property_errors,
        )

    if min_features is not None and total_features < min_features:
        errors.append({"code": "LOW_TOTAL_FEATURES", "message": f"Tile has {total_features} features total, expected at least {min_features}"})
    if max_features is not None and total_features > max_features:
        errors.append({"code": "HIGH_TOTAL_FEATURES", "message": f"Tile has {total_features} features total, expected at most {max_features}"})
    if total_features == 0 and not allow_empty:
        warnings.append({"code": "EMPTY_TILE", "message": "Tile contains 0 features"})

    return ValidationResult(
        pass_=len(errors) == 0,
        source=source,
        layers=layer_results,
        available_layers=available_layers,
        total_features=total_features,
        errors=errors,
        warnings=warnings,
        duration=int((time.time() - start) * 1000),
    )


def validate_batch(sources: list[str] | str | Path, **options) -> list[ValidationResult]:
    if isinstance(sources, (str, Path)) and Path(sources).exists():
        source_list = [line.strip() for line in Path(sources).read_text().splitlines() if line.strip() and not line.strip().startswith("#")]
    else:
        source_list = list(sources)  # type: ignore[arg-type]
    return [validate_tile(source, **options) for source in source_list]


def load_config(path: str | Path) -> dict:
    return json.loads(Path(path).read_text())


def _fetch_bytes(source: str, timeout: int = 10) -> bytes:
    if source.startswith(("http://", "https://")):
        request = Request(source, headers={"User-Agent": "tileguard/0.1"})
        try:
            with urlopen(request, timeout=timeout) as response:
                return response.read()
        except HTTPError as exc:
            raise OSError(f"HTTP {exc.code}: {exc.reason}") from exc
        except URLError as exc:
            raise OSError(str(exc.reason)) from exc
    if source.endswith(".mbtiles"):
        raise OSError("MBTiles sources require a tile extraction adapter; pass a .pbf file or URL for now")
    path = Path(source)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {source}")
    return path.read_bytes()


def _fail(source: str, start: float, code: str, message: str) -> ValidationResult:
    return ValidationResult(pass_=False, source=source, errors=[{"code": code, "message": message}], duration=int((time.time() - start) * 1000))
