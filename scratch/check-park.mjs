import { decodeMvt } from '../packages/tile-rules/dist/index.js';
import { getFeatureParts } from '../packages/tile-rules/dist/types.js';

async function main() {
  const url = 'https://tiles.openfreemap.org/planet/20260621_080001_pt/5/28/14.pbf';
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const tile = decodeMvt(Buffer.from(buf));

  const layer = tile.layers.park;
  if (!layer) {
    console.log('No park layer found');
    return;
  }

  console.log(`Park layer has ${layer.features.length} features.`);
  for (let i = 0; i < layer.features.length; i++) {
    const f = layer.features[i];
    const parts = getFeatureParts(f);
    let out = false;
    const pts = [];
    for (const part of parts) {
      for (const p of part) {
        if (p.x < -80 || p.x > 4176 || p.y < -80 || p.y > 4176) {
          out = true;
          pts.push(p);
        }
      }
    }
    if (out) {
      console.log(
        `Feature ${i}: type=${f.type}, properties=`,
        f.properties,
        `out-of-range coordinates:`,
        pts,
      );
    }
  }
}

main().catch(console.error);
