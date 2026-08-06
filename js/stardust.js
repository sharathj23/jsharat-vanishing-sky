/* =========================================================================
   stardust.js — two independent visual engines
   1) window.Stardust : the human FACE built from star particles (Stardust tab).
      Lazy — only animates while the Stardust panel is open.
   2) window.FadeSky  : the "1950 -> today" fading sky canvas in the main scroll.
      Its own visibility-gated loop; driven by a hover slider (see main.js).
   Both respect prefers-reduced-motion.
   ========================================================================= */

/* -------------------------------------------------------------------------
   1) STARDUST FACE
   ------------------------------------------------------------------------- */
window.Stardust = (function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let active = false, raf = null;

  const faceCanvas = document.getElementById("stardust-face");
  const fctx = faceCanvas ? faceCanvas.getContext("2d") : null;
  let fW = 0, fH = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  let parts = [];

  const PROFILE = [
    [0.30,0.09],[0.40,0.055],[0.52,0.05],[0.62,0.08],[0.68,0.16],[0.70,0.24],
    [0.665,0.30],[0.74,0.36],[0.815,0.40],[0.74,0.435],[0.675,0.45],
    [0.715,0.485],[0.75,0.52],[0.685,0.545],[0.71,0.575],[0.70,0.625],
    [0.66,0.66],[0.585,0.70],[0.50,0.725],[0.49,0.80],[0.49,1.0],
    [0.17,1.0],[0.185,0.80],[0.175,0.62],[0.145,0.46],[0.155,0.30],[0.21,0.16]
  ];

  function buildFace() {
    if (!faceCanvas) return;
    const rect = faceCanvas.getBoundingClientRect();
    fW = Math.max(240, rect.width); fH = Math.max(240, rect.height);
    faceCanvas.width = fW * DPR; faceCanvas.height = fH * DPR;
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const box = Math.min(fW, fH) * 0.92;
    const ox = (fW - box) / 2, oy = (fH - box) / 2;
    const path = new Path2D();
    PROFILE.forEach(([x, y], i) => {
      const px = ox + x * box, py = oy + y * box;
      i ? path.lineTo(px, py) : path.moveTo(px, py);
    });
    path.closePath();

    const off = document.createElement("canvas");
    off.width = fW; off.height = fH;
    const octx = off.getContext("2d");
    octx.fillStyle = "#fff"; octx.fill(path);
    const img = octx.getImageData(0, 0, fW, fH).data;

    const homes = [];
    const step = Math.max(2, Math.round(Math.min(fW, fH) / 150));
    for (let y = 0; y < fH; y += step)
      for (let x = 0; x < fW; x += step)
        if (img[(y * fW + x) * 4 + 3] > 128 && Math.random() < 0.55)
          homes.push({ x: x + (Math.random()-0.5)*step, y: y + (Math.random()-0.5)*step });

    parts = homes.map(h => ({
      hx: h.x, hy: h.y, x: h.x, y: h.y,
      r: Math.random() < 0.12 ? 1.6 + Math.random()*1.2 : 0.5 + Math.random()*0.9,
      tw: Math.random()*Math.PI*2, tws: 0.7 + Math.random()*1.8,
      esc: 0, vx: 0, vy: 0, hue: Math.random() < 0.15 ? (Math.random()<0.5?210:45) : 0
    }));
    faceCanvas._path = path;
  }

  function drawFace(dt) {
    if (!fctx) return;
    fctx.clearRect(0, 0, fW, fH);
    if (faceCanvas._path) {
      fctx.save(); fctx.strokeStyle = "rgba(95,227,255,0.12)"; fctx.lineWidth = 1;
      fctx.stroke(faceCanvas._path); fctx.restore();
    }
    fctx.save(); fctx.globalCompositeOperation = "lighter";
    for (const p of parts) {
      if (!reduce) p.tw += dt * p.tws;
      let a = 0.55 + 0.45 * Math.sin(p.tw);
      if (p.esc > 0) {
        p.x += p.vx; p.y += p.vy; p.vy -= 6 * dt; p.esc -= dt * 0.5;
        a *= Math.max(0, p.esc);
        if (p.esc <= 0) { p.x = p.hx; p.y = p.hy; a = 0; }
      } else if (!reduce && Math.random() < 0.0006) {
        p.esc = 1; const ang = -Math.PI/2 + (Math.random()-0.5)*1.1;
        const sp = 10 + Math.random()*20; p.vx = Math.cos(ang)*sp*dt*6; p.vy = Math.sin(ang)*sp*dt*6;
      }
      const col = p.hue === 0 ? `rgba(245,247,255,${a})`
                : p.hue === 210 ? `rgba(180,205,255,${a})` : `rgba(255,220,150,${a})`;
      fctx.fillStyle = col;
      fctx.beginPath(); fctx.arc(p.x, p.y, p.r, 0, Math.PI*2); fctx.fill();
      if (p.r > 1.4) {
        const g = fctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*4);
        g.addColorStop(0, `rgba(255,255,255,${a*0.5})`); g.addColorStop(1, "rgba(255,255,255,0)");
        fctx.fillStyle = g; fctx.beginPath(); fctx.arc(p.x, p.y, p.r*4, 0, Math.PI*2); fctx.fill();
      }
    }
    fctx.restore();
  }

  let last = 0;
  function loop(ts) {
    if (!active) return;
    const dt = Math.min((ts - last)/1000 || 0, 0.05); last = ts;
    drawFace(dt);
    raf = requestAnimationFrame(loop);
  }
  function onShow() { setTimeout(() => { DPR = Math.min(window.devicePixelRatio||1,2); buildFace(); }, 60); }
  function setActive(on) {
    active = on;
    if (on) { last = performance.now(); if (!raf) raf = requestAnimationFrame(loop); }
    else if (raf) { cancelAnimationFrame(raf); raf = null; }
  }
  window.addEventListener("resize", () => { if (active) onShow(); });
  return { onShow, setActive };
})();

