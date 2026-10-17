// Text view ("Regije"): the regions and their borders as written in the notebook.
// Every text is [English, Serbian Latin]; Cyrillic is produced automatically.
// map: what "Show on map" zooms to — { region }, { group } or { overlay } (ids from geo-regions.js).
// borders: n / e / s / w. list: an ordered list instead of borders (valleys). parts: sub-regions.

window.REGION_TEXTS = [
  {
    map: { group: 'panonska' },
    name: ['Pannonian region – Vojvodina', 'Panonska regija – Vojvodina'],
    borders: {
      n: ['the Hungarian border', 'mađarska granica'],
      e: ['the Romanian border', 'rumunska granica'],
      s: ['the Sava and Danube rivers', 'reke Sava i Dunav'],
      w: ['the Croatian border, partly the Danube', 'hrvatska granica, delom Dunav']
    },
    parts: [
      ['Srem – between the Danube and the Sava', 'Srem – između Dunava i Save'],
      ['Banat – east of the Tisa', 'Banat – istočno od Tise'],
      ['Bačka – between the Danube and the Tisa', 'Bačka – između Dunava i Tise']
    ]
  },
  {
    map: { region: 'rudne' },
    name: ['Northwestern Serbia – Ore and flysch mountains (Vardar zone)', 'Severozapadna Srbija – Rudne i flišne planine (Vardarska zona)'],
    borders: {
      n: ['the Sava river', 'reka Sava'],
      e: ['the Kolubara, Ljig and Dičina rivers', 'reke Kolubara, Ljig i Dičina'],
      s: ['the Đetinja and Zapadna Morava rivers', 'reke Đetinja i Zapadna Morava'],
      w: ['the Drina river', 'reka Drina']
    }
  },
  {
    map: { region: 'sumadija' },
    name: ['Šumadija', 'Šumadija'],
    borders: {
      n: ['the Sava and Danube rivers', 'reke Sava i Dunav'],
      e: ['the Juhor, Crni vrh and Azanja hills', 'planine Juhor, Crni vrh i Azanjska brda'],
      s: ['the Zapadna Morava river', 'reka Zapadna Morava'],
      w: ['the Kolubara, Ljig and Dičina rivers', 'reke Kolubara, Ljig i Dičina']
    }
  },
  {
    map: { region: 'starivlah' },
    name: ['Stari Vlah–Raška region', 'Starovlaško-raška oblast'],
    borders: {
      n: ['Tara, the Đetinja, the Zapadna Morava', 'Tara, Đetinja, Zapadna Morava'],
      e: ['the Ibar', 'Ibar'],
      s: ['Rogozna and Mokra gora (the Kosovo border)', 'Rogozna i Mokra gora (kosovska granica)'],
      w: ['the borders with Montenegro and Bosnia', 'crnogorska i bosanska granica']
    }
  },
  {
    map: { region: 'velikoPomoravlje' },
    name: ['Great Morava valley', 'Veliko Pomoravlje'],
    list: [
      ['Stalać gorge – the Great Morava forms', 'Stalaćka klisura – nastaje Velika Morava'],
      ['Upper Great Morava basin (Jagodina–Paraćin)', 'Gornjovelikomoravska kotlina (Jagodinsko-paraćinska)'],
      ['Bagrdan gorge', 'Bagrdanska klisura'],
      ['Lower Great Morava basin (Požarevac)', 'Donjovelikomoravska kotlina (Požarevačka)'],
      ['Near Kovin it flows into the Danube', 'Kod Kovina utiče (uliva se) u Dunav']
    ]
  },
  {
    map: { region: 'juznoPomoravlje' },
    name: ['South Morava valley', 'Južno Pomoravlje'],
    list: [
      ['Forms from the Preševska and Binačka Moravica in the Bujanovac basin', 'Nastaje od Preševske i Binačke Moravice u Bujanovačkoj kotlini'],
      ['Vranje basin', 'Vranjska kotlina'],
      ['Grdelica gorge', 'Grdelička klisura'],
      ['Pečenjevce narrows', 'Pečenjevačko suženje'],
      ['Niš basin', 'Niška kotlina'],
      ['Mezgraja narrows', 'Mezgrajsko suženje'],
      ['Aleksinac basin', 'Aleksinačka kotlina'],
      ['Stalać gorge', 'Stalaćka klisura']
    ]
  },
  {
    map: { region: 'kopaonik' },
    name: ['Kopaonik region (Kopaonik, Stolovi, Goč, Željin)', 'Kopaonički kraj (Kopaonik, Stolovi, Goč, Željin)'],
    borders: {
      n: ['the Zapadna Morava', 'Zapadna Morava'],
      w: ['the Ibar river', 'reka Ibar'],
      s: ['the Sitnica and Lab rivers', 'reke Sitnica i Lab'],
      e: ['the Rasina and Toplica rivers', 'reke Rasina i Toplica']
    }
  },
  {
    map: { group: 'smm' },
    name: ['Serbo-Macedonian massif (block mountains)', 'Srpsko-makedonska masa (Gromadne planine)'],
    borders: {
      n: ['the Danube', 'Dunav'],
      e: ['Resava hills, Bukovik, Seličevica, Babička gora, Kruševica, the Vlasina river to Ruj, the Bulgarian border to North Macedonia',
          'Resavska brda, Bukovik, Seličevica, Babička gora, Kruševica, reka Vlasina do planine Ruj, granica prema Bugarskoj do Makedonije'],
      s: ['the Macedonian border to Skopska Crna Gora', 'granica Makedonije do Skopske Crne Gore'],
      w: ['the administrative line towards Metohija; the Goljak, Majdan and Radan mountains; the Rasina river; the Kruševac basin; Juhor, Crni vrh, the Azanja hills',
          'administrativna granica ka Metohiji; planine Goljak, Majdan i Radan; reka Rasina; Kruševačka kotlina; Juhor, Crni vrh, Azanjsko pobrđe']
    },
    parts: [['Great Morava valley', 'Veliko Pomoravlje'], ['South Morava valley', 'Južno Pomoravlje']]
  },
  {
    map: { region: 'istocna' },
    name: ['Eastern Serbia (Carpathian–Balkan region)', 'Istočna Srbija (Karpatsko-balkanska oblast)'],
    borders: {
      n: ['the Danube', 'Dunav'],
      w: ['Resava hills, Bukovik (parallel to the South Morava), Seličevica, Babička gora, Kruševica',
          'Resavska brda, planina Bukovik (paralelno sa Južnom Moravom), planine Seličevica, Babička gora, Kruševica'],
      s: ['the Vlasina river and Ruj', 'reka Vlasina i planina Ruj'],
      e: ['the borders with Bulgaria and Romania', 'granica prema Bugarskoj i Rumuniji']
    }
  },
  {
    map: { overlay: 'nisava' },
    name: ['Nišava valley', 'Nišavska dolina'],
    notRegion: true,
    list: [
      ['Dimitrovgrad basin', 'Dimitrovgradska kotlina'],
      ['Pirot basin', 'Pirotska kotlina'],
      ['Bela Palanka basin', 'Belopalanačka kotlina'],
      ['Sićevo gorge', 'Sićevačka klisura'],
      ['Niš basin', 'Niška kotlina']
    ]
  },
  {
    map: { region: 'kim' },
    name: ['Kosovo and Metohija', 'Kosovo i Metohija'],
    list: [
      ['The Kosovo basin and Metohija (the basin of the White Drin)', 'Kosovska kotlina i Metohija (kotlina Belog Drima)'],
      ['Ringed by Šar, Prokletije and Kopaonik', 'Okružene Šarom, Prokletijama i Kopaonikom'],
      ['The part north of the Sitnica and Lab, east of the Ibar, belongs to the Kopaonik region', 'Deo severno od Sitnice i Laba, istočno od Ibra, pripada Kopaoničkom kraju']
    ]
  }
];
