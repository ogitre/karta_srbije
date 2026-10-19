// Hand-curated point data. Coordinates are approximate (±1 km).

window.REGIONS = {
  vojvodina:  { name: 'Vojvodina', sr: 'Vojvodina', seat: 'Novi Sad' },
  belgrade:   { name: 'Belgrade', sr: 'Beograd', seat: 'Belgrade' },
  sumadija:   { name: 'Šumadija and Western Serbia', sr: 'Šumadija i Zapadna Srbija', seat: 'Kragujevac' },
  south:      { name: 'Southern and Eastern Serbia', sr: 'Južna i Istočna Srbija', seat: 'Niš' },
  kosovo:     { name: 'Kosovo and Metohija', sr: 'Kosovo i Metohija', seat: 'Priština', note: 'Status disputed; administered by Kosovo institutions since 2008.' }
};

// geoBoundaries shapeName -> details
window.DISTRICT_INFO = {
  'Syrmia District':         { sr: 'Sremski okrug',          seat: 'Sremska Mitrovica', region: 'vojvodina' },
  'South Banat District':    { sr: 'Južnobanatski okrug',    seat: 'Pančevo',           region: 'vojvodina' },
  'North Banat District':    { sr: 'Severnobanatski okrug',  seat: 'Kikinda',           region: 'vojvodina' },
  'Central Banat District':  { sr: 'Srednjobanatski okrug',  seat: 'Zrenjanin',         region: 'vojvodina' },
  'North Backa District':    { sr: 'Severnobački okrug',     seat: 'Subotica',          region: 'vojvodina' },
  'West Backa District':     { sr: 'Zapadnobački okrug',     seat: 'Sombor',            region: 'vojvodina' },
  'South Backa District':    { sr: 'Južnobački okrug',       seat: 'Novi Sad',          region: 'vojvodina' },
  'Belgrade':                { sr: 'Grad Beograd',           seat: 'Belgrade',          region: 'belgrade' },
  'Macva District':          { sr: 'Mačvanski okrug',        seat: 'Šabac',             region: 'sumadija' },
  'Kolubara District':       { sr: 'Kolubarski okrug',       seat: 'Valjevo',           region: 'sumadija' },
  'Sumadija District':       { sr: 'Šumadijski okrug',       seat: 'Kragujevac',        region: 'sumadija' },
  'Pomoravlje District':     { sr: 'Pomoravski okrug',       seat: 'Jagodina',          region: 'sumadija' },
  'Moravica District':       { sr: 'Moravički okrug',        seat: 'Čačak',             region: 'sumadija' },
  'Zlatibor District':       { sr: 'Zlatiborski okrug',      seat: 'Užice',             region: 'sumadija' },
  'Raska District':          { sr: 'Raški okrug',            seat: 'Kraljevo',          region: 'sumadija' },
  'Rasina District':         { sr: 'Rasinski okrug',         seat: 'Kruševac',          region: 'sumadija' },
  'Podunavlje District':     { sr: 'Podunavski okrug',       seat: 'Smederevo',         region: 'south' },
  'Branicevo District':      { sr: 'Braničevski okrug',      seat: 'Požarevac',         region: 'south' },
  'Bor District':            { sr: 'Borski okrug',           seat: 'Bor',               region: 'south' },
  'Zajecar District':        { sr: 'Zaječarski okrug',       seat: 'Zaječar',           region: 'south' },
  'Nisava District':         { sr: 'Nišavski okrug',         seat: 'Niš',               region: 'south' },
  'Toplica District':        { sr: 'Toplički okrug',         seat: 'Prokuplje',         region: 'south' },
  'Pirot District':          { sr: 'Pirotski okrug',         seat: 'Pirot',             region: 'south' },
  'Jablanica District':      { sr: 'Jablanički okrug',       seat: 'Leskovac',          region: 'south' },
  'Pcinja District':         { sr: 'Pčinjski okrug',         seat: 'Vranje',            region: 'south' }
};

