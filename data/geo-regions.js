// Traditional geographic regions of Serbia (as taught in Serbian regional geography).
//
// Two kinds of region:
//  - seed:  bounded by NATURAL borders (rivers, mountains, state borders). Serbia is cut along the
//           lines in GEO_BOUNDARIES; the piece containing the seed point [lng, lat] is the region
//           (or a list of points, when a region is split into several pieces).
//  - munis: everything the natural regions don't cover, approximated by whole municipalities
//           (names as in geoBoundaries, without the " Municipality"/" City" suffix). Only the part
//           of each municipality that lies outside the natural regions is used.
//  - kosDistricts: Kosovo and Metohija, built from the 7 Kosovo districts.
// group: regions drawn together under a shared outline and label (e.g. the Pannonian region).
// label: map label lines, separated by "|".
// After editing anything here except names/notes, re-run tools/build-geometry.html.

// labelAt: 'north' = label near the group's northern edge, a region id = at that region's label point,
//          or [lng, lat] = at that exact spot. label: optional [English, Serbian] text, lines separated by "|".
window.GEO_GROUPS = {
  panonska: { name: 'Pannonian region', sr: 'Panonska regija', labelAt: 'north',
    note: 'Bounded by Hungary (N), Romania (E), the Sava and Danube (S) and Croatia (W).',
    noteSr: 'Granice: Mađarska (S), Rumunija (I), Sava i Dunav (J), Hrvatska (Z).' },
  // label over the northern slopes of Jastrebac, in the western part of the massif
  smm: { name: 'Serbo-Macedonian massif', sr: 'Srpsko-makedonska masa', labelAt: [21.50, 43.50],
    label: ['Serbo-Macedonian|massif', 'Srpsko-makedonska|masa'] }
};

