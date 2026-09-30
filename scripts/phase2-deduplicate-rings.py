"""
Task 2.1 — Step 1: Deduplicate Rings

Removes rings with identical coordinate sequences from the 619-ring set
before oracle evaluation. Deduplication prevents the oracle results from
being inflated by repeated instances of the same geometry.

Two rings are duplicates if:
  - Same coordinate sequence (order-sensitive, exact integer match)

Output: analysis/phase2-oracle/deduplicated-rings.json

Usage: python3 scripts/phase2-deduplicate-rings.py
"""

import json
import os
import hashlib
from pathlib import Path

ROOT     = Path(__file__).parent.parent
IN_PATH  = ROOT / 'analysis/phase2-self-intersection/self-intersection-rings.json'
OUT_DIR  = ROOT / 'analysis/phase2-oracle'
OUT_PATH = OUT_DIR / 'deduplicated-rings.json'

OUT_DIR.mkdir(parents=True, exist_ok=True)

rings = json.loads(IN_PATH.read_text())
print(f'Input rings: {len(rings)}')

def ring_hash(vertices: list) -> str:
    """Canonical hash of a ring's coordinate sequence."""
    coords = tuple((v['x'], v['y']) for v in vertices)
    return hashlib.sha256(str(coords).encode()).hexdigest()

seen_hashes  = {}
deduplicated = []
duplicate_log= []

for ring in rings:
    h = ring_hash(ring['vertices'])
    if h in seen_hashes:
        duplicate_log.append({
            'duplicate_ring': f"{ring['dataset']}|{ring['tile']}|{ring['layer']}|fi{ring['featureIndex']}|pi{ring['partIndex']}",
            'same_as':        seen_hashes[h],
        })
    else:
        seen_hashes[h] = f"{ring['dataset']}|{ring['tile']}|{ring['layer']}|fi{ring['featureIndex']}|pi{ring['partIndex']}"
        deduplicated.append(ring)

print(f'Unique rings:    {len(deduplicated)}')
print(f'Duplicates removed: {len(duplicate_log)}')

# Stats on deduplicated set
b1  = [r for r in deduplicated if not r['sharedVertex']]
b1p = [r for r in b1 if r['geometryType'] == 'Polygon']
b1l = [r for r in b1 if r['geometryType'] == 'LineString']
rest= [r for r in deduplicated if r['sharedVertex']]

print(f'\nDeduplicated breakdown:')
print(f'  B1 (genuine, sharedVertex=False): {len(b1)} — Polygon: {len(b1p)}, LineString: {len(b1l)}')
print(f'  Suppressed (sharedVertex=True):   {len(rest)}')

output = {
    'meta': {
        'task': '2.1-step1',
        'description': 'Deduplicated ring set for dual-oracle evaluation',
        'generated': __import__('datetime').datetime.now().isoformat(),
        'inputFile': 'analysis/phase2-self-intersection/self-intersection-rings.json',
        'outputFile': 'analysis/phase2-oracle/deduplicated-rings.json',
    },
    'stats': {
        'inputCount':      len(rings),
        'uniqueCount':     len(deduplicated),
        'duplicatesRemoved': len(duplicate_log),
        'b1Total':         len(b1),
        'b1Polygon':       len(b1p),
        'b1LineString':    len(b1l),
        'suppressed':      len(rest),
    },
    'duplicateLog': duplicate_log,
    'rings':        deduplicated,
}

OUT_PATH.write_text(json.dumps(output, indent=2))
print(f'\nOutput: {OUT_PATH}')
