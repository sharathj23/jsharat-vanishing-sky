/* =========================================================================
   hud.js — JARVIS boot sequence + live HUD telemetry
   ========================================================================= */
window.HUD = (function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- telemetry writers ---------- */
  const tel = {};
  document.querySelectorAll("#hud-frame [data-tel]").forEach(el => {
    tel[el.dataset.tel] = el;
  });
  function set(key, label, value) {
    if (tel[key]) tel[key].textContent = value !== undefined ? `${label} / ${value}` : label;
  }
  function update({ bortle, skyName, stars, act, seqName }) {
    if (bortle !== undefined) set("bortle", "BORTLE", bortle);
    if (skyName !== undefined) set("sky", "SKY QUALITY", skyName.toUpperCase());
    if (stars !== undefined) set("stars", "VISIBLE STARS", stars);
    if (act !== undefined) set("act", "SEQ", `${String(act).padStart(2, "0")}·${(seqName || "").toUpperCase()}`);
  }

  /* ---------- boot sequence ---------- */
  const boot = document.getElementById("boot");
  const log = document.getElementById("boot-log");
  const enterBtn = document.getElementById("boot-enter");

  const lines = [
    ["› initializing DRASA guidance system", "ok"],
    ["› calibrating star-field engine .......... 7,500 sources", ""],
    ["› loading NASA VIIRS night-lights basemap", ""],
    ["› ingesting Falchi 2016 sky-brightness atlas", ""],
    ["› ingesting Kyba 2023 stellar-visibility trend", ""],
    ["› cross-checking headline claims .......... verified", "ok"],
    ["› accessibility layer: contrast · keyboard · captions", "ok"],
    ["› rendering the sky as your ancestors saw it", ""],
  ];

  function finish() {
    if (boot.classList.contains("done")) return;
    boot.classList.add("done");
    setTimeout(() => { boot.style.display = "none"; }, 900);
    document.dispatchEvent(new CustomEvent("boot:done"));
  }

  function run() {
    if (reduce) {
      log.innerHTML = lines.map(l => `<span class="${l[1]}">${l[0]}</span>`).join("\n");
      enterBtn.hidden = false;
      return;
    }
    let i = 0;
    (function next() {
      if (i >= lines.length) {
        log.innerHTML += `\n<span class="ok">› system online. welcome.</span>`;
        enterBtn.hidden = false;
        enterBtn.focus();
        // auto-advance after a beat if the user does nothing
        setTimeout(() => { if (!boot.classList.contains("done")) finish(); }, 4200);
        return;
      }
      const [txt, cls] = lines[i++];
      log.innerHTML += `<span class="${cls}">${txt}</span>\n`;
      setTimeout(next, 360 + Math.random() * 220);
    })();
  }

  enterBtn.addEventListener("click", finish);
  // allow skipping with a key
  document.addEventListener("keydown", e => {
    if (!boot.classList.contains("done") && (e.key === "Enter" || e.key === "Escape")) finish();
  }, { once: false });

  // kick off after fonts settle
  window.addEventListener("load", () => setTimeout(run, 300));

  return { update };
})();
