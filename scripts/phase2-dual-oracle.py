"""
Task 2.1 — Step 3: Dual-Oracle Comparison (GEOS + Exact Integer vs TileGuard)

Compares three verdicts on every deduplicated ring:
    Oracle 1: GEOS/Shapely  — LinearRing.is_simple, Polygon.is_valid
    Oracle 2: Exact Integer — Python int orient2d, no external library
    TileGuard: sharedVertex field (False = TileGuard flagged, True = TileGuard suppressed)

Key alignment requirement:
    GEOS is_simple treats vertex-touching (self-tangency) as non-simple.
    TileGuard Guard 3 suppresses duplicate-vertex touching.
    TileGuard Guard 2 suppresses the (0, N-1) closure pair on closed LineStrings.
    The comparison must bucket these edge cases explicitly, not lump them with
    genuine disagreements.

Agreement categories per ring:
    AGREE_DEFECT      — all three say self-intersects (proper crossing)
    AGREE_CLEAN       — all three say no self-intersection
    GEOS_EXTRA        — GEOS non-simple, TileGuard + Oracle2 agree clean (Guard 2/3 explains)
    ORACLE2_EXTRA     — Oracle2 finds crossing, GEOS + TileGuard agree clean
    TILEGUARD_EXTRA   — TileGuard flagged, both oracles say clean
    PARTIAL_AGREE     — mixed (any other combination)

Computes Precision, Recall, F1 for TileGuard on Polygon rings against
dual-oracle consensus (both oracles agree it is a proper crossing = ground truth positive).

Input:
    analysis/phase2-oracle/deduplicated-rings.json
    analysis/phase2-oracle/exact-integer-oracle-results.json

Output:
    analysis/phase2-oracle/geos-oracle-results.json
    analysis/phase2-oracle/agreement-matrix.json

Usage: python3 scripts/phase2-dual-oracle.py
"""

import json
from pathlib import Path
from datetime import datetime
from shapely.geometry import LinearRing, Polygon
from shapely.errors import TopologicalError

ROOT      = Path(__file__).parent.parent
DEDUP     = ROOT / 'analysis/phase2-oracle/deduplicated-rings.json'
ORACLE2   = ROOT / 'analysis/phase2-oracle/exact-integer-oracle-results.json'
OUT_GEOS  = ROOT / 'analysis/phase2-oracle/geos-oracle-results.json'
OUT_AGREE = ROOT / 'analysis/phase2-oracle/agreement-matrix.json'

dedup_data   = json.loads(DEDUP.read_text())
oracle2_data = json.loads(ORACLE2.read_text())

rings    = dedup_data['rings']
o2_map   = {r['id']: r for r in oracle2_data['results']}

print(f'Running GEOS/Shapely oracle on {len(rings)} deduplicated rings...')

# ── Oracle 1: GEOS/Shapely ────────────────────────────────────────────────────

def ring_id(ring) -> str:
    return f"{ring['dataset']}|{ring['tile']}|{ring['layer']}|fi{ring['featureIndex']}|pi{ring['partIndex']}"

def geos_check(vertices: list, geom_type: str) -> dict:
    """
    Run GEOS/Shapely validity checks on a ring.
    Returns dict with is_simple, is_valid, error info.
    """
    coords = [(v['x'], v['y']) for v in vertices]

    # Ensure ring is closed for Shapely
    if coords[0] != coords[-1]:
        coords = coords + [coords[0]]

    try:
        lr = LinearRing(coords)
        is_simple = bool(lr.is_simple)
        is_valid  = bool(lr.is_valid)

        # For Polygon type, also check as Shapely Polygon
        if geom_type == 'Polygon':
            try:
                poly = Polygon(coords)
                poly_valid = bool(poly.is_valid)
            except Exception:
                poly_valid = False
        else:
            poly_valid = None

        return {
            'geos_is_simple':       is_simple,
            'geos_is_valid':        is_valid,
            'geos_poly_valid':      poly_valid,
            'geos_non_simple':      not is_simple,
            'geos_error':           None,
        }
    except (TopologicalError, Exception) as e:
        return {
            'geos_is_simple':   None,
            'geos_is_valid':    None,
            'geos_poly_valid':  None,
            'geos_non_simple':  None,
            'geos_error':       str(e),
        }

