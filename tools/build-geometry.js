/* Precomputes all area shapes (districts, merged regions, outlines, label points) so the map
 * doesn't have to run polygon unions on every page load.
 * Output: data/geometry.js  (window.GEOMETRY). Re-run after editing district/municipality assignments
 * in data/places.js (DISTRICT_INFO) or anything in data/geo-regions.js except names/notes.
 * Inputs used only here: data/districts.js, data/kosovo.js, data/municipalities.js, data/boundary-rivers.js,
 * plus elevation tiles fetched from AWS Terrain Tiles (for the valley regions). */
(async () => {
  // also to the console, which stays readable even while a long synchronous step blocks the page
  const log = (msg) => { document.getElementById('log').textContent += msg + '\n'; console.log('[build]', msg); };
  const t0 = performance.now();
  const KM = { units: 'kilometers' };
  const buf = (f) => turf.buffer(f, 0.02, KM); // closes hairline gaps between neighbours
  const unionAll = (features) => features.filter(Boolean).reduce((acc, f) => (acc ? clip('union', acc, f) || acc : f), null);
  const km2 = (f) => (f ? turf.area(f) / 1e6 : 0);
  const polysOf = (f) => (!f ? [] : (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).map((c) => turf.polygon(c)));
  const fromPolys = (ps) => (!ps.length ? null : ps.length === 1 ? ps[0] : turf.multiPolygon(ps.map((p) => p.geometry.coordinates)));
  const inside = (pt, f) => turf.booleanPointInPolygon(turf.point(pt), f);
  // Morphological closing: seals the 10 m slits left by cut lines that end inside a region
  const close = (f) => { const grown = turf.buffer(f, 0.03, KM); return turf.buffer(grown, -0.03, KM) || f; };
  const keepBig = (f, minKm2) => fromPolys(polysOf(f).filter((p) => km2(p) >= minKm2));
  // Polygon clipping (martinez) occasionally fails on nearly coincident vertices;
  // retry once with both shapes re-noded (rounded + 1 m buffer).
  const renode = (f) => turf.buffer(turf.truncate(f, { precision: 5 }), 0.001, KM);
  const clip = (op, a, b) => {
    if (!a || !b) return op === 'difference' ? a : null;
    try { return turf[op](a, b); } catch (e) { return turf[op](renode(a), renode(b)); }
  };

  // Label anchor: centre of mass, or a guaranteed-inside point for concave shapes
  const labelPoint = (f) => {
    const com = turf.centerOfMass(f);
    return (turf.booleanPointInPolygon(com, f) ? com : turf.pointOnFeature(f)).geometry.coordinates;
  };
  const round = (c) => (typeof c[0] === 'number' ? [+c[0].toFixed(4), +c[1].toFixed(4)] : c.map(round));
  // The buffer adds many tiny arc vertices at every corner; simplifying at ~30 m removes them
  // without visibly changing the shape.
  const simplify = (f) => turf.simplify(f, { tolerance: 0.0003, highQuality: true });
  const geomOf = (f) => { const s = simplify(f); return { type: s.geometry.type, coordinates: round(s.geometry.coordinates) }; };
  const pack = (f, areaKm2) => ({ g: geomOf(f), a: Math.round(areaKm2), c: round(labelPoint(f)) });

  try {
    // --- statistical regions (from districts) ---
    const districts = window.DISTRICTS.features;
    // Districts are kept unsimplified (neighbours share vertices, so rounding keeps them gap-free)
    const districtOut = {};
    districts.forEach((d) => {
      districtOut[d.properties.shapeName] = { g: { type: d.geometry.type, coordinates: round(d.geometry.coordinates) }, a: Math.round(km2(d)), c: round(labelPoint(d)) };
    });
    const regions = {};
    const regionIds = ['vojvodina', 'belgrade', 'sumadija', 'south'];
    regionIds.forEach((id) => {
      const parts = districts.filter((d) => (window.DISTRICT_INFO[d.properties.shapeName] || {}).region === id);
      regions[id] = pack(unionAll(parts.map(buf)), parts.reduce((s, d) => s + km2(d), 0));
      regions[id].n = parts.length;
    });
    const kosovo = window.KOSOVO.features[0];
    regions.kosovo = pack(kosovo, km2(kosovo));
    log(`statistical regions: ${Object.keys(regions).length}`);

    // --- national outline, with and without Kosovo ---
    // Small holes are gaps where the Serbian and Kosovo boundary datasets don't quite meet; fill them.
    const fillHoles = (f, minKm2) => fromPolys(polysOf(f).map((p) => turf.polygon([p.geometry.coordinates[0],
      ...p.geometry.coordinates.slice(1).filter((h) => km2(turf.polygon([h])) >= minKm2)])));
    const without = fillHoles(unionAll(regionIds.map((id) => ({ type: 'Feature', properties: {}, geometry: regions[id].g }))), 5);
    const withK = fillHoles(turf.union(without, buf(kosovo)) || without, 5);

    /* ================================================================ *
     * Traditional geographic regions
     * ================================================================ */
    const B = window.GEO_BOUNDARIES;
    const GR = window.GEO_REGIONS;
    const { riverPath, buildValleys } = window.BuildHelpers;

    // 1. Cut lines: boundary rivers, river stretches, hand-drawn connectors and the Kosovo border
    const lines = [];
    window.BOUNDARY_RIVERS.features.filter((f) => B.rivers.includes(f.properties.name)).forEach((f) =>
      f.geometry.coordinates.forEach((c) => { if (c.length > 1) lines.push(turf.simplify(turf.lineString(c), { tolerance: 0.0001 })); }));
    B.rivers.forEach((n) => { if (!window.BOUNDARY_RIVERS.features.some((f) => f.properties.name === n)) log(`WARNING: river "${n}" not in boundary-rivers.js`); });
    B.lines.forEach((l) => {
      if (!l.river) { lines.push(turf.lineString(l.coords)); return; }
      const path = turf.simplify(turf.lineString(riverPath(l.river, l.from, l.to, l.maxGap)), { tolerance: 0.0001 }).geometry.coordinates;
      lines.push(turf.lineString([...(l.prepend || []), ...path, ...(l.extend || [])]));
    });
    const kosovoBorder = turf.polygonToLine(kosovo);
    (kosovoBorder.geometry.type === 'LineString' ? [kosovoBorder.geometry.coordinates] : kosovoBorder.geometry.coordinates)
      .forEach((c) => lines.push(turf.lineString(c)));
    // Close small gaps (a river interrupted by a reservoir, a mouth mapped a bit off):
    // connect every line end to the nearest other line if it is within 1.5 km.
    const bridges = [];
    lines.forEach((p, i) => {
      const cs = p.geometry.coordinates;
      [cs[0], cs[cs.length - 1]].forEach((end) => {
        let best = null;
        lines.forEach((q, j) => {
          if (j === i) return;
          const n = turf.nearestPointOnLine(q, end, KM);
          if (!best || n.properties.dist < best.properties.dist) best = n;
        });
        if (best && best.properties.dist > 0.002 && best.properties.dist < 1.5) bridges.push(turf.lineString([end, best.geometry.coordinates]));
      });
    });
    log(`cut lines: ${lines.length} (+${bridges.length} gap bridges)`);

    // 2. Cut Serbia (with Kosovo) into pieces along the lines. Uses an unbuffered union: a buffer around
    //    Kosovo would leave a hairline strip outside the Kosovo border cut line that connects everything.
    const cut = turf.buffer(turf.multiLineString([...lines, ...bridges].map((l) => l.geometry.coordinates)), 0.005, KM);
    const withKExact = fillHoles(turf.union(without, kosovo) || without, 5);
    const pieces = polysOf(turf.difference(withKExact, cut)).map((p) => ({ p, a: km2(p), id: null }));

    // 3. Assign pieces: the natural region whose seed lies inside; big unseeded pieces are "rest";
    //    slivers (< 30 km², e.g. between a border river and the border) join the nearest big piece.
    const natural = GR.filter((g) => g.seed);
    const seedsOf = (g) => (Array.isArray(g.seed[0]) ? g.seed : [g.seed]);
    pieces.forEach((pc) => {
      const seeds = natural.filter((n) => seedsOf(n).some((s) => inside(s, pc.p)));
      if (seeds.length > 1) log(`WARNING: ${seeds.map((s) => s.id).join(' + ')} fell into the same piece — a boundary line between them has a gap`);
      pc.id = seeds.length ? seeds[0].id : (pc.a >= 30 ? 'rest' : null);
    });
    const big = pieces.filter((pc) => pc.id).map((pc) => ({ ...pc, verts: turf.coordAll(pc.p) }));
    let slivers = 0;
    pieces.filter((pc) => !pc.id).forEach((pc) => {
      const [x, y] = turf.pointOnFeature(pc.p).geometry.coordinates;
      let best = null, bd = Infinity;
      big.forEach((b) => b.verts.forEach(([vx, vy]) => { const d = (vx - x) ** 2 + ((vy - y) * 1.4) ** 2; if (d < bd) { bd = d; best = b; } }));
      pc.id = best.id; slivers++;
    });
    log(`pieces: ${pieces.length} (${slivers} slivers merged into neighbours)`);
    if (location.search.includes('debug')) {
      pieces.filter((pc) => pc.a >= 30).forEach((pc) => log(`  piece ${pc.id}: ${Math.round(pc.a)} km², bbox [${turf.bbox(pc.p).map((v) => v.toFixed(2))}]`));
      window.DEBUG_PIECES = pieces;
    }
    natural.forEach((g) => seedsOf(g).forEach((s) => {
      if (!pieces.some((pc) => pc.id === g.id && inside(s, pc.p))) log(`WARNING: a seed of "${g.id}" is not inside Serbia`);
    }));

    const byId = (id) => pieces.filter((pc) => pc.id === id).map((pc) => pc.p);
    const geoFinal = {};
    natural.forEach((g) => { geoFinal[g.id] = close(unionAll(byId(g.id))); });
    let rest = unionAll(byId('rest'));
    Object.entries(B.outside || {}).forEach(([name, pt]) => {
      const hit = natural.find((g) => inside(pt, geoFinal[g.id]));
      if (hit) log(`WARNING: ${name} ended up inside "${hit.id}" — a cut line probably has a gap`);
    });
    // Container regions (e.g. the Serbo-Macedonian massif) hold the valleys; they don't block them
    const naturalUnion = unionAll(natural.filter((g) => !g.container).map((g) => geoFinal[g.id]));

    // 4. Valleys: units grown over low terrain along the river, outside the natural regions
    log('valleys: loading elevation…');
    // one shape per valley (its sections are merged on the elevation grid)
    const grown = await buildValleys(window.GEO_VALLEYS || [], log);
    Object.entries(grown).forEach(([id, raw]) => {
      if (!raw) return;
      // thin out the dense smoothed outline (~30 m) and re-node it (tiny buffer), so polygon
      // clipping can't trip over near-duplicate vertices
      const f = turf.buffer(turf.simplify(turf.truncate(raw, { precision: 5 }), { tolerance: 0.0003 }), 0.002, KM);
      log(`  clipping ${id}…`);
      let g = clip('intersect', f, without);
      if (g) g = clip('difference', g, naturalUnion);
      g = g && keepBig(close(g), 1);
      if (g) geoFinal[id] = g; else log(`WARNING: valley unit "${id}" vanished after clipping`);
    });
    // A section listed in two valleys (Stalać gorge) is also added to the second one (the two overlap there)
    (grown.shared || []).forEach(({ id, into, shape }) => {
      if (!shape || !geoFinal[into]) return;
      const f = turf.buffer(turf.simplify(turf.truncate(shape, { precision: 5 }), { tolerance: 0.0003 }), 0.002, KM);
      const g = clip('difference', clip('intersect', f, without), naturalUnion);
      if (g) { geoFinal[into] = close(clip('union', geoFinal[into], g)); log(`  ${id} also added to ${into}: ${km2(g).toFixed(0)} km²`); }
    });
    const valleyUnion = unionAll(Object.keys(grown).map((id) => geoFinal[id]));
    if (valleyUnion) {
      log('  removing valleys from the rest…');
      rest = clip('difference', rest, valleyUnion);
      // a container keeps what the valleys inside it leave
      natural.filter((g) => g.container).forEach((g) => {
        log(`  removing valleys from ${g.id}…`);
        const left = clip('difference', geoFinal[g.id], valleyUnion);
        const parts = polysOf(left && close(left));
        geoFinal[g.id] = fromPolys(parts.filter((p) => km2(p) >= 30));
        // crumbs of slope (< 30 km²) between a valley and the container's border join that valley
        parts.filter((p) => km2(p) < 30 && km2(p) >= 0.5).forEach((p) => {
          const ring = turf.buffer(p, 0.3, KM);
          let best = null, bestA = 0;
          Object.keys(grown).forEach((vid) => { const a = km2(clip('intersect', ring, geoFinal[vid])); if (a > bestA) { bestA = a; best = vid; } });
          if (best) geoFinal[best] = close(clip('union', geoFinal[best], turf.buffer(p, 0.05, KM)));
        });
      });
      // A valley can be widened to fill its container north of a line (`fillFrom`)
      (window.GEO_REGIONS || []).filter((g) => g.fillFrom && geoFinal[g.id] && geoFinal[g.fillFrom.id]).forEach((g) => {
        const { id: from, above } = g.fillFrom;
        const north = turf.polygon([[...above, [above[above.length - 1][0], 47], [above[0][0], 47], above[0]]]);
        const take = clip('intersect', geoFinal[from], north);
        if (!take) return;
        geoFinal[g.id] = close(clip('union', geoFinal[g.id], turf.buffer(take, 0.05, KM)));
        geoFinal[from] = keepBig(close(clip('difference', geoFinal[from], north)), 1);
        log(`  ${g.id} widened with ${km2(take).toFixed(0)} km² of ${from}`);
      });
    }
    log('municipality-based regions…');

    // 5. Municipality-based regions: only the part of their municipalities that nothing above covers
    const muniByName = new Map(window.MUNICIPALITIES.features.map((f) => [f.properties.shapeName.replace(/ (Municipality|City|Municipal\*)$/, ''), f]));
    const kosByName = new Map(window.KOSOVO_DISTRICTS.features.map((f) => [f.properties.shapeName, f]));
    const partsOf = (g, names) => names.map((n) => {
      const f = muniByName.get(n) || kosByName.get(n);
      if (!f) log(`WARNING: ${g.id}: unknown municipality "${n}"`);
      return f;
    }).filter(Boolean);
    GR.filter((g) => g.munis || g.kosDistricts).forEach((g) => {
      const clipped = clip('intersect', unionAll(partsOf(g, g.munis || g.kosDistricts).map(buf)), rest);
      // drop crumbs (< 5 km²) left where a municipality barely crosses a boundary
      const keep = clipped && keepBig(close(clipped), 5);
      if (keep) geoFinal[g.id] = keep; else log(`WARNING: "${g.id}" is entirely covered by other regions`);
    });

    // 6. Leftover land joins the neighbouring (non-natural) region it shares the longest border with.
    //    Small detached fragments of a region (< 150 km² and < 40% of its main piece) count as leftover too.
    const flexible = GR.filter((g) => !g.seed && geoFinal[g.id]).map((g) => g.id);
    flexible.forEach((id) => {
      const parts = polysOf(geoFinal[id]).sort((a, b) => km2(b) - km2(a));
      if (parts.length < 2) return;
      const main = km2(parts[0]);
      geoFinal[id] = fromPolys(parts.filter((p, i) => i === 0 || km2(p) >= Math.min(150, 0.4 * main)));
    });
    const covered = unionAll(Object.values(geoFinal));
    // only small crumbs (0.05–50 km²; slivers between cut lines and holes left by the valleys); they join
    // whichever region they share the longest border with. Larger land outside all regions stays without one.
    const gaps = polysOf(clip('difference', withK, turf.buffer(covered, 0.05, KM))).filter((p) => km2(p) > 0.05 && km2(p) < 50);
    gaps.forEach((gap) => {
      const ring = turf.buffer(gap, 0.4, KM);
      const gb = turf.bbox(ring);
      let best = null, bestA = 0;
      Object.keys(geoFinal).forEach((id) => {
        const rb = turf.bbox(geoFinal[id]);
        if (rb[0] > gb[2] || rb[2] < gb[0] || rb[1] > gb[3] || rb[3] < gb[1]) return;
        const a = km2(clip('intersect', ring, geoFinal[id]));
        if (a > bestA) { bestA = a; best = id; }
      });
      if (best) geoFinal[best] = close(clip('union', geoFinal[best], turf.buffer(gap, 0.08, KM)));
      else log(`  note: ${km2(gap).toFixed(0)} km² near [${turf.pointOnFeature(gap).geometry.coordinates.map((v) => v.toFixed(2))}] borders only natural regions — left empty`);
    });
    log(`leftover areas attached to neighbours: ${gaps.length}`);

    // 7. Pack. Regions reaching into Kosovo also get a version without it (used when Kosovo is hidden).
    const geo = {};
    Object.entries(geoFinal).forEach(([id, f]) => {
      // small holes are bits of the Stalać gorge left only in the other valley (the gorge belongs to both)
      f = fillHoles(f, 2);
      geo[id] = pack(f, km2(f));
      const meta = GR.find((g) => g.id === id);
      if (!meta.kosovo && km2(clip('intersect', f, kosovo)) > 1) {
        const noK = keepBig(clip('intersect', f, without), 1);
        if (noK) geo[id].k = pack(noK, km2(noK));
      }
    });
    const groupsOf = (g) => (g.group ? [].concat(g.group) : []);
    const geoGroups = {};
    Object.keys(window.GEO_GROUPS || {}).forEach((gid) => {
      const members = GR.filter((g) => groupsOf(g).includes(gid)).map((g) => geoFinal[g.id]).filter(Boolean);
      const merged = close(unionAll(members.map(buf)));
      geoGroups[gid] = pack(merged, km2(merged));
    });
    log(`geographic regions: ${Object.keys(geo).length}, groups: ${Object.keys(geoGroups).length}`);
    Object.entries(geo).forEach(([id, g]) => log(`  ${id}: ${g.a} km²${g.k ? ` (${g.k.a} km² without Kosovo)` : ''}${polysOf({ geometry: g.g }).length > 1 ? `, ${polysOf({ geometry: g.g }).length} parts` : ''}`));

    // 8. Overlays (e.g. the Nišava valley): grown the same way, clipped only to Serbia, not cut out of regions
    const overlays = {};
    let overlayPoints = [];
    if ((window.GEO_OVERLAY_VALLEYS || []).length) {
      log('overlays…');
      const ov = await buildValleys(window.GEO_OVERLAY_VALLEYS, log);
      overlayPoints = ov.points || [];
      Object.entries(ov).forEach(([id, raw]) => {
        if (!raw) return;
        const f = turf.buffer(turf.simplify(turf.truncate(raw, { precision: 5 }), { tolerance: 0.0003 }), 0.002, KM);
        const g = keepBig(close(clip('intersect', f, without)), 1);
        if (g) { overlays[id] = pack(g, km2(g)); log(`  ${id}: ${overlays[id].a} km²`); }
      });
    }

    // 9. Outside Serbia the map shows only landscape, borders and country names:
    //    neighbouring countries' outlines (trimmed to the map area) and rivers/lakes clipped to Serbia (with KiM).
    const countries = (window.NE_COUNTRIES ? window.NE_COUNTRIES.features : []).map((f) => {
      const c = turf.bboxClip(f, [12.5, 37.5, 30.5, 50.5]);
      if (!c.geometry.coordinates.length) return null;
      const s = turf.simplify(c, { tolerance: 0.004, highQuality: true });
      return { n: f.properties.name, g: { type: s.geometry.type, coordinates: round(s.geometry.coordinates) } };
    }).filter(Boolean);
    log(`countries: ${countries.length}`);

    // Keep the parts of each river line that lie inside Serbia
    const clipLines = (f) => {
      const parts = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const kept = [];
      parts.forEach((c) => {
        if (c.length < 2) return;
        const line = turf.lineString(c);
        const pieces = turf.lineSplit(line, withKExact).features;
        (pieces.length ? pieces : [line]).forEach((p) => {
          const len = turf.length(p, KM);
          const mid = turf.along(p, len / 2, KM);
          if (inside(mid.geometry.coordinates, withKExact)) kept.push(round(p.geometry.coordinates));
        });
      });
      return kept.length ? { type: 'Feature', properties: f.properties, geometry: { type: 'MultiLineString', coordinates: kept } } : null;
    };
    const riversIn = { type: 'FeatureCollection', features: (window.RIVERS ? window.RIVERS.features : []).map(clipLines).filter(Boolean) };
    const lakesIn = { type: 'FeatureCollection', features: (window.LAKES ? window.LAKES.features : []).map((f) => {
      const g = clip('intersect', f, withKExact);
      return g && km2(g) > 0.05 ? { type: 'Feature', properties: f.properties, geometry: { type: g.geometry.type, coordinates: round(g.geometry.coordinates) } } : null;
    }).filter(Boolean) };
    log(`rivers inside Serbia: ${riversIn.features.length} of ${(window.RIVERS || { features: [] }).features.length}; lakes: ${lakesIn.features.length}`);

    // 10. Border landmarks: the rivers named in the region borders, in full OSM detail, kept within ~3 km of
    //     Serbia (border rivers such as the Drina or Danube run along the edge), plus label points of the
    //     named valley sections (basins, gorges, narrows).
    const LANDMARK_RIVERS = ['Dunav', 'Sava', 'Tisa', 'Kolubara', 'Ljig', 'Dičina', 'Zapadna Morava', 'Đetinja', 'Ibar', 'Sitnica',
      'Lab', 'Rasina', 'Toplica', 'Vlasina', 'Južna Morava', 'Velika Morava', 'Preševska Moravica', 'Binačka Morava', 'Nišava'];
    const nearSerbia = turf.buffer(withKExact, 3, KM);
    const keepParts = (parts, test) => parts.filter((c) => c.length > 1).flatMap((c) => {
      const line = turf.lineString(c);
      const pieces = turf.lineSplit(line, nearSerbia).features;
      return (pieces.length ? pieces : [line]).filter((p) => {
        const mid = turf.along(p, turf.length(p, KM) / 2, KM).geometry.coordinates;
        return inside(mid, nearSerbia) && (!test || test(mid));
      }).map((p) => round(turf.simplify(p, { tolerance: 0.0004 }).geometry.coordinates));
    });
    const landmarkRivers = [];
    const addRiver = (name, parts) => {
      if (!parts.length) { log(`  note: no part of "${name}" near Serbia`); return; }
      // label on the middle of the longest part
      const longest = parts.reduce((a, b) => (turf.length(turf.lineString(b)) > turf.length(turf.lineString(a)) ? b : a));
      const ls = turf.lineString(longest);
      landmarkRivers.push({ n: name, g: { type: 'MultiLineString', coordinates: parts },
        c: round(turf.along(ls, turf.length(ls, KM) / 2, KM).geometry.coordinates) });
    };
    LANDMARK_RIVERS.forEach((name) => {
      const f = window.BOUNDARY_RIVERS.features.find((r) => r.properties.name === name);
      if (!f) { log(`WARNING: landmark river "${name}" not in boundary-rivers.js`); return; }
      // "Toplica" also matches a small tributary of the Kolubara in the west: keep only the eastern one
      addRiver(name, keepParts(f.geometry.coordinates, name === 'Toplica' ? (m) => m[0] > 20.8 : null));
    });
    // The Drina (the western border) is only in the Natural Earth river data
    const drina = (window.RIVERS ? window.RIVERS.features : []).filter((r) => r.properties.name === 'Drina');
    addRiver('Drina', keepParts(drina.flatMap((f) => (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates))));
    const landmarkPoints = [...(grown.points || []), ...overlayPoints].map((p) => ({ n: p.name, c: round(p.at) }));
    log(`landmarks: ${landmarkRivers.length} rivers, ${landmarkPoints.length} basins/gorges`);

    const out = { districts: districtOut, regions, geo, geoGroups, overlays, countries, rivers: riversIn, lakes: lakesIn,
      landmarkRivers, landmarkPoints,
      outlineWith: geomOf(withK), outlineWithout: geomOf(without) };
    window.GEOMETRY_JS = '// Generated by tools/build-geometry.html — do not edit by hand.\nwindow.GEOMETRY = ' + JSON.stringify(out) + ';\n';
    log(`done in ${Math.round(performance.now() - t0)} ms, ${(window.GEOMETRY_JS.length / 1024).toFixed(0)} KB`);

    const a = document.getElementById('download');
    a.href = URL.createObjectURL(new Blob([window.GEOMETRY_JS], { type: 'text/javascript' }));
    a.hidden = false;
  } catch (e) {
    log(`ERROR: ${e.message}`);
    console.error(e);
  }
})();
