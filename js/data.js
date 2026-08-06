/* =========================================================================
   data.js — The World After Dark
   All figures traceable to published, public sources. See README + citations.
   Primary sources:
     - Falchi et al. (2016) "The New World Atlas of Artificial Night Sky
       Brightness," Science Advances 2(6):e1600377.  (population-under-light,
       Milky-Way-not-visible shares, per-country artificial brightness)
     - Kyba et al. (2023) "Citizen scientists report global rapid reductions
       in the visibility of stars," Science 379:265-268.  (~9.6%/yr growth)
     - Bortle, J. (2001) Sky & Telescope — Bortle Dark-Sky Scale.
     - NASA VIIRS Day/Night Band ("Black Marble") — the lit-Earth basemap.
   NOTE: country/city values are the published atlas-derived estimates,
   rounded for display. build_data.py documents the derivation and lets you
   regenerate spec_data from the raw rasters if you want exact figures.
   ========================================================================= */

window.SPEC = (function () {

  /* ---- Bortle scale: 9 classes, each drives the live sky simulator ---- */
  const BORTLE = [
    { c: 1, name: "Excellent dark-sky site", stars: "~7,500", mw: "Casts shadows",
      who: "Remote wilderness, high desert",
      desc: "The Milky Way is dazzling and structured. Zodiacal light and airglow are visible. Truly pristine — almost nobody lives here.",
      glow: 0.00, starMul: 1.00 },
    { c: 2, name: "Typical truly dark site", stars: "~7,000", mw: "Highly structured",
      who: "National parks, deep countryside",
      desc: "The Milky Way is richly detailed. Clouds appear as dark holes against the stars.",
      glow: 0.05, starMul: 0.92 },
    { c: 3, name: "Rural sky", stars: "~5,000", mw: "Prominent",
      who: "Rural villages, farmland",
      desc: "Some light pollution glows on the horizon. The Milky Way still shows real structure overhead.",
      glow: 0.14, starMul: 0.72 },
    { c: 4, name: "Rural / suburban transition", stars: "~2,500", mw: "Faint",
      who: "Outer suburbs, small towns",
      desc: "Light-pollution domes glow over distant towns. The Milky Way is visible but washed out overhead.",
      glow: 0.28, starMul: 0.45 },
    { c: 5, name: "Suburban sky", stars: "~800", mw: "Barely visible",
      who: "Typical suburbs",
      desc: "The Milky Way is very weak or invisible near the horizon. The sky glows grey within 30° of the horizon.",
      glow: 0.44, starMul: 0.24 },
    { c: 6, name: "Bright suburban sky", stars: "~500", mw: "Only near zenith, if at all",
      who: "Dense suburbs, city edges",
      desc: "The Milky Way is invisible. The sky within 35° of the horizon glows greyish-white.",
      glow: 0.60, starMul: 0.13 },
    { c: 7, name: "Suburban / urban transition", stars: "~250", mw: "Invisible",
      who: "Urban neighbourhoods",
      desc: "The entire sky has a vague greyish-white hue. Strong light sources are obvious in all directions.",
      glow: 0.74, starMul: 0.07 },
    { c: 8, name: "City sky", stars: "~100", mw: "Invisible",
      who: "Cities",
      desc: "The sky glows white or orange — you can read newspaper headlines. Only the brightest stars and planets remain.",
      glow: 0.86, starMul: 0.03 },
    { c: 9, name: "Inner-city sky", stars: "<30", mw: "Invisible",
      who: "City centres",
      desc: "The entire sky is brightly lit. Only a handful of the very brightest stars and the planets break through.",
      glow: 0.97, starMul: 0.012 }
  ];

  /* ---- Headline figures (Falchi 2016 / Kyba 2023) ---- */
  const HEADLINE = {
    world_mw_hidden_pct: 33,       // >1/3 of humanity cannot see the Milky Way
    europe_mw_hidden_pct: 60,
    north_america_mw_hidden_pct: 80,
    world_under_lp_pct: 83,        // 83% live under light-polluted skies
    annual_growth_pct: 9.6,        // Kyba 2023 sky-brightness growth per year
    dark_sky_places: 200
  };

  /* ---- Country choropleth: % of population that CANNOT see the Milky Way.
     Derived from Falchi et al. 2016 population-weighted atlas figures,
     rounded. ISO numeric ids match world-atlas TopoJSON. ---- */
  const COUNTRY_MW_HIDDEN = {
    // id : { name, pct }
    "702": { name: "Singapore", pct: 100 },
    "414": { name: "Kuwait", pct: 98 },
    "634": { name: "Qatar", pct: 97 },
    "784": { name: "United Arab Emirates", pct: 93 },
    "376": { name: "Israel", pct: 90 },
    "528": { name: "Netherlands", pct: 90 },
    "380": { name: "Italy", pct: 86 },
    "410": { name: "South Korea", pct: 85 },
    "826": { name: "United Kingdom", pct: 84 },
    "276": { name: "Germany", pct: 82 },
    "840": { name: "United States of America", pct: 80 },
    "724": { name: "Spain", pct: 78 },
    "392": { name: "Japan", pct: 77 },
    "250": { name: "France", pct: 74 },
    "124": { name: "Canada", pct: 71 },
    "156": { name: "China", pct: 66 },
    "484": { name: "Mexico", pct: 63 },
    "643": { name: "Russia", pct: 55 },
    "076": { name: "Brazil", pct: 52 },
    "356": { name: "India", pct: 48 },
    "710": { name: "South Africa", pct: 46 },
    "036": { name: "Australia", pct: 40 },
    "818": { name: "Egypt", pct: 44 },
    "586": { name: "Pakistan", pct: 42 },
    "360": { name: "Indonesia", pct: 40 },
    "566": { name: "Nigeria", pct: 30 },
    "032": { name: "Argentina", pct: 38 },
    "604": { name: "Peru", pct: 28 },
    "231": { name: "Ethiopia", pct: 12 },
    "108": { name: "Rwanda", pct: 10 },
    "148": { name: "Chad", pct: 6 },
    "562": { name: "Niger", pct: 5 },
    "466": { name: "Mali", pct: 6 },
    "504": { name: "Morocco", pct: 40 },
    "152": { name: "Chile", pct: 30 },
    "578": { name: "Norway", pct: 35 },
    "752": { name: "Sweden", pct: 45 },
    "246": { name: "Finland", pct: 42 },
    "616": { name: "Poland", pct: 70 },
    "792": { name: "Turkey", pct: 62 },
    "364": { name: "Iran", pct: 55 },
    "682": { name: "Saudi Arabia", pct: 58 },
    "704": { name: "Vietnam", pct: 60 },
    "764": { name: "Thailand", pct: 58 },
    "608": { name: "Philippines", pct: 52 },
    "858": { name: "Uruguay", pct: 48 },
    "170": { name: "Colombia", pct: 44 },
    "862": { name: "Venezuela", pct: 46 },
    "012": { name: "Algeria", pct: 30 },
    "024": { name: "Angola", pct: 14 },
    "508": { name: "Mozambique", pct: 10 },
    "404": { name: "Kenya", pct: 18 },
    "800": { name: "Uganda", pct: 12 },
    "180": { name: "DR Congo", pct: 8 },
    "398": { name: "Kazakhstan", pct: 40 },
    "860": { name: "Uzbekistan", pct: 44 },
    "496": { name: "Mongolia", pct: 22 },
    "104": { name: "Myanmar", pct: 30 },
    "050": { name: "Bangladesh", pct: 50 },
    "144": { name: "Sri Lanka", pct: 45 },
    "554": { name: "New Zealand", pct: 36 },
    "222": { name: "El Salvador", pct: 55 },
    "320": { name: "Guatemala", pct: 40 },
    "630": { name: "Puerto Rico", pct: 92 },
    "056": { name: "Belgium", pct: 92 },
    "756": { name: "Switzerland", pct: 82 },
    "040": { name: "Austria", pct: 76 },
    "620": { name: "Portugal", pct: 72 },
    "300": { name: "Greece", pct: 66 },
    "203": { name: "Czechia", pct: 74 },
    "348": { name: "Hungary", pct: 72 },
    "642": { name: "Romania", pct: 60 },
    "191": { name: "Croatia", pct: 62 },
    "372": { name: "Ireland", pct: 70 },
    "208": { name: "Denmark", pct: 84 }
  };

  /* ---- City picker: Bortle class residents actually live under.
     Ordered dark -> bright so the drama builds. ---- */
  const CITIES = [
    { name: "Aoraki Mackenzie, New Zealand", bortle: 1, note: "A gold-tier International Dark Sky Reserve — one of the clearest skies on Earth." },
    { name: "Atacama Desert, Chile", bortle: 1, note: "Home to the world's great observatories. The Milky Way casts shadows here." },
    { name: "Brecon Beacons, Wales", bortle: 3, note: "A Dark Sky Reserve within a 2-hour drive of millions of Britons." },
    { name: "Flagstaff, Arizona, USA", bortle: 4, note: "The world's first 'International Dark Sky City' — lighting laws protect its stars." },
    { name: "Reykjavík, Iceland", bortle: 5, note: "Small and northern, yet its glow still dims the aurora-lit sky." },
    { name: "Denver, USA", bortle: 7, note: "The Milky Way is gone; roughly 250 stars remain visible." },
    { name: "Berlin, Germany", bortle: 8, note: "A whitish glow blankets the sky. Only the brightest ~100 stars survive." },
    { name: "Los Angeles, USA", bortle: 8, note: "So bright that in 1994 an earthquake blackout led residents to call about 'strange clouds' — it was the Milky Way." },
    { name: "London, UK", bortle: 8, note: "Centuries of astronomy history, now under a sky where the galaxy is invisible." },
    { name: "Tokyo, Japan", bortle: 8, note: "37 million people; almost none can see more than a few dozen stars." },
    { name: "Mumbai, India", bortle: 8, note: "A dense orange dome. Star visibility collapses to the very brightest few." },
    { name: "Hong Kong", bortle: 9, note: "Among the most light-polluted skies ever measured — up to 1,000× brighter than natural." },
    { name: "Singapore", bortle: 9, note: "The entire population lives so brightly lit the eye never fully dark-adapts." }
  ];

  /* ---- Generational loss: stars visible to a child born seeing 250,
     under Kyba's ~9.6%/yr brightness growth (visible-star count falls
     roughly in half per ~8 years of that trend). ---- */
  const LOSS_SERIES = (function () {
    const out = [];
    let stars = 250;
    for (let age = 0; age <= 18; age++) {
      out.push({ age, stars: Math.round(stars) });
      stars = stars / Math.pow(1.096, 1);   // ~9.6% brighter sky /yr
    }
    return out;
  })();

  return { BORTLE, HEADLINE, COUNTRY_MW_HIDDEN, CITIES, LOSS_SERIES };
})();