geos_results = []

for ring in rings:
    rid    = ring_id(ring)
    result = geos_check(ring['vertices'], ring['geometryType'])
    geos_results.append({'id': rid, **result})

# Save GEOS results
geos_output = {
    'meta': {
        'task': '2.1-step3a',
        'oracle': 'GEOS via Shapely 2.1.2 — LinearRing.is_simple + Polygon.is_valid',
        'generated': datetime.now().isoformat(),
    },
    'results': geos_results,
}
OUT_GEOS.write_text(json.dumps(geos_output, indent=2))
print(f'GEOS oracle complete. Results: {OUT_GEOS}')

# ── Three-way comparison ──────────────────────────────────────────────────────

print('\nBuilding three-way agreement matrix...')

agreement_rows = []

for ring in rings:
    rid = ring_id(ring)
    geos = next((r for r in geos_results if r['id'] == rid), None)
    o2   = o2_map.get(rid)

    if not geos or not o2:
        continue

    # TileGuard verdict: sharedVertex=False means TileGuard flagged it
    tg_flagged = not ring['sharedVertex']

    # GEOS verdict: non-simple = found a self-intersection issue
    # None means GEOS errored
    geos_flagged = geos['geos_non_simple'] if geos['geos_non_simple'] is not None else False

    # Oracle 2 verdict: proper crossing only (not endpoint touch)
    o2_proper    = o2['oracle2_has_proper_crossing']
    o2_flagged   = o2['oracle2_self_intersects']

    # Dual oracle consensus: BOTH oracles agree it has a PROPER crossing
    # (endpoint-touch is a boundary case we track separately)
    dual_consensus_defect = o2_proper and geos_flagged

    # Classify the agreement
    if tg_flagged and geos_flagged and o2_proper:
        category = 'AGREE_DEFECT'
    elif not tg_flagged and not geos_flagged and not o2_flagged:
        category = 'AGREE_CLEAN'
    elif geos_flagged and not tg_flagged:
        # GEOS non-simple, TileGuard suppressed
        # Sub-classify: is this a duplicate vertex (Guard 3) or closure (Guard 2)?
        if ring['hasDuplicateVertices']:
            category = 'GEOS_EXTRA_DUP_VERTEX'   # Guard 3 explains
        else:
            category = 'GEOS_EXTRA_CLOSURE'       # Guard 2 explains
    elif tg_flagged and not geos_flagged and not o2_proper:
        category = 'TILEGUARD_EXTRA'
    elif o2_proper and not geos_flagged:
        category = 'ORACLE2_EXTRA'
    elif tg_flagged and geos_flagged and not o2_proper:
        category = 'AGREE_NOPROPER_TOUCH'
    else:
        category = 'PARTIAL_AGREE'

    agreement_rows.append({
        'id':               rid,
        'dataset':          ring['dataset'],
        'geometryType':     ring['geometryType'],
        'layer':            ring['layer'],
        'sharedVertex':     ring['sharedVertex'],
        'hasDuplicateVertices': ring['hasDuplicateVertices'],
        'isCollinear':      ring['isCollinear'],
        'tileguard_flagged': tg_flagged,
        'geos_flagged':     geos_flagged,
        'o2_proper':        o2_proper,
        'o2_touch':         o2['oracle2_has_endpoint_touch'],
        'dual_consensus_defect': dual_consensus_defect,
        'category':         category,
    })

# ── Category counts ────────────────────────────────────────────────────────────

from collections import Counter
cats = Counter(r['category'] for r in agreement_rows)

print('\nAgreement categories (all rings):')
for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
    print(f'  {cat}: {count}')

# ── Precision / Recall / F1 for Polygon rings ──────────────────────────────────
# Ground truth positive = dual oracle consensus defect (GEOS non-simple AND Oracle2 proper crossing)
# Ground truth negative = both oracles agree clean

