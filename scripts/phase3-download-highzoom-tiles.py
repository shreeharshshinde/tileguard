"""
Task 3.3 — EXP-008: Download z8 / z12 / z14 tiles for higher-zoom corpus

Fixed bounding box:  Tokyo region
  z8  and z12: full 2°×2° bbox  (139.0–141.0°E, 35.0–37.0°N)
  z14:         0.25°×0.25° sub-bbox  (139.65–139.90°E, 35.50–35.75°N)
               (z14 full bbox = 10,396 tiles — impractical to download;
                representative 195-tile sub-region documented in EXP-008)

Providers:
  OpenFreeMap  (Planetiler pipeline)  — .pbf
  CARTO Streets (proprietary pipeline) — .mvt (saved as .pbf; bytes are identical MVT)

Note: OpenMapTiles (demotiles.maplibre.org) has maxzoom=6 and does not serve
z8/z12/z14. EXP-008 therefore covers 2 of the 3 providers from EXP-002/003.
This is documented as a scope constraint in the EXPERIMENT_LOG.

Output:
  fixtures/phase3-highzoom/<provider>/<zoom>/<z>-<x>-<y>.pbf

Usage:
  python3 scripts/phase3-download-highzoom-tiles.py
"""

import os, math, time, requests, json
from pathlib import Path
from datetime import datetime

ROOT     = Path(__file__).parent.parent
OUT_ROOT = ROOT / "fixtures" / "phase3-highzoom"
MANIFEST = ROOT / "analysis" / "phase3-higher-zooms" / "download-manifest.json"

HEADERS  = {
    "User-Agent": "TileGuard-Research/1.0 (academic; github.com/shreeharshshinde/tileguard)",
    "Accept":     "application/x-protobuf,application/vnd.mapbox-vector-tile",
}
DELAY    = 0.20   # seconds between requests — polite rate limit

# ── Providers ─────────────────────────────────────────────────────────────────
PROVIDERS = {
    "OpenFreeMap": {
        "url":    "https://tiles.openfreemap.org/planet/20260621_080001_pt/{z}/{x}/{y}.pbf",
        "ext":    "pbf",
        "maxzoom": 14,
    },
    "CARTO Streets": {
        "url":    "https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt",
        "ext":    "pbf",   # save as .pbf — MVT bytes are identical
        "maxzoom": 14,
    },
}

# ── Bbox → tile range ─────────────────────────────────────────────────────────
def deg2tile(lat: float, lon: float, z: int):
    lat_r = math.radians(lat)
    n     = 2 ** z
    x     = int((lon + 180.0) / 360.0 * n)
    y     = int((1.0 - math.log(math.tan(lat_r) + 1.0 / math.cos(lat_r)) / math.pi) / 2.0 * n)
    return x, y

def bbox_tiles(lat_max, lon_min, lat_min, lon_max, z):
    """Return list of (x, y) for all tiles covering the bbox at zoom z."""
    x_min, y_min = deg2tile(lat_max, lon_min, z)
    x_max, y_max = deg2tile(lat_min, lon_max, z)
    return [(x, y) for x in range(x_min, x_max + 1) for y in range(y_min, y_max + 1)]

# Zoom-level bboxes
BBOX_Z8_Z12  = dict(lat_max=37.0, lon_min=139.0, lat_min=35.0, lon_max=141.0)   # 2°×2°
BBOX_Z14     = dict(lat_max=35.75, lon_min=139.65, lat_min=35.50, lon_max=139.90)  # 0.25°×0.25°

ZOOM_BBOXES = {
    8:  BBOX_Z8_Z12,
    12: BBOX_Z8_Z12,
    14: BBOX_Z14,
}

# ── Download ──────────────────────────────────────────────────────────────────
def download_all():
    (ROOT / "analysis" / "phase3-higher-zooms").mkdir(parents=True, exist_ok=True)

    manifest = {
        "generated":   datetime.now().isoformat(),
        "description": "Phase 3 EXP-008 — higher-zoom tile download manifest",
        "bboxes": {
            "z8_z12": BBOX_Z8_Z12,
            "z14":    BBOX_Z14,
            "z14_note": (
                "Full 2°×2° bbox at z14 = 10,396 tiles per provider — impractical to download. "
                "Representative 0.25°×0.25° sub-region used (195 tiles per provider). "
                "Statistical representativeness is documented in EXP-008."
            ),
        },
        "providers": {},
    }

    session  = requests.Session()
    session.headers.update(HEADERS)
    grand_total = 0

    for provider_name, cfg in PROVIDERS.items():
        manifest["providers"][provider_name] = {}
        provider_slug = provider_name.replace(" ", "_")

        for z in [8, 12, 14]:
            tiles   = bbox_tiles(**ZOOM_BBOXES[z], z=z)
            out_dir = OUT_ROOT / provider_slug / f"z{z}"
            out_dir.mkdir(parents=True, exist_ok=True)

            ok = skip = err = 0
            for x, y in tiles:
                fname = out_dir / f"{z}-{x}-{y}.pbf"
                if fname.exists() and fname.stat().st_size > 0:
                    skip += 1
                    continue
                url = cfg["url"].format(z=z, x=x, y=y)
                try:
                    r = session.get(url, timeout=15)
                    if r.status_code == 200 and len(r.content) > 0:
                        fname.write_bytes(r.content)
                        ok += 1
                    else:
                        err += 1
                        print(f"  SKIP {provider_name} z{z}/{x}/{y}: HTTP {r.status_code}")
                except Exception as e:
                    err += 1
                    print(f"  ERR  {provider_name} z{z}/{x}/{y}: {e}")
                time.sleep(DELAY)

            total = ok + skip
            print(f"  {provider_name} z{z}: {ok} new + {skip} cached = {total} tiles  ({err} errors)")
            manifest["providers"][provider_name][f"z{z}"] = {
                "tiles":   total,
                "new":     ok,
                "cached":  skip,
                "errors":  err,
                "bbox":    "2°×2°" if z < 14 else "0.25°×0.25°",
            }
            grand_total += total

    MANIFEST.write_text(json.dumps(manifest, indent=2))
    print(f"\nTotal tiles downloaded/cached: {grand_total}")
    print(f"Manifest: {MANIFEST}")
    return manifest

if __name__ == "__main__":
    print("Phase 3 EXP-008 — downloading higher-zoom tiles...\n")
    for z, bbox in ZOOM_BBOXES.items():
        tiles = bbox_tiles(**bbox, z=z)
        print(f"z{z}: {len(tiles)} tiles/provider × 2 providers = {len(tiles)*2} tiles  "
              f"({'2°×2°' if z < 14 else '0.25°×0.25°'})")
    print()
    download_all()
