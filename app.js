/* Interactive map of Serbia — all logic lives here. */
(() => {
  const $ = (id) => document.getElementById(id);
  const HOME = { center: [44.05, 20.85], zoom: 7 };
  const REGION_IDS = ['vojvodina', 'belgrade', 'sumadija', 'south', 'kosovo'];

  /* ------------------------------------------------------------------ *
   * Language: 'en' | 'sr' (Latin) | 'cyr' (Cyrillic)
   * ------------------------------------------------------------------ */
  let lang = 'en';
  // Serbian text (Latin) -> current script
  const script = (s) => (lang === 'cyr' ? I18N.unbrace(I18N.toCyr(s)) : I18N.unbrace(s));
  // English text -> current language
  const tr = (s) => (s == null || s === '' || lang === 'en' ? s : script(window.SR[s] ?? s));
  // Pick between an English and a Serbian (Latin) variant
  const pick = (en, sr) => (lang === 'en' ? en : script(sr ?? window.SR[en] ?? en));
  const regionName = (id) => pick(window.REGIONS[id].name, window.REGIONS[id].sr);

  function applyStaticI18n() {
    document.documentElement.lang = lang === 'en' ? 'en' : lang === 'cyr' ? 'sr-Cyrl' : 'sr-Latn';
    document.title = lang === 'en' ? 'Map of Serbia' : script('Karta Srbije');
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      if (!el.dataset.i18n) el.dataset.i18n = el.textContent.trim();
      el.textContent = tr(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = tr(el.dataset.i18nTitle); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = tr(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('#lang button').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
    document.querySelectorAll('#baseMaps label').forEach((l) => {
      l.querySelector('span').textContent = tr(BASEMAPS[l.querySelector('input').value].label);
    });
  }

  /* ------------------------------------------------------------------ *
   * Palettes
   * ------------------------------------------------------------------ */
  const PALETTES = {
    classic: { regions: { vojvodina: '#e9c46a', belgrade: '#c6363c', sumadija: '#6a9f58', south: '#e07b39', kosovo: '#8e7cc3' }, ramp: ['#fff5d6', '#b5452f'], s: 55, l: 62 },
    pastel:  { regions: { vojvodina: '#fbe3a1', belgrade: '#f4a6a6', sumadija: '#b8e0c2', south: '#f9c9a3', kosovo: '#cfc4ee' }, ramp: ['#f7f4ff', '#9b8ae0'], s: 70, l: 82 },
    vivid:   { regions: { vojvodina: '#ffbe0b', belgrade: '#ff006e', sumadija: '#38b000', south: '#fb5607', kosovo: '#8338ec' }, ramp: ['#ffe066', '#d00000'], s: 90, l: 52 },
    earth:   { regions: { vojvodina: '#d8c690', belgrade: '#8c4a32', sumadija: '#6b8e4e', south: '#b5835a', kosovo: '#7f7a6b' }, ramp: ['#efe6cf', '#5a4632'], s: 35, l: 55 },
    ocean:   { regions: { vojvodina: '#a8dadc', belgrade: '#1d3557', sumadija: '#457b9d', south: '#2a9d8f', kosovo: '#6c8ead' }, ramp: ['#e0f3f8', '#08306b'], s: 55, l: 50, hueBase: 180, hueSpan: 70 },
    flag:    { regions: { vojvodina: '#f2f2f2', belgrade: '#c6363c', sumadija: '#0c4076', south: '#c6363c', kosovo: '#6d86a8' }, ramp: ['#ffffff', '#c6363c'], s: 60, l: 50, flag: true }
  };

  const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgbToHex = (r) => '#' + r.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => rgbToHex(hexToRgb(a).map((v, i) => v + (hexToRgb(b)[i] - v) * t));

  /* ------------------------------------------------------------------ *
   * Map + panes
   * ------------------------------------------------------------------ */
  // All interactive shapes (areas, rivers, lakes, city/place dots, grid, border) are drawn on ONE shared
  // canvas instead of hundreds of SVG elements — much smoother panning and zooming.
  // It must be a single canvas: stacked canvases would block each other's mouse events.
  // Stacking order within it is maintained by restack().
  const vec = L.canvas({ tolerance: 3 });
  const map = L.map('map', { preferCanvas: true, renderer: vec, zoomControl: true, minZoom: 5, maxZoom: 17, zoomSnap: 0.25, attributionControl: true })
    .setView(HOME.center, HOME.zoom);
  map.setMaxBounds([[38, 13], [50, 28]]);
  // Non-interactive panes only (they let the mouse through)
  [['mask', 350], ['labels', 640]].forEach(([n, z]) => {
    map.createPane(n).style.zIndex = z;
  });
  map.getPane('labels').style.pointerEvents = 'none';
  map.getPane('mask').style.pointerEvents = 'none';

  // Don't request intermediate tiles during zoom animations; keep a ring of tiles around the view for panning
  const TILE_OPTS = { updateWhenZooming: false, keepBuffer: 3 };
  const tiles = (url, opts) => L.tileLayer(url, { ...TILE_OPTS, ...opts });
  const esri = (svc, maxNative = 17, extra = '') =>
    tiles(`https://server.arcgisonline.com/ArcGIS/rest/services/${svc}/MapServer/tile/{z}/{y}/{x}`,
      { maxNativeZoom: maxNative, maxZoom: 17, attribution: 'Tiles © Esri' + extra });

  // The chosen base map is drawn only inside Serbia (with KiM); tiles entirely outside are never downloaded.
  // Outside Serbia there is only a plain relief layer, plus our own country borders and names.
  // (If the clipping plugin failed to load, fall back to plain unclipped layers so the map still works.)
  const canClip = !!(L.TileLayer && L.TileLayer.BoundaryCanvas);
  const insideSerbia = (layer) => (canClip ? L.TileLayer.BoundaryCanvas.createFromLayer(layer, { boundary: outlineWith }) : layer);
  const BASEMAPS = {
    terrain:   { label: 'Terrain',   layer: () => insideSerbia(tiles('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxNativeZoom: 17, maxZoom: 17, attribution: '© OpenStreetMap, SRTM | © OpenTopoMap (CC-BY-SA)' })) },
    physical:  { label: 'Physical',  layer: () => insideSerbia(esri('World_Physical_Map', 8, ' — US National Park Service')) },
    relief:    { label: 'Relief',    layer: () => insideSerbia(esri('World_Shaded_Relief', 13)) },
    satellite: { label: 'Satellite', layer: () => insideSerbia(esri('World_Imagery', 17, ', Maxar, Earthstar Geographics')) },
    topo:      { label: 'Topographic', layer: () => insideSerbia(esri('World_Topo_Map', 17)) },
    streets:   { label: 'Streets',   layer: () => insideSerbia(tiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenStreetMap contributors' })) },
    light:     { label: 'Light',     layer: () => insideSerbia(esri('Canvas/World_Light_Gray_Base', 16)) },
    dark:      { label: 'Dark',      layer: () => insideSerbia(esri('Canvas/World_Dark_Gray_Base', 16)) },
    none:      { label: 'None',      layer: () => null }
  };
  let hillshade = null; // created once the Serbia outline is known (below)
  let baseLayer = null;

  /* ------------------------------------------------------------------ *
   * Geometry: districts, regions, Kosovo, national outline
   * ------------------------------------------------------------------ */
  // Shapes, areas and label points are precomputed by tools/build-geometry.html (data/geometry.js).
  // Here they are only joined with the descriptive metadata.
  const G = window.GEOMETRY;
  const feature = (g, properties) => ({ type: 'Feature', geometry: g.g, properties: { ...properties, areaKm2: g.a, _c: g.c } });

  const districtFeatures = Object.entries(G.districts).map(([shapeName, g], index) => {
    const info = window.DISTRICT_INFO[shapeName] || { sr: shapeName, seat: '—', region: 'south' };
    const name = shapeName.replace(' District', '')
      .replace('Macva', 'Mačva').replace('Pcinja', 'Pčinja').replace('Branicevo', 'Braničevo')
      .replace('Sumadija', 'Šumadija').replace('Zajecar', 'Zaječar').replace('Raska', 'Raška')
      .replace('Nisava', 'Niš').replace('Backa', 'Bačka').replace('Syrmia', 'Srem');
    return feature(g, { kind: 'district', index,
      name: shapeName.includes(' District') ? name + ' District' : 'City of ' + name, label: name,
      srLabel: info.sr.replace(/ okrug$/, '').replace(/^Grad /, ''), ...info });
  });

  const regionFeatures = REGION_IDS.map((id) => {
    const r = window.REGIONS[id];
    return feature(G.regions[id], { kind: 'region', id, region: id, name: r.name, sr: r.sr, seat: r.seat, note: r.note, districts: G.regions[id].n });
  });
  const kosovoFeature = regionFeatures.find((f) => f.properties.id === 'kosovo');

  const outlineWith = { type: 'Feature', properties: {}, geometry: G.outlineWith };
  const outlineWithout = { type: 'Feature', properties: {}, geometry: G.outlineWithout };

  hillshade = insideSerbia(esri('Elevation/World_Hillshade', 16));
  hillshade.setOpacity(0.45);

  // Everything except Serbia: the world with Serbia's outline cut out (holes must run opposite to the outer ring)
  const ringArea = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return a / 2; };
  const ccw = (r) => (ringArea(r) > 0 ? r : r.slice().reverse());
  const cw = (r) => (ringArea(r) < 0 ? r : r.slice().reverse());
  const outsideSerbia = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [
    ccw([[-179, -85], [179, -85], [179, 85], [-179, 85], [-179, -85]]),
    ...(G.outlineWith.type === 'Polygon' ? [G.outlineWith.coordinates] : G.outlineWith.coordinates).map((p) => cw(p[0]))
  ] } };
  // Coloured terrain with hillshade but no labels, roads or towns, for the landscape outside Serbia
  // (Esri World Terrain Base has real tiles up to zoom 9; beyond that they are scaled up)
  if (canClip) L.TileLayer.BoundaryCanvas.createFromLayer(esri('World_Terrain_Base', 9), { boundary: outsideSerbia, zIndex: 0 }).addTo(map);

  // Neighbouring countries: borders and names only (drawn by drawCountries() once settings are loaded)
  const countryLayer = L.featureGroup();
  const countryLabelLayer = L.layerGroup();

  const geoFeatures = window.GEO_REGIONS.filter((g) => {
    if (!G.geo[g.id]) console.warn(`Geographic region "${g.id}" has no geometry — re-run tools/build-geometry.html`);
    return G.geo[g.id];
  }).map((g, index) => {
    const props = {
      kind: 'geo', id: g.id, index, name: g.name, sr: g.sr, note: g.note, noteSr: g.noteSr, label: g.label, kosovo: !!g.kosovo,
      groups: g.group ? [].concat(g.group) : [], natural: !!(g.seed || g.valley), valley: !!g.valley, hideLabel: !!g.hideLabel
    };
    const f = feature(G.geo[g.id], props);
    // Regions reaching into Kosovo have a second shape without it, used while Kosovo is hidden
    if (G.geo[g.id].k) f.properties.noKosovo = feature(G.geo[g.id].k, props);
    return f;
  });
  // Overlays (e.g. the Nišava valley): shown on top of the regions, not regions themselves
  const overlayFeatures = (window.GEO_OVERLAYS || []).filter((o) => G.overlays && G.overlays[o.id])
    .map((o) => feature(G.overlays[o.id], { kind: 'overlay', id: o.id, name: o.name, sr: o.sr, note: o.note, noteSr: o.noteSr, label: o.label }));
  // Shape to draw for a region, depending on whether Kosovo is shown
  const geoShape = (f) => (!val('showKosovo') && f.properties.noKosovo) || f;
  // Groups of geographic regions (e.g. the Pannonian region = Bačka + Banat + Srem)
  const geoGroups = Object.entries(window.GEO_GROUPS || {}).filter(([id]) => G.geoGroups && G.geoGroups[id])
    .map(([id, meta]) => feature(G.geoGroups[id], { kind: 'group', id, ...meta }));

  const outerRings = (feat) => {
    const g = feat.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    return polys.map((p) => p[0].map(([x, y]) => [y, x]));
  };

  /* ------------------------------------------------------------------ *
   * Point data (tagged with the region they fall in)
   * ------------------------------------------------------------------ */
  // Ray-casting point-in-polygon (holes respected) — all we need from a geometry library at runtime
  function inRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function pointInGeometry(x, y, g) {
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    return polys.some((p) => inRing(x, y, p[0]) && !p.slice(1).some((hole) => inRing(x, y, hole)));
  }
  const regionOf = (lat, lng) => {
    const hit = regionFeatures.find((f) => pointInGeometry(lng, lat, f.geometry));
    return hit ? hit.properties.id : null;
  };
  const P = (arr, fn) => arr.map((a) => { const o = fn(a); o.region = regionOf(o.lat, o.lng); return o; });

  const mountains = P(window.MOUNTAINS, ([name, lat, lng, elev, range, system]) => ({ name, lat, lng, elev, range, system, type: 'mountain' }));
  const cities = P(window.CITIES, ([name, lat, lng, pop, capital]) => ({ name, lat, lng, pop, capital: !!capital, type: 'city' }));
  const parks = P(window.PARKS, ([name, lat, lng, kind, note]) => ({ name, lat, lng, kind, note, type: 'park' }));
  const spas = P(window.SPAS, ([name, lat, lng]) => ({ name, lat, lng, type: 'spa' }));
  const heritage = P(window.HERITAGE, ([name, lat, lng, kind, note]) => ({ name, lat, lng, kind, note, type: 'heritage' }));
  const ski = P(window.SKI, ([name, lat, lng]) => ({ name, lat, lng, type: 'ski' }));
  // Rivers, lakes, mountain names, peaks, basins, caves and towns from OpenStreetMap (data/features.js)
  const F = window.FEATURES || null;
  const lakePoints = F ? [] : P(window.LAKE_POINTS, ([name, lat, lng, note]) => ({ name, lat, lng, note, type: 'lake' }));
  const at = (c) => ({ lat: c[1], lng: c[0] });
  mountains.forEach((m) => { m.iso = Infinity; });
  if (F) {
    // OSM peaks appear by isolation (distance to the nearest higher peak) as you zoom in
    F.peaks.forEach((p) => mountains.push({ name: p.n, ...at(p.c), elev: p.e, iso: p.i, osm: true, type: 'mountain' }));
    F.towns.forEach((t) => cities.push({ name: t.n, ...at(t.c), pop: t.p, osm: true, type: 'city' }));
    [...mountains, ...cities].forEach((o) => { if (o.osm) o.region = regionOf(o.lat, o.lng); });
  }
  const caves = F ? F.caves.map((c) => ({ name: c.n, ...at(c.c), famous: !!c.f, type: 'cave', region: regionOf(c.c[1], c.c[0]) })) : [];

  /* ------------------------------------------------------------------ *
   * State (persisted in localStorage)
   * ------------------------------------------------------------------ */
  const STORE = 'serbia-map-state-v1';
  const hiddenRegions = new Set();
  const hiddenGeo = new Set();
  let basemapKey = 'terrain';

  const inputs = [...document.querySelectorAll('#panel input[id], #panel select[id]')].filter((el) => el.id !== 'search');
  const val = (id) => { const el = $(id); return el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value; };

  function save() {
    try {
      const s = { basemap: basemapKey, lang, hidden: [...hiddenRegions], hiddenGeo: [...hiddenGeo], inputs: {} };
      inputs.forEach((el) => { s.inputs[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
      localStorage.setItem(STORE, JSON.stringify(s));
    } catch (e) { /* storage unavailable */ }
  }
  // Settings used when this browser has none saved yet (the author's chosen setup)
  const DEFAULT_STATE = {
    basemap: 'terrain', lang: 'cyr', hidden: [], hiddenGeo: [],
    inputs: {
      hillshade: true, baseOpacity: '1', maskOutside: true,
      showGeo: true, showOverlays: true, showLandmarks: true, showRegions: false, showDistricts: false, showKosovo: true,
      showOutline: false, showAreaLabels: true,
      fillOn: true, colorBy: 'region', palette: 'classic', singleColor: '#c6363c', fillOpacity: '0.35',
      borderColor: '#3b3b3b', borderWidth: '0',
      showMountains: true, minElev: '500', showElev: true, peakSystems: false, showRanges: true,
      showRivers: true, showRiverNames: true, riverColor: '#2f7fd1', showLakes: true, showLakeNames: true,
      showBasins: true, showCaves: true, showParks: true,
      showCities: true, minPop: '0', showSpas: true, showHeritage: false, showSki: false,
      showGrid: true, showCoords: true, showScale: true, darkUI: true
    }
  };

  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { /* storage unavailable */ }
    s = s || DEFAULT_STATE;
    try {
      if (BASEMAPS[s.basemap]) basemapKey = s.basemap;
      if (['en', 'sr', 'cyr'].includes(s.lang)) lang = s.lang;
      (s.hidden || []).forEach((r) => hiddenRegions.add(r));
      (s.hiddenGeo || []).forEach((r) => hiddenGeo.add(r));
      Object.entries(s.inputs || {}).forEach(([id, v]) => {
        const el = $(id); if (!el) return;
        if (el.type === 'checkbox') el.checked = v; else el.value = v;
      });
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ *
   * Base map
   * ------------------------------------------------------------------ */
  const baseWrap = $('baseMaps');
  Object.entries(BASEMAPS).forEach(([key, b]) => {
    const lab = document.createElement('label');
    lab.innerHTML = `<input type="radio" name="base" value="${key}"> <span>${b.label}</span>`;
    baseWrap.appendChild(lab);
  });
  baseWrap.addEventListener('change', (e) => { basemapKey = e.target.value; applyBase(); save(); });

  function applyBase() {
    baseWrap.querySelector(`input[value="${basemapKey}"]`).checked = true;
    if (baseLayer) map.removeLayer(baseLayer);
    baseLayer = BASEMAPS[basemapKey].layer();
    if (baseLayer) { baseLayer.addTo(map); baseLayer.setOpacity(val('baseOpacity')); baseLayer.bringToBack(); }
    if (val('hillshade')) hillshade.addTo(map); else map.removeLayer(hillshade);
  }

  /* ------------------------------------------------------------------ *
   * Area layers
   * ------------------------------------------------------------------ */
  function colorFor(p) {
    const pal = PALETTES[val('palette')];
    const by = val('colorBy');
    if (by === 'single') return val('singleColor');
    if (p.kind === 'geo' && by !== 'area') return distinctColor(pal, p.index);
    if (by === 'region' || p.kind === 'region') {
      if (by === 'area') return areaColor(p);
      return pal.regions[p.region];
    }
    if (by === 'area') return areaColor(p);
    return distinctColor(pal, p.index);
  }
  // Well-separated colors for many areas (golden-angle hue steps)
  function distinctColor(pal, index) {
    if (pal.flag) return ['#c6363c', '#0c4076', '#f2f2f2'][index % 3];
    const hue = pal.hueBase != null ? pal.hueBase + ((index * 137.5) % pal.hueSpan) : (index * 137.508) % 360;
    return `hsl(${hue.toFixed(0)}, ${pal.s}%, ${pal.l}%)`;
  }
  const areaRange = (list) => [Math.min(...list), Math.max(...list)];
  const ranges = {
    geo: areaRange(geoFeatures.map((d) => d.properties.areaKm2)),
    district: areaRange(districtFeatures.map((d) => d.properties.areaKm2)),
    region: areaRange(regionFeatures.map((d) => d.properties.areaKm2))
  };
  function areaColor(p) {
    const [a, b] = ranges[p.kind];
    const pal = PALETTES[val('palette')];
    return mix(pal.ramp[0], pal.ramp[1], (p.areaKm2 - a) / (b - a));
  }

  function styleArea(feature) {
    const p = feature.properties;
    const showD = val('showDistricts');
    const isD = p.kind === 'district';
    const filled = val('fillOn') && (isD || !showD || p.id === 'kosovo');
    const bw = val('borderWidth');
    return {
      color: val('borderColor'),
      weight: isD ? bw * 0.6 : (showD ? bw * 1.6 : bw),
      opacity: bw === 0 ? 0 : 0.9,
      fillColor: colorFor(p),
      fillOpacity: filled ? val('fillOpacity') : 0,
      dashArray: p.id === 'kosovo' || p.kosovo ? '6 4' : null
    };
  }

  const info = $('info');
  const fmt = (n) => Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
  const areaName = (p) => (p.kind === 'region' ? regionName(p.id) : pick(p.name, p.sr));
  function showInfo(p) {
    // Show the name in the "other" language as a secondary row
    const other = lang === 'en' ? ['Serbian', `${p.sr} / ${I18N.toCyr(p.sr)}`] : ['English', p.name];
    if (p.kind === 'overlay') {
      info.innerHTML = `<h3>${pick(p.name, p.sr)}</h3><div class="muted">${tr('Not a region')}</div>
        <div style="margin-top:6px">${pick(p.note, p.noteSr)}</div>`;
      info.classList.remove('hidden');
      return;
    }
    if (p.kind === 'geo') {
      info.innerHTML = `<h3>${areaName(p)}</h3><div class="muted">${tr('Geographic region')}</div>
        <table>${[other, ['Area', '≈ ' + fmt(p.areaKm2) + ' km²']].map(([k, v]) => `<tr><td>${tr(k)}</td><td>${v}</td></tr>`).join('')}</table>
        <div style="margin-top:6px">${pick(p.note, p.noteSr)}</div>
        ${p.groups.filter((g) => window.GEO_GROUPS[g].name !== p.name).length
          ? `<div style="margin-top:4px">${tr('Part of')}: <b>${p.groups.filter((g) => window.GEO_GROUPS[g].name !== p.name).map(groupName).join(', ')}</b></div>` : ''}
        <div class="muted" style="margin-top:4px">${tr(p.valley ? 'Shape follows the valley floor and its slopes (from elevation data).'
          : p.natural || p.kosovo ? 'Borders follow rivers, mountains and state borders.'
          : 'Approximate borders, following municipality boundaries.')}</div>`;
      info.classList.remove('hidden');
      return;
    }
    const rows = p.kind === 'district'
      ? [other, ['Seat', tr(p.seat)], ['Region', regionName(p.region)], ['Area', fmt(p.areaKm2) + ' km²']]
      : [other, ['Center', tr(p.seat)], ['Area', '≈ ' + fmt(p.areaKm2) + ' km²'], ...(p.districts ? [['Districts', p.districts]] : [])];
    info.innerHTML = `<h3>${areaName(p)}</h3><div class="muted">${tr(p.kind === 'district' ? 'District (okrug)' : 'Statistical region')}</div>
      <table>${rows.map(([k, v]) => `<tr><td>${tr(k)}</td><td>${v}</td></tr>`).join('')}</table>
      ${p.note ? `<div class="muted" style="margin-top:6px">${tr(p.note)}</div>` : ''}`;
    info.classList.remove('hidden');
  }

  function bindArea(feature, layer) {
    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: styleArea(feature).weight + 2, fillOpacity: Math.min(1, val('fillOpacity') + 0.2) });
        showInfo(feature.properties);
      },
      mouseout: (e) => { e.target.setStyle(styleArea(feature)); info.classList.add('hidden'); },
      click: (e) => map.fitBounds(e.target.getBounds(), { padding: [30, 30] })
    });
  }

  const regionLayer = L.geoJSON(null, { style: styleArea, onEachFeature: bindArea });
  const districtLayer = L.geoJSON(null, { style: styleArea, onEachFeature: bindArea });
  const geoLayer = L.geoJSON(null, { style: styleArea, onEachFeature: bindArea });
  const geoVisible = (f) => !hiddenGeo.has(f.properties.id) && (!f.properties.kosovo || val('showKosovo'));
  const groupName = (id) => pick(window.GEO_GROUPS[id].name, window.GEO_GROUPS[id].sr);
  // Thick shared outline around each group (drawn when geographic regions are shown)
  const groupLayer = L.featureGroup();
  // Overlays: dashed brown outline with a faint fill
  const overlayStyle = () => ({ color: val('darkUI') ? '#ffc58a' : '#8a4b0f', weight: 2, dashArray: '6 5', opacity: 0.95,
    fillColor: '#e0a060', fillOpacity: 0.12 });
  const overlayLayer = L.geoJSON(null, {
    style: overlayStyle,
    onEachFeature: (f, l) => l.on({
      mouseover: () => { l.setStyle({ weight: 3.5, fillOpacity: 0.25 }); showInfo(f.properties); },
      mouseout: () => { l.setStyle(overlayStyle()); info.classList.add('hidden'); },
      click: () => map.fitBounds(l.getBounds(), { padding: [30, 30] })
    })
  });
  const outlineLayer = L.featureGroup();
  const maskLayer = L.layerGroup();
  const labelLayer = L.layerGroup();

  function renderAreas() {
    regionLayer.clearLayers(); districtLayer.clearLayers(); geoLayer.clearLayers();
    const kos = val('showKosovo');
    const visibleRegions = REGION_IDS.filter((r) => !hiddenRegions.has(r) && (r !== 'kosovo' || kos));

    if (val('showGeo')) {
      geoLayer.addData(geoFeatures.filter(geoVisible).map(geoShape));
    } else {
      if (val('showRegions')) regionLayer.addData(regionFeatures.filter((f) => visibleRegions.includes(f.properties.id)));
      else if (kos && visibleRegions.includes('kosovo')) regionLayer.addData(kosovoFeature);
      if (val('showDistricts')) districtLayer.addData(districtFeatures.filter((f) => visibleRegions.includes(f.properties.region)));
    }

    toggle(regionLayer, true); toggle(districtLayer, val('showDistricts')); toggle(geoLayer, val('showGeo'));

    groupLayer.clearLayers();
    if (val('showGeo')) {
      geoGroups.filter((g) => geoFeatures.some((f) => f.properties.groups.includes(g.properties.id) && geoVisible(f)))
        .forEach((g) => L.geoJSON(g, { interactive: false, style: groupStyle }).addTo(groupLayer));
    }
    toggle(groupLayer, val('showGeo'));

    overlayLayer.clearLayers();
    const showOverlays = val('showGeo') && val('showOverlays');
    if (showOverlays) overlayLayer.addData(overlayFeatures);
    toggle(overlayLayer, showOverlays);

    // outline + mask
    outlineLayer.clearLayers(); maskLayer.clearLayers();
    const outline = kos ? outlineWith : outlineWithout;
    if (val('showOutline')) {
      L.geoJSON(outline, { interactive: false,
        style: { color: '#c6363c', weight: 3.5, opacity: 0.95, fill: false } }).addTo(outlineLayer);
    }
    if (val('maskOutside')) {
      const world = [[-89, -179], [-89, 179], [89, 179], [89, -179]];
      L.polygon([world, ...outerRings(outline)], { pane: 'mask', interactive: false, stroke: false,
        fillColor: maskColor(), fillOpacity: 0.3 }).addTo(maskLayer);
    }
    toggle(outlineLayer, true); toggle(maskLayer, true);
    renderAreaLabels();
    renderChips();
  }
  const maskColor = () => (val('darkUI') ? '#000' : '#fff');
  const groupStyle = () => ({ color: val('darkUI') ? '#9ec5ff' : '#0c4076', opacity: 0.9, fill: false, weight: val('borderWidth') * 1.6 + 1.5 });

  // Color / border / opacity changes: restyle the existing shapes instead of rebuilding them
  function restyleAreas() {
    regionLayer.setStyle(styleArea); districtLayer.setStyle(styleArea); geoLayer.setStyle(styleArea);
    groupLayer.eachLayer((l) => l.setStyle(groupStyle));
    overlayLayer.setStyle(overlayStyle);
    maskLayer.eachLayer((l) => l.setStyle({ fillColor: maskColor() }));
    renderChips();
  }

  const LABEL_LINES = {
    kosovo: ['Kosovo', 'and Metohija'], sumadija: ['Šumadija and', 'Western Serbia'], south: ['Southern and', 'Eastern Serbia']
  };
  const labelLines = (id) => (LABEL_LINES[id] ? LABEL_LINES[id].map(tr).join('<br>') : regionName(id));

  function renderAreaLabels() {
    labelLayer.clearLayers();
    if (!val('showAreaLabels')) return;
    const kos = val('showKosovo');
    if (val('showGeo')) {
      geoFeatures.filter(geoVisible).forEach((f) => {
        const p = geoShape(f).properties;
        if (p.hideLabel) return; // named by its group's label instead
        const text = p.label ? p.label[lang === 'en' ? 0 : 1] : (lang === 'en' ? p.name : p.sr);
        const html = text.split('|').map((s) => (lang === 'en' ? s : script(s))).join('<br>');
        L.marker([p._c[1], p._c[0]], { pane: 'labels', interactive: false,
          icon: L.divIcon({ className: `area-label geo${p.valley ? ' valley' : ''}`, html: `<span>${html}</span>`, iconSize: [0, 0] }) }).addTo(labelLayer);
      });
      overlayLayer.eachLayer((l) => {
        const p = l.feature.properties;
        const html = p.label[lang === 'en' ? 0 : 1].split('|').map((s) => (lang === 'en' ? s : script(s))).join('<br>');
        L.marker([p._c[1], p._c[0]], { pane: 'labels', interactive: false,
          icon: L.divIcon({ className: 'area-label overlay', html: `<span>${html}</span>`, iconSize: [0, 0] }) }).addTo(labelLayer);
      });
      groupLayer.eachLayer((l) => {
        const g = l.getLayers()[0].feature.properties;
        let at;
        const anchor = typeof g.labelAt === 'string' && g.labelAt !== 'north' && geoFeatures.find((f) => f.properties.id === g.labelAt);
        if (Array.isArray(g.labelAt)) {
          at = [g.labelAt[1], g.labelAt[0]]; // explicit [lng, lat]
        } else if (anchor) {
          // at the label point of the named member region
          const c = geoShape(anchor).properties._c;
          at = [c[1], c[0]];
        } else {
          // near the group's northern edge, clear of the member labels
          const b = l.getBounds();
          at = [b.getNorth() - (b.getNorth() - b.getSouth()) * 0.12, b.getCenter().lng];
        }
        const text = g.label ? g.label[lang === 'en' ? 0 : 1] : (lang === 'en' ? g.name : g.sr);
        const html = text.split('|').map((s) => (lang === 'en' ? s : script(s))).join('<br>');
        L.marker(at, { pane: 'labels', interactive: false,
          icon: L.divIcon({ className: 'area-label group', html: `<span>${html}</span>`, iconSize: [0, 0] }) }).addTo(labelLayer);
      });
      toggle(labelLayer, true);
      return;
    }
    const useDistricts = val('showDistricts') && map.getZoom() >= 7.5;
    const feats = useDistricts
      ? districtFeatures.filter((f) => !hiddenRegions.has(f.properties.region))
      : (val('showRegions') ? regionFeatures : [kosovoFeature]).filter((f) => !hiddenRegions.has(f.properties.id));
    feats.forEach((f) => {
      if (f.properties.region === 'kosovo' && !kos) return;
      if (useDistricts && f.properties.kind === 'region') return;
      const p = f.properties;
      const c = p._c;
      const name = p.kind === 'district' ? pick(p.label, p.srLabel) : labelLines(p.id);
      L.marker([c[1], c[0]], { pane: 'labels', interactive: false,
        icon: L.divIcon({ className: `area-label ${p.kind}`, html: `<span>${name}</span>`, iconSize: [0, 0] }) }).addTo(labelLayer);
    });
    if (useDistricts && val('showKosovo') && !hiddenRegions.has('kosovo')) {
      const c = kosovoFeature.properties._c;
      L.marker([c[1], c[0]], { pane: 'labels', interactive: false,
        icon: L.divIcon({ className: 'area-label region', html: `<span>${labelLines('kosovo')}</span>`, iconSize: [0, 0] }) }).addTo(labelLayer);
    }
    toggle(labelLayer, true);
  }

  function renderChips() {
    const pal = PALETTES[val('palette')];
    const wrap = $('regionChips');
    wrap.innerHTML = '';
    if (val('showGeo')) {
      geoFeatures.forEach((f) => {
        const p = f.properties;
        if (p.kosovo && !val('showKosovo')) return;
        const b = document.createElement('button');
        b.className = 'chip' + (hiddenGeo.has(p.id) ? ' off' : '');
        b.innerHTML = `<i style="background:${colorFor(p)}"></i>${areaName(p)}`;
        b.title = tr('Click to show / hide · double-click to zoom');
        b.onclick = () => { hiddenGeo.has(p.id) ? hiddenGeo.delete(p.id) : hiddenGeo.add(p.id); schedule(['areas']); saveSoon(); };
        b.ondblclick = () => map.fitBounds(L.geoJSON(f).getBounds());
        wrap.appendChild(b);
      });
      return;
    }
    REGION_IDS.forEach((id) => {
      if (id === 'kosovo' && !val('showKosovo')) return;
      const b = document.createElement('button');
      b.className = 'chip' + (hiddenRegions.has(id) ? ' off' : '');
      const c = val('colorBy') === 'single' ? val('singleColor') : pal.regions[id];
      b.innerHTML = `<i style="background:${c}"></i>${regionName(id)}`;
      b.title = tr('Click to show / hide · double-click to zoom');
      b.onclick = () => { hiddenRegions.has(id) ? hiddenRegions.delete(id) : hiddenRegions.add(id); schedule(['areas', 'points']); saveSoon(); };
      b.ondblclick = () => map.fitBounds(L.geoJSON(regionFeatures.find((f) => f.properties.id === id)).getBounds());
      wrap.appendChild(b);
    });
  }

  /* ------------------------------------------------------------------ *
   * Water
   * ------------------------------------------------------------------ */
  // Zoom steps for the detail layers: 0 (< 7.5), 1 (< 8.5), 2 (< 9.5), 3 (< 10.5), 4 (< 11.5), 5
  const zb = () => { const z = map.getZoom(); return z < 7.5 ? 0 : z < 8.5 ? 1 : z < 9.5 ? 2 : z < 10.5 ? 3 : z < 11.5 ? 4 : 5; };
  // Shortest river (km) drawn / named, smallest lake (km²) named, lowest mountain named, least isolated peak (km) — per zoom step
  const RIVER_MIN = [40, 15, 5, 0, 0, 0], RIVER_LABEL_MIN = [150, 50, 20, 8, 3, 0];
  const LAKE_LABEL_MIN = [5, 1.5, 0.4, 0.15, 0, 0], RANGE_MIN = [1000, 700, 0, 0, 0, 0], PEAK_ISO = [Infinity, 15, 8, 4, 1.5, 0];
  // the best-known basins are named at every zoom, the others from zoom 7.5
  // well-known lower mountains, named at every zoom like the high ones
  const MAJOR_MOUNTAINS = ['Fruška gora', 'Vršačke planine', 'Avala', 'Kosmaj', 'Rudnik', 'Bukulja', 'Venčac', 'Cer', 'Vlašić', 'Juhor',
    'Crni vrh', 'Gledićke planine', 'Kotlenik', 'Ovčar', 'Kablar', 'Jelica', 'Maljen', 'Suvobor', 'Povlen', 'Medvednik', 'Rtanj',
    'Deli Jovan', 'Miroč', 'Bukovik', 'Boranja', 'Gučevo', 'Jagodnja', 'Ozren', 'Devica', 'Bobija'];
  const rangeRank = (r) => (r.h >= 1500 || MAJOR_MOUNTAINS.includes(r.n) ? 0 : 1);
  const MAJOR_BASINS = ['Kosovska kotlina', 'Metohijska kotlina', 'Niška kotlina', 'Leskovačka kotlina', 'Vranjska kotlina',
    'Kruševačka kotlina', 'Čačansko-kraljevačka kotlina', 'Požeška kotlina', 'Paraćinsko-jagodinska kotlina', 'Pirotska kotlina',
    'Zaječarska kotlina', 'Valjevska kotlina', 'Sjenička kotlina'];
  const riverWeight = (l) => (l >= 300 ? 2.6 : l >= 100 ? 2 : l >= 40 ? 1.5 : l >= 15 ? 1.1 : 0.8);
  const ll = (c) => c.map(([x, y]) => [y, x]);
  const nameIn = (n) => (lang === 'en' ? n : script(n)); // OSM names are Serbian Latin

  const riverLayer = L.featureGroup();
  const riverLines = (F ? F.rivers : []).map((r) => ({ r, line: L.polyline(r.g.map(ll), {
    color: '#2f7fd1', weight: riverWeight(r.l), opacity: 0.9, lineCap: 'round'
  }).bindTooltip(() => `${riverName(r.n)} · ${fmt(r.l)} km`, { sticky: true }) }));

  const lakePolyLayer = L.featureGroup();
  // the hand-written lake notes (data/places.js) go to the nearest lake outline
  const lakeNote = (l) => {
    const p = (window.LAKE_POINTS || []).find(([, lat, lng]) => Math.hypot(lat - l.c[1], (lng - l.c[0]) * 0.72) < 0.08);
    return p ? p[3] : null;
  };
  (F ? F.lakes : []).forEach((l) => {
    L.polygon(l.g.map(ll), { color: '#2f7fd1', weight: 1, fillColor: '#6fb7ea', fillOpacity: 0.85 })
      .bindTooltip(() => nameIn(l.n), { sticky: true })
      .bindPopup(() => popup(nameIn(l.n), tr('Lake / reservoir'), [`${tr('Area')}: <b>${String(l.a).replace('.', lang === 'en' ? '.' : ',')} km²</b>`, tr(lakeNote(l))]))
      .addTo(lakePolyLayer);
  });
  // Name labels of rivers, lakes, mountains and basins (redrawn on zoom steps)
  const riverLabels = L.layerGroup(), lakeLabels = L.layerGroup(), rangeLabels = L.layerGroup(), basinLabels = L.layerGroup();
  const textLabel = (c, cls, text) => L.marker([c[1], c[0]], { pane: 'labels', interactive: false,
    icon: L.divIcon({ className: 'feature-label ' + cls, html: `<span>${text}</span>`, iconSize: [0, 0] }) });

  function renderFeatures() {
    const z = zb();
    const vis = (c) => !viewBounds || viewBounds.contains([c[1], c[0]]);
    const landmarksShown = val('showLandmarks') && map.getZoom() >= 7.5;
    const landmarkRivers = new Set(landmarksShown ? (G.landmarkRivers || []).map((r) => r.n) : []);
    // rivers: longer ones first, shorter ones as you zoom in
    const riversOn = val('showRivers'), color = val('riverColor');
    riverLines.forEach(({ r, line }) => {
      const show = riversOn && r.l >= RIVER_MIN[z];
      if (show) { line.setStyle({ color }); if (!riverLayer.hasLayer(line)) riverLayer.addLayer(line); }
      else if (riverLayer.hasLayer(line)) riverLayer.removeLayer(line);
    });
    toggle(riverLayer, riversOn);
    riverLabels.clearLayers();
    if (riversOn && val('showRiverNames')) (F ? F.rivers : []).forEach((r) => {
      if (r.l >= RIVER_LABEL_MIN[z] && !landmarkRivers.has(r.n) && vis(r.c)) textLabel(r.c, 'river', riverName(r.n)).addTo(riverLabels);
    });
    toggle(riverLabels, riversOn && val('showRiverNames'));

    toggle(lakePolyLayer, val('showLakes'));
    lakeLabels.clearLayers();
    if (val('showLakes') && val('showLakeNames')) (F ? F.lakes : []).forEach((l) => {
      if (l.a >= LAKE_LABEL_MIN[z] && vis(l.c)) textLabel(l.c, 'lake', nameIn(l.n)).addTo(lakeLabels);
    });
    toggle(lakeLabels, val('showLakes') && val('showLakeNames'));

    // mountain names, skipping those the border landmarks already name
    const lm = val('showLandmarks') ? (window.LANDMARKS || []) : [];
    rangeLabels.clearLayers();
    // big and well-known mountains first, so they win when names would overlap
    const rangeOrder = (F ? F.ranges : []).slice().sort((a, b) => rangeRank(a) - rangeRank(b));
    if (val('showRanges')) rangeOrder.forEach((r) => {
      if ((r.h < RANGE_MIN[z] && !MAJOR_MOUNTAINS.includes(r.n)) || !vis(r.c)) return;
      if (lm.some(([n, , [x, y]]) => n[1] === r.n && Math.abs(x - r.c[0]) < 0.3 && Math.abs(y - r.c[1]) < 0.3)) return;
      textLabel(r.c, 'range', nameIn(r.n)).addTo(rangeLabels);
    });
    toggle(rangeLabels, val('showRanges'));

    const lmBasins = new Set([...(landmarksShown ? (G.landmarkPoints || []).map((p) => p.n[1]) : []),
      ...lm.filter(([, kind]) => kind === 'area').map(([n]) => n[1])]);
    basinLabels.clearLayers();
    if (val('showBasins')) (F ? F.basins : []).forEach((b) => {
      if (!lmBasins.has(b.n) && (z >= 1 || MAJOR_BASINS.includes(b.n)) && vis(b.c)) textLabel(b.c, 'basin', nameIn(b.n)).addTo(basinLabels);
    });
    toggle(basinLabels, val('showBasins'));
  }

  /* ------------------------------------------------------------------ *
   * Point layers
   * ------------------------------------------------------------------ */
  const groups = {
    mountains: L.featureGroup(), cities: L.featureGroup(), parks: L.featureGroup(), spas: L.featureGroup(),
    heritage: L.featureGroup(), ski: L.featureGroup(), lakes: L.featureGroup(), caves: L.featureGroup()
  };
  const markerIndex = new Map();
  const visible = (o) => !o.region || (!hiddenRegions.has(o.region) && (o.region !== 'kosovo' || val('showKosovo')));
  const popup = (title, tag, lines = []) =>
    `<h4>${title}</h4><span class="tag">${tag}</span>${lines.filter(Boolean).map((l) => `<p>${l}</p>`).join('')}`;

  const DOT = { park: '#2e8b57', spa: '#17a2b8', heritage: '#b8860b', ski: '#6c63ff', lake: '#4aa3df', cave: '#6b4a2b' };
  function dot(o, radius = 6) {
    return L.circleMarker([o.lat, o.lng], { radius, color: '#fff', weight: 2, fillColor: DOT[o.type], fillOpacity: 1 });
  }

  // Which checkbox shows each point group
  const POINT_GROUPS = { mountains: 'showMountains', cities: 'showCities', parks: 'showParks', spas: 'showSpas',
    heritage: 'showHeritage', ski: 'showSki', lakes: 'showLakes', caves: 'showCaves' };

  // Remove from the map first (closes permanent tooltips), then drop tooltip/popup bindings
  function clearGroup(g) {
    const layers = g.getLayers();
    g.clearLayers();
    layers.forEach((l) => { l.unbindTooltip(); l.unbindPopup(); });
  }

  /* Markers are created once and reused. Filters (min. elevation, population, hidden regions)
   * only add/remove existing markers; markers are rebuilt only when their appearance changes,
   * which `sig` (signature) captures. */
  const simpleSpec = (list, tagFn, linesFn) => ({
    list, sig: () => lang, filter: () => true,
    make: (o) => dot(o).bindPopup(popup(tr(o.name), tr(tagFn(o)), linesFn(o).map(tr)))
      .bindTooltip(tr(o.name), { direction: 'top', offset: [0, -6] })
  });

  // Map area (padded) for layers that only show what is in view when zoomed in
  let viewBounds = null;
  const inView = (o) => !viewBounds || viewBounds.contains([o.lat, o.lng]);

  const POINT_SPECS = {
    mountains: {
      list: mountains,
      sig: () => `${lang}|${val('showElev')}|${val('peakSystems')}`,
      filter: (m) => m.elev >= val('minElev') && (!m.osm || (m.iso >= PEAK_ISO[zb()] && inView(m))),
      make: makePeak
    },
    cities: {
      list: cities,
      sig: () => `${lang}|${zb()}`,
      filter: (c) => (c.pop === 0 || c.pop >= val('minPop')) && (!c.osm || ((zb() >= 1 || c.pop >= 15000) && inView(c))),
      make: makeCity
    },
    parks: simpleSpec(parks, (o) => o.kind, (o) => [o.note]),
    spas: {
      list: spas,
      sig: () => `${lang}|${zb() >= 2}`,
      filter: () => true,
      make: (o) => dot(o, 5).bindPopup(popup(tr(o.name), tr('Spa town'), [tr('Thermal / mineral springs')]))
        .bindTooltip(tr(o.name), { permanent: zb() >= 2, direction: 'right', offset: [5, 0], className: 'spa-label' })
    },
    caves: {
      list: caves,
      sig: () => `${lang}|${zb() >= 1}`,
      filter: (c) => c.famous || (zb() >= 2 && inView(c)),
      make: (o) => L.marker([o.lat, o.lng], {
        icon: L.divIcon({ className: 'cave-icon' + (o.famous ? ' famous' : ''), html: '<i></i>', iconSize: [14, 10], iconAnchor: [7, 8] })
      }).bindPopup(popup(tr(o.name), tr('Cave'), [o.famous && tr('Show-cave (open to visitors)'), `${latStr(o.lat, 3)}, ${lngStr(o.lng, 3)}`]))
        .bindTooltip(tr(o.name), { permanent: o.famous && zb() >= 1, direction: 'right', offset: [6, -2], className: 'cave-label' })
    },
    heritage: simpleSpec(heritage, (o) => o.kind, (o) => [o.note]),
    ski: simpleSpec(ski, () => 'Ski resort', () => []),
    lakes: simpleSpec(lakePoints, () => 'Lake / reservoir', (o) => [o.note])
  };
  const markerCache = {};
  const markerKey = (o) => o.type + ':' + o.name + ':' + o.lat;

  // Sync point groups — only the ones named in `only` (all if omitted)
  function renderPoints(only) {
    Object.entries(POINT_GROUPS).forEach(([name, toggleId]) => {
      if (only && !only.has(name)) return;
      const on = val(toggleId);
      toggle(groups[name], on);
      if (!on) return; // hidden groups are synced when switched on again

      const spec = POINT_SPECS[name];
      const group = groups[name];
      const sig = spec.sig();
      let cache = markerCache[name];
      if (!cache || cache.sig !== sig) {
        clearGroup(group);
        cache = markerCache[name] = { sig, entries: spec.list.map((o) => ({ o, mk: null })) };
      }
      // markers are made the first time they are shown (there are thousands of peaks)
      cache.entries.forEach((e) => {
        const show = visible(e.o) && spec.filter(e.o);
        if (show && !e.mk) { e.mk = spec.make(e.o); markerIndex.set(markerKey(e.o), e.mk); }
        if (!e.mk) return;
        const shown = group.hasLayer(e.mk);
        if (show && !shown) group.addLayer(e.mk);
        else if (!show && shown) group.removeLayer(e.mk);
      });
    });
  }

  function makePeak(m) {
    const sys = window.MOUNTAIN_SYSTEMS[m.system];
    const tri = val('peakSystems') && sys ? `<div class="tri" style="border-bottom-color:${sys.color}"></div>` : '<div class="tri"></div>';
    const label = val('showElev') ? `${tr(m.name)} <span style="font-weight:400">${fmt(m.elev)} m</span>` : tr(m.name);
    return L.marker([m.lat, m.lng], {
      icon: L.divIcon({ className: 'peak-icon' + (m.osm ? ' minor' : ''), html: tri, iconSize: [14, 12], iconAnchor: [7, 12] })
    }).bindPopup(popup(tr(m.name), tr('Peak'), [
      `<b>${fmt(m.elev)} m</b>` + (m.range ? ` · ${tr(m.range)}` : ''),
      sys && `${tr('Mountain system')}: ${pick(sys.name, sys.sr)}`,
      `${latStr(m.lat, 3)}, ${lngStr(m.lng, 3)}`
    ])).bindTooltip(label, { permanent: val('showElev'), direction: 'right', offset: [6, -6], className: 'peak-label' + (m.osm ? ' minor' : '') });
  }

  function makeCity(c) {
    const r = c.capital ? 8 : Math.max(3, Math.sqrt(c.pop) / 90);
    // big cities always named, smaller towns as you zoom in
    const z = zb();
    const showLabel = c.capital || c.pop >= 90000 || (z >= 1 && c.pop >= 25000) || (z >= 2 && c.pop >= 8000) || z >= 3;
    const popText = !c.pop ? tr('n/a in Serbian 2022 census')
      : `<b>${fmt(c.pop)}</b> <small>${tr(c.osm ? '(approx.)' : '(2022 census)')}</small>`;
    return L.circleMarker([c.lat, c.lng], {
      radius: r, color: '#fff', weight: c.osm ? 1.5 : 2, fillColor: c.capital ? '#c6363c' : '#222', fillOpacity: 1
    }).bindPopup(popup(tr(c.name), tr(c.capital ? 'Capital city' : c.osm ? 'Town' : 'City'), [`${tr('Population')}: ${popText}`]))
      .bindTooltip(tr(c.name), { permanent: showLabel, direction: 'right', offset: [r, 0], className: 'city-label' + (c.capital ? ' capital' : '') });
  }

  /* ------------------------------------------------------------------ *
   * Graticule
   * ------------------------------------------------------------------ */
  const gridLayer = L.featureGroup();
  function renderGrid() {
    clearGroup(gridLayer);
    if (!val('showGrid')) return;
    const step = map.getZoom() >= 9 ? 0.25 : map.getZoom() >= 8 ? 0.5 : 1;
    const style = { color: '#555', weight: 0.7, opacity: 0.5, dashArray: '3 4', interactive: false };
    for (let lat = 41; lat <= 47; lat += step) {
      L.polyline([[lat, 17], [lat, 24]], style).addTo(gridLayer);
      L.marker([lat, 18.2], { opacity: 0, interactive: false }).bindTooltip(latStr(lat), { permanent: true, className: 'grid-label', direction: 'center' }).addTo(gridLayer);
    }
    for (let lng = 17; lng <= 24; lng += step) {
      L.polyline([[41, lng], [47, lng]], style).addTo(gridLayer);
      L.marker([46.35, lng], { opacity: 0, interactive: false }).bindTooltip(lngStr(lng), { permanent: true, className: 'grid-label', direction: 'center' }).addTo(gridLayer);
    }
  }
  // Coordinates; with no digit count, trailing zeros are dropped (grid labels)
  const num = (v, d) => (d == null ? String(+v.toFixed(2)) : v.toFixed(d));
  function latStr(v, d) { return num(v, d) + tr('°N'); }
  function lngStr(v, d) { return num(v, d) + tr('°E'); }

  /* ------------------------------------------------------------------ *
   * Tools
   * ------------------------------------------------------------------ */
  const scale = L.control.scale({ metric: true, imperial: false, position: 'bottomleft' });
  const coordsBox = $('coords');
  // Update the readout at most once per animation frame
  let lastMouse = null, mouseFrame = 0;
  map.on('mousemove', (e) => {
    lastMouse = e.latlng;
    if (mouseFrame || !val('showCoords')) return;
    mouseFrame = requestAnimationFrame(() => {
      mouseFrame = 0;
      if (lastMouse) coordsBox.textContent = `${latStr(lastMouse.lat, 4)}  ${lngStr(lastMouse.lng, 4)}`;
    });
  });
  map.on('mouseout', () => { lastMouse = null; coordsBox.textContent = ''; });

  function toggle(layer, on) { if (on) { if (!map.hasLayer(layer)) layer.addTo(map); } else map.removeLayer(layer); }

  /* ------------------------------------------------------------------ *
   * Rendering: each control only redraws what it affects.
   * Tasks: base, areas (rebuild shapes), style (recolor shapes), labels, rivers,
   *        points (all groups) or p:<group>, grid, ui — or 'all'.
   * ------------------------------------------------------------------ */
  const TASKS_FOR = {
    baseOpacity: ['base'], hillshade: ['base'],
    showGeo: ['areas'], showOverlays: ['areas'], showLandmarks: ['landmarks', 'features'], showRegions: ['areas'], showDistricts: ['areas'], showOutline: ['areas'], maskOutside: ['areas'],
    showKosovo: ['areas', 'points'], showAreaLabels: ['labels'],
    fillOn: ['style'], colorBy: ['style', 'ui'], palette: ['style'], singleColor: ['style'],
    fillOpacity: ['style'], borderColor: ['style'], borderWidth: ['style'],
    showMountains: ['p:mountains', 'ui'], minElev: ['p:mountains', 'ui'], showElev: ['p:mountains'], peakSystems: ['p:mountains', 'ui'],
    showRivers: ['features'], showRiverNames: ['features'], riverColor: ['features', 'rivers'], showLakes: ['features', 'p:lakes'],
    showLakeNames: ['features'], showRanges: ['features'], showBasins: ['features'], showCaves: ['p:caves'], showParks: ['p:parks'],
    showCities: ['p:cities'], minPop: ['p:cities', 'ui'], showSpas: ['p:spas'], showHeritage: ['p:heritage'], showSki: ['p:ski'],
    showGrid: ['grid'], showCoords: ['ui'], showScale: ['ui'], darkUI: ['ui', 'style']
  };

  function run(tasks) {
    const all = tasks.has('all');
    const has = (t) => all || tasks.has(t);
    if (has('ui')) updateUi();
    if (has('base')) {
      if (baseLayer) baseLayer.setOpacity(val('baseOpacity'));
      toggle(hillshade, val('hillshade'));
    }
    if (has('areas')) renderAreas();
    else {
      if (tasks.has('style')) restyleAreas();
      if (tasks.has('labels')) renderAreaLabels();
    }
    if (has('rivers')) landmarkLayer.setStyle(landmarkRiverStyle());
    if (has('landmarks')) renderLandmarks();
    // zoomed in, labels and small places are only placed inside the visible area
    viewBounds = zb() >= 2 ? map.getBounds().pad(0.3) : null;
    if (has('features')) renderFeatures();
    if (has('points')) renderPoints();
    else {
      const only = new Set([...tasks].filter((t) => t.startsWith('p:')).map((t) => t.slice(2)));
      if (only.size) renderPoints(only);
    }
    if (has('grid')) { renderGrid(); toggle(gridLayer, val('showGrid')); }
    restack();
    declutter();
  }

  // Draw order on the shared canvas, bottom to top (re-applied after layers are rebuilt)
  function restack() {
    [countryLayer, districtLayer, geoLayer, regionLayer, groupLayer, overlayLayer, outlineLayer, gridLayer, lakePolyLayer, riverLayer, landmarkLayer,
      groups.lakes, groups.parks, groups.caves, groups.spas, groups.heritage, groups.ski, groups.cities]
      .forEach((l) => { if (map.hasLayer(l)) l.bringToFront(); });
  }

  /* Label decluttering: where names would overlap, only the more important one stays visible.
   * Groups are in priority order; inside a group the earlier label wins (the data is sorted
   * biggest city / highest mountain / longest river first). Region and country names are not
   * part of this: they always stay, written large over the areas. */
  const ALWAYS_SHOWN = ['.city-label.capital'];
  const LABEL_PRIORITY = ['.city-label.capital', '.city-label', '.landmark-label span', '.feature-label.range span',
    '.peak-label:not(.minor)', '.feature-label.river span', '.feature-label.lake span', '.feature-label.basin span',
    '.cave-label', '.spa-label', '.peak-label.minor'];
  let declutterFrame = 0;
  function declutter() {
    cancelAnimationFrame(declutterFrame);
    declutterFrame = requestAnimationFrame(() => {
      const box = map.getContainer();
      const seen = new Set();
      const collect = (sels) => sels.flatMap((s) => [...box.querySelectorAll(s)].filter((el) => !seen.has(el) && seen.add(el)));
      const fixed = collect(ALWAYS_SHOWN), ranked = collect(LABEL_PRIORITY);
      // read all positions first, then hide (avoids layout thrashing)
      const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - 2, r: r.right + 2, t: r.top - 1, b: r.bottom + 1 }; };
      const placed = fixed.map(rect).filter((r) => r.r > r.l);
      const rects = ranked.map(rect);
      const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
      const hide = rects.map((r) => {
        if (r.r - r.l <= 4) return false;
        if (placed.some((p) => hit(p, r))) return true;
        placed.push(r); return false;
      });
      ranked.forEach((el, i) => { el.style.visibility = hide[i] ? 'hidden' : ''; });
    });
  }
  map.on('moveend', declutter);

  // Coalesce rapid changes (e.g. dragging a slider) into one redraw per animation frame
  const pending = new Set();
  let frame = 0;
  function schedule(tasks) {
    tasks.forEach((t) => pending.add(t));
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; const t = new Set(pending); pending.clear(); run(t); });
  }
  function renderAll() { pending.clear(); run(new Set(['all'])); }

  let saveTimer = 0;
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); };

  /* ------------------------------------------------------------------ *
   * Border landmarks: rivers, mountains, basins and places named in the region borders
   * (rivers and basin/gorge label points from the build, mountains from data/places.js)
   * ------------------------------------------------------------------ */
  // English names of the rivers (the data uses the Serbian ones)
  const RIVER_EN = { 'Dunav': 'Danube', 'Zapadna Morava': 'West Morava', 'Južna Morava': 'South Morava', 'Velika Morava': 'Great Morava',
    'Tisa': 'Tisza', 'Tamiš': 'Timiș', 'Beli Drim': 'White Drin' };
  const riverName = (n) => (lang === 'en' ? (RIVER_EN[n] || n) : script(n));
  const landmarkLayer = L.featureGroup();
  const landmarkLabels = L.layerGroup();
  const landmarkRiverStyle = () => ({ color: val('riverColor'), weight: 2.4, opacity: 0.95, lineCap: 'round' });
  function renderLandmarks() {
    landmarkLayer.clearLayers(); landmarkLabels.clearLayers();
    const on = val('showLandmarks');
    if (on) {
      const z = map.getZoom();
      (G.landmarkRivers || []).forEach((r) => {
        L.geoJSON({ type: 'Feature', properties: {}, geometry: r.g }, { style: landmarkRiverStyle,
          onEachFeature: (f, l) => l.bindTooltip(() => riverName(r.n), { sticky: true }) }).addTo(landmarkLayer);
        if (z >= 7.5) L.marker([r.c[1], r.c[0]], { pane: 'labels', interactive: false,
          icon: L.divIcon({ className: 'landmark-label river', html: `<span>${riverName(r.n)}</span>`, iconSize: [0, 0] }) }).addTo(landmarkLabels);
      });
      (window.LANDMARKS || []).forEach(([name, kind, [lng, lat]]) => {
        const icon = kind === 'mountain' ? '<i class="lm-peak"></i>' : kind === 'place' ? '<i class="lm-place"></i>' : '';
        L.marker([lat, lng], { pane: 'labels', interactive: false,
          icon: L.divIcon({ className: `landmark-label ${kind}`, html: `${icon}<span>${textPair(name)}</span>`, iconSize: [0, 0] }) }).addTo(landmarkLabels);
      });
      if (z >= 7.5) (G.landmarkPoints || []).forEach((p) => {
        L.marker([p.c[1], p.c[0]], { pane: 'labels', interactive: false,
          icon: L.divIcon({ className: 'landmark-label basin', html: `<span>${textPair(p.n)}</span>`, iconSize: [0, 0] }) }).addTo(landmarkLabels);
      });
    }
    toggle(landmarkLayer, on); toggle(landmarkLabels, on);
  }

  // Neighbouring countries: outline + name, in the current language (Serbia itself is drawn by our own layers)
  const countryStyle = () => ({ color: val('darkUI') ? '#b8bec7' : '#5f6670', weight: 1.3, opacity: 0.9, fill: false });
  function drawCountries() {
    countryLayer.clearLayers(); countryLabelLayer.clearLayers();
    (G.countries || []).forEach((c) => L.geoJSON({ type: 'Feature', properties: {}, geometry: c.g },
      { interactive: false, style: countryStyle }).addTo(countryLayer));
    Object.entries(window.COUNTRY_LABELS || {}).forEach(([name, [lng, lat]]) => {
      L.marker([lat, lng], { pane: 'labels', interactive: false,
        icon: L.divIcon({ className: 'country-label', html: `<span>${tr(name)}</span>`, iconSize: [0, 0] }) }).addTo(countryLabelLayer);
    });
    countryLayer.addTo(map); countryLabelLayer.addTo(map);
  }

  function updateUi() {
    document.documentElement.dataset.theme = val('darkUI') ? 'dark' : 'light';
    countryLayer.eachLayer((l) => l.setStyle(countryStyle()));
    if (val('showScale')) scale.addTo(map); else scale.remove();
    if (!val('showCoords')) coordsBox.textContent = '';
    $('minElevOut').textContent = fmt(val('minElev')) + ' m';
    $('minPopOut').textContent = fmt(val('minPop'));
    $('systemLegend').innerHTML = val('peakSystems') && val('showMountains')
      ? Object.values(window.MOUNTAIN_SYSTEMS).map((s) => `<li><i style="border-bottom-color:${s.color}"></i>${pick(s.name, s.sr)}</li>`).join('')
      : '';
    $('singleColor').closest('label').style.display = val('colorBy') === 'single' ? '' : 'none';
    $('palette').closest('label').style.display = val('colorBy') === 'single' ? 'none' : '';
  }

  // Geographic regions and statistical regions/districts are alternative divisions: show one at a time
  function exclusiveDivision(id) {
    if (!$(id).checked) return;
    if (id === 'showGeo') { $('showRegions').checked = false; $('showDistricts').checked = false; }
    if (id === 'showRegions' || id === 'showDistricts') $('showGeo').checked = false;
  }
  inputs.forEach((el) => el.addEventListener(el.type === 'range' || el.type === 'color' ? 'input' : 'change', () => {
    exclusiveDivision(el.id);
    schedule(TASKS_FOR[el.id] || ['all']);
    saveSoon();
  }));

  // Only a few things depend on zoom level (district vs region labels, city labels, grid spacing)
  let lastZoomBucket = null;
  map.on('zoomend', () => {
    const z = map.getZoom();
    const bucket = `${zb()}|${z >= 7.5}|${z >= 8}|${z >= 9}`;
    if (bucket !== lastZoomBucket) {
      lastZoomBucket = bucket;
      schedule(['labels', 'p:cities', 'p:mountains', 'p:spas', 'p:caves', 'grid', 'landmarks', 'features']);
    }
  });
  // zoomed in, labels and small places follow the visible area
  map.on('moveend', () => { if (zb() >= 2) schedule(['p:mountains', 'p:cities', 'p:caves', 'features']); });

  $('resetView').onclick = () => map.flyTo(HOME.center, HOME.zoom);
  const LAYER_TOGGLES = ['showRegions', 'showDistricts', 'showKosovo', 'showOutline', 'showAreaLabels', 'showMountains', 'showRivers',
    'showRiverNames', 'showLakes', 'showLakeNames', 'showRanges', 'showBasins', 'showCaves', 'showParks', 'showCities', 'showSpas',
    'showHeritage', 'showSki', 'hillshade', 'fillOn'];
  $('allOn').onclick = () => {
    LAYER_TOGGLES.forEach((id) => { $(id).checked = true; });
    $('showGeo').checked = false; hiddenRegions.clear(); renderAll(); save();
  };
  $('allOff').onclick = () => { LAYER_TOGGLES.forEach((id) => { $(id).checked = false; }); renderAll(); save(); };

  $('panelToggle').onclick = () => { document.body.classList.add('collapsed'); setTimeout(() => map.invalidateSize(), 300); };
  $('panelOpen').onclick = () => { document.body.classList.remove('collapsed'); setTimeout(() => map.invalidateSize(), 300); };

  /* ------------------------------------------------------------------ *
   * Search
   * ------------------------------------------------------------------ */
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'dj');
  const searchItems = [
    ...cities.map((o) => ({ o, label: () => tr('City'), toggle: 'showCities' })),
    ...mountains.map((o) => ({ o, label: () => `${tr('Peak')} · ${o.elev} m`, toggle: 'showMountains' })),
    ...parks.map((o) => ({ o, label: () => tr(o.kind), toggle: 'showParks' })),
    ...spas.map((o) => ({ o, label: () => tr('Spa'), toggle: 'showSpas' })),
    ...heritage.map((o) => ({ o, label: () => tr(o.kind), toggle: 'showHeritage' })),
    ...ski.map((o) => ({ o, label: () => tr('Ski resort'), toggle: 'showSki' })),
    ...lakePoints.map((o) => ({ o, label: () => tr('Lake'), toggle: 'showLakes' })),
    ...caves.map((o) => ({ o, label: () => tr('Cave'), toggle: 'showCaves' })),
    ...riverLines.map(({ r, line }) => ({ o: { name: r.n, type: 'river', bounds: line.getBounds() },
      display: () => riverName(r.n), label: () => `${tr('River')} · ${fmt(r.l)} km`, toggle: 'showRivers' })),
    ...lakePolyLayer.getLayers().map((p, i) => ({ o: { name: F.lakes[i].n, type: 'lake', bounds: p.getBounds(), poly: p },
      label: () => tr('Lake'), toggle: 'showLakes' })),
    ...(F ? F.ranges : []).map((r) => ({ o: { name: r.n, ...at(r.c), type: 'range', zoom: 10 },
      label: () => tr('Mountain'), toggle: 'showRanges' })),
    ...(F ? F.basins : []).map((b) => ({ o: { name: b.n, ...at(b.c), type: 'basin', zoom: 10 },
      label: () => tr('Basin'), toggle: 'showBasins' })),
    ...districtFeatures.map((f) => ({ o: { name: f.properties.name, sr: f.properties.sr, type: 'district', feature: f }, label: () => tr('District'), toggle: 'showDistricts' })),
    ...regionFeatures.map((f) => ({ o: { name: f.properties.name, sr: f.properties.sr, type: 'region', feature: f }, label: () => tr('Region'), toggle: 'showRegions' })),
    ...geoGroups.map((f) => ({ o: { name: f.properties.name, sr: f.properties.sr, type: 'group', feature: f }, label: () => tr('Geographic region'), toggle: 'showGeo' })),
    ...geoFeatures.map((f) => ({ o: { name: f.properties.name, sr: f.properties.sr, type: 'geo', feature: f }, label: () => tr('Geographic region'), toggle: 'showGeo' }))
  ];
  // Every item is searchable by its English, Serbian Latin and Cyrillic names
  searchItems.forEach((it) => {
    const sr = it.o.sr || window.SR[it.o.name] || it.o.name;
    it.display = it.display || (() => (it.o.feature ? areaName(it.o.feature.properties) : tr(it.o.name)));
    it.haystack = [it.o.name, sr, I18N.toCyr(sr)].map((s) => norm(I18N.unbrace(s))).join('|');
  });
  const results = $('searchResults');
  let current = [], active = 0;

  function go(item) {
    const { o } = item;
    $(item.toggle).checked = true;
    exclusiveDivision(item.toggle);
    if (o.region) hiddenRegions.delete(o.region);
    if (o.type === 'geo') hiddenGeo.delete(o.feature.properties.id);
    if (o.region === 'kosovo' || o.feature?.properties.region === 'kosovo' || o.feature?.properties.kosovo) $('showKosovo').checked = true;
    if (o.type === 'mountain' && o.elev < val('minElev')) $('minElev').value = 0;
    if (o.type === 'city' && o.pop && o.pop < val('minPop')) $('minPop').value = 0;
    if (o.feature) { hiddenRegions.delete(o.feature.properties.region); renderAll(); map.flyToBounds(L.geoJSON(o.feature).getBounds(), { padding: [30, 30] }); }
    else if (o.bounds) {
      renderAll();
      map.flyToBounds(o.bounds, { padding: [30, 30], maxZoom: 12 });
      if (o.poly) map.once('moveend', () => o.poly.openPopup());
    } else {
      renderAll();
      // OSM peaks appear only when zoomed in close
      map.flyTo([o.lat, o.lng], o.osm ? 12 : Math.max(map.getZoom(), o.zoom || 10));
      map.once('moveend', () => setTimeout(() => markerIndex.get(markerKey(o))?.openPopup(), 150));
    }
    save();
    results.innerHTML = ''; $('search').value = item.display();
  }
  function drawResults() {
    results.innerHTML = current.map((it, i) =>
      `<li data-i="${i}" class="${i === active ? 'active' : ''}"><span>${it.display()}</span><small>${it.label()}</small></li>`).join('');
  }
  $('search').addEventListener('input', (e) => {
    const q = norm(e.target.value.trim());
    current = q ? searchItems.filter((it) => it.haystack.includes(q)).slice(0, 12) : [];
    active = 0; drawResults();
  });
  $('search').addEventListener('keydown', (e) => {
    if (!current.length) return;
    if (e.key === 'ArrowDown') { active = (active + 1) % current.length; drawResults(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = (active - 1 + current.length) % current.length; drawResults(); e.preventDefault(); }
    else if (e.key === 'Enter') go(current[active]);
    else if (e.key === 'Escape') { results.innerHTML = ''; }
  });
  results.addEventListener('mousedown', (e) => { const li = e.target.closest('li'); if (li) go(current[+li.dataset.i]); });
  $('search').addEventListener('blur', () => setTimeout(() => { results.innerHTML = ''; }, 150));

  /* ------------------------------------------------------------------ *
   * Text view: the regions and their borders as organised text (data/region-texts.js)
   * ------------------------------------------------------------------ */
  const textPair = (pair) => (lang === 'en' ? pair[0] : script(pair[1]));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // The map feature a text entry points to, and the colour shown on its card
  function textTarget(m) {
    if (m.region) return geoFeatures.find((f) => f.properties.id === m.region);
    if (m.group) return geoGroups.find((f) => f.properties.id === m.group);
    if (m.overlay) return overlayFeatures.find((f) => f.properties.id === m.overlay);
    return null;
  }
  function textSwatch(m, f) {
    if (m.overlay) return '#c27a2c';
    if (m.group) return val('darkUI') ? '#9ec5ff' : '#0c4076';
    return f ? colorFor(f.properties) : 'var(--line)';
  }

  function renderRegionText() {
    const side = { n: 'North', e: 'East', s: 'South', w: 'West' };
    const cards = (window.REGION_TEXTS || []).map((r, i) => {
      const f = textTarget(r.map);
      const borders = r.borders ? `<dl>${['n', 'e', 's', 'w'].filter((k) => r.borders[k])
        .map((k) => `<dt>${tr(side[k])}</dt><dd>${esc(textPair(r.borders[k]))}</dd>`).join('')}</dl>` : '';
      const list = r.list ? `<ol>${r.list.map((p) => `<li>${esc(textPair(p))}</li>`).join('')}</ol>` : '';
      const parts = r.parts ? `<div class="sub">${tr(r.map.group === 'smm' ? 'Includes' : 'Consists of')}:</div>
        <ul>${r.parts.map((p) => `<li>${esc(textPair(p))}</li>`).join('')}</ul>` : '';
      return `<article class="region-card" style="--swatch:${textSwatch(r.map, f)}">
        <h3>${esc(textPair(r.name))}</h3>
        ${r.notRegion ? `<span class="tag">${tr('Not a region')}</span>` : ''}
        ${borders}${list}${parts}
        ${f ? `<button data-show="${i}">${tr('Show on map')}</button>` : ''}
      </article>`;
    }).join('');
    $('regionText').innerHTML = `<h2>${tr('Geographic regions of Serbia')}</h2>
      <p class="lead">${tr('Borders of each region, as written in the notebook.')}</p>
      <div class="region-grid">${cards}</div>`;
  }

  let view = 'map';
  function setView(v) {
    view = v;
    $('regionText').hidden = v !== 'text';
    document.querySelectorAll('.view-switch button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    if (v === 'text') renderRegionText();
    else map.invalidateSize();
  }
  document.querySelector('.view-switch').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]');
    if (b) setView(b.dataset.view);
  });

  // "Show on map": switch to the map with geographic regions on and zoom to the region
  $('regionText').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-show]');
    if (!b) return;
    const r = window.REGION_TEXTS[+b.dataset.show];
    const f = textTarget(r.map);
    if (!f) return;
    $('showGeo').checked = true; exclusiveDivision('showGeo');
    if (r.map.overlay) $('showOverlays').checked = true;
    if (f.properties.kosovo || r.map.region === 'kopaonik') $('showKosovo').checked = true;
    if (f.properties.id) hiddenGeo.delete(f.properties.id);
    renderAll(); saveSoon();
    setView('map');
    map.fitBounds(L.geoJSON(f).getBounds(), { padding: [40, 40] });
  });

  $('lang').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-lang]');
    if (!b || b.dataset.lang === lang) return;
    lang = b.dataset.lang;
    applyStaticI18n(); drawCountries(); renderAll(); map.closePopup(); save();
    if (view === 'text') renderRegionText();
  });

  /* ------------------------------------------------------------------ */
  load();
  applyStaticI18n();
  applyBase();
  drawCountries();
  renderAll();
  setView('map');
  lastZoomBucket = `${map.getZoom() >= 7.5}|${map.getZoom() >= 8}|${map.getZoom() >= 9}`;
})();
