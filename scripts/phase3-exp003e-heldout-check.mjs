/**
 * EXP-003e — Held-out generalization check for Guard 6.
 *
 * The 407-ring dual-oracle corpus (EXP-003b/c/d) was used both to *diagnose*
 * the collinear-endpoint FP mechanism and to *measure* Guard 6's effect on it.
 * That makes the 100% precision result on that corpus potentially circular.
 *
 * This script provides independent validation: it runs TileGuard v0.7.0
 * (Guards 1–6) on the 1,800 higher-zoom tiles from EXP-008 — a dataset the
 * guards were never tuned on — extracts the rings it flags, and runs the same
 * dual-oracle pipeline (GEOS via Shapely + Exact Integer Python) on them.
 *
 * If Guard 6 generalizes cleanly, the higher-zoom rings should also show
 * precision near 100% with recall unchanged.  If the 5-vertex collinear-sliver
 * pattern was z0–z4 / countries-layer-specific, new FPs will appear here.
 *
 * Method:
 *   1. Scan all 1,800 phase3-highzoom PBFs with v0.7.0 Guards 1–6.
 *   2. For each flagged ring, record vertices + metadata.
 *   3. Deduplicate by vertex-list hash (same policy as EXP-003b).
 *   4. Write deduplicated rings to analysis/phase3-heldout/heldout-rings.json.
 *   5. Run GEOS oracle (Shapely LinearRing.is_simple) — inline Python subprocess.
 *   6. Run Exact Integer Oracle 2 (orient2d proper-crossing) — inline Python subprocess.
 *   7. Compute precision/recall/F1 (Polygon rings only; dual-oracle consensus as GT).
 *   8. Write full results to analysis/phase3-heldout/exp003e-heldout-results.json.
 *
 * Usage: node scripts/phase3-exp003e-heldout-check.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { readdirSync, statSync }  from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath }          from 'node:url';
import { execSync }               from 'node:child_process';
import { createHash }             from 'node:crypto';
import { VectorTile }             from '@mapbox/vector-tile';
import { PbfReader as Pbf }       from 'pbf';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const TILE_ROOT = join(ROOT, 'fixtures', 'phase3-highzoom');
const OUT_DIR   = join(ROOT, 'analysis', 'phase3-heldout');
mkdirSync(OUT_DIR, { recursive: true });

// ── TileGuard v0.7.0 Guards 1–6 (pure JS replica) ────────────────────────────

function orientation(ax, ay, bx, by, cx, cy) {
  const value = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
  if (value === 0) return 0;
  return value > 0 ? 1 : 2;
}
function onSegment(ax, ay, bx, by, cx, cy) {
  return bx <= Math.max(ax,cx) && bx >= Math.min(ax,cx) &&
         by <= Math.max(ay,cy) && by >= Math.min(ay,cy);
}
function segmentsIntersect(ax,ay,bx,by,cx,cy,dx,dy) {
  const o1 = orientation(ax,ay,bx,by,cx,cy);
  const o2 = orientation(ax,ay,bx,by,dx,dy);
  const o3 = orientation(cx,cy,dx,dy,ax,ay);
  const o4 = orientation(cx,cy,dx,dy,bx,by);
  if (o1!==o2 && o3!==o4) return true;
  if (o1===0 && onSegment(ax,ay,cx,cy,bx,by)) return true;
  if (o2===0 && onSegment(ax,ay,dx,dy,bx,by)) return true;
  if (o3===0 && onSegment(cx,cy,ax,ay,dx,dy)) return true;
  if (o4===0 && onSegment(cx,cy,bx,by,dx,dy)) return true;
  return false;
}
// Guard 6: proper crossing only (0=collinear, 1=CW, 2=CCW — not signed)
function isProperCrossing(ax,ay,bx,by,cx,cy,dx,dy) {
  const o1 = orientation(ax,ay,bx,by,cx,cy);
  const o2 = orientation(ax,ay,bx,by,dx,dy);
  const o3 = orientation(cx,cy,dx,dy,ax,ay);
  const o4 = orientation(cx,cy,dx,dy,bx,by);
  return o1!==0 && o2!==0 && o1!==o2 && o3!==0 && o4!==0 && o3!==o4;
}
function collectDuplicateVertices(pts, closed) {
  const seen = new Map(); const dups = new Set(); const last = pts.length-1;
  for (let i=0;i<pts.length;i++) {
    const k = `${pts[i].x},${pts[i].y}`;
    if (seen.has(k)) { if (closed && seen.get(k)===0 && i===last) continue; dups.add(k); }
    else seen.set(k,i);
  }
  return dups;
}
function collectSelfTangencyVertices(pts, closed) {
  const seen = new Map(); const last = pts.length-1;
  for (let i=0;i<pts.length;i++) {
    const k=`${pts[i].x},${pts[i].y}`; const a=seen.get(k);
    if (!a) seen.set(k,[i]); else a.push(i);
  }
  const t = new Set();
  for (const [k,idx] of seen) {
    if (idx.length<2) continue;
    for (let a=0;a<idx.length-1;a++) for (let b=a+1;b<idx.length;b++) {
      const i=idx[a],j=idx[b];
      if (closed && i===0 && j===last) continue;
      if (Math.abs(i-j)===1) continue;
      t.add(k);
    }
  }
  return t;
}

function tileguardV7Flagged(pts, closed) {
  if (pts.length < 4) return false;
  const dup  = collectDuplicateVertices(pts, closed);
  const tang = collectSelfTangencyVertices(pts, closed);
  const segCount = pts.length - 1;

  for (let first=0; first<segCount; first++) {
    const ax=pts[first].x, ay=pts[first].y;
    const bx=pts[first+1].x, by=pts[first+1].y;
    const aMinX=Math.min(ax,bx), aMaxX=Math.max(ax,bx);
    const aMinY=Math.min(ay,by), aMaxY=Math.max(ay,by);

    for (let second=first+1; second<segCount; second++) {
      if (Math.abs(first-second)<=1) continue;
      if (closed && first===0 && second===segCount-1) continue;
      const cx=pts[second].x, cy=pts[second].y;
      const dx=pts[second+1].x, dy=pts[second+1].y;
      if (aMinX>Math.max(cx,dx)||aMaxX<Math.min(cx,dx)||
          aMinY>Math.max(cy,dy)||aMaxY<Math.min(cy,dy)) continue;
      if (dup.size>0) {
        const ak=`${ax},${ay}`,bk=`${bx},${by}`,ck=`${cx},${cy}`,dk=`${dx},${dy}`;
        if ((dup.has(bk)&&(bk===ck||bk===dk))||(dup.has(ak)&&(ak===ck||ak===dk))||
            (dup.has(ck)&&(ck===ak||ck===bk))||(dup.has(dk)&&(dk===ak||dk===bk))) continue;
      }
      if (tang.size>0) {
        const ak=`${ax},${ay}`,bk=`${bx},${by}`,ck=`${cx},${cy}`,dk=`${dx},${dy}`;
        if ((tang.has(bk)&&(bk===ck||bk===dk))||(tang.has(ak)&&(ak===ck||ak===dk))||
            (tang.has(ck)&&(ck===ak||ck===bk))||(tang.has(dk)&&(dk===ak||dk===bk))) continue;
      }
      if (segmentsIntersect(ax,ay,bx,by,cx,cy,dx,dy) &&
          isProperCrossing(ax,ay,bx,by,cx,cy,dx,dy)) return true;
    }
  }
  return false;
}

// ── Step 1: Scan all phase3-highzoom tiles ─────────────────────────────────

console.log('Step 1: Scanning 1,800 higher-zoom tiles with TileGuard v0.7.0...');

const rawRings = [];
const providers = readdirSync(TILE_ROOT).filter(p => statSync(join(TILE_ROOT,p)).isDirectory());

for (const provider of providers) {
  const zoomDirs = readdirSync(join(TILE_ROOT, provider))
    .filter(z => statSync(join(TILE_ROOT, provider, z)).isDirectory());

  for (const zoomDir of zoomDirs) {
    const z = parseInt(zoomDir.replace('z',''), 10);
    const tileDir = join(TILE_ROOT, provider, zoomDir);
    const files = readdirSync(tileDir).filter(f => f.endsWith('.pbf'));

    for (const filename of files) {
      const filepath = join(tileDir, filename);
      if (statSync(filepath).size === 0) continue;
      let tile;
      try {
        const buf = readFileSync(filepath);
        tile = new VectorTile(new Pbf(buf));
      } catch (e) { continue; }

      const [zStr, xStr, yStr] = filename.replace('.pbf','').split('-');

      for (const [layerName, layer] of Object.entries(tile.layers)) {
        for (let fi=0; fi<layer.length; fi++) {
          const feature = layer.feature(fi);
          if (feature.type !== 2 && feature.type !== 3) continue;
          let parts;
          try { parts = feature.loadGeometry(); } catch(_) { continue; }

          const firstPt = parts[0]?.[0];
          for (let pi=0; pi<parts.length; pi++) {
            const pts = parts[pi];
            if (!pts || pts.length < 4) continue;

            const lastPt = pts[pts.length-1];
            const isClosedLS = feature.type===2 &&
              pts[0].x===lastPt.x && pts[0].y===lastPt.y;
            const closed = feature.type===3 || isClosedLS;

            if (!tileguardV7Flagged(pts, closed)) continue;

            const vset = new Set(pts.map(p=>`${p.x},${p.y}`));
            rawRings.push({
              provider,
              zoom: z,
              tile: filename,
              layer: layerName,
              featureIndex: fi,
              partIndex: pi,
              geometryType: feature.type===2 ? 'LineString' : 'Polygon',
              vertexCount: pts.length,
              hasDuplicateVertices: vset.size < pts.length,
              vertices: pts.map(p=>({x:p.x, y:p.y})),
            });
          }
        }
      }
    }
  }
}

console.log(`  Flagged rings (before dedup): ${rawRings.length}`);

// ── Step 2: Deduplicate by vertex-list hash ───────────────────────────────────

console.log('Step 2: Deduplicating by vertex-list hash...');

function ringHash(vertices) {
  return createHash('sha256')
    .update(vertices.map(v=>`${v.x},${v.y}`).join('|'))
    .digest('hex');
}

const seen = new Map();
const rings = [];
for (const r of rawRings) {
  const h = ringHash(r.vertices);
  if (!seen.has(h)) { seen.set(h, true); rings.push({...r, id: `${r.provider}|${r.tile}|${r.layer}|fi${r.featureIndex}|pi${r.partIndex}`}); }
}
console.log(`  Unique rings after dedup: ${rings.length}`);

// Save rings for oracle scripts
const ringsPath = join(OUT_DIR, 'heldout-rings.json');
writeFileSync(ringsPath, JSON.stringify({ meta: { experiment:'EXP-003e', generated: new Date().toISOString(), totalTiles:1800, rawFlagged: rawRings.length, uniqueRings: rings.length }, rings }, null, 2));
console.log(`  Saved: ${ringsPath}`);

// ── Step 3 & 4: Run oracles via inline Python ─────────────────────────────────

console.log('\nStep 3: Running GEOS oracle (Shapely LinearRing.is_simple)...');

const geosPy = `
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
`;

const geosPyPath = join(OUT_DIR, '_geos_oracle.py');
writeFileSync(geosPyPath, geosPy);
const geosOut = execSync(`python3 ${geosPyPath} ${ringsPath}`, {maxBuffer: 50*1024*1024}).toString();
const geosResults = JSON.parse(geosOut);
const geosMap = Object.fromEntries(geosResults.results.map(r=>[r.id, r]));
console.log(`  GEOS done. Non-simple: ${geosResults.results.filter(r=>r.geos_non_simple).length}/${geosResults.results.length}`);

console.log('Step 4: Running Exact Integer Oracle 2 (orient2d proper-crossing)...');

const o2Py = `
import json, sys

def orient2d(ax, ay, bx, by, cx, cy):
    return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)

def has_proper_crossing(verts):
    n = len(verts)
    if n < 4:
        return False, False
    closed = (verts[0][0] == verts[-1][0] and verts[0][1] == verts[-1][1])
    seg_count = n - 1
    has_proper = False
    has_any_crossing = False
    for i in range(seg_count):
        ax, ay = verts[i]
        bx, by = verts[i+1]
        for j in range(i+1, seg_count):
            if abs(i-j) <= 1: continue
            if closed and i == 0 and j == seg_count - 1: continue
            cx, cy = verts[j]
            dx, dy = verts[j+1]
            o1 = orient2d(ax,ay,bx,by,cx,cy)
            o2 = orient2d(ax,ay,bx,by,dx,dy)
            o3 = orient2d(cx,cy,dx,dy,ax,ay)
            o4 = orient2d(cx,cy,dx,dy,bx,by)
            def sign(v): return 1 if v>0 else (-1 if v<0 else 0)
            s1,s2,s3,s4 = sign(o1),sign(o2),sign(o3),sign(o4)
            # Any crossing (general + collinear)
            gen = (s1!=s2 and s3!=s4) or \
                  (o1==0 and min(ax,bx)<=cx<=max(ax,bx) and min(ay,by)<=cy<=max(ay,by)) or \
                  (o2==0 and min(ax,bx)<=dx<=max(ax,bx) and min(ay,by)<=dy<=max(ay,by)) or \
                  (o3==0 and min(cx,dx)<=ax<=max(cx,dx) and min(cy,dy)<=ay<=max(cy,dy)) or \
                  (o4==0 and min(cx,dx)<=bx<=max(cx,dx) and min(cy,dy)<=by<=max(cy,dy))
            if gen:
                has_any_crossing = True
                # Proper = strictly opposite signs on both straddling tests
                if s1 != 0 and s2 != 0 and s1 != s2 and s3 != 0 and s4 != 0 and s3 != s4:
                    has_proper = True
    return has_any_crossing, has_proper

data = json.load(open(sys.argv[1]))
results = []
for ring in data['rings']:
    verts = [(v['x'],v['y']) for v in ring['vertices']]
    any_cross, proper = has_proper_crossing(verts)
    results.append({
        'id': ring['id'],
        'oracle2_self_intersects': any_cross,
        'oracle2_has_proper_crossing': proper,
    })
print(json.dumps({'results': results}))
`;

const o2PyPath = join(OUT_DIR, '_o2_oracle.py');
writeFileSync(o2PyPath, o2Py);
const o2Out = execSync(`python3 ${o2PyPath} ${ringsPath}`, {maxBuffer: 50*1024*1024}).toString();
const o2Results = JSON.parse(o2Out);
const o2Map = Object.fromEntries(o2Results.results.map(r=>[r.id, r]));
console.log(`  Oracle 2 done. Proper crossings: ${o2Results.results.filter(r=>r.oracle2_has_proper_crossing).length}/${o2Results.results.length}`);

// ── Step 5: Compute precision/recall/F1 ───────────────────────────────────────

console.log('\nStep 5: Computing precision/recall/F1...');

const rows = rings.map(ring => {
  const geo = geosMap[ring.id];
  const o2  = o2Map[ring.id];
  const geosFlagged    = geo ? geo.geos_non_simple : false;
  const o2Proper       = o2  ? o2.oracle2_has_proper_crossing : false;
  const dualConsensus  = geosFlagged && o2Proper;
  // TileGuard v0.7.0 flagged this ring (by construction — all rings in this set were flagged)
  const tgFlagged = true;

  let category;
  if (tgFlagged && geosFlagged && o2Proper)         category = 'AGREE_DEFECT';
  else if (tgFlagged && geosFlagged && !o2Proper)   category = 'AGREE_COLLINEAR_CONTACT'; // shouldn't appear if Guard 6 works
  else if (tgFlagged && !geosFlagged && o2Proper)   category = 'TILEGUARD_ONLY_PROPER';
  else if (tgFlagged && !geosFlagged && !o2Proper)  category = 'TILEGUARD_EXTRA';
  else                                               category = 'OTHER';

  return { ...ring, geosFlagged, o2Proper, dualConsensus, tgFlagged, category };
});

const polyRows = rows.filter(r => r.geometryType === 'Polygon');
const lsRows   = rows.filter(r => r.geometryType === 'LineString');

const TP = polyRows.filter(r => r.tgFlagged && r.dualConsensus).length;
const FP = polyRows.filter(r => r.tgFlagged && !r.dualConsensus).length;
const FN = 0; // We only have TileGuard-flagged rings — FN not measurable here
const TN = 0; // Same reason

const precision = TP + FP > 0 ? TP / (TP + FP) : null;
// Recall not directly measurable (we only have flagged rings, not the full negative set)
// But: 0 FN in the oracle study means recall is conservatively assumed 100%
// from the EXP-003d result. We note this explicitly.

const catCounts = {};
for (const r of rows) catCounts[r.category] = (catCounts[r.category]??0)+1;

// Vertex distribution of any FPs
const fpRows = polyRows.filter(r => r.tgFlagged && !r.dualConsensus);
const fpVertexDist = {};
for (const r of fpRows) fpVertexDist[r.vertexCount] = (fpVertexDist[r.vertexCount]??0)+1;

console.log('\n' + '═'.repeat(62));
console.log('  EXP-003e — Held-Out Generalization Check (v0.7.0)');
console.log('═'.repeat(62));
console.log(`  Tiles scanned:              1,800`);
console.log(`  Raw flagged rings:          ${rawRings.length}`);
console.log(`  Unique rings (held-out):    ${rings.length}`);
console.log(`  Polygon rings:              ${polyRows.length}`);
console.log(`  LineString rings:           ${lsRows.length}`);
console.log('');
console.log('  Agreement categories:');
for (const [cat, count] of Object.entries(catCounts).sort((a,b)=>b[1]-a[1])) {
  console.log(`    ${cat.padEnd(35)} ${count}`);
}
console.log('');
console.log(`  Polygon TP=${TP}  FP=${FP}  (FN/TN not measurable — only flagged rings collected)`);
if (precision !== null) console.log(`  Polygon Precision: ${(precision*100).toFixed(1)}%`);
if (FP > 0) {
  console.log(`\n  ⚠ FP vertex distribution:`);
  for (const [v,c] of Object.entries(fpVertexDist).sort((a,b)=>Number(a[0])-Number(b[0]))) {
    console.log(`    ${v} vertices: ${c}`);
  }
}
console.log('═'.repeat(62));

// ── Write results ─────────────────────────────────────────────────────────────

const outPath = join(OUT_DIR, 'exp003e-heldout-results.json');
writeFileSync(outPath, JSON.stringify({
  meta: {
    experiment: 'EXP-003e',
    description: 'Held-out generalization check for Guard 6 — TileGuard v0.7.0 on 1,800 EXP-008 higher-zoom tiles',
    generated: new Date().toISOString(),
    guardVersion: 'v0.7.0 (Guards 1–6)',
    tileCorpus: { tiles: 1800, providers: ['OpenFreeMap','CARTO Streets'], zooms: ['z8','z12','z14'] },
    note: 'FN/TN not measurable — only TileGuard-flagged rings were oracle-evaluated. Recall assumed 100% from EXP-003d.',
  },
  counts: { rawFlagged: rawRings.length, uniqueRings: rings.length, polygonRings: polyRows.length, lineStringRings: lsRows.length },
  polygonMetrics: { TP, FP, FN_note: 'not_measurable', precision: precision !== null ? Math.round(precision*10000)/10000 : null },
  fpVertexDistribution: fpVertexDist,
  categoryCounts: catCounts,
  rows,
}, null, 2));
console.log(`\nOutput: ${outPath}`);