window.GEO_REGIONS = [
  // --- Pannonian region: Hungarian border (N), Romanian border (E), Sava & Danube (S), Croatian border / Danube (W)
  { id: 'backa', name: 'Bačka', sr: 'Bačka', group: 'panonska', seed: [19.64, 45.57],
    note: 'Fertile plain between the Danube and the Tisa.', noteSr: 'Plodna ravnica između Dunava i Tise.' },
  { id: 'banat', name: 'Banat', sr: 'Banat', group: 'panonska', seed: [20.39, 45.38],
    note: 'Plain east of the Tisa and north of the Danube, with Deliblato Sands and the Vršac Hills.',
    noteSr: 'Ravnica istočno od Tise i severno od Dunava, sa Deliblatskom peščarom i Vršačkim planinama.' },
  { id: 'srem', name: 'Srem', sr: 'Srem', group: 'panonska', seed: [19.82, 45.01],
    note: 'Between the Danube and the Sava, crowned by Fruška Gora.', noteSr: 'Između Dunava i Save, sa Fruškom gorom.' },

  // --- Ore and flysch mountains: Sava (N), Kolubara–Ljig–Dičina (E), Đetinja & Zapadna Morava (S), Drina (W)
  { id: 'rudne', name: 'Northwestern Serbia – Ore and flysch mountains (Vardar zone)', sr: 'Severozapadna Srbija – Rudne i flišne planine (Vardarska zona)',
    label: ['Northwestern Serbia|(ore and flysch mountains)', 'Severozapadna Srbija|(rudne i flišne planine)'],
    seed: [19.89, 44.27],
    note: 'From the Sava to the Đetinja and Zapadna Morava, between the Drina and the Kolubara–Ljig–Dičina line. Ore-bearing (Cer, Boranja, Jagodnja) and flysch (Povlen, Maljen, Suvobor) mountains, with Mačva in the north.',
    noteSr: 'Od Save do Đetinje i Zapadne Morave, između Drine i linije Kolubara–Ljig–Dičina. Rudne (Cer, Boranja, Jagodnja) i flišne (Povlen, Maljen, Suvobor) planine, sa Mačvom na severu.' },

  // --- Šumadija: Sava & Danube (N), Juhor–Crni vrh–Azanjska brda (E), Kolubara–Ljig–Dičina (W), Zapadna Morava (S)
  { id: 'sumadija', name: 'Šumadija', sr: 'Šumadija', seed: [20.91, 44.01],
    note: 'The heart of Serbia, from the Sava and Danube to the Zapadna Morava, between the Kolubara–Ljig–Dičina line and the Juhor, Crni vrh and Azanja hills.',
    noteSr: 'Srce Srbije, od Save i Dunava do Zapadne Morave, između linije Kolubara–Ljig–Dičina i Juhora, Crnog vrha i Azanjskih brda.' },

  // --- Stari Vlah–Raška: Tara, Đetinja & Zapadna Morava (N), Ibar (E), Rogozna & Mokra gora / Kosovo (S), Montenegro & Bosnia (W)
  { id: 'starivlah', name: 'Stari Vlah–Raška highlands', sr: 'Starovlaško-raška visija', label: ['Stari Vlah–Raška|highlands', 'Starovlaško-raška|visija'],
    // second seed: the corner of Tutin between the Ibar (before it enters Kosovo) and the Kosovo border
    seed: [[20.00, 43.27], [20.44, 42.91]],
    note: 'High plateaus and mountains (Zlatibor, Tara, Zlatar, Golija, Pešter) between the Đetinja and Zapadna Morava, the Ibar, Rogozna and Mokra gora, and the borders with Montenegro and Bosnia.',
    noteSr: 'Visoravni i planine (Zlatibor, Tara, Zlatar, Golija, Pešter) između Đetinje i Zapadne Morave, Ibra, Rogozne i Mokre gore i granica sa Crnom Gorom i Bosnom.' },

  // --- Kopaonik region: Zapadna Morava (N), Ibar (W), Sitnica & Lab (S), Rasina & Toplica (E). Reaches into Kosovo.
  { id: 'kopaonik', name: 'Kopaonik region', sr: 'Kopaonički kraj', label: ['Kopaonik|region', 'Kopaonički|kraj'],
    // second seed: the part in Kosovo (between the Ibar and the Lab)
    seed: [[20.82, 43.30], [20.93, 42.98]],
    note: 'Kopaonik, Stolovi, Goč and Željin. North: the Zapadna Morava; west: the Ibar; south: the Sitnica and Lab; east: the Rasina and Toplica.',
    noteSr: 'Kopaonik, Stolovi, Goč i Željin. Sever: Zapadna Morava; zapad: reka Ibar; jug: reke Sitnica i Lab; istok: reke Rasina i Toplica.' },

  // --- Great Morava valley and South Morava valley: one region each. Their shapes come from terrain
  // elevation along the river (see GEO_VALLEYS below), wide in the basins and narrow in the gorges.
  { id: 'juznoPomoravlje', name: 'South Morava valley', sr: 'Južno Pomoravlje', valley: true, group: 'smm',
    label: ['South Morava|valley', 'Južno|Pomoravlje'],
    note: 'Forms from the Preševska and Binačka Moravica in the Bujanovac basin; Vranje basin; Grdelica gorge; Pečenjevce narrows; Niš basin; Mezgraja narrows; Aleksinac basin; Stalać gorge.',
    noteSr: 'Nastaje od Preševske i Binačke Moravice u Bujanovačkoj kotlini; Vranjska kotlina; Grdelička klisura; Pečenjevačko suženje; Niška kotlina; Mezgrajsko suženje; Aleksinačka kotlina; Stalaćka klisura.' },
  { id: 'velikoPomoravlje', name: 'Great Morava valley', sr: 'Veliko Pomoravlje', valley: true, group: 'smm',
    label: ['Great Morava|valley', 'Veliko|Pomoravlje'],
    note: 'Stalać gorge (the Great Morava forms); upper Great Morava basin (Jagodina–Paraćin); Bagrdan gorge; lower Great Morava basin (Požarevac); flows into the Danube near Kovin.',
    noteSr: 'Stalaćka klisura (nastaje Velika Morava); Gornjovelikomoravska kotlina (Jagodinsko-paraćinska); Bagrdanska klisura; Donjovelikomoravska kotlina (Požarevačka); kod Kovina utiče (uliva se) u Dunav.' },

  // --- Serbo-Macedonian massif: Danube (N); Resava hills – Bukovik – Seličevica – Babička gora – Kruševica –
  // Vlasina river to Ruj – Bulgarian border (E); Macedonian border to Skopska Crna Gora (S);
  // Kosovo border – Goljak – Majdan – Radan – Toplica/Rasina – Kruševac basin – Juhor – Crni vrh – Azanja hills (W).
  // container: the two Morava valleys lie inside it; this region is the rest of the massif, and
  // the group 'smm' (this + both valleys) is drawn and labelled as Srpsko-makedonska masa.
  { id: 'smmMasa', name: 'Serbo-Macedonian massif', sr: 'Srpsko-makedonska masa', group: 'smm',
    // second seed: the wedge west of Radan (Kosanica, south of Kuršumlija) between Kopaonik region and the
    // Goljak–Majdan–Radan line, which no notebook boundary covers; assigned to the massif
    container: true, hideLabel: true, seed: [[21.43, 43.40], [21.35, 43.03]],
    note: 'Massive (block) mountains. North: the Danube; east: Resava hills, Bukovik, Seličevica, Babička gora, Kruševica, the Vlasina river to Ruj, the Bulgarian border to North Macedonia; south: the Macedonian border to Skopska Crna Gora; west: the administrative line towards Metohija, Goljak, Majdan and Radan, the Rasina, the Kruševac basin, Juhor, Crni vrh and the Azanja hills.',
    noteSr: 'Gromadne planine. Sever: Dunav; istok: Resavska brda, Bukovik, Seličevica, Babička gora, Kruševica, reka Vlasina do planine Ruj, granica prema Bugarskoj do Makedonije; jug: granica Makedonije do Skopske Crne Gore; zapad: administrativna granica ka Metohiji, planine Goljak, Majdan i Radan, reka Rasina, Kruševačka kotlina, Juhor, Crni vrh, Azanjsko pobrđe.' },

  // --- Eastern Serbia (Carpathian–Balkan region): Danube (N); Resava hills – Bukovik – (parallel to the South Morava) –
  // Seličevica – Babička gora – Kruševica (W, the same line as the massif's east); Vlasina river and Ruj (S);
  // Bulgarian and Romanian borders (E).
  // Not a container: the shared line with the massif is a hard border, the Morava valleys stop at it.
  { id: 'istocna', name: 'Eastern Serbia (Carpathian–Balkan region)', sr: 'Istočna Srbija i Karpatsko-balkanska oblast',
    label: ['Eastern Serbia|(Carpathian–Balkan region)', 'Istočna Srbija i|Karpatsko-balkanska oblast'],
    seed: [22.10, 44.07],
    note: 'North: the Danube; west: Resava hills, Bukovik (parallel to the South Morava), Seličevica, Babička gora, Kruševica; south: the Vlasina river and Ruj; east: the borders with Bulgaria and Romania.',
    noteSr: 'Sever: Dunav; zapad: Resavska brda, planina Bukovik (paralelno sa Južnom Moravom), planine Seličevica, Babička gora, Kruševica; jug: reka Vlasina i planina Ruj; istok: granica prema Bugarskoj i Rumuniji.' },

  // --- Kosovo and Metohija: the 7 Kosovo districts, minus the part that belongs to the Kopaonik region
  // (north of the Sitnica and Lab, east of the Ibar). Hidden together with the Kosovo toggle.
  { id: 'kim', name: 'Kosovo and Metohija', sr: 'Kosovo i Metohija', label: ['Kosovo|and Metohija', 'Kosovo|i Metohija'], kosovo: true,
    note: 'The Kosovo basin and Metohija (the basin of the White Drin), ringed by Šar, Prokletije and Kopaonik.',
    noteSr: 'Kosovska kotlina i Metohija (kotlina Belog Drima), okružene Šarom, Prokletijama i Kopaonikom.',
    kosDistricts: ['District of Prishtina', 'District of Mitrovica', 'District of Gjilan', 'District of Ferizaj',
      'District of Peja', 'District of Gjakova', 'District of Prizren'] }
  // Only the regions above. Land outside them (e.g. the strip west of Radan) has no region.
];

