/* =========================================================================
   starfield.js — the living sky
   A canvas 2D engine that renders a full star field + Milky Way band, then
   lets the story dial in "light pollution" (Bortle 1..9). As pollution rises:
     - faint stars fade out first (realistic magnitude cutoff)
     - the Milky Way band dissolves
     - a warm sky-glow dome rises from the horizon
   Respects prefers-reduced-motion (renders a static frame, no twinkle).
   ========================================================================= */

window.Sky = (function () {
  const canvas = document.getElementById("sky-canvas");
  const dome = document.getElementById("light-dome");
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  let stars = [];
  let mwPuffs = [];       // soft blobs that form the Milky Way band
  let nebula = [];        // large soft colored clouds (galaxy feel)
  let shooting = [];      // occasional meteors

  // animated state
  let curGlow = 0;        // 0..1 light pollution
  let targetGlow = 0;
  let curStarMul = 1;     // fraction of faint stars visible
  let targetStarMul = 1;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }

  function build() {
    // stars: brightness ~ magnitude. Store a "faintness" 0(bright)..1(faint)
    const count = Math.round((W * H) / 1400);
    stars = [];
    for (let i = 0; i < count; i++) {
      const faint = Math.pow(Math.random(), 0.6); // more faint than bright (realistic)
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: (1 - faint) * 1.6 + 0.25,
        faint,                                   // used for magnitude cutoff
        base: 0.35 + (1 - faint) * 0.65,
        tw: Math.random() * Math.PI * 2,
        twSpeed: 0.6 + Math.random() * 1.6,
        hue: Math.random() < 0.15 ? (Math.random() < 0.5 ? 210 : 40) : 0 // some blue/gold stars
      });
    }
    // Milky Way band: a diagonal ribbon of soft puffs
    mwPuffs = [];
    const cx = W * 0.5, cy = H * 0.5;
    const angle = -0.5; // radians tilt
    const n = Math.round(W / 8);
    for (let i = 0; i < n; i++) {
      const t = (i / n - 0.5) * 1.8;               // -0.9..0.9 along band
      const along = t * Math.hypot(W, H) * 0.62;
      const across = (Math.random() - 0.5) * H * 0.30 * (1 - Math.abs(t) * 0.4);
      out(cx + Math.cos(angle) * along - Math.sin(angle) * across,
          cy + Math.sin(angle) * along + Math.cos(angle) * across,
          40 + Math.random() * 90,
          0.02 + Math.random() * 0.05);
    }
    function out(x, y, r, a) { mwPuffs.push({ x, y, r, a }); }
    // dense dust knots along the core
    for (let i = 0; i < n; i++) {
      const t = (i / n - 0.5) * 1.2;
      const along = t * Math.hypot(W, H) * 0.62;
      mwPuffs.push({
        x: cx + Math.cos(angle) * along,
        y: cy + Math.sin(angle) * along + (Math.random() - 0.5) * 30,
        r: 6 + Math.random() * 22, a: 0.05 + Math.random() * 0.09
      });
    }

    // colored nebula clouds — subtle, so the sky reads as a rich galaxy, not flat black
    const palette = [
      [96, 130, 255],   // indigo
      [70, 200, 210],   // teal
      [180, 110, 220],  // violet
      [255, 140, 170],  // rose
    ];
    nebula = [];
    const nb = 5;
    for (let i = 0; i < nb; i++) {
      const c = palette[i % palette.length];
      nebula.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.9,
        r: Math.min(W, H) * (0.28 + Math.random() * 0.30),
        col: c,
        a: 0.05 + Math.random() * 0.05,
      });
    }
  }

  function spawnShooting() {
    if (curGlow > 0.5) return; // only in dark skies
    const x = Math.random() * W * 0.8;
    const y = Math.random() * H * 0.4;
    shooting.push({ x, y, len: 0, maxLen: 120 + Math.random() * 160,
      vx: 6 + Math.random() * 4, vy: 3 + Math.random() * 2, life: 1 });
  }

  let last = 0;
  function frame(ts) {
    const dt = Math.min((ts - last) / 1000 || 0, 0.05); last = ts;

    // ease state toward targets
    curGlow += (targetGlow - curGlow) * Math.min(dt * 3, 1);
    curStarMul += (targetStarMul - curStarMul) * Math.min(dt * 3, 1);

    ctx.clearRect(0, 0, W, H);

    // --- colored nebula clouds (behind everything; dim as light pollution rises) ---
    const nebVis = Math.max(0, 1 - curGlow * 1.25);
    if (nebVis > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const nbl of nebula) {
        const g = ctx.createRadialGradient(nbl.x, nbl.y, 0, nbl.x, nbl.y, nbl.r);
        const a = nbl.a * nebVis;
        g.addColorStop(0, `rgba(${nbl.col[0]},${nbl.col[1]},${nbl.col[2]},${a})`);
        g.addColorStop(1, `rgba(${nbl.col[0]},${nbl.col[1]},${nbl.col[2]},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(nbl.x, nbl.y, nbl.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // --- Milky Way band (fades out as glow rises) ---
    const mwVis = Math.max(0, 1 - curGlow * 1.5);
    if (mwVis > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of mwPuffs) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        const a = p.a * mwVis;
        g.addColorStop(0, `rgba(205,214,255,${a})`);
        g.addColorStop(1, "rgba(205,214,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // --- stars (faint ones disappear as starMul drops) ---
    const cutoff = curStarMul; // stars with faint <= cutoff-ish remain
    for (const s of stars) {
      // magnitude cutoff: brighter stars (low faint) survive pollution
      const visible = (1 - s.faint) >= (1 - cutoff) * 0.98;
      if (!visible && s.r < 1.1) continue;
      let alpha = s.base;
      if (!reduceMotion) { s.tw += dt * s.twSpeed; alpha *= 0.72 + 0.28 * Math.sin(s.tw); }
      // fade stars near the (glowing) horizon more
      const horizonFade = 1 - curGlow * (s.y / H) * 0.9;
      alpha *= Math.max(0.12, horizonFade);
      // dim by residual pollution
      alpha *= Math.max(0.15, 1 - curGlow * (0.6 + s.faint * 0.4));
      if (alpha <= 0.02) continue;

      if (s.hue === 0) ctx.fillStyle = `rgba(253,253,255,${alpha})`;
      else if (s.hue === 210) ctx.fillStyle = `rgba(180,205,255,${alpha})`;
      else ctx.fillStyle = `rgba(255,220,150,${alpha})`;

      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();

      // bright stars get a soft glow + cross sparkle
      if (s.r > 1.2) {
        const gg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
        gg.addColorStop(0, `rgba(255,255,255,${alpha * 0.5})`);
        gg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // --- shooting stars ---
    if (!reduceMotion) {
      if (Math.random() < 0.004) spawnShooting();
      for (let i = shooting.length - 1; i >= 0; i--) {
        const m = shooting[i];
        m.x += m.vx; m.y += m.vy; m.len = Math.min(m.len + 14, m.maxLen); m.life -= dt * 0.6;
        if (m.life <= 0 || m.x > W || m.y > H) { shooting.splice(i, 1); continue; }
        const tailX = m.x - m.vx * (m.len / 6), tailY = m.y - m.vy * (m.len / 6);
        const g = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * m.life})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(m.x, m.y); ctx.lineTo(tailX, tailY); ctx.stroke();
      }
    }

    // --- light pollution veil across whole sky ---
    if (curGlow > 0.01) {
      const veil = ctx.createLinearGradient(0, 0, 0, H);
      veil.addColorStop(0, `rgba(30,40,70,${curGlow * 0.10})`);
      veil.addColorStop(1, `rgba(120,90,55,${curGlow * 0.16})`);
      ctx.fillStyle = veil; ctx.fillRect(0, 0, W, H);
    }

    requestAnimationFrame(frame);
  }

  // ---- public: set sky by Bortle class object {glow, starMul} ----
  function setSky(glow, starMul) {
    targetGlow = glow; targetStarMul = starMul;
    // horizon dome
    const inten = glow;
    dome.style.background =
      `radial-gradient(130% 78% at 50% 122%,
        rgba(255,168,86,${0.55 * inten}) 0%,
        rgba(255,140,66,${0.30 * inten}) 32%,
        rgba(120,90,60,${0.10 * inten}) 55%,
        rgba(0,0,0,0) 74%)`;
  }

  window.addEventListener("resize", () => { DPR = Math.min(window.devicePixelRatio || 1, 2); resize(); });
  resize();
  requestAnimationFrame(frame);

  return { setSky };
})();