poly_rows = [r for r in agreement_rows if r['geometryType'] == 'Polygon']

TP = sum(1 for r in poly_rows if r['tileguard_flagged'] and r['dual_consensus_defect'])
FP = sum(1 for r in poly_rows if r['tileguard_flagged'] and not r['dual_consensus_defect'])
FN = sum(1 for r in poly_rows if not r['tileguard_flagged'] and r['dual_consensus_defect'])
TN = sum(1 for r in poly_rows if not r['tileguard_flagged'] and not r['dual_consensus_defect'])

precision = TP / (TP + FP) if (TP + FP) > 0 else None
recall    = TP / (TP + FN) if (TP + FN) > 0 else None
f1        = (2 * precision * recall / (precision + recall)
             if precision is not None and recall is not None and (precision + recall) > 0
             else None)

print(f'\nPolygon ring evaluation (dual oracle consensus as ground truth):')
print(f'  TP={TP}  FP={FP}  FN={FN}  TN={TN}')
print(f'  Precision: {precision:.4f}' if precision else '  Precision: n/a')
print(f'  Recall:    {recall:.4f}'    if recall    else '  Recall: n/a')
print(f'  F1:        {f1:.4f}'        if f1        else '  F1: n/a')

# LineString breakdown
ls_rows = [r for r in agreement_rows if r['geometryType'] == 'LineString']
ls_tg   = sum(1 for r in ls_rows if r['tileguard_flagged'])
ls_geos = sum(1 for r in ls_rows if r['geos_flagged'])
ls_o2   = sum(1 for r in ls_rows if r['o2_proper'])
print(f'\nLineString rings: {len(ls_rows)} total')
print(f'  TileGuard flagged: {ls_tg}, GEOS flagged: {ls_geos}, Oracle2 proper: {ls_o2}')

# ── Save agreement matrix ──────────────────────────────────────────────────────

output = {
    'meta': {
        'task':       '2.1',
        'experiment': 'EXP-003b',
        'description': 'Dual-oracle validation: GEOS/Shapely + Exact Integer vs TileGuard',
        'generated':  datetime.now().isoformat(),
        'oracles': {
            'oracle1': 'GEOS via Shapely 2.1.2 — LinearRing.is_simple',
            'oracle2': 'Exact Integer Predicates — Python int orient2d, no floating point',
            'tileguard': 'TileGuard v0.6.0 — sharedVertex=False means flagged as genuine crossing',
        },
        'alignmentNote': (
            'Dual consensus = GEOS non-simple AND Oracle2 proper crossing. '
            'GEOS_EXTRA_DUP_VERTEX and GEOS_EXTRA_CLOSURE categories document '
            'where GEOS fires but TileGuard Guards 2/3 correctly suppress.'
        ),
        'gapsClosed': ['C2'],
    },
    'categoryCounts': dict(cats),
    'polygonMetrics': {
        'TP': TP, 'FP': FP, 'FN': FN, 'TN': TN,
        'precision': round(precision, 4) if precision else None,
        'recall':    round(recall, 4)    if recall    else None,
        'f1':        round(f1, 4)        if f1        else None,
    },
    'lineStringMetrics': {
        'total':            len(ls_rows),
        'tileguardFlagged': ls_tg,
        'geosFlagged':      ls_geos,
        'oracle2Proper':    ls_o2,
        'note': 'LineString crossings are OGC non-simple but valid — not evaluated for P/R/F1',
    },
    'rows': agreement_rows,
}

OUT_AGREE.write_text(json.dumps(output, indent=2))

print(f'\n{"═"*60}')
print(f'  EXP-003b Dual-Oracle Results')
print(f'{"═"*60}')
for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
    print(f'  {cat:<35} {count}')
print(f'{"─"*60}')
print(f'  Polygon P/R/F1: {precision:.1%} / {recall:.1%} / {f1:.4f}' if f1 else '  Polygon metrics: n/a')
print(f'{"═"*60}')
print(f'\nOutputs:')
print(f'  {OUT_GEOS}')
print(f'  {OUT_AGREE}')