// Overlays: features shown on top of the regions without being regions themselves.
// Their shapes come from terrain along a river, like the valley regions (see GEO_VALLEYS).
window.GEO_OVERLAYS = [
  { id: 'nisava', name: 'Nišava valley', sr: 'Nišavska dolina', label: ['Nišava|valley', 'Nišavska|dolina'],
    note: 'Not a region: the valley of the Nišava with the Dimitrovgrad, Pirot and Bela Palanka basins, the Sićevo gorge and the Niš basin.',
    noteSr: 'Nije regija: Dimitrovgradska kotlina, Pirotska kotlina, Belopalanačka kotlina, Sićevačka klisura, Niška kotlina.' }
];

// Lines along which Serbia (including Kosovo, whose border is also a cut line) is cut to form the natural regions.
// rivers: full courses from data/boundary-rivers.js (OpenStreetMap).
// lines:  either hand-drawn [lng, lat] connectors where the border isn't a river, or
//         { river, from, to }: only the stretch of that river between two points.
//         They should touch or cross the lines they connect; small gaps (< 1.5 km) are closed automatically.
window.GEO_BOUNDARIES = {
  rivers: ['Dunav', 'Sava', 'Tisa', 'Kolubara', 'Ljig', 'Dičina', 'Zapadna Morava', 'Đetinja', 'Ibar'],
  lines: [
    // Serbo-Macedonian massif, east: from the Danube over the named mountains to the Vlasina,
    // up the Vlasina to the point nearest Ruj, then over Ruj to the Bulgarian border.
    // `prepend`/`extend` are straight segments added before/after the river stretch.
    // Mountain coordinates from Serbian Wikipedia.
    { name: 'Massif east: Danube – Resava hills – Bukovik – Seličevica – Babička gora – Kruševica – Vlasina – Ruj',
      // from the Danube east of Požarevac (the Požarevac basin belongs to the lower Great Morava basin)
      prepend: [[21.31, 44.90], [21.29, 44.58], [21.25, 44.38],
        [21.231, 44.135],   // Resavski humovi (Resavska brda)
        [21.636, 43.692],   // Bukovik
        // parallel to the South Morava, east of the Aleksinac and Niš basins (so the line doesn't cut through them)
        [21.80, 43.53], [21.95, 43.40], [22.04, 43.31],   // last one just east of Niška Banja
        [21.970, 43.236],   // Seličevica
        [22.061, 43.127],   // Babička gora
        [22.104, 43.022]],  // Kruševica
      river: 'Vlasina', from: [22.104, 43.022], to: [22.533, 42.850],
      extend: [[22.533, 42.850], [22.62, 42.86]] },   // Ruj, then into Bulgaria
    // Serbo-Macedonian massif, west (south part): from the Toplica (where Kopaonik region's border leaves it)
    // over Radan, Majdan and Goljak to the Kosovo border
    { name: 'Massif west: Toplica – Radan – Majdan – Goljak – Kosovo border',
      coords: [[21.0989, 43.2122], [21.497, 43.003], [21.457, 42.927], [21.689, 42.692], [21.66, 42.64]] },
    // Kopaonik region, east and south: Rasina – Toplica – Lab – Sitnica
    { name: 'Rasina from Kruševac up to Brus', river: 'Rasina', from: [21.358, 43.62], to: [21.094, 43.342] },
    { name: 'Brus – upper Toplica', coords: [[21.094, 43.342], [21.0298, 43.2567]] },
    { name: 'Upper Toplica', river: 'Toplica', from: [21.0298, 43.2567], to: [21.0989, 43.2122] },
    { name: 'Upper Toplica – upper Lab', coords: [[21.0989, 43.2122], [21.023, 43.120]] },
    // maxGap: the upper Lab is mapped as two pieces 4.5 km apart in OSM
    { name: 'Lab down to the Sitnica', river: 'Lab', from: [21.023, 43.120], to: [21.017, 42.755], maxGap: 5 },
    { name: 'Sitnica down to the Ibar', river: 'Sitnica', from: [21.017, 42.756], to: [20.873, 42.901] },
    { name: 'Ljig source – Dičina source, over Suvobor/Rajac', coords: [[20.189, 44.148], [20.374, 44.037]] },
    { name: 'Lower Dičina to the Zapadna Morava (missing from the OSM river data)', coords: [[20.398, 43.916], [20.3717, 43.8938], [20.368, 43.888]] },
    { name: 'Zapadna Morava through the Ovčar–Kablar gorge (Međuvršje lake)', coords: [[20.18, 43.9], [20.233, 43.909]] },
    { name: 'Đetinja source – Drina, along the northern foot of Tara', coords: [[19.668, 43.853], [19.62, 43.93], [19.575, 43.975], [19.52, 44.0]] },
    { name: 'Ibar from south of Raška to the Kosovo border (missing from the OSM river data)', coords: [[20.696, 43.222], [20.72, 43.18], [20.76, 43.14]] },
    { name: 'Šumadija east: Danube – Azanjska brda – Crni vrh – Juhor – Zapadna Morava',
      coords: [[20.88, 44.72], [20.88, 44.62], [20.87, 44.43], [20.97, 44.25], [21.05, 44.03], [21.22, 43.85], [21.30, 43.70], [21.32, 43.58]] }
  ],
  // Points that must NOT end up inside any natural region (sanity check for leaks in the cut lines)
  outside: { Priština: [21.17, 42.66] }
};

