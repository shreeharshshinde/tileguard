
import json, sys
from shapely.geometry import LinearRing, LineString

data = json.load(open(sys.argv[1]))
results = []
for ring in data['rings']:
    verts = ring['vertices']
    rid = ring['id']
    try:
        coords = [(v['x'], v['y']) for v in verts]
        if ring['geometryType'] == 'Polygon':
            geom = LinearRing(coords)
        else:
            geom = LineString(coords)
        is_simple = geom.is_simple
        geos_non_simple = not is_simple
    except Exception as e:
        geos_non_simple = False
    results.append({'id': rid, 'geos_non_simple': geos_non_simple})
print(json.dumps({'results': results}))