// [name, lat, lng, elevation m, range, mountain system (see MOUNTAIN_SYSTEMS in geo-regions.js)]
window.MOUNTAINS = [
  ['Đeravica', 42.533, 20.137, 2656, 'Prokletije', 'dinar_k'],
  ['Ljuboten', 42.197, 21.120, 2498, 'Šar planina', 'dinar'],
  ['Midžor', 43.395, 22.678, 2169, 'Stara planina', 'balkan'],
  ['Pančićev vrh', 43.273, 20.825, 2017, 'Kopaonik', 'dinar_r'],
  ['Besna Kobila', 42.532, 22.212, 1922, 'Besna Kobila', 'rodop'],
  ['Jankov kamen', 43.331, 20.293, 1833, 'Golija', 'dinar'],
  ['Trem', 43.180, 22.180, 1810, 'Suva planina', 'balkan'],
  ['Željin', 43.480, 20.810, 1785, 'Željin', 'dinar_r'],
  ['Golo brdo', 43.404, 19.803, 1627, 'Zlatar', 'dinar_k'],
  ['Šiljak', 43.776, 21.894, 1565, 'Rtanj', 'karpat'],
  ['Zborište', 43.880, 19.410, 1544, 'Tara', 'dinar_k'],
  ['Vasilijin vrh', 43.460, 20.000, 1520, 'Javor', 'dinar'],
  ['Tornik', 43.667, 19.658, 1496, 'Zlatibor', 'dinar'],
  ['Velika Đulica', 43.400, 21.430, 1491, 'Jastrebac', 'rodop'],
  ['Radan', 42.975, 21.515, 1409, 'Radan', 'rodop'],
  ['Povlen', 44.135, 19.730, 1347, 'Povlen', 'dinar_f'],
  ['Beljanica', 44.120, 21.700, 1339, 'Beljanica', 'karpat'],
  ['Leskovik', 43.580, 21.920, 1174, 'Ozren', 'karpat'],
  ['Veliki Krš', 44.190, 22.130, 1148, 'Veliki Krš', 'karpat'],
  ['Cvijićev vrh', 44.128, 20.522, 1132, 'Rudnik', 'dinar_r'],
  ['Kraljev sto', 44.103, 19.987, 1104, 'Maljen', 'dinar_f'],
  ['Crni vrh', 44.080, 21.980, 1043, 'Crni vrh (Bor)', 'karpat'],
  ['Suvobor', 44.130, 20.220, 864, 'Suvobor', 'dinar_f'],
  ['Bukulja', 44.290, 20.540, 696, 'Bukulja', 'dinar_r'],
  ['Cer', 44.600, 19.450, 687, 'Cer', 'dinar_r'],
  ['Gudurički vrh', 45.120, 21.395, 641, 'Vršac Hills', 'panon'],
  ['Kosmaj', 44.470, 20.570, 628, 'Kosmaj', 'dinar_r'],
  ['Crveni čot', 45.155, 19.713, 539, 'Fruška Gora', 'panon'],
  ['Avala', 44.689, 20.515, 511, 'Avala', 'dinar_r']
];

// [name, lat, lng, population (2022 census, city/municipality, approx), isCapital]
window.CITIES = [
  ['Belgrade', 44.8176, 20.4633, 1681405, true],
  ['Novi Sad', 45.2671, 19.8335, 368967],
  ['Niš', 43.3209, 21.8958, 249501],
  ['Kragujevac', 44.0128, 20.9114, 171197],
  ['Leskovac', 42.9981, 21.9461, 124889],
  ['Subotica', 46.1003, 19.6658, 123207],
  ['Pančevo', 44.8708, 20.6403, 115414],
  ['Kruševac', 43.5800, 21.3339, 113582],
  ['Kraljevo', 43.7258, 20.6894, 110196],
  ['Novi Pazar', 43.1367, 20.5122, 106720],
  ['Čačak', 43.8914, 20.3497, 106453],
  ['Zrenjanin', 45.3816, 20.3903, 105722],
  ['Šabac', 44.7489, 19.6908, 105380],
  ['Smederevo', 44.6628, 20.9300, 97930],
  ['Valjevo', 44.2751, 19.8982, 82541],
  ['Sombor', 45.7742, 19.1122, 76941],
  ['Vranje', 42.5514, 21.9003, 74381],
  ['Sremska Mitrovica', 44.9764, 19.6122, 71897],
  ['Požarevac', 44.6200, 21.1897, 71212],
  ['Loznica', 44.5333, 19.2258, 70420],
  ['Užice', 43.8586, 19.8488, 69805],
  ['Jagodina', 43.9772, 21.2612, 64882],
  ['Kikinda', 45.8297, 20.4653, 52066],
  ['Pirot', 43.1531, 22.5861, 49601],
  ['Zaječar', 43.9042, 22.2850, 49550],
  ['Vršac', 45.1167, 21.3036, 45462],
  ['Bor', 44.0750, 22.0958, 42983],
  ['Prokuplje', 43.2342, 21.5881, 38954],
  ['Priština', 42.6629, 21.1655, 0]
];

