// Builds data/roads/ from Natural Earth's 1:10m roads (public domain) so the big roads load from our own site
// instead of the public Overpass servers. Run once, or again if Natural Earth publishes a new version:
//   curl -LO https://naciscdn.org/naturalearth/10m/cultural/ne_10m_roads.zip && unzip ne_10m_roads.zip -d ne
//   npm i --no-save shapefile@0.6.6 && node tools/build-roads.js ne/ne_10m_roads.shp
// Output: one small file per 10 degree tile, data/roads/<lonIndex>_<latIndex>.json, plus data/roads/index.json.
// Each tile is { "lines": [[kind, x0, y0, dx1, dy1, dx2, dy2, ...], ...] } with coordinates in hundredths of a degree,
// each point stored as the difference from the one before. kind 0 = major highway, 1 = secondary highway, 2 = road.
const fs = require('fs'), path = require('path'), shp = require('shapefile');
const KIND = { 'Major Highway': 0, 'Beltway': 0, 'Bypass': 0, 'Secondary Highway': 1, 'Road': 2 };
const TILE = 10, Q = 100, TOL = 0.004; // tile size in degrees, quantize to 0.01 degree, simplify to about 400 m
function simplify(pts) { // Douglas-Peucker
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let best = -1, bd = TOL * TOL;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i]; let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
      const ex = ax + t * dx - px, ey = ay + t * dy - py, d = ex * ex + ey * ey; if (d > bd) { bd = d; best = i; }
    }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
(async () => {
  const src = await shp.open(process.argv[2]), tiles = new Map(); let kept = 0, points = 0;
  for (;;) {
    const r = await src.read(); if (r.done) break;
    const p = r.value.properties, g = r.value.geometry; if (!g) continue;
    let kind = KIND[p.type]; if (kind === undefined) continue; if (p.expressway === 1) kind = 0;
    for (const line of g.type === 'LineString' ? [g.coordinates] : g.coordinates) {
      const s = simplify(line).map(([x, y]) => [Math.round(x * Q), Math.round(y * Q)]).filter((v, i, a) => !i || v[0] !== a[i - 1][0] || v[1] !== a[i - 1][1]);
      if (s.length < 2) continue;
      const enc = [kind, s[0][0], s[0][1]]; for (let i = 1; i < s.length; i++) enc.push(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; s.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
      // a line goes in every tile its bounding box touches, so it shows whichever tiles are loaded
      for (let i = Math.floor((x0 / Q + 180) / TILE); i <= Math.floor((x1 / Q + 180) / TILE); i++)
        for (let j = Math.floor((y0 / Q + 90) / TILE); j <= Math.floor((y1 / Q + 90) / TILE); j++) {
          const k = i + '_' + j; if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(enc);
        }
      kept++; points += s.length;
    }
  }
  const out = path.join(__dirname, '..', 'data', 'roads'); fs.mkdirSync(out, { recursive: true });
  fs.readdirSync(out).forEach(f => fs.unlinkSync(path.join(out, f)));
  let bytes = 0; for (const [k, lines] of tiles) { const t = JSON.stringify({ lines }); bytes += t.length; fs.writeFileSync(path.join(out, k + '.json'), t); }
  fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify({ tile: TILE, q: Q, source: 'Natural Earth 1:10m roads v5.1.2 (public domain)', tiles: [...tiles.keys()].sort() }));
  console.log(kept, 'lines', points, 'points', tiles.size, 'tiles', (bytes / 1e6).toFixed(2), 'MB');
})();
