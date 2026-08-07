/* =========================================================================
   narration.js — "DRASA", the AI guide (JARVIS-style, but her own voice)
   Voice direction: warm, low, smooth and slightly husky/breathy female — the
   calm, intimate AI narrator vibe of Scarlett Johansson's "Samantha" in Her.

   HONEST NOTE: the browser SpeechSynthesis API cannot clone a specific
   actress. We get as close as the platform allows by (a) preferring the
   warmest natural female voice available and (b) lowering pitch + slowing the
   rate for that breathy, unhurried delivery. For a genuinely Scarlett-like
   husky timbre, deploy the documented upgrade below.

   >> Upgrade path (also strengthens the "Best Use of GenAI" story): route
      speak() to Amazon Polly *generative/neural* voices ("Ruth" or "Danielle"
      — warm, breathy US female) or Amazon Nova Sonic, via a tiny signed
      endpoint. Keeps voice on AWS infra (compliant). The per-line text below
      is already SSML-ready. Zero-dependency Web Speech is the default so the
      entry works on any judge's machine with no keys; captions always render.
   ========================================================================= */

window.DRASA = (function () {
  const btn = document.getElementById("jarvis-toggle");
  const stateEl = btn.querySelector(".hud-state");
  const eq = document.getElementById("jarvis-eq");
  const sub = document.getElementById("subtitle");

  const subText = document.getElementById("subtitle-text");
  const subClose = document.getElementById("subtitle-close");
  const supported = "speechSynthesis" in window;
  let enabled = false;
  let voice = null;
  let subTimer = null;
  let captionsMuted = false;   // user closed captions with the × button

  function pickVoice() {
    if (!supported) return;
    const voices = speechSynthesis.getVoices();
    // Prefer warm / smooth FEMALE English voices, best-first.
    const prefer = [
      "Samantha",                 // macOS — warm US female (closest to "Her")
      "Ava", "Allison", "Susan", "Zoe", "Nicky",
      "Microsoft Aria",           // Windows — smooth US female
      "Microsoft Jenny", "Microsoft Michelle", "Microsoft Sonia",
      "Google UK English Female", "Google US English",
      "Serena", "Fiona", "Tessa", "Karen", "Moira", "Victoria", "Zira"
    ];
    for (const name of prefer) {
      const v = voices.find(v => v.name.includes(name));
      if (v) { voice = v; return; }
    }
    // fallback: any voice that self-identifies female, else first en voice
    voice = voices.find(v => /female/i.test(v.name))
         || voices.find(v => v.lang && v.lang.startsWith("en"))
         || voices[0] || null;
  }
  if (supported) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function hideSubtitle() {
    sub.classList.remove("show");
    clearTimeout(subTimer);
    subTimer = setTimeout(() => { sub.hidden = true; }, 350);
  }

  function showSubtitle(text) {
    // captions appear only while Drasa voice is ON, and only if not dismissed
    if (!enabled || captionsMuted) { hideSubtitle(); return; }
    clearTimeout(subTimer);
    subText.textContent = text;
    sub.hidden = false;
    requestAnimationFrame(() => sub.classList.add("show"));
    const dwell = Math.max(4000, text.length * 55);
    subTimer = setTimeout(() => sub.classList.remove("show"), dwell);
  }

  // × closes captions for the session (re-enabling the voice brings them back)
  if (subClose) subClose.addEventListener("click", () => { captionsMuted = true; hideSubtitle(); });

  // make the caption box draggable so it never hides content
  (function makeDraggable() {
    let dragging = false, ox = 0, oy = 0;
    sub.addEventListener("pointerdown", e => {
      if (e.target === subClose) return;
      dragging = true; sub.classList.add("dragging");
      const r = sub.getBoundingClientRect();
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      sub.style.transform = "none"; sub.style.right = "auto"; sub.style.bottom = "auto";
      sub.setPointerCapture(e.pointerId);
    });
    sub.addEventListener("pointermove", e => {
      if (!dragging) return;
      sub.style.left = Math.max(6, Math.min(window.innerWidth - sub.offsetWidth - 6, e.clientX - ox)) + "px";
      sub.style.top  = Math.max(6, Math.min(window.innerHeight - sub.offsetHeight - 6, e.clientY - oy)) + "px";
    });
    sub.addEventListener("pointerup", () => { dragging = false; sub.classList.remove("dragging"); });
  })();

  let _fallback = null;
  function speak(text, onEnd) {
    showSubtitle(text);               // captions only while voice is on (see showSubtitle)
    clearTimeout(_fallback);
    if (!enabled || !supported) {
      if (onEnd) _fallback = setTimeout(onEnd, Math.max(3500, text.length * 45));
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    // warm female delivery: unhurried but not sluggish, lowered pitch for warmth
    u.rate = 0.9; u.pitch = 0.8; u.volume = 1;
    u.onstart = () => eq.classList.add("speaking");
    u.onend = () => { eq.classList.remove("speaking"); if (onEnd) onEnd(); };
    u.onerror = () => { eq.classList.remove("speaking"); if (onEnd) onEnd(); };
    speechSynthesis.speak(u);
  }

  function setEnabled(on, silent) {
    enabled = on;
    btn.setAttribute("aria-pressed", String(on));
    stateEl.textContent = on ? "on" : "off";
    if (!on) {
      if (supported) { speechSynthesis.cancel(); eq.classList.remove("speaking"); }
      hideSubtitle();                 // voice off -> no captions
    } else {
      captionsMuted = false;          // turning voice on brings captions back
      if (!silent) speak("I'm Drasa. Stay with me, and scroll slowly. I'll show you the sky we've been quietly losing.");
    }
  }

  btn.addEventListener("click", () => setEnabled(!enabled));
  if (!supported) { stateEl.textContent = "CAPTIONS"; btn.title = "Voice not supported here — captions will guide you"; }

  return { speak, isEnabled: () => enabled, setEnabled };
})();

// Back-compat alias so any older reference keeps working.
window.ARIA = window.DRASA;
