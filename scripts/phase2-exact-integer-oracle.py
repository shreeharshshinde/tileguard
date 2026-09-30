"""
Task 2.1 — Step 2: Exact Integer Oracle (Oracle 2)

Implements a standalone self-intersection checker using Python's native
arbitrary-precision integers for the orient2d predicate — no floating point,
no external C++ library. Completely independent of TileGuard and GEOS.

Algorithm: O(N²) segment-pair sweep with exact integer cross-product.
    orient2d(a, b, c) = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
    Sign tells us which side of line AB the point C is on.
    If C and D are on opposite sides of AB, and A and B are on opposite sides
    of CD, the segments properly cross.

Detects:
    - Proper interior crossings (segments AB and CD cross without sharing endpoints)
    - Collinear overlaps (segments are collinear and overlap)

Does NOT suppress:
    - Vertex touching (this oracle reports everything; TileGuard suppresses some)
    - Duplicate vertices (this oracle reports them; TileGuard Guard 3 suppresses them)
    - Closed-ring closure pair (this oracle reports them; TileGuard Guard 2 suppresses)

This intentional difference is what makes the comparison scientifically meaningful:
the disagreements between this oracle and TileGuard reveal exactly what the guards suppress.

Input:  analysis/phase2-oracle/deduplicated-rings.json
Output: analysis/phase2-oracle/exact-integer-oracle-results.json

Usage: python3 scripts/phase2-exact-integer-oracle.py
"""

import json
from pathlib import Path
from datetime import datetime

ROOT     = Path(__file__).parent.parent
IN_PATH  = ROOT / 'analysis/phase2-oracle/deduplicated-rings.json'
OUT_PATH = ROOT / 'analysis/phase2-oracle/exact-integer-oracle-results.json'

data  = json.loads(IN_PATH.read_text())
rings = data['rings']
print(f'Evaluating {len(rings)} deduplicated rings with exact integer oracle...')

# ── Exact integer predicates ──────────────────────────────────────────────────

def orient2d(ax, ay, bx, by, cx, cy) -> int:
    """
    Exact integer cross product. Returns:
      > 0  if C is to the left of AB  (counter-clockwise)
      < 0  if C is to the right of AB (clockwise)
      = 0  if A, B, C are collinear
    Uses Python int (arbitrary precision) — no floating point.
    """
    return int(bx - ax) * int(cy - ay) - int(by - ay) * int(cx - ax)

def on_segment_collinear(ax, ay, bx, by, cx, cy) -> bool:
    """
    Given that A, B, C are collinear, returns True if B lies on segment AC.
    """
    return (min(ax, cx) <= bx <= max(ax, cx) and
            min(ay, cy) <= by <= max(ay, cy))

def segments_intersect_exact(ax, ay, bx, by, cx, cy, dx, dy):
    """
    Returns (intersects: bool, crossing_type: str) using exact integer arithmetic.
    crossing_type: 'proper' | 'collinear' | 'endpoint_touch' | 'none'
    """
    o1 = orient2d(ax, ay, bx, by, cx, cy)
    o2 = orient2d(ax, ay, bx, by, dx, dy)
    o3 = orient2d(cx, cy, dx, dy, ax, ay)
    o4 = orient2d(cx, cy, dx, dy, bx, by)

    # Proper crossing: endpoints of each segment strictly straddle the other segment
    if (o1 > 0 and o2 < 0 or o1 < 0 and o2 > 0) and \
       (o3 > 0 and o4 < 0 or o3 < 0 and o4 > 0):
        return True, 'proper'

    # Collinear / degenerate cases
    if o1 == 0 and on_segment_collinear(ax, ay, bx, by, cx, cy):
        return True, 'endpoint_touch'
    if o2 == 0 and on_segment_collinear(ax, ay, bx, by, dx, dy):
        return True, 'endpoint_touch'
    if o3 == 0 and on_segment_collinear(cx, cy, dx, dy, ax, ay):
        return True, 'endpoint_touch'
    if o4 == 0 and on_segment_collinear(cx, cy, dx, dy, bx, by):
        return True, 'endpoint_touch'

    return False, 'none'

