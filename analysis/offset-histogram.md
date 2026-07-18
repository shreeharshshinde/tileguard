# Offset Distribution Analysis

**Generated:** 2026-07-18T03:08:19.146Z

## Summary

| Metric | Value |
| :--- | :--- |
| Total out-of-range coordinates | 148268 |
| OpenMapTiles | 48378 |
| OpenFreeMap | 50282 |
| CARTO Streets | 49608 |
| Direction: below-zero | 87702 |
| Direction: above-extent | 94924 |

---

## Signed Offset Histogram

| Bucket | Count |
| :--- | ---: |
| -1025 to -4096 | 36685 |
| -513 to -1024 | 5871 |
| -257 to -512 | 2808 |
| -129 to -256 | 1330 |
| -65 to -128 | 6013 |
| -1 to -64 | 34995 |
| +1 to +64 | 41404 |
| +65 to +128 | 6939 |
| +129 to +256 | 1557 |
| +257 to +512 | 3259 |
| +513 to +1024 | 6602 |
| +1025 to +4096 | 35163 |

---

## Layer Breakdown

| Layer | Count |
| :--- | ---: |
| place | 60820 |
| countries | 46225 |
| water | 15146 |
| boundary | 13952 |
| landcover | 5409 |
| water_name | 3578 |
| geolines | 2093 |
| park | 705 |
| waterway | 280 |
| centroids | 60 |

---

## Geometry Type Breakdown

| Type | Count |
| :--- | ---: |
| Polygon | 68535 |
| LineString | 15789 |
| Point | 63944 |

---

## Cross-Provider Identity Verification

Features appearing on the same tile/layer/index across multiple providers,
with identity verified via property values (name, class) rather than offset magnitude.

| Metric | Value |
| :--- | ---: |
| Features appearing in ≥2 providers | 28679 |
| Identity confirmed (property match) | 1695 |
| Identity unconfirmed | 26984 |

### Confirmed Same-Feature Examples

| Tile | Feature | Name | Providers & Offsets |
| :--- | :--- | :--- | :--- |
| 0-0-0 | landcover:3 | (no name) | OpenFreeMap: x=0 (in-range); CARTO Streets: x=0 (in-range) |
| 0-0-0 | place:0 | Europe | OpenFreeMap: x=-1934 (below-zero); CARTO Streets: x=-1934 (below-zero) |
| 0-0-0 | water:16 | (no name) | OpenFreeMap: x=11 (above-extent); CARTO Streets: x=11 (above-extent) |
| 0-0-0 | water_name:0 | North Atlantic Ocean | OpenFreeMap: x=-2503 (below-zero); CARTO Streets: x=-2503 (below-zero) |
| 0-0-0 | water_name:1 | North Pacific Ocean | OpenFreeMap: x=-3982 (below-zero); CARTO Streets: x=-3982 (below-zero) |
| 0-0-0 | water_name:2 | South Atlantic Ocean | OpenFreeMap: x=-2219 (below-zero); CARTO Streets: x=-2219 (below-zero) |
| 0-0-0 | water_name:3 | South Pacific Ocean | OpenFreeMap: x=-3527 (below-zero); CARTO Streets: x=-3527 (below-zero) |
| 1-0-0 | boundary:0 | (no name) | OpenFreeMap: x=0 (in-range); CARTO Streets: x=0 (in-range) |
| 1-0-0 | place:0 | Europe | OpenFreeMap: x=-3868 (below-zero); CARTO Streets: x=-3868 (below-zero) |
| 1-0-0 | water:11 | (no name) | OpenFreeMap: x=11 (above-extent); CARTO Streets: x=11 (above-extent) |
| 1-0-0 | water_name:0 | 南海/Biển Đông/South China Sea | OpenFreeMap: x=-1479 (below-zero); CARTO Streets: x=-1479 (below-zero) |
| 1-0-0 | water_name:1 | Philippine Sea | OpenFreeMap: x=-1024 (below-zero); CARTO Streets: x=-1024 (below-zero) |
| 1-0-0 | water_name:2 | Sea of Okhotsk | OpenFreeMap: x=-683 (below-zero); CARTO Streets: x=-683 (below-zero) |
| 1-0-0 | water_name:6 | Te Tai-o-Rehua / Tasman Sea | OpenFreeMap: x=-455 (below-zero); CARTO Streets: x=-455 (below-zero) |
| 1-0-0 | water_name:9 | Coral Sea | OpenFreeMap: x=-569 (below-zero); CARTO Streets: x=-569 (below-zero) |