// Valley regions shaped by terrain. `id` is the region in GEO_REGIONS. The river is split into
// sections only to shape the valley (they are merged into one region): starting from the river,
// each section spreads over land at most `rise` metres above the river and at most `dmax` km away.
// Gorges/narrows get a small dmax, basins a large one. Sections follow the river from `from`;
// each ends `until` the river point nearest the given coordinate (the last one runs to the end).
// name: [English, Serbian] label shown on the map with the border landmarks (sections without a name get no label).
// Elevation: AWS Terrain Tiles (Mapzen terrarium), zoom 10 (~110 m per pixel).
window.GEO_VALLEYS = [
  { id: 'juznoPomoravlje', river: 'Južna Morava', from: [21.77, 42.446], to: [21.404, 43.70],
    // the South Morava forms from these two rivers in the Bujanovac basin
    extraSeeds: [{ river: 'Preševska Moravica', unit: 'bujanovacka', within: [21.77, 42.446, 10] },
                 { river: 'Binačka Morava', unit: 'bujanovacka', within: [21.77, 42.446, 10] }],
    units: [
      { id: 'bujanovacka', name: ['Bujanovac basin', 'Bujanovačka kotlina'], until: [21.85, 42.52], dmax: 9, rise: 120 },
      { id: 'vranjska', name: ['Vranje basin', 'Vranjska kotlina'], until: [22.064, 42.707], dmax: 10, rise: 150 },
      { id: 'grdelicka', name: ['Grdelica gorge', 'Grdelička klisura'], until: [22.068, 42.896], dmax: 2.5, rise: 300 },
      { id: 'leskovacka', until: [21.90, 43.07], dmax: 16, rise: 140 },
      { id: 'pecenjevacko', name: ['Pečenjevce narrows', 'Pečenjevačko suženje'], until: [21.87, 43.12], dmax: 4, rise: 100 },
      { id: 'niska', name: ['Niš basin', 'Niška kotlina'], until: [21.80, 43.43], dmax: 14, rise: 140 },
      { id: 'mezgrajsko', name: ['Mezgraja narrows', 'Mezgrajsko suženje'], until: [21.75, 43.48], dmax: 4, rise: 100 },
      { id: 'aleksinacka', name: ['Aleksinac basin', 'Aleksinačka kotlina'], until: [21.53, 43.627], dmax: 10, rise: 130 },
      // the notebook lists the Stalać gorge in both valleys: it also becomes part of the Great Morava valley
      { id: 'stalacka', name: ['Stalać gorge', 'Stalaćka klisura'], dmax: 2.5, rise: 200, alsoIn: 'velikoPomoravlje' }
    ] },
  { id: 'velikoPomoravlje', river: 'Velika Morava', from: [21.404, 43.70], to: [21.039, 44.718],
    units: [
      { id: 'gornjovm', name: ['Upper Great Morava basin', 'Gornjovelikomoravska kotlina'], until: [21.19, 44.06], dmax: 14, rise: 110 },
      { id: 'bagrdanska', name: ['Bagrdan gorge', 'Bagrdanska klisura'], until: [21.11, 44.16], dmax: 3, rise: 200 },
      { id: 'donjovm', name: ['Lower Great Morava basin', 'Donjovelikomoravska kotlina'], dmax: 13, rise: 75 }
    ] }
];

