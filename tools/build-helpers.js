/* Helpers for build-geometry.js:
 *  - riverPath: the course of a river between two points, following OSM river data
 *  - buildValleys: basin/gorge regions grown from a river over low terrain (elevation tiles)
 */
window.BuildHelpers = (() => {
  /* ------------------------------------------------------------------ *
   * River paths
   * ------------------------------------------------------------------ */
  const graphs = {};

  // Graph of one river's vertices. Gaps between OSM ways (reservoirs, mapping breaks) up to `maxGap` km are bridged.
  function riverGraph(name, maxGap = 1.5) {
    const cacheKey = name + '|' + maxGap;
    if (graphs[cacheKey]) return graphs[cacheKey];
    const f = window.BOUNDARY_RIVERS.features.find((r) => r.properties.name === name);
    if (!f) throw new Error(`river "${name}" is not in data/boundary-rivers.js`);
    const idx = new Map(), pts = [], adj = [], lineOf = [];
    const node = (c, li) => {
      const k = c[0] + ',' + c[1];
      let i = idx.get(k);
      if (i === undefined) { i = pts.length; idx.set(k, i); pts.push(c); adj.push([]); lineOf.push(li); }
      return i;
    };
    const link = (a, b, d) => { adj[a].push([b, d]); adj[b].push([a, d]); };
    const lines = f.geometry.coordinates.filter((l) => l.length > 1);
    lines.forEach((line, li) => {
      let prev = -1;
      line.forEach((c) => { const i = node(c, li); if (prev >= 0 && prev !== i) link(prev, i, turf.distance(pts[prev], c)); prev = i; });
    });
    // Connected pieces (union-find over nodes), so gaps are only bridged between different pieces
    const parent = pts.map((_, i) => i);
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    adj.forEach((nb, i) => nb.forEach(([j]) => { parent[find(i)] = find(j); }));
    lines.forEach((line) => [line[0], line[line.length - 1]].forEach((c) => {
      const a = idx.get(c[0] + ',' + c[1]);
      let best = -1, bd = maxGap;
      pts.forEach((p, j) => { if (find(j) !== find(a)) { const d = turf.distance(c, p); if (d < bd) { bd = d; best = j; } } });
      if (best >= 0) { link(a, best, bd); parent[find(a)] = find(best); }
    }));
    return (graphs[cacheKey] = { pts, adj });
  }

  const nearestNode = (pts, c) => {
    let best = 0, bd = Infinity;
    pts.forEach((p, i) => { const d = (p[0] - c[0]) ** 2 + ((p[1] - c[1]) * 1.4) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  };

  // Ordered coordinates of `name` from the vertex nearest `from` to the vertex nearest `to` (Dijkstra)
  function riverPath(name, from, to, maxGap) {
    const { pts, adj } = riverGraph(name, maxGap);
    const s = nearestNode(pts, from), t = nearestNode(pts, to);
    const dist = new Float64Array(pts.length).fill(Infinity), prev = new Int32Array(pts.length).fill(-1);
    const heap = new Heap();
    dist[s] = 0; heap.push(0, s);
    while (heap.size) {
      const [d, i] = heap.pop();
      if (d > dist[i]) continue;
      if (i === t) break;
      for (const [j, w] of adj[i]) if (d + w < dist[j]) { dist[j] = d + w; prev[j] = i; heap.push(d + w, j); }
    }
    if (!isFinite(dist[t])) throw new Error(`no path along "${name}" between the given points`);
    const out = [];
    for (let i = t; i >= 0; i = prev[i]) out.push(pts[i]);
    return out.reverse();
  }

  /* ------------------------------------------------------------------ *
   * Binary min-heap of (priority, value)
   * ------------------------------------------------------------------ */
  class Heap {
    constructor() { this.p = []; this.v = []; }
    get size() { return this.p.length; }
    push(p, v) {
      const P = this.p, V = this.v;
      let i = P.length; P.push(p); V.push(v);
      while (i > 0) { const j = (i - 1) >> 1; if (P[j] <= p) break; P[i] = P[j]; V[i] = V[j]; i = j; }
      P[i] = p; V[i] = v;
    }
    pop() {
      const P = this.p, V = this.v, top = [P[0], V[0]];
      const lp = P.pop(), lv = V.pop();
      if (P.length) {
        let i = 0; const n = P.length;
        for (;;) {
          let c = 2 * i + 1; if (c >= n) break;
          if (c + 1 < n && P[c + 1] < P[c]) c++;
          if (P[c] >= lp) break;
          P[i] = P[c]; V[i] = V[c]; i = c;
        }
        P[i] = lp; V[i] = lv;
      }
      return top;
    }
  }

  /* ------------------------------------------------------------------ *
   * Elevation (AWS Terrain Tiles, terrarium encoding)
   * ------------------------------------------------------------------ */
  function loadTile(z, x, y) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = 256;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, 256, 256).data);
      };
      img.onerror = () => reject(new Error(`elevation tile ${z}/${x}/${y} failed to load`));
      img.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
    });
  }

  async function loadDem(bbox, z) {
    const n = 2 ** z;
    const lon2x = (lon) => ((lon + 180) / 360) * n;
    const lat2y = (lat) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n; };
    const tx0 = Math.floor(lon2x(bbox[0])), tx1 = Math.floor(lon2x(bbox[2]));
    const ty0 = Math.floor(lat2y(bbox[3])), ty1 = Math.floor(lat2y(bbox[1]));
    const W = (tx1 - tx0 + 1) * 256, H = (ty1 - ty0 + 1) * 256;
    const elev = new Float32Array(W * H);
    const jobs = [];
    for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) {
      jobs.push(loadTile(z, tx, ty).then((d) => {
        const ox = (tx - tx0) * 256, oy = (ty - ty0) * 256;
        for (let r = 0; r < 256; r++) for (let c = 0; c < 256; c++) {
          const k = (r * 256 + c) * 4;
          elev[(oy + r) * W + ox + c] = d[k] * 256 + d[k + 1] + d[k + 2] / 256 - 32768;
        }
      }));
    }
    await Promise.all(jobs);
    const x0 = tx0 * 256, y0 = ty0 * 256, scale = 256 * n;
    const rowLat = (row) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y0 + row)) / scale))) * 180) / Math.PI;
    return {
      W, H, elev, tiles: jobs.length,
      toPixel: (lon, lat) => [lon2x(lon) * 256 - x0, lat2y(lat) * 256 - y0],
      toLngLat: (col, row) => [((x0 + col) / scale) * 360 - 180, rowLat(row)],
      metersPerPixel: (row) => (40075016.686 * Math.cos((rowLat(row) * Math.PI) / 180)) / scale
    };
  }

  /* ------------------------------------------------------------------ *
   * Raster → polygons
   * ------------------------------------------------------------------ */
  // Trace the outline of every pixel labelled `L` into rings (interior kept on the right, screen coords)
  function traceRings(label, W, H, L, box) {
    const K = W + 2;
    const key = (c, r) => r * K + c;
    const out = new Map(); // start vertex -> [end vertices]
    const add = (c0, r0, c1, r1) => { const k = key(c0, r0); (out.get(k) || out.set(k, []).get(k)).push(key(c1, r1)); };
    const is = (c, r) => c >= 0 && r >= 0 && c < W && r < H && label[r * W + c] === L;
    for (let r = box[1]; r <= box[3]; r++) for (let c = box[0]; c <= box[2]; c++) {
      if (label[r * W + c] !== L) continue;
      if (!is(c, r - 1)) add(c, r, c + 1, r);
      if (!is(c + 1, r)) add(c + 1, r, c + 1, r + 1);
      if (!is(c, r + 1)) add(c + 1, r + 1, c, r + 1);
      if (!is(c - 1, r)) add(c, r + 1, c, r);
    }
    const rings = [];
    const xy = (k) => [k % K, Math.floor(k / K)];
    for (const [start] of out) {
      while (out.get(start) && out.get(start).length) {
        const ring = [start];
        let cur = start, dir = null;
        for (let guard = 0; guard < 1e7; guard++) {
          const nexts = out.get(cur);
          if (!nexts || !nexts.length) break;
          let pick = 0;
          if (nexts.length > 1 && dir) {
            // at a saddle, turn right (towards the interior) so diagonal pixels stay separate
            const [cx, cy] = xy(cur);
            const want = [-dir[1], dir[0]];
            const i = nexts.findIndex((k) => { const [nx, ny] = xy(k); return nx - cx === want[0] && ny - cy === want[1]; });
            if (i >= 0) pick = i;
          }
          const nxt = nexts.splice(pick, 1)[0];
          const [ax, ay] = xy(cur), [bx, by] = xy(nxt);
          dir = [bx - ax, by - ay];
          cur = nxt;
          if (cur === start) break;
          ring.push(cur);
        }
        if (ring.length >= 4) rings.push(ring.map(xy));
      }
    }
    return rings;
  }

  const ringArea = (ring) => { let a = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]); return a / 2; };
  const inRing = ([x, y], ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  // Chaikin corner cutting: turns pixel staircases into smooth natural-looking outlines
  const chaikin = (ring, n) => {
    let pts = ring.slice(0, -1);
    for (let k = 0; k < n; k++) {
      const next = [];
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        next.push([0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]], [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]]);
      });
      pts = next;
    }
    return [...pts, pts[0]];
  };

  function vectorize(dem, label, L, box) {
    // Traced with the interior on the right in screen coordinates (y down). Rows run north→south,
    // so in lng/lat outer rings come out clockwise (negative area) and holes counter-clockwise.
    // Reverse both to get GeoJSON's convention (outer CCW, holes CW).
    const rings = traceRings(label, dem.W, dem.H, L, box)
      .map((r) => { const g = r.map(([c, rr]) => dem.toLngLat(c, rr)); g.push(g[0]); return g.reverse(); });
    const outers = rings.filter((r) => ringArea(r) > 0).map((r) => [r]);
    rings.filter((r) => ringArea(r) < 0).forEach((h) => {
      const o = outers.find((p) => inRing(h[0], p[0]));
      if (o) o.push(h);
    });
    if (!outers.length) return null;
    // smooth: drop staircase vertices, then round the corners
    const smooth = (ring) => {
      const s = turf.simplify(turf.lineString(ring), { tolerance: 0.0018 }).geometry.coordinates;
      return s.length >= 4 ? chaikin(s, 3) : null;
    };
    const polys = outers.map((p) => p.map(smooth).filter(Boolean)).filter((p) => p.length && Math.abs(ringArea(p[0])) > 1e-5);
    return polys.length ? turf.multiPolygon(polys) : null;
  }

  /* ------------------------------------------------------------------ *
   * Valley regions
   * ------------------------------------------------------------------ */
  // Grows every unit outward from its stretch of river (shortest distance first, so neighbouring
  // units meet halfway). A pixel joins if it is within the unit's dmax and at most `rise` metres
  // above the river level where the growth started.
  async function buildValleys(valleys, log) {
    const units = [];      // { id, dmax (m), rise, seeds: [[lng,lat]] }
    const densify = (path, step = 0.05) => {
      const out = [];
      for (let i = 1; i < path.length; i++) {
        const d = turf.distance(path[i - 1], path[i]);
        const n = Math.max(1, Math.ceil(d / step));
        for (let k = 0; k < n; k++) out.push([path[i - 1][0] + ((path[i][0] - path[i - 1][0]) * k) / n, path[i - 1][1] + ((path[i][1] - path[i - 1][1]) * k) / n]);
      }
      out.push(path[path.length - 1]);
      return out;
    };
    valleys.forEach((v) => {
      const path = riverPath(v.river, v.from, v.to);
      let start = 0;
      v.units.forEach((u, k) => {
        let end = path.length - 1;
        if (u.until) {
          let bd = Infinity;
          path.forEach((p, i) => { if (i >= start) { const d = turf.distance(p, u.until); if (d < bd) { bd = d; end = i; } } });
          if (bd > 3) log(`  note: ${u.id}: river passes ${bd.toFixed(1)} km from its "until" point`);
        }
        units.push({ id: u.id, name: u.name, region: v.id, alsoIn: u.alsoIn, dmax: u.dmax * 1000, rise: u.rise, seeds: densify(path.slice(start, end + 1)) });
        start = end;
      });
      (v.extraSeeds || []).forEach((x) => {
        const unit = units.find((u) => u.id === x.unit);
        const [lng, lat, km] = x.within;
        const f = window.BOUNDARY_RIVERS.features.find((r) => r.properties.name === x.river);
        if (!f) { log(`WARNING: river "${x.river}" not found`); return; }
        f.geometry.coordinates.forEach((line) => {
          const near = line.filter((c) => turf.distance(c, [lng, lat]) <= km);
          if (near.length > 1) unit.seeds.push(...densify(near));
        });
      });
    });

    // Elevation for the area around all seeds
    const maxD = Math.max(...units.map((u) => u.dmax)) / 1000 + 3;
    const all = units.flatMap((u) => u.seeds);
    const lats = all.map((p) => p[1]), lngs = all.map((p) => p[0]);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const dLat = maxD / 111, dLng = maxD / (111 * Math.cos((midLat * Math.PI) / 180));
    const bbox = [Math.min(...lngs) - dLng, Math.min(...lats) - dLat, Math.max(...lngs) + dLng, Math.max(...lats) + dLat];
    const dem = await loadDem(bbox, 10);
    log(`  elevation: ${dem.tiles} tiles, ${dem.W}×${dem.H} px`);

    const { W, H, elev } = dem;
    const label = new Int16Array(W * H).fill(-1);
    // Float64: queue priorities are doubles; a Float32 copy rounds down and makes `d > dist[i]` skip valid pixels
    const dist = new Float64Array(W * H).fill(Infinity);
    const ref = new Float32Array(W * H);
    const heap = new Heap();
    units.forEach((u, ui) => u.seeds.forEach(([lng, lat]) => {
      const [x, y] = dem.toPixel(lng, lat).map(Math.floor);
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return;
      const i = y * W + x;
      if (dist[i] === 0) return;
      // river level: lowest point right around the river pixel
      let lo = Infinity;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) lo = Math.min(lo, elev[i + dy * W + dx]);
      dist[i] = 0; label[i] = ui; ref[i] = lo;
      heap.push(0, i);
    }));
    const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    while (heap.size) {
      const [d, i] = heap.pop();
      if (d > dist[i]) continue;
      const ui = label[i], u = units[ui];
      const x = i % W, y = (i - x) / W;
      const mpp = dem.metersPerPixel(y);
      for (const [dx, dy, f] of NB) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx, nd = d + mpp * f;
        if (nd >= dist[j] || nd > u.dmax || elev[j] > ref[i] + u.rise) continue;
        dist[j] = nd; label[j] = ui; ref[j] = ref[i];
        heap.push(nd, j);
      }
    }

    // Sections shared with a second valley (`alsoIn`): keep their own outline before merging
    const shared = units.map((u, ui) => [u, ui]).filter(([u]) => u.alsoIn).map(([u, ui]) => {
      const box = [W, H, -1, -1];
      for (let i = 0; i < label.length; i++) if (label[i] === ui) {
        const x = i % W, y = (i - x) / W;
        if (x < box[0]) box[0] = x; if (y < box[1]) box[1] = y; if (x > box[2]) box[2] = x; if (y > box[3]) box[3] = y;
      }
      return box[2] < 0 ? null : { id: u.id, into: u.alsoIn, shape: vectorize(dem, label, ui, box) };
    }).filter(Boolean);

    // Sections of the same valley become one region: relabel pixels by region (valley) index
    const regionIds = [...new Set(units.map((u) => u.region))];
    const regionOf = units.map((u) => regionIds.indexOf(u.region));
    for (let i = 0; i < label.length; i++) if (label[i] >= 0) label[i] = regionOf[label[i]];

    // Round off the outline of each valley region (morphological opening, then closing):
    //  - opening (shrink, then grow back) cuts off thin tongues that run up side valleys and small bumps
    //  - closing (grow, then shrink back) fills narrow notches between hills
    // Pixels near the river itself are always kept, so narrow gorges stay connected.
    {
      const mpp = dem.metersPerPixel(H / 2);
      const OPEN = 700 / mpp, CLOSE = 600 / mpp, CORE = 450;
      // chamfer distance (in pixels) from every pixel to the nearest pixel where inside(i) is false
      const distTo = (inside) => {
        const d = new Float32Array(W * H);
        for (let i = 0; i < d.length; i++) d[i] = inside(i) ? 1e9 : 0;
        const a = 1, b = Math.SQRT2;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x; if (!d[i]) continue;
          let v = d[i];
          if (x > 0) v = Math.min(v, d[i - 1] + a);
          if (y > 0) { v = Math.min(v, d[i - W] + a); if (x > 0) v = Math.min(v, d[i - W - 1] + b); if (x < W - 1) v = Math.min(v, d[i - W + 1] + b); }
          d[i] = v;
        }
        for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
          const i = y * W + x; if (!d[i]) continue;
          let v = d[i];
          if (x < W - 1) v = Math.min(v, d[i + 1] + a);
          if (y < H - 1) { v = Math.min(v, d[i + W] + a); if (x < W - 1) v = Math.min(v, d[i + W + 1] + b); if (x > 0) v = Math.min(v, d[i + W - 1] + b); }
          d[i] = v;
        }
        return d;
      };
      regionIds.forEach((id, ri) => {
        const isR = (i) => label[i] === ri;
        // opening
        const inner = distTo(isR);                                   // distance to the outside
        const eroded = (i) => inner[i] > OPEN;
        const toCore = distTo((i) => !eroded(i));                    // distance to the shrunken shape
        let kept = 0, cut = 0;
        for (let i = 0; i < label.length; i++) {
          if (label[i] !== ri) continue;
          if (toCore[i] <= OPEN + 0.5 || dist[i] <= CORE) kept++;
          else { label[i] = -1; cut++; }
        }
        // closing: only unlabelled pixels may be filled
        const outer = distTo((i) => label[i] !== ri);                // distance to the region
        const grown = (i) => outer[i] <= CLOSE;
        const toOut = distTo(grown);                                 // distance to outside the grown shape
        let filled = 0;
        for (let i = 0; i < label.length; i++) {
          if (label[i] === -1 && toOut[i] > CLOSE + 0.5) { label[i] = ri; filled++; }
        }
        log(`  smoothing ${id}: cut ${(cut * mpp * mpp / 1e6).toFixed(1)} km², filled ${(filled * mpp * mpp / 1e6).toFixed(1)} km²`);
      });
    }

    // Smooth ragged edges: two passes of a 3×3 majority filter (only near labelled pixels)
    let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
    for (let i = 0; i < label.length; i++) if (label[i] >= 0) {
      const x = i % W, y = (i - x) / W;
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
    }
    const ls = new Int16Array(9), ns = new Int8Array(9);
    for (let pass = 0; pass < 2; pass++) {
      const copy = label.slice();
      for (let y = Math.max(1, by0 - 1); y <= Math.min(H - 2, by1 + 1); y++) for (let x = Math.max(1, bx0 - 1); x <= Math.min(W - 2, bx1 + 1); x++) {
        let k = 0, uniform = true;
        const c0 = copy[y * W + x];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const l = copy[(y + dy) * W + x + dx];
          if (l !== c0) uniform = false;
          let m = 0; while (m < k && ls[m] !== l) m++;
          if (m === k) { ls[k] = l; ns[k] = 0; k++; }
          ns[m]++;
        }
        if (uniform) continue;
        let best = c0, bc = 0;
        for (let m = 0; m < k; m++) if (ns[m] > bc) { bc = ns[m]; best = ls[m]; }
        if (bc >= 5) label[y * W + x] = best;
      }
    }

    // Fill holes: unlabelled patches (knolls on the valley floor) smaller than ~3 km² that are
    // completely surrounded by valley join the unit around them.
    {
      const seen = new Uint8Array(W * H);
      const maxPx = Math.round(3e6 / (dem.metersPerPixel(H / 2) ** 2));
      for (let s = 0; s < label.length; s++) {
        if (label[s] !== -1 || seen[s]) continue;
        const comp = [s]; seen[s] = 1;
        let touchesEdge = false, around = -2, mixed = false;
        // explore the whole patch (even big ones) so every pixel is classified exactly once
        for (let k = 0; k < comp.length; k++) {
          const i = comp[k], x = i % W, y = (i - x) / W;
          if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { touchesEdge = true; continue; }
          for (const j of [i - 1, i + 1, i - W, i + W]) {
            if (label[j] === -1) { if (!seen[j]) { seen[j] = 1; comp.push(j); } }
            else if (around === -2) around = label[j];
            else if (around !== label[j]) mixed = true;
          }
        }
        if (!touchesEdge && comp.length <= maxPx && around >= 0 && !mixed) comp.forEach((i) => { label[i] = around; });
      }
    }

    if (location.search.includes('debug')) window.DEBUG_VALLEY = { dem, label, ref, dist, units };

    // One outline per valley region
    const result = {};
    regionIds.forEach((id, ri) => {
      const box = [W, H, -1, -1];
      let n = 0;
      for (let i = 0; i < label.length; i++) if (label[i] === ri) {
        const x = i % W, y = (i - x) / W; n++;
        if (x < box[0]) box[0] = x; if (y < box[1]) box[1] = y; if (x > box[2]) box[2] = x; if (y > box[3]) box[3] = y;
      }
      if (box[2] < 0) { log(`WARNING: valley "${id}" is empty`); return; }
      result[id] = vectorize(dem, label, ri, box);
      const mpp = dem.metersPerPixel((box[1] + box[3]) / 2);
      log(`  ${id}: ${(n * mpp * mpp / 1e6).toFixed(0)} km² of valley floor and slopes`);
    });
    // shared sections travel alongside (non-enumerable, so callers iterating regions don't see them)
    Object.defineProperty(result, 'shared', { value: shared, enumerable: false });
    // label points of named sections (the middle of their stretch of river)
    Object.defineProperty(result, 'points', { enumerable: false,
      value: units.filter((u) => u.name && u.seeds.length).map((u) => ({ name: u.name, at: u.seeds[Math.floor(u.seeds.length / 2)] })) });
    return result;
  }

  return { riverPath, buildValleys };
})();
