# 🌌 The World After Dark

### *How the world lives beneath a vanishing sky*
**Analyticon 2026 · VizCon — theme: "How the world lives, thrives, and connects"**

> For 200,000 years, every human who ever lived looked up and saw the same river of stars. Most people alive today never will.

An interactive, cinematic data story about the night sky humanity is losing — guided by **Drasa**, a JARVIS-style AI narrator with a warm, husky female voice. As you scroll, the real star field behind the text dims in real time until the Milky Way disappears, exactly as it has for **one in three people on Earth**.

---

## The "I had no idea" hook
- **33%** of humanity — including **60% of Europeans** and **~80% of North Americans** — can no longer see the Milky Way.
- **83%** of the world lives under light-polluted skies.
- Sky brightness is rising **~9.6% every year**: a child born seeing 250 stars sees fewer than 100 by adulthood.
- Yet it's the **only pollution that vanishes the instant we switch off a light.**

---

## How it scores against the rubric

| Criterion | Weight | How this entry earns it |
|---|---|---|
| **Data Storytelling & Impact** | 30% | A 9-act narrative arc: shared inheritance → loss → interactive proof → personal city → generational trend → hope → call to look up. Emotional, memorable, universal. |
| **Discovery & Innovation** | 25% | The live canvas sky that *dims the actual Milky Way as you scroll* is a format few will attempt. Drasa voice narration turns a dashboard into a guided experience. |
| **Visual Design & Aesthetics** | 20% | Cinematic dark theme, custom star-field engine, glowing choropleth, animated stat + loss line. Cohesive palette, "Cormorant" display serif + "Inter" body. |
| **Data Quality & Inclusivity** | 15% | Every figure cited to Falchi 2016 / Kyba 2023 (peer-reviewed). WCAG-AA palette, keyboard-navigable map, live subtitles for narration, `prefers-reduced-motion` honored, alt text on all visuals. |
| **Technical Execution & Engagement** | 10% | Scrollytelling + 3 interactives (Bortle simulator, world map, city picker), zero-backend, polished transitions, works offline for the voice via Web Speech. |

---

## Run it locally
Easiest (no server — works even when a security agent blocks `localhost`):

```bash
cd analyticon_2026_world_after_dark
python build_selfcontained.py
# then double-click dist/world_after_dark.html
```

Or run the Streamlit app (the submission host):

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Then click **Drasa voice** (top-right) to enable the husky-voiced narration, and scroll. Use the **left constellation nav** to travel between sections — Genesis · The Dimming · Skydial · Glow Map · Your Night · **Stardust** · About. The **Stardust** tab holds the personal story (childhood memories, the "we're made of stardust" hook, and the *Leo & Liam* short story) with a human face rendered from thousands of star particles that dissolve into the sky, plus a lifetime "fading sky" slider.

> Tip: Chrome/Edge give the best voice. If sound is off or unsupported, on-screen subtitles narrate every line — nothing is lost.

**Deploying for submission?** See **`DEPLOY.md`** — Streamlit Community Cloud (like last year's winner) or GitHub Pages, step by step.

---

## Project structure
```
analyticon_2026_world_after_dark/
├── index.html          # the story (9 acts, semantic + accessible)
├── css/styles.css      # cinematic dark theme, AA-contrast palette
├── js/
│   ├── data.js         # all figures, each traceable to a cited source
│   ├── starfield.js    # canvas engine: stars + Milky Way + light-pollution dome
│   ├── narration.js    # Drasa voice (Web Speech, husky female) + captions
│   ├── hud.js          # JARVIS boot sequence + live HUD telemetry
│   ├── stardust.js     # "Stardust" tab: particle face + fading-sky slider
│   └── main.js         # constellation nav + panels + world map + charts
├── streamlit_app.py    # Streamlit host (deploy to Community Cloud)
├── inline_build.py     # bundles the site into one self-contained HTML string
├── build_selfcontained.py  # writes dist/world_after_dark.html (portable single file)
├── requirements.txt    # streamlit (for Community Cloud)
├── .streamlit/config.toml  # dark theme + hidden chrome
├── build_data.py       # data provenance / validation / JSON emit
├── DEPLOY.md           # step-by-step hosting guide
├── GENAI_USAGE.md      # workflow log for the "Best Use of GenAI" award
└── README.md
```

Validate the data any time:
```bash
python build_data.py --check
python build_data.py --emit-json   # optional: writes data/*.json
```

---

## Data sources (cited in-story too)
1. **Falchi, F. et al. (2016).** *The new world atlas of artificial night sky brightness.* Science Advances 2(6):e1600377. — country shares, 83% / 33% / 60% / 80% figures.
2. **Kyba, C. C. M. et al. (2023).** *Citizen scientists report global rapid reductions in the visibility of stars, 2011–2022.* Science 379:265–268. — ~9.6%/yr growth.
3. **Bortle, J. E. (2001).** *Introducing the Bortle Dark-Sky Scale.* Sky & Telescope. — the 9-class simulator.
4. **NASA VIIRS Day-Night Band ("Black Marble").** — lit-Earth night imagery reference.
5. **Our World in Data** — population weighting. **International Dark-Sky Association** — Dark Sky Places.

---

## Accessibility notes
- Palette contrast checked to **WCAG AA** on the dark base (body text ≥ 7:1).
- Full **keyboard navigation** on the world map (each country is focusable, with `aria-label`).
- Narration has an always-on **subtitle track** (`aria-live="polite"`).
- **`prefers-reduced-motion`** disables twinkle, meteors, and chart animation.
- All charts carry descriptive `role="img"` + `aria-label` summaries.

---

## Drasa — the voice, and the compliant production path
Drasa is the AI guide, styled after a JARVIS-like assistant but with a warm, smooth, slightly husky **female** voice. The shipped version uses the browser's built-in `SpeechSynthesis` (preferring voices like Samantha / Microsoft Aria) so it runs anywhere with **no API keys and no data leaving the machine**. For a truer husky-smooth timbre, `js/narration.js` documents a drop-in upgrade to **Amazon Polly Neural** (e.g. "Ruth"/"Danielle") or **Amazon Nova Sonic** via a small signed endpoint — keeping voice generation on AWS infrastructure, the compliant choice. The per-act narration script is already SSML-ready.

## Visitor / login logging (real identity)
`visitor_log.py` records who opens the project (timestamp, identity, name, IP, user agent) to `logs/visits.csv` and the host log console. **Real identities are captured automatically** when the app is deployed behind Midway / an ALB-OIDC listener / Harmony: it decodes the `x-amzn-oidc-data` JWT and common SSO headers (`x-forwarded-user`, etc.). It also supports Streamlit native login (`st.user`) and `?viewer=<alias>` tags for public share links.

View the log privately at **`/?admin=1`** — access is gated: only the owner (verified by SSO identity, aliases in `_OWNERS`) or someone holding the secret `ADMIN_TOKEN` (set in `.streamlit/secrets.toml`) can see it. Everyone else gets "Not authorized."
