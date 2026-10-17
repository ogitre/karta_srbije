# Karta Srbije

Interaktivna geografska karta Srbije: geografske regije (po beleškama iz sveske), statistički regioni i okruzi,
planine, reke, jezera, gradovi, banje, nacionalni parkovi i kulturna baština. Na srpskom (latinica i ćirilica) i engleskom.

Dugmad **Mapa / Regije** na vrhu prebacuju između karte i tekstualnog pregleda granica svih regija.

## Pokretanje na računaru

Dvoklik na `start.bat` — otvara se `http://localhost:8080/`.
(Može i samo otvaranje `index.html` u pregledaču, ali neke podloge karte traže lokalni server.)

## Gde je šta

| Fajl | Šta sadrži |
|---|---|
| `index.html`, `style.css`, `app.js` | sama stranica |
| `i18n.js` | prevodi (engleski → srpski; ćirilica se pravi automatski) |
| `data/region-texts.js` | tekst u prikazu „Regije“ (granice iz sveske) |
| `data/geo-regions.js` | definicije geografskih regija i njihovih granica |
| `data/places.js` | planine, gradovi, banje, parkovi, baština |
| `data/geometry.js` | **generisano** — gotovi oblici regija (ne menjati ručno) |

## Menjanje granica regija

1. Izmeni `data/geo-regions.js`.
2. Pokreni `start.bat` i otvori `http://localhost:8080/tools/build-geometry.html` (traje 2–3 minuta, treba internet za podatke o visini terena).
3. Kad se pojavi „done“, klikni **Download geometry.js** i sačuvaj ga preko `data/geometry.js`.

Samo za izradu oblika (stranica ih ne učitava): `tools/`, `data/districts.js`, `data/kosovo.js`,
`data/municipalities.js`, `data/boundary-rivers.js`.

## Objavljivanje (GitHub Pages)

1. U GitHub Desktop: *File → Add local repository* → ovaj folder → *Publish repository* (isključi „Keep this code private“).
2. Na github.com: repozitorijum → *Settings → Pages* → Branch `main`, folder `/ (root)` → *Save*.
3. Za izmene: u GitHub Desktop *Commit* pa *Push* — sajt se osveži za oko minut.

## Izvori podataka

Granice: geoBoundaries (CC BY 4.0) · Reke: Natural Earth i © OpenStreetMap saradnici (ODbL) ·
Visina terena: AWS Terrain Tiles · Podloge karte: OpenTopoMap, OpenStreetMap, Esri.