def check_ring_exact_integer(vertices: list):
    """
    Check a ring for self-intersection using exact integer arithmetic.
    Returns dict with findings — NO guards applied (raw oracle).
    """
    pts = vertices
    n   = len(pts)

    if n < 4:
        return {'self_intersects': False, 'reason': 'too_few_vertices', 'crossings': []}

    crossings = []

    seg_count = n - 1  # last point = first point for closed rings

    for i in range(seg_count):
        ax, ay = pts[i]['x'],   pts[i]['y']
        bx, by = pts[i+1]['x'], pts[i+1]['y']

        for j in range(i + 2, seg_count):
            # Skip adjacent segment pairs (share a vertex by construction)
            if abs(i - j) <= 1:
                continue

            cx, cy = pts[j]['x'],   pts[j]['y']
            dx, dy = pts[j+1]['x'], pts[j+1]['y']

            intersects, crossing_type = segments_intersect_exact(ax, ay, bx, by, cx, cy, dx, dy)
            if intersects:
                crossings.append({
                    'seg_i': i,
                    'seg_j': j,
                    'type':  crossing_type,
                })

    has_proper    = any(c['type'] == 'proper'         for c in crossings)
    has_touch     = any(c['type'] == 'endpoint_touch' for c in crossings)
    self_intersects = len(crossings) > 0

    return {
        'self_intersects':    self_intersects,
        'has_proper_crossing': has_proper,
        'has_endpoint_touch': has_touch,
        'crossing_count':     len(crossings),
        'crossings':          crossings[:5],  # first 5 for log
    }

# ── Evaluate all rings ─────────────────────────────────────────────────────────

results = []
counts  = {'proper': 0, 'endpoint_touch_only': 0, 'none': 0}

for ring in rings:
    verts  = ring['vertices']
    result = check_ring_exact_integer(verts)

    entry = {
        'id':          f"{ring['dataset']}|{ring['tile']}|{ring['layer']}|fi{ring['featureIndex']}|pi{ring['partIndex']}",
        'dataset':     ring['dataset'],
        'geometryType': ring['geometryType'],
        'sharedVertex': ring['sharedVertex'],
        'vertexCount': ring['vertexCount'],
        'oracle2_self_intersects':    result['self_intersects'],
        'oracle2_has_proper_crossing': result['has_proper_crossing'],
        'oracle2_has_endpoint_touch': result['has_endpoint_touch'],
        'oracle2_crossing_count':     result['crossing_count'],
        'oracle2_crossings_sample':   result['crossings'],
    }
    results.append(entry)

    if result['has_proper_crossing']:
        counts['proper'] += 1
    elif result['has_endpoint_touch']:
        counts['endpoint_touch_only'] += 1
    else:
        counts['none'] += 1

# ── Summary stats ──────────────────────────────────────────────────────────────

total      = len(results)
b1_rings   = [r for r in results if not r['sharedVertex']]
b1_polygon = [r for r in b1_rings if r['geometryType'] == 'Polygon']
b1_line    = [r for r in b1_rings if r['geometryType'] == 'LineString']
suppressed = [r for r in results if r['sharedVertex']]

print(f'\nExact Integer Oracle results:')
print(f'  Total rings evaluated: {total}')
print(f'  Proper crossings found: {counts["proper"]}')
print(f'  Endpoint touch only:    {counts["endpoint_touch_only"]}')
print(f'  No intersection:        {counts["none"]}')
print(f'\n  B1 rings (sharedVertex=False): {len(b1_rings)}')
b1_proper = sum(1 for r in b1_rings if r['oracle2_has_proper_crossing'])
b1_touch  = sum(1 for r in b1_rings if r['oracle2_has_endpoint_touch'] and not r['oracle2_has_proper_crossing'])
b1_none   = sum(1 for r in b1_rings if not r['oracle2_self_intersects'])
print(f'    proper crossing:      {b1_proper}')
print(f'    endpoint touch only:  {b1_touch}')
print(f'    no intersection:      {b1_none}')

output = {
    'meta': {
        'task': '2.1-step2',
        'oracle': 'Exact Integer Predicates (Python int, no floating point, no external C++ library)',
        'description': 'Oracle 2: exact arbitrary-precision integer orient2d — no guards applied',
        'generated': datetime.now().isoformat(),
        'inputFile': 'analysis/phase2-oracle/deduplicated-rings.json',
        'outputFile': 'analysis/phase2-oracle/exact-integer-oracle-results.json',
        'note': 'This oracle applies NO guards. Disagreements with TileGuard reveal what each guard suppresses.',
    },
    'summary': {
        'totalRings':             total,
        'properCrossings':        counts['proper'],
        'endpointTouchOnly':      counts['endpoint_touch_only'],
        'noIntersection':         counts['none'],
        'b1Rings':                len(b1_rings),
        'b1ProperCrossing':       b1_proper,
        'b1EndpointTouchOnly':    b1_touch,
        'b1NoIntersection':       b1_none,
    },
    'results': results,
}

OUT_PATH.write_text(json.dumps(output, indent=2))
print(f'\nOutput: {OUT_PATH}')
