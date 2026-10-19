/* Builds data/features.js (window.FEATURES) from OpenStreetMap downloads in raw/ (Overpass API, ODbL):
 *   rivers   – every named river (waterway=river), merged per river, clipped to Serbia (+2 km for border rivers)
 *   lakes    – named lakes and reservoirs (natural=water) larger than 0.05 km²
 *   ranges   – mountain names (natural=mountain_range|ridge) with the height of their highest nearby peak
 *   peaks    – named peaks with elevation and isolation (distance to the nearest higher peak)
 *   basins   – kotline (natural=valley named "… kotlina") plus Kosovo and Metohija
 *   caves    – named caves (natural=cave_entrance)
 *   towns    – cities and towns (place=city|town) not already in data/places.js
 * Names are stored in Serbian Latin script. */
(async () => {
  const logEl = document.getElementById('log');
  const log = (s) => { logEl.textContent += s + '\n'; console.log(s); };
  const t0 = performance.now();
  try {
    const get = (f) => fetch('../raw/' + f).then((r) => r.json()).then((j) => j.elements);
    const [riverEls, lakeEls, rangeEls, peakEls, valleyEls, caveEls, placeEls, lakeRelEls] = await Promise.all(
      ['allrivers.json', 'lakesosm.json', 'mtranges.json', 'peaks.json', 'valleys.json', 'caves.json', 'places.json', 'lakesrel.json'].map(get));
    // lake relations come from a separate download with their member outlines
    lakeEls.splice(0, lakeEls.length, ...lakeEls.filter((e) => e.type === 'way'), ...lakeRelEls);
    const G = window.GEOMETRY;
    const KM = { units: 'kilometers' };
    const r4 = (v) => +v.toFixed(4);
    const round = (c) => (typeof c[0] === 'number' ? [r4(c[0]), r4(c[1])] : c.map(round));

    // ---- names: Serbian Latin --------------------------------------------------------------------
    const CYR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj',
      м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š' };
    const toLat = (s) => s.replace(/[Ѐ-ӿ]/g, (ch) => {
      const lo = ch.toLowerCase(), l = CYR[lo];
      if (l == null) return ch;
      return ch === lo ? l : l[0].toUpperCase() + l.slice(1);
    });
    // Kosovo rivers that only carry Albanian names in OSM
    const ALB = { 'Drini i Bardhë': 'Beli Drim', 'Llap': 'Lab', 'Lepenc': 'Lepenac', 'Lumbardhi i Pejës': 'Pećka Bistrica',
      'Lumi i Pejës': 'Pećka Bistrica', 'Lumbardhi i Deçanit': 'Dečanska Bistrica', 'Drenicë': 'Drenica', 'Sitnicë': 'Sitnica',
      'Ereniku': 'Erenik', 'Klinë': 'Klina', 'Nerodime': 'Nerodimka', 'Lumbardhi i Prizrenit': 'Prizrenska Bistrica',
      'Mirusha': 'Miruša', 'Mirushë': 'Miruša', 'Lumi Mirushë': 'Miruša', 'Kaçandoll': 'Kačandolska reka', 'Batllavë': 'Batlava',
      'Lumi Klina': 'Klina', 'Përlepnica': 'Prilepnica', 'Morava e Binçës': 'Binačka Morava', 'Ibri': 'Ibar', 'Prroni i Keq': 'Prroni i Keq' };
    const nameOf = (t) => {
      if (t['name:sr-Latn']) return t['name:sr-Latn'].split(' / ')[0].trim();
      if (t['name:sr']) return toLat(t['name:sr'].split(' / ')[0]).trim();
      const n = (t.name || '').trim();
      return ALB[n] || toLat(n.split(' / ')[0]);
    };
    const albanian = (n) => /[ëç]|^(Lumi|Prroni|Gryka|Shpell|Mal|Maja) /.test(n) || /ë/.test(n);

    // ---- Serbia mask: 0.01° cells, inside Serbia (with Kosovo) or within ~2 km of it -------------
    const MX0 = 18.7, MY0 = 41.75, CELL = 0.01, MW = 460, MH = 460;
    const outline = G.outlineWith.type === 'Polygon' ? [G.outlineWith.coordinates] : G.outlineWith.coordinates;
    const inRing = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      if ((r[i][1] > y) !== (r[j][1] > y) && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; } return c; };
    const raw = new Uint8Array(MW * MH);
    // scanline fill per row (fast): crossings of the outline rings
    for (let j = 0; j < MH; j++) {
      const y = MY0 + (j + 0.5) * CELL, xs = [];
      outline.forEach((p) => p.forEach((r) => { for (let i = 0, k = r.length - 1; i < r.length; k = i++) {
        if ((r[i][1] > y) !== (r[k][1] > y)) xs.push(((r[k][0] - r[i][0]) * (y - r[i][1])) / (r[k][1] - r[i][1]) + r[i][0]); } }));
      xs.sort((a, b) => a - b);
      for (let s = 0; s + 1 < xs.length; s += 2) {
        const a = Math.max(0, Math.ceil((xs[s] - MX0) / CELL - 0.5)), b = Math.min(MW - 1, Math.floor((xs[s + 1] - MX0) / CELL - 0.5));
        for (let i = a; i <= b; i++) raw[j * MW + i] = 1;
      }
    }
    const mask = new Uint8Array(MW * MH);
    const R = 2; // dilation in cells (~1.6–2.2 km)
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
      if (!raw[j * MW + i]) continue;
      for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
        const jj = j + dj, ii = i + di; if (jj >= 0 && jj < MH && ii >= 0 && ii < MW) mask[jj * MW + ii] = 1; }
    }
    const near = ([x, y]) => { const i = Math.floor((x - MX0) / CELL), j = Math.floor((y - MY0) / CELL);
      return i >= 0 && j >= 0 && i < MW && j < MH && mask[j * MW + i] === 1; };
    const inSerbia = ([x, y]) => { const i = Math.floor((x - MX0) / CELL), j = Math.floor((y - MY0) / CELL);
      return i >= 0 && j >= 0 && i < MW && j < MH && raw[j * MW + i] === 1; };
    const lenKm = (c) => { let L = 0; for (let i = 1; i < c.length; i++) {
      const dx = (c[i][0] - c[i - 1][0]) * 111.32 * Math.cos(c[i][1] * Math.PI / 180), dy = (c[i][1] - c[i - 1][1]) * 110.57; L += Math.hypot(dx, dy); } return L; };
    const distKm = (a, b) => Math.hypot((a[0] - b[0]) * 111.32 * Math.cos(a[1] * Math.PI / 180), (a[1] - b[1]) * 110.57);
    const along = (c, d) => { for (let i = 1; i < c.length; i++) { const s = lenKm([c[i - 1], c[i]]); if (d <= s) {
      const t = s ? d / s : 0; return [c[i - 1][0] + (c[i][0] - c[i - 1][0]) * t, c[i - 1][1] + (c[i][1] - c[i - 1][1]) * t]; } d -= s; } return c[c.length - 1]; };

    // ---- rivers -----------------------------------------------------------------------------------
    // join ways that share end points into longer chains
    const key = (p) => p[0].toFixed(5) + ',' + p[1].toFixed(5);
    function chains(lines) {
      lines = lines.map((l) => l.slice());
      let merged = true;
      while (merged) {
        merged = false;
        const ends = new Map();
        lines.forEach((l, i) => { [key(l[0]), key(l[l.length - 1])].forEach((k) => { if (!ends.has(k)) ends.set(k, []); ends.get(k).push(i); }); });
        const used = new Set(), out = [];
        lines.forEach((l, i) => {
          if (used.has(i)) return;
          used.add(i);
          let cur = l, grew = true;
          while (grew) {
            grew = false;
            for (const [end, atEnd] of [[cur[cur.length - 1], true], [cur[0], false]]) {
              const j = (ends.get(key(end)) || []).find((x) => !used.has(x));
              if (j == null) continue;
              let o = lines[j]; used.add(j); grew = merged = true;
              if (atEnd) { if (key(o[0]) !== key(end)) o = o.slice().reverse(); cur = cur.concat(o.slice(1)); }
              else { if (key(o[o.length - 1]) !== key(end)) o = o.slice().reverse(); cur = o.concat(cur.slice(1)); }
              break;
            }
          }
          out.push(cur);
        });
        lines = out;
      }
      return lines;
    }
    // keep the stretches of a line that run inside the (dilated) mask
    const clipToMask = (c) => { const out = []; let cur = [];
      c.forEach((p) => { if (near(p)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } });
      if (cur.length > 1) out.push(cur); return out; };

    const byName = new Map();
    riverEls.forEach((w) => {
      if (!w.geometry || w.geometry.length < 2) return;
      const n = nameOf(w.tags);
      if (!n || /^(kanal|canal)$/i.test(n)) return;
      if (!byName.has(n)) byName.set(n, []);
      byName.get(n).push(w.geometry.map((p) => [p.lon, p.lat]));
    });
    const rivers = [];
    byName.forEach((lines, n) => {
      // split same-named rivers far apart (e.g. the many "Moravica" or "Jablanica"): group chains whose ends are within 3 km
      const cs = chains(lines);
      // union-find: two chains belong together when an end of one lies within 3 km of the other
      const parent = cs.map((_, i) => i);
      const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
      const touches = (a, b) => [a[0], a[a.length - 1]].some((e) => b.some((p) => distKm(p, e) < 3));
      for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
        if (find(i) !== find(j) && (touches(cs[i], cs[j]) || touches(cs[j], cs[i]))) parent[find(i)] = find(j);
      }
      const byRoot = new Map();
      cs.forEach((c, i) => { const r = find(i); if (!byRoot.has(r)) byRoot.set(r, []); byRoot.get(r).push(c); });
      const groups = [...byRoot.values()];
      groups.forEach((gr) => {
        const parts = gr.flatMap(clipToMask)
          .map((c) => turf.simplify(turf.lineString(c), { tolerance: 0.0006 }).geometry.coordinates)
          .filter((c) => c.length > 1 && lenKm(c) > 0.3);
        if (!parts.length) return;
        const len = parts.reduce((s, c) => s + lenKm(c), 0);
        if (len < 2 || albanian(n)) return;
        const longest = parts.reduce((a, b) => (lenKm(b) > lenKm(a) ? b : a));
        rivers.push({ n, l: Math.round(len), c: round(along(longest, lenKm(longest) / 2)), g: round(parts) });
      });
    });
    rivers.sort((a, b) => b.l - a.l);
    log(`rivers: ${rivers.length} (${rivers.filter((r) => r.l >= 50).length} ≥ 50 km)`);
    const albRivers = rivers.filter((r) => albanian(r.n)).map((r) => r.n);
    if (albRivers.length) log(`  Albanian-only river names: ${albRivers.join(', ')}`);

    // ---- lakes ------------------------------------------------------------------------------------
    const ringClose = (r) => (key(r[0]) === key(r[r.length - 1]) ? r : r.concat([r[0]]));
    const lakes = [];
    let serbiaBuf = null;
    lakeEls.forEach((e) => {
      const t = e.tags || {};
      if (t.water && /river|canal|stream|ditch|wastewater|fishpond|pond|basin/.test(t.water)) return;
      let rings = [];
      if (e.type === 'way') { if (e.geometry && e.geometry.length > 3) rings = [e.geometry.map((p) => [p.lon, p.lat])]; }
      else if (e.members) rings = chains(e.members.filter((m) => m.role !== 'inner' && m.geometry).map((m) => m.geometry.map((p) => [p.lon, p.lat])));
      rings = rings.filter((r) => r.length > 3).map(ringClose);
      if (!rings.length) return;
      const polys = rings.map((r) => turf.polygon([r]));
      const area = polys.reduce((s, p) => s + turf.area(p) / 1e6, 0);
      if (area < 0.05) return;
      // lakes on the border (Đerdap, Perućac…) keep only their part on the Serbian side
      const pts = rings.flat(), share = pts.filter(near).length / pts.length;
      if (share < 0.02) return;
      let parts = polys;
      if (share < 0.98) {
        serbiaBuf = serbiaBuf || turf.buffer({ type: 'Feature', properties: {}, geometry: G.outlineWith }, 0.3, KM);
        parts = polys.flatMap((p) => { const x = turf.intersect(p, serbiaBuf); if (!x) return [];
          return x.geometry.type === 'Polygon' ? [turf.polygon([x.geometry.coordinates[0]])] : x.geometry.coordinates.map((c) => turf.polygon([c[0]])); });
        if (!parts.length) return;
      }
      const areaIn = parts.reduce((s, p) => s + turf.area(p) / 1e6, 0);
      if (areaIn < 0.05) return;
      const big = parts.reduce((a, b) => (turf.area(b) > turf.area(a) ? b : a));
      const c = turf.pointOnFeature(big).geometry.coordinates;
      const simp = parts.map((p) => turf.simplify(p, { tolerance: 0.0003 }).geometry.coordinates[0]).filter((r) => r.length > 3);
      lakes.push({ n: nameOf(t), a: +areaIn.toFixed(2), c: round(c), g: round(simp) });
    });
    lakes.sort((a, b) => b.a - a.a);
    log(`lakes: ${lakes.length}; largest: ${lakes.slice(0, 12).map((l) => `${l.n} ${l.a}`).join(', ')}`);

    // ---- peaks ------------------------------------------------------------------------------------
    const handPeaks = (window.MOUNTAINS || []).map(([, lat, lng]) => [lng, lat]);
    let peaks = peakEls.map((e) => ({ n: nameOf(e.tags), e: parseFloat(String(e.tags.ele || '').replace(',', '.')), c: [e.lon, e.lat] }))
      .filter((p) => p.n && p.e > 0 && p.e < 3000 && inSerbia(p.c) && !/^\d/.test(p.n));
    // isolation: distance to the nearest higher peak (km, capped at 200)
    const all = peaks.concat(handPeaks.map((c, i) => ({ c, e: window.MOUNTAINS[i][3] })));
    peaks.forEach((p) => { let d = 200; all.forEach((q) => { if (q.e > p.e) { const k = distKm(p.c, q.c); if (k < d) d = k; } }); p.i = +d.toFixed(1); });
    const before = peaks.length;
    peaks = peaks.filter((p) => !handPeaks.some((h) => distKm(h, p.c) < 1.5));
    peaks = peaks.map((p) => ({ n: p.n, e: Math.round(p.e), i: p.i, c: round(p.c) })).sort((a, b) => b.e - a.e);
    log(`peaks: ${peaks.length} (of ${before}; ${before - peaks.length} duplicate the hand-made list); isolation ≥ 10 km: ${peaks.filter((p) => p.i >= 10).length}`);

    // ---- mountain ranges --------------------------------------------------------------------------
    const ranges = [];
    const normName = (n) => n.toLowerCase().replace(/\bpl\.$/, 'planina').replace(/\bbr\.$/, 'brdo').trim();
    // ridges only when they are named as a mountain (… planina / gora / brdo)
    rangeEls.filter((e) => e.type !== 'relation' && (e.tags.natural !== 'ridge' || /planin|gora|brd|планин|гора|брд/i.test(e.tags.name || ''))).forEach((e) => {
      const n = nameOf(e.tags).replace(/\bpl\.$/, 'planina').replace(/\bbr\.$/, 'brdo').replace(/ \/ .*$/, '');
      const c = e.type === 'node' ? [e.lon, e.lat] : [e.center.lon, e.center.lat];
      if (!n || !inSerbia(c)) return;
      const dup = ranges.find((r) => normName(r.n) === normName(n) && distKm(r.c, c) < 25);
      if (dup) { if (e.type === 'node') dup.c = c; return; }
      ranges.push({ n: n[0].toUpperCase() + n.slice(1), c });
    });
    // Kosovo and Metohija mountains that OSM lacks under Serbian names
    [['Prokletije', [20.10, 42.58]], ['Šar planina', [20.90, 42.12]], ['Mokra gora', [20.40, 42.85]], ['Žljeb', [20.28, 42.78]],
      ['Koprivnik', [20.20, 42.64]], ['Paštrik', [20.55, 42.22]], ['Ošljak', [20.88, 42.22]], ['Čičavica', [20.97, 42.77]],
      ['Skopska Crna Gora', [21.45, 42.20]], ['Grmija', [21.22, 42.68]]].forEach(([n, c]) => { if (!ranges.some((r) => r.n === n)) ranges.push({ n, c }); });
    ranges.forEach((r) => {
      let h = 0; all.forEach((p) => { if (p.e > h && distKm(p.c, r.c) < 7) h = p.e; }); r.h = Math.round(h); r.c = round(r.c);
    });
    ranges.sort((a, b) => b.h - a.h);
    log(`ranges: ${ranges.length}; top: ${ranges.slice(0, 15).map((r) => r.n + ' ' + r.h).join(', ')}`);

    // ---- basins (kotline) -------------------------------------------------------------------------
    const basins = [];
    valleyEls.forEach((e) => {
      const n = nameOf(e.tags); const c = e.type === 'node' ? [e.lon, e.lat] : [e.center.lon, e.center.lat];
      if (!/kotlina/i.test(n) || !inSerbia(c)) return;
      const fixed = n.replace('Bajinobaštinska', 'Bajinobaštanska');
      if (basins.some((b) => b.n === fixed)) return;
      basins.push({ n: fixed, c: round(c) });
    });
    // well-known basins missing in OSM
    [['Kosovska kotlina', [21.05, 42.63]], ['Metohijska kotlina', [20.45, 42.52]], ['Knjaževačka kotlina', [22.26, 43.57]],
      ['Sokobanjska kotlina', [21.86, 43.64]], ['Prokupačka kotlina', [21.56, 43.24]], ['Svrljiška kotlina', [22.12, 43.42]]].forEach(([n, c]) => { if (!basins.some((b) => b.n === n)) basins.push({ n, c }); });
    log(`basins: ${basins.length}: ${basins.map((b) => b.n).join(', ')}`);

    // ---- caves ------------------------------------------------------------------------------------
    const GENERIC = /^(jama|pećina|shpell[aë]|gropa|stari rudnik|lagum u radićevoj|pcelinjk stankovic|tunel .*|rimski bunar|kanal)$/i;
    const FAMOUS = ['Resavska pećina', 'Ceremošnja', 'Lazareva pećina', 'Rajkova pećina', 'Potpećka pećina', 'Stopića pećina', 'Risovača',
      'Prekonoška pećina', 'Vernjikica', 'Mermerna pećina', 'Bogovinska pećina', 'Petnička pećina', 'Hadži Prodanova pećina',
      'Ušačka pećina', 'Degurićka pećina', 'Tašmajdanska pećina', 'Gradašnica', 'Cerjanska pećina', 'Bisernа pećina', 'Biserna pećina'];
    const caves = [];
    caveEls.forEach((e) => {
      let n = nameOf(e.tags);
      if (!n || GENERIC.test(n) || !inSerbia([e.lon, e.lat])) return;
      if (n === 'Shpella e Radacit (Bukuroshja e Fjetur)') n = 'Radavačka pećina';
      if (n === 'Mermerna pećina' || /Gadimlj/.test(n)) n = 'Mermerna pećina';
      if (albanian(n)) return;
      n = n[0].toUpperCase() + n.slice(1);
      if (caves.some((c) => c.n === n && distKm(c.c, [e.lon, e.lat]) < 3)) return;
      caves.push({ n, c: round([e.lon, e.lat]), f: FAMOUS.includes(n) ? 1 : 0 });
    });
    caves.sort((a, b) => b.f - a.f || a.n.localeCompare(b.n));
    log(`caves: ${caves.length} (${caves.filter((c) => c.f).length} famous): ${caves.filter((c) => c.f).map((c) => c.n).join(', ')}`);

    // ---- towns ------------------------------------------------------------------------------------
    const handCities = (window.CITIES || []).map(([, lat, lng]) => [lng, lat]);
    const towns = [];
    placeEls.forEach((e) => {
      if (!/^(city|town)$/.test(e.tags.place) || e.type !== 'node') return;
      const c = [e.lon, e.lat], n = nameOf(e.tags);
      if (!n || !inSerbia(c) || handCities.some((h) => distKm(h, c) < 3)) return;
      if (/banja/i.test(n) && !/^(Sokobanja)$/.test(n)) { /* spa towns are in the spa layer too, keep them as towns */ }
      towns.push({ n, p: parseInt(String(e.tags.population || '0').replace(/\D/g, ''), 10) || 0, c: round(c) });
    });
    towns.sort((a, b) => b.p - a.p);
    log(`towns: ${towns.length} (${towns.filter((t) => !t.p).length} without population)`);

    const out = { rivers, lakes, ranges, peaks, basins, caves, towns };
    window.FEATURES_JS = '// Generated by tools/build-features.html from OpenStreetMap data (© OpenStreetMap contributors, ODbL) — do not edit by hand.\n'
      + 'window.FEATURES = ' + JSON.stringify(out) + ';\n';
    log(`done in ${Math.round(performance.now() - t0)} ms, ${(window.FEATURES_JS.length / 1024).toFixed(0)} KB `
      + Object.entries(out).map(([k, v]) => `${k} ${(JSON.stringify(v).length / 1024).toFixed(0)}KB`).join(', '));
    const a = document.getElementById('download');
    a.href = URL.createObjectURL(new Blob([window.FEATURES_JS], { type: 'text/javascript' }));
    a.hidden = false;
  } catch (e) {
    log(`ERROR: ${e.message}`);
    console.error(e);
  }
})();