// Overlay valleys (same method, but not regions: drawn on top, not cut out of other regions)
window.GEO_OVERLAY_VALLEYS = [
  { id: 'nisava', river: 'Nišava', from: [22.99, 42.99], to: [21.769, 43.37],
    units: [
      { id: 'dimitrovgradska', name: ['Dimitrovgrad basin', 'Dimitrovgradska kotlina'], until: [22.68, 43.06], dmax: 5, rise: 100 },
      { id: 'pirotska', name: ['Pirot basin', 'Pirotska kotlina'], until: [22.42, 43.21], dmax: 8, rise: 120 },
      { id: 'belopalanacka', name: ['Bela Palanka basin', 'Belopalanačka kotlina'], until: [22.20, 43.30], dmax: 7, rise: 120 },
      { id: 'sicevacka', name: ['Sićevo gorge', 'Sićevačka klisura'], until: [22.07, 43.33], dmax: 2, rise: 250 },
      { id: 'niskaNisava', dmax: 10, rise: 120 }
    ] }
];

// Mountain systems used to classify peaks
window.MOUNTAIN_SYSTEMS = {
  panon:   { name: 'Pannonian island mountains', sr: 'Panonske (ostrvske) planine', color: '#c9a227' },
  dinar_k: { name: 'Dinaric – limestone',        sr: 'Dinarske – krečnjačke',       color: '#3a86ff' },
  dinar_f: { name: 'Dinaric – flysch',           sr: 'Dinarske – flišne',           color: '#48cae4' },
  dinar_r: { name: 'Dinaric – ore-bearing',      sr: 'Dinarske – rudne',            color: '#e76f51' },
  dinar:   { name: 'Dinaric – other',            sr: 'Dinarske – ostale',           color: '#7b5ea7' },
  karpat:  { name: 'Carpathian',                 sr: 'Karpatske',                   color: '#2a9d8f' },
  balkan:  { name: 'Balkan',                     sr: 'Balkanske',                   color: '#d62828' },
  rodop:   { name: 'Rhodope',                    sr: 'Rodopske',                    color: '#7a5230' }
};
