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

  const supported = "speechSynthesis" in window;
  let enabled = false;
  let voice = null;
  let subTimer = null;

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

  function showSubtitle(text) {
    clearTimeout(subTimer);
    sub.textContent = text;
    sub.classList.add("show");
    const dwell = Math.max(3800, text.length * 55);
    subTimer = setTimeout(() => sub.classList.remove("show"), dwell);
  }

  function speak(text) {
    showSubtitle(text);               // captions always (accessibility)
    if (!enabled || !supported) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    // warm female delivery: unhurried but not sluggish, lowered pitch for warmth
    u.rate = 0.9; u.pitch = 0.8; u.volume = 1;
    u.onstart = () => eq.classList.add("speaking");
    u.onend = () => eq.classList.remove("speaking");
    u.onerror = () => eq.classList.remove("speaking");
    speechSynthesis.speak(u);
  }

  function setEnabled(on) {
    enabled = on;
    btn.setAttribute("aria-pressed", String(on));
    stateEl.textContent = on ? "ON" : "OFF";
    if (!on && supported) { speechSynthesis.cancel(); eq.classList.remove("speaking"); }
    if (on) {
      speak("I'm Drasa. Stay with me, and scroll slowly. I'll show you the sky we've been quietly losing.");
    }
  }

  btn.addEventListener("click", () => setEnabled(!enabled));
  if (!supported) { stateEl.textContent = "CAPTIONS"; btn.title = "Voice not supported here — captions will guide you"; }

  return { speak, isEnabled: () => enabled };
})();

// Back-compat alias so any older reference keeps working.
window.ARIA = window.DRASA;