// [name, lat, lng, type, note]
window.PARKS = [
  ['Fruška Gora', 45.150, 19.750, 'National park', 'Oldest national park in Serbia (1960); 16 monasteries.'],
  ['Tara', 43.900, 19.420, 'National park', 'Drina canyon, Serbian spruce habitat.'],
  ['Kopaonik', 43.280, 20.800, 'National park', 'Largest mountain massif in Serbia.'],
  ['Đerdap', 44.550, 22.050, 'National park', 'Iron Gates gorge of the Danube.'],
  ['Šar planina', 42.150, 20.950, 'National park', 'Glacial lakes and high peaks.'],
  ['Stara planina', 43.380, 22.620, 'Nature park', 'Highest peak of central Serbia (Midžor).'],
  ['Golija', 43.330, 20.280, 'Nature park', 'UNESCO biosphere reserve Golija-Studenica.'],
  ['Uvac', 43.400, 19.950, 'Special nature reserve', 'Meanders and griffon vultures.'],
  ['Deliblato Sands', 44.950, 21.050, 'Special nature reserve', 'Largest sandy terrain in Europe.'],
  ['Zasavica', 44.950, 19.500, 'Special nature reserve', 'Wetland, beavers and Mangalica pigs.'],
  ['Obedska bara', 44.730, 20.020, 'Special nature reserve', 'One of the oldest protected wetlands in the world.'],
  ['Gornje Podunavlje', 45.750, 18.950, 'Special nature reserve', 'Danube floodplain forests.']
];

// Spas (banje) of Serbia, incl. Kosovo and Metohija [name, lat, lng] (positions of the spa settlements, mostly from OpenStreetMap)
window.SPAS = [
  ['Vrnjačka Banja', 43.6222, 20.8929], ['Sokobanja', 43.6444, 21.8730], ['Niška Banja', 43.2933, 22.0072],
  ['Banja Koviljača', 44.5138, 19.1586], ['Mataruška Banja', 43.6893, 20.6094], ['Bukovička Banja', 44.3072, 20.5577],
  ['Prolom Banja', 43.0440, 21.4010], ['Lukovska Banja', 43.1670, 21.0360], ['Kuršumlijska Banja', 43.0579, 21.2550],
  ['Vranjska Banja', 42.5470, 22.0020], ['Banja Kanjiža', 46.0657, 20.0579], ['Ribarska Banja', 43.4260, 21.5150],
  ['Sijarinska Banja', 42.7760, 21.6050], ['Atomska Banja Gornja Trepča', 43.9500, 20.2500], ['Jošanička Banja', 43.3893, 20.7497],
  ['Novopazarska Banja', 43.1580, 20.5460], ['Banja Vrujci', 44.2230, 20.1550], ['Ovčar Banja', 43.8960, 20.1980],
  ['Bogutovačka Banja', 43.6330, 20.5000], ['Banja Rusanda', 45.5080, 20.3030], ['Banja Junaković', 45.6760, 19.0500],
  ['Palić', 46.1023, 19.7635], ['Banja Badanja', 44.4700, 19.3800], ['Pribojska Banja', 43.5490, 19.5600],
  ['Ivanjička Banja', 43.5820, 20.2300], ['Zvonačka Banja', 42.9320, 22.5740], ['Brestovačka Banja', 44.0380, 22.0930],
  ['Gamzigradska Banja', 43.9230, 22.1740], ['Bujanovačka Banja', 42.3900, 21.8890], ['Banja Ždrelo', 44.2930, 21.4970],
  ['Rgoška Banja', 43.5550, 22.2050], ['Banja Vrdnik', 45.1220, 19.7920], ['Banja Slankamen', 45.1410, 20.2590],
  ['Bečejska Banja', 45.6154, 20.0490], ['Selters Banja', 44.4230, 20.6850], ['Banja Bogatić', 44.8370, 19.4820],
  ['Pećka Banja', 42.7250, 20.3870], ['Banjska', 42.9740, 20.7810], ['Klokot Banja', 42.3690, 21.3750]
];

