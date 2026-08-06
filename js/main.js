/* =========================================================================
   main.js — orchestration
   Wires scroll -> sky state + narration, and builds all interactive viz:
   big-stat counter, Bortle simulator, world choropleth, city picker, loss line.
   ========================================================================= */
(function () {
  const S = window.SPEC;
  const bortleByClass = {}; S.BORTLE.forEach(b => bortleByClass[b.c] = b);
  const seqColors = ["#0d1830","#29304f","#5b4a63","#94614f","#cf7c3a","#ffb545","#ffe9a8"];

  /* ---------- helper: sky from a Bortle class number ---------- */
  function skyFromClass(c) {
    const b = bortleByClass[Math.max(1, Math.min(9, Math.round(c)))];
    window.Sky.setSky(b.glow, b.starMul);
    if (window.HUD) window.HUD.update({ bortle: b.c, skyName: b.name, stars: b.stars });
  }
  skyFromClass(1);

  const SEQ_NAMES = ["INIT", "INHERIT", "VANISH", "SIMULATE", "MAP", "CITY", "TREND", "KNOW", "RECOVER", "LOOK-UP"];

  /* ---- "The sky we're switching off": hover-driven slider -> fading-sky canvas ---- */
  const fadeSlider = document.getElementById("fade-slider");
  const fadeYear = document.getElementById("fade-year-num");
  const fadeCap = document.getElementById("fade-caption");
  function applyFade(v01) {
    const v = Math.max(0, Math.min(1, v01));
    if (window.FadeSky) window.FadeSky.setFade(v);
    if (fadeYear) fadeYear.textContent = Math.round(1950 + v * (2026 - 1950));
    if (fadeCap) fadeCap.textContent =
        v < 0.28 ? "A sky brimming with stars."
      : v < 0.55 ? "The glow begins to rise."
      : v < 0.82 ? "The Milky Way dissolves."
      : "Tonight — an amber haze.";
  }
  if (fadeSlider) {
    // normal drag + keyboard still work
    fadeSlider.addEventListener("input", e => applyFade(+e.target.value / 100));
    // hover-move: the value follows the cursor across the bar (no click/drag needed)
    fadeSlider.addEventListener("mousemove", e => {
      const r = fadeSlider.getBoundingClientRect();
      const v = (e.clientX - r.left) / r.width;
      fadeSlider.value = Math.round(Math.max(0, Math.min(1, v)) * 100);
      applyFade(v);
    });
    applyFade(0);
  }

  /* =======================================================================
     SCROLLAMA
     ======================================================================= */
  const acts = document.querySelectorAll(".act");
  const progressFill = document.getElementById("progress-fill");
  let lastNarratedAct = -1;

  const scroller = scrollama();
  scroller
    .setup({ step: ".act", offset: 0.55 })
    .onStepEnter(({ element }) => {
      acts.forEach(a => a.classList.remove("is-active"));
      element.classList.add("is-active");

      const bortle = +element.dataset.bortle || 1;
      skyFromClass(bortle);

      const act = +element.dataset.act;
      if (window.HUD) window.HUD.update({ act, seqName: SEQ_NAMES[act] || "" });

      // narration (only once per act, only forward)
      const line = element.dataset.narrate;
      if (line && act !== lastNarratedAct) { window.DRASA.speak(line); lastNarratedAct = act; }

      // act-specific triggers
      if (act === 2) animateBigStat();
      if (act === 6) drawLossChart();
    });

  window.addEventListener("resize", () => scroller.resize());

  // progress rail
  window.addEventListener("scroll", () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progressFill.style.width = (window.scrollY / h * 100).toFixed(2) + "%";
  }, { passive: true });

  /* =======================================================================
     ACT 2 — animated big stat counter
     ======================================================================= */
  let statDone = false;
  function animateBigStat() {
    if (statDone) return; statDone = true;
    const el = document.querySelector("#stat-third .big-stat-num");
    const target = +document.getElementById("stat-third").dataset.count;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { el.textContent = target; return; }
    let t0 = null; const dur = 1600;
    function tick(ts) {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* =======================================================================
     ACT 3 — Bortle simulator
     ======================================================================= */
  const slider = document.getElementById("bortle-slider");
  const readout = document.getElementById("bortle-readout");
  const bDesc = document.getElementById("bortle-desc");
  const bStars = document.getElementById("bortle-stars");
  const bMw = document.getElementById("bortle-mw");
  const bWho = document.getElementById("bortle-who");

  function updateBortle(v) {
    const b = bortleByClass[v];
    readout.textContent = `Class ${b.c} — ${b.name}`;
    bDesc.textContent = b.desc;
    bStars.textContent = b.stars;
    bMw.textContent = b.mw;
    bWho.textContent = b.who;
    skyFromClass(b.c);   // live sky change behind the panel
  }
  slider.addEventListener("input", e => updateBortle(+e.target.value));
  updateBortle(+slider.value);

  /* =======================================================================
     ACT 4 — world choropleth (Milky Way hidden %)
     ======================================================================= */
  const mwData = S.COUNTRY_MW_HIDDEN;
  const color = d3.scaleThreshold()
    .domain([15, 30, 45, 60, 75, 90])
    .range(seqColors);

  const tooltip = document.getElementById("map-tooltip");
  tooltip.innerHTML = "Hover or tap a country to see how many of its people have lost the Milky Way.";

  function buildLegend() {
    const el = document.getElementById("map-legend");
    const bins = ["0–15","15–30","30–45","45–60","60–75","75–90","90–100"];
    el.innerHTML = '<span class="legend-caption">% of population that cannot see the Milky Way</span>';
    bins.forEach((label, i) => {
      const s = document.createElement("span");
      s.innerHTML = `<span class="swatch" style="background:${seqColors[i]}"></span>`;
      el.appendChild(s);
    });
    const lo = document.createElement("span"); lo.textContent = " fewer ";
    const hi = document.createElement("span"); hi.textContent = " more → lost ";
    el.insertBefore(lo, el.children[1]); el.appendChild(hi);
  }

  function drawMap() {
    const host = document.getElementById("world-map");
    const width = 620, height = 380;
    const svg = d3.select(host).append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`);

    const projection = d3.geoNaturalEarth1();
    const path = d3.geoPath(projection);

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json")
      .then(world => {
        const countries = topojson.feature(world, world.objects.countries).features;
        projection.fitSize([width, height], { type: "FeatureCollection", features: countries });

        svg.append("g").selectAll("path")
          .data(countries).join("path")
          .attr("class", "country")
          .attr("d", path)
          .attr("tabindex", d => mwData[d.id] ? 0 : -1)
          .attr("role", d => mwData[d.id] ? "button" : null)
          .attr("aria-label", d => {
            const rec = mwData[d.id];
            return rec ? `${rec.name}: ${rec.pct}% cannot see the Milky Way` : null;
          })
          .attr("fill", d => { const rec = mwData[d.id]; return rec ? color(rec.pct) : "#0a1020"; })
          .on("mouseenter focus", (event, d) => showCountry(d, event.currentTarget))
          .on("mouseleave blur", () => {});

        buildLegend();
        addMapAnnotations(svg, projection, countries, width, height);
      })
      .catch(() => {
        host.innerHTML = '<p class="lede">Map data could not load (offline). See the country table in README for the full dataset.</p>';
      });
  }

  // static callouts marking the extremes — clear guidance for the reader
  function addMapAnnotations(svg, projection, countries, W, H) {
    const items = [
      { id: "702", label: "Singapore · 100%", sub: "brightest — galaxy never visible", cool: false, tx: W - 150, ty: 70 },
      { id: "148", label: "Central Africa", sub: "darkest — Milky Way still bright", cool: true, tx: 8, ty: H - 40 },
    ];
    const g = svg.append("g").attr("class", "map-annos");
    items.forEach(it => {
      const f = countries.find(c => String(c.id) === it.id);
      if (!f) return;
      let p; try { p = projection(d3.geoCentroid(f)); } catch (e) { return; }
      if (!p) return;
      const [x, y] = p;
      g.append("line").attr("class", "map-anno-leader")
        .attr("x1", x).attr("y1", y).attr("x2", it.tx + 4).attr("y2", it.ty - 4);
      g.append("circle").attr("class", "map-anno-dot" + (it.cool ? " map-anno-dot--cool" : ""))
        .attr("cx", x).attr("cy", y).attr("r", 3.2);
      g.append("text").attr("class", "map-anno-label").attr("x", it.tx).attr("y", it.ty).text(it.label);
      g.append("text").attr("class", "map-anno-sub").attr("x", it.tx).attr("y", it.ty + 12).text(it.sub);
    });
  }

  function showCountry(d, node) {
    const rec = mwData[d.id];
    d3.selectAll(".country.active").classed("active", false);
    if (!rec) { tooltip.innerHTML = "No population-weighted estimate for this country."; return; }
    d3.select(node).classed("active", true);
    const verdict = rec.pct >= 90 ? "has all but lost the night sky"
      : rec.pct >= 60 ? "has largely lost the Milky Way"
      : rec.pct >= 30 ? "is losing the Milky Way fast"
      : "still holds on to dark skies";
    tooltip.innerHTML = `<strong>${rec.name}</strong> — <strong>${rec.pct}%</strong> of people cannot see the Milky Way. It ${verdict}.`;
  }
  drawMap();

  /* =======================================================================
     ACT 5 — city picker
     ======================================================================= */
  const sel = document.getElementById("city-select");
  const cReadout = document.getElementById("city-readout");
  S.CITIES.forEach((c, i) => {
    const o = document.createElement("option");
    o.value = i; o.textContent = c.name; sel.appendChild(o);
  });
  function classTint(b) {
    if (b <= 2) return { bg: "rgba(95,227,255,0.15)", fg: "#5fe3ff", label: "Pristine" };
    if (b <= 4) return { bg: "rgba(140,220,160,0.15)", fg: "#8fe0a0", label: "Rural" };
    if (b <= 6) return { bg: "rgba(255,210,122,0.15)", fg: "#ffd27a", label: "Suburban" };
    return { bg: "rgba(255,122,107,0.15)", fg: "#ff9d8f", label: "Urban glow" };
  }
  function updateCity(i) {
    const c = S.CITIES[i]; const b = bortleByClass[c.bortle]; const tint = classTint(c.bortle);
    cReadout.innerHTML =
      `<div class="cr-name">${c.name}</div>
       <span class="cr-class" style="background:${tint.bg};color:${tint.fg}">
         Bortle ${c.bortle} · ${tint.label} · ${b.stars} stars</span>
       <p class="cr-line">${c.note}</p>
       <p class="cr-line"><strong>Milky Way:</strong> ${b.mw}.</p>`;
    skyFromClass(c.bortle);
  }
  sel.addEventListener("change", e => updateCity(+e.target.value));
  sel.value = S.CITIES.length - 1;   // start on the brightest (Singapore) for drama
  updateCity(S.CITIES.length - 1);

  /* =======================================================================
     ACT 6 — generational loss line
     ======================================================================= */
  let lossDrawn = false;
  function drawLossChart() {
    if (lossDrawn) return; lossDrawn = true;
    const host = document.getElementById("loss-chart");
    const data = S.LOSS_SERIES;
    const width = 640, height = 300, m = { t: 24, r: 24, b: 44, l: 52 };
    const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${width} ${height}`);

    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "lossGrad")
      .attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#ffd27a").attr("stop-opacity", 0.6);
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#ffd27a").attr("stop-opacity", 0);

    const x = d3.scaleLinear().domain([0, 18]).range([m.l, width - m.r]);
    const y = d3.scaleLinear().domain([0, 250]).range([height - m.b, m.t]);

    svg.append("g").attr("class", "loss-axis").attr("transform", `translate(0,${height - m.b})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d => d === 0 ? "birth" : `age ${d}`));
    svg.append("g").attr("class", "loss-axis").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}`));
    svg.append("text").attr("class", "loss-annot").attr("x", m.l).attr("y", m.t - 8)
      .text("Stars visible to the naked eye");

    const area = d3.area().x(d => x(d.age)).y0(y(0)).y1(d => y(d.stars)).curve(d3.curveMonotoneX);
    const line = d3.line().x(d => x(d.age)).y(d => y(d.stars)).curve(d3.curveMonotoneX);

    const areaPath = svg.append("path").datum(data).attr("class", "loss-area").attr("d", area);
    const linePath = svg.append("path").datum(data).attr("class", "loss-line").attr("d", line);

    // birth annotation (start of the decline)
    const first = data[0];
    svg.append("circle").attr("class", "loss-dot").attr("cx", x(first.age)).attr("cy", y(first.stars)).attr("r", 4);
    svg.append("text").attr("class", "loss-annot").attr("x", x(first.age) + 10).attr("y", y(first.stars) - 8)
      .text(`born: ~${first.stars} stars`);

    // "~100 stars" reference threshold (a bright-suburb sky)
    svg.append("line").attr("class", "anno-line")
      .attr("x1", m.l).attr("x2", width - m.r).attr("y1", y(100)).attr("y2", y(100));
    svg.append("text").attr("class", "anno-text anno-text--warm")
      .attr("x", width - m.r).attr("y", y(100) - 6).attr("text-anchor", "end")
      .text("≈100 stars — a bright-suburb sky");

    // endpoint annotation
    const last = data[data.length - 1];
    svg.append("circle").attr("class", "loss-dot").attr("cx", x(last.age)).attr("cy", y(last.stars)).attr("r", 5);
    svg.append("text").attr("class", "loss-annot").attr("x", x(last.age) - 8).attr("y", y(last.stars) - 12)
      .attr("text-anchor", "end").text(`age 18: ~${last.stars} stars`);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      const L = linePath.node().getTotalLength();
      linePath.attr("stroke-dasharray", `${L} ${L}`).attr("stroke-dashoffset", L)
        .transition().duration(1800).ease(d3.easeCubicInOut).attr("stroke-dashoffset", 0);
      areaPath.attr("opacity", 0).transition().delay(600).duration(1400).attr("opacity", 0.5);
    }
  }

  /* =======================================================================
     CONSTELLATION NAV + STORY PANELS (Stardust, About)
     ======================================================================= */
  const nodes = Array.from(document.querySelectorAll(".cnode"));
  const panels = {
    stardust: document.getElementById("stardust-panel"),
    about: document.getElementById("about-panel"),
  };
  let openPanelName = null;
  let lastFocused = null;

  const sectionNodes = nodes.filter(n => n.dataset.target !== undefined)
    .map(n => ({ el: n, target: +n.dataset.target }))
    .sort((a, b) => a.target - b.target);

  function setCurrentByAct(act) {
    if (openPanelName) return;
    let chosen = sectionNodes[0];
    for (const s of sectionNodes) if (s.target <= act) chosen = s;
    nodes.forEach(n => n.classList.remove("is-current"));
    if (chosen) chosen.el.classList.add("is-current");
  }

  function openPanel(name) {
    const panel = panels[name];
    if (!panel) return;
    // close any other open panel first
    if (openPanelName && openPanelName !== name) closePanel(true);
    lastFocused = document.activeElement;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("show"));
    openPanelName = name;
    nodes.forEach(n => n.classList.toggle("is-current", n.dataset.panel === name));
    document.body.style.overflow = "hidden";
    const closeBtn = panel.querySelector("[data-close], .panel-close, .about-close");
    if (closeBtn) closeBtn.focus();
    if (name === "stardust") {
      if (window.Stardust) { window.Stardust.onShow(); window.Stardust.setActive(true); }
      if (window.DRASA) window.DRASA.speak("Everyone says don't forget your roots. But our truest roots are the stars. Every atom in you was forged inside one. This is what we are quietly switching off.");
    }
  }
  function closePanel(silent) {
    const panel = panels[openPanelName];
    if (!panel) { openPanelName = null; return; }
    panel.classList.remove("show");
    if (openPanelName === "stardust" && window.Stardust) window.Stardust.setActive(false);
    setTimeout(() => { panel.hidden = true; }, 400);
    openPanelName = null;
    document.body.style.overflow = "";
    if (!silent) {
      if (lastFocused) lastFocused.focus();
      const active = document.querySelector(".act.is-active");
      setCurrentByAct(active ? +active.dataset.act : 0);
    }
  }

  nodes.forEach(n => {
    n.addEventListener("click", () => {
      if (n.dataset.panel) { openPanel(n.dataset.panel); collapseNav(); return; }
      if (openPanelName) closePanel();
      const target = document.querySelector(`.act[data-act="${n.dataset.target}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      collapseNav();
    });
  });

  // close buttons (both panels)
  document.querySelectorAll("[data-close], .about-close").forEach(btn => {
    btn.addEventListener("click", () => closePanel());
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && openPanelName) closePanel();
  });

  // mobile: toggle the constellation rail open
  const starnav = document.getElementById("starnav");
  const navToggle = document.getElementById("starnav-toggle");
  function collapseNav() { if (starnav) { starnav.classList.remove("open"); if (navToggle) navToggle.setAttribute("aria-expanded", "false"); } }
  if (navToggle) navToggle.addEventListener("click", () => {
    const open = starnav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  // keep nav highlight synced to scroll
  document.addEventListener("scroll", () => {
    if (openPanelName) return;
    const active = document.querySelector(".act.is-active");
    if (active) setCurrentByAct(+active.dataset.act);
  }, { passive: true });

  /* =======================================================================
     FIRST-LOAD "HOW TO EXPLORE" HINT
     ======================================================================= */
  const useHint = document.getElementById("usehint");
  const useHintClose = document.getElementById("usehint-close");
  let hintShown = false, hintDone = false;
  function showHint() {
    if (hintShown || hintDone || !useHint) return;
    hintShown = true;
    useHint.hidden = false;
    requestAnimationFrame(() => useHint.classList.add("show"));
    setTimeout(hideHint, 11000);
  }
  function hideHint() {
    if (!useHint) return;
    hintDone = true;
    useHint.classList.remove("show");
    setTimeout(() => { useHint.hidden = true; }, 500);
  }
  if (useHintClose) useHintClose.addEventListener("click", hideHint);
  document.addEventListener("boot:done", () => setTimeout(showHint, 650));
  window.addEventListener("scroll", () => { if (window.scrollY > 160) hideHint(); }, { passive: true });
  // fallback if the boot overlay was skipped or never fired
  window.addEventListener("load", () => setTimeout(() => {
    const boot = document.getElementById("boot");
    if (!hintShown && (!boot || boot.style.display === "none" || boot.classList.contains("done"))) showHint();
  }, 5000));

  console.log("%c◆ The World After Dark — systems online", "color:#5fe3ff");
})();