/* -------------------------------------------------------------------------
   2) FADE SKY  (1950 -> today) — independent, visibility-gated
   ------------------------------------------------------------------------- */
window.FadeSky = (function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("fading-sky");
  const ctx = canvas ? canvas.getContext("2d") : null;
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  let stars = [], mw = [], fade = 0, visible = false, raf = null, last = 0;

  function build() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    W = Math.max(280, rect.width); H = Math.max(180, rect.height || 260);
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    stars = [];
    const n = Math.round(W * H / 850);
    for (let i = 0; i < n; i++) {
      const faint = Math.pow(Math.random(), 0.6);
      stars.push({ x: Math.random()*W, y: Math.random()*H, r: (1-faint)*1.4+0.3,
        faint, base: 0.3 + (1-faint)*0.7, tw: Math.random()*6.28, tws: 0.6+Math.random()*1.6 });
    }
    mw = [];
    for (let i = 0; i < W/6; i++) {
      const t = (i/(W/6) - 0.5) * 1.8;
      mw.push({ x: W*0.5 + t*W*0.55, y: H*0.5 + Math.sin(t*2)*H*0.12 + (Math.random()-0.5)*H*0.25,
        r: 20 + Math.random()*55, a: 0.03 + Math.random()*0.05 });
    }
  }

  function draw(dt) {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const mwVis = Math.max(0, 1 - fade * 1.4);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const p of mw) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(205,214,255,${p.a * mwVis})`); g.addColorStop(1, "rgba(205,214,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
    }
    ctx.restore();
    for (const s of stars) {
      const survives = (1 - s.faint) >= fade * 0.98;
      if (!survives && s.r < 1.0) continue;
      if (!reduce) s.tw += dt * s.tws;
      let a = s.base * (reduce ? 1 : (0.7 + 0.3*Math.sin(s.tw)));
      a *= Math.max(0.1, 1 - fade * (0.6 + s.faint*0.4));
      if (a <= 0.02) continue;
      ctx.fillStyle = `rgba(250,250,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill();
    }
    if (fade > 0.01) {
      const veil = ctx.createLinearGradient(0, 0, 0, H);
      veil.addColorStop(0, `rgba(30,40,70,${fade*0.12})`);
      veil.addColorStop(1, `rgba(200,120,60,${fade*0.34})`);
      ctx.fillStyle = veil; ctx.fillRect(0, 0, W, H);
    }
  }

  function loop(ts) {
    if (!visible) { raf = null; return; }
    const dt = Math.min((ts - last)/1000 || 0, 0.05); last = ts;
    draw(dt);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }

  function setFade(v) { fade = Math.max(0, Math.min(1, v)); if (!visible) draw(0); }

  if (canvas) {
    build();
    // only run the loop while the canvas is on-screen (saves CPU)
    const io = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) start();
    }, { threshold: 0.05 });
    io.observe(canvas);
    window.addEventListener("resize", () => { DPR = Math.min(window.devicePixelRatio||1,2); build(); draw(0); });
    draw(0);
  }
  return { setFade };
})();