// [name, lat, lng, kind, note]
window.HERITAGE = [
  ['Studenica Monastery', 43.4861, 20.5317, 'Monastery', 'UNESCO World Heritage (12th c.).'],
  ['Stari Ras & Sopoćani', 43.1106, 20.4247, 'Monastery', 'UNESCO World Heritage.'],
  ['Žiča Monastery', 43.6958, 20.6456, 'Monastery', 'Coronation church of Serbian kings.'],
  ['Manasija', 44.0936, 21.4531, 'Monastery', 'Fortified 15th-century monastery.'],
  ['Ravanica', 43.9567, 21.5683, 'Monastery', 'Endowment of Prince Lazar.'],
  ['Visoki Dečani', 42.5467, 20.2656, 'Monastery', 'UNESCO World Heritage (Medieval Monuments in Kosovo).'],
  ['Gračanica', 42.5992, 21.1936, 'Monastery', 'UNESCO World Heritage (Medieval Monuments in Kosovo).'],
  ['Patriarchate of Peć', 42.6647, 20.2656, 'Monastery', 'UNESCO World Heritage (Medieval Monuments in Kosovo).'],
  ['Gamzigrad – Felix Romuliana', 43.9000, 22.1872, 'Archaeological', 'UNESCO World Heritage, Roman palace.'],
  ['Viminacium', 44.7361, 21.2156, 'Archaeological', 'Roman provincial capital.'],
  ['Lepenski Vir', 44.5572, 22.0258, 'Archaeological', 'Mesolithic settlement.'],
  ['Belgrade Fortress', 44.8231, 20.4508, 'Fortress', 'Kalemegdan, at the Sava–Danube confluence.'],
  ['Petrovaradin Fortress', 45.2522, 19.8625, 'Fortress', 'Home of the EXIT festival.'],
  ['Golubac Fortress', 44.6533, 21.6322, 'Fortress', 'Guards the entrance to the Iron Gates.'],
  ['Smederevo Fortress', 44.6703, 20.9294, 'Fortress', 'One of the largest lowland fortresses in Europe.'],
  ['Đavolja varoš', 42.9936, 21.4064, 'Natural monument', '"Devil\'s Town" earth pyramids.'],
  ['Šargan Eight', 43.7900, 19.5100, 'Railway', 'Narrow-gauge heritage railway, Mokra Gora.']
];

window.SKI = [
  ['Kopaonik', 43.2850, 20.8100], ['Stara planina (Babin Zub)', 43.3700, 22.6200], ['Zlatibor (Tornik)', 43.6600, 19.6600],
  ['Divčibare', 44.1000, 19.9900], ['Brezovica', 42.2100, 21.0200], ['Besna Kobila', 42.5400, 22.2100]
];

// Lakes & reservoirs [name, lat, lng, note]
window.LAKE_POINTS = [
  ['Đerdap Lake', 44.620, 21.950, 'Reservoir on the Danube, largest in Serbia.'],
  ['Vlasina Lake', 42.700, 22.330, 'Highest large lake, with floating islands.'],
  ['Perućac', 43.950, 19.430, 'Reservoir on the Drina.'],
  ['Zlatar Lake', 43.460, 19.840, 'Reservoir near Nova Varoš.'],
  ['Uvac Lake', 43.380, 19.950, 'Famous for its meanders.'],
  ['Palić', 46.075, 19.765, 'Lake resort near Subotica.'],
  ['Srebrno jezero', 44.770, 21.370, '"Silver Lake", a Danube arm.'],
  ['Gazivode', 42.950, 20.600, 'Reservoir on the Ibar.'],
  ['Bovan Lake', 43.630, 21.720, 'Reservoir near Sokobanja.'],
  ['Ćelije Lake', 43.510, 21.230, 'Reservoir near Kruševac.'],
  ['Zavoj Lake', 43.230, 22.630, 'Formed by a 1963 landslide.'],
  ['Ada Ciganlija', 44.785, 20.410, 'Belgrade\'s "sea".']
];

// Neighbouring countries' name labels [lng, lat] (English names; translated in i18n.js)
window.COUNTRY_LABELS = {
  'Hungary': [19.5, 46.95], 'Romania': [23.6, 45.55], 'Bulgaria': [24.3, 42.85], 'North Macedonia': [21.7, 41.6],
  'Albania': [20.05, 41.2], 'Montenegro': [19.25, 42.8], 'Bosnia and Herzegovina': [17.8, 44.1], 'Croatia': [16.4, 45.6],
  'Slovenia': [14.8, 46.1], 'Austria': [14.6, 47.55], 'Slovakia': [19.5, 48.65], 'Ukraine': [23.9, 48.3],
  'Greece': [22.2, 39.8], 'Moldova': [28.4, 47.1], 'Italy': [14.2, 42.3], 'Turkey': [27.2, 41.4]
};

// Mountains, hills and places named in the region borders (shown with "Border landmarks").
// [English, Serbian], kind ('mountain' | 'area' | 'place'), [lng, lat] (mostly from Serbian Wikipedia).
window.LANDMARKS = [
  [['Juhor', 'Juhor'], 'mountain', [21.264, 43.812]],
  [['Crni vrh', 'Crni vrh'], 'mountain', [21.064, 44.003]],
  [['Azanja hills', 'Azanjska brda'], 'mountain', [20.88, 44.433]],
  [['Tara', 'Tara'], 'mountain', [19.466, 43.848]],
  [['Rogozna', 'Rogozna'], 'mountain', [20.58, 43.014]],
  [['Mokra gora', 'Mokra gora'], 'mountain', [20.364, 42.832]],
  [['Resava hills', 'Resavska brda'], 'mountain', [21.231, 44.135]],
  [['Bukovik', 'Bukovik'], 'mountain', [21.636, 43.692]],
  [['Seličevica', 'Seličevica'], 'mountain', [21.970, 43.236]],
  [['Babička gora', 'Babička gora'], 'mountain', [22.061, 43.127]],
  [['Kruševica', 'Kruševica'], 'mountain', [22.104, 43.022]],
  [['Ruj', 'Ruj'], 'mountain', [22.533, 42.850]],
  [['Goljak', 'Goljak'], 'mountain', [21.689, 42.692]],
  [['Majdan', 'Majdan'], 'mountain', [21.457, 42.927]],
  [['Radan', 'Radan'], 'mountain', [21.497, 43.003]],
  [['Skopska Crna Gora', 'Skopska Crna Gora'], 'mountain', [21.446, 42.192]],
  [['Kopaonik', 'Kopaonik'], 'mountain', [20.823, 43.269]],
  [['Stolovi', 'Stolovi'], 'mountain', [20.611, 43.609]],
  [['Goč', 'Goč'], 'mountain', [20.846, 43.536]],
  [['Željin', 'Željin'], 'mountain', [20.81, 43.48]],
  [['Kruševac basin', 'Kruševačka kotlina'], 'area', [21.30, 43.60]],
  [['Kovin', 'Kovin'], 'place', [20.977, 44.742]]
];
