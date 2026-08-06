# 🚀 Deploy & Preview — The World After Dark

**Submission deadline: August 10.** Submission format: a hosted web app URL
(Streamlit / cloud) or a self-contained package. This project supports both.

---

## ✅ Fastest preview (no server, works around the localhost block)
Your corporate security agent resets `localhost` connections, so skip the server.
Build the single-file bundle and just open it:

```bash
cd analyticon_2026_world_after_dark
python build_selfcontained.py
```

Then **double-click `dist/world_after_dark.html`** (or drag it into Chrome/Edge).
It needs internet only for the pinned CDN libraries + world map. Click
**ARIA voice** (top-right) and scroll.

> Chrome/Edge give the best JARVIS voice. With sound off, subtitles narrate every line.

---

## 🏆 Recommended submission: Streamlit Community Cloud (free public URL)
Same host last year's winner used (`*.streamlit.app`).

### 1. Test locally (optional)
```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

### 2. Push to GitHub
Put the whole `analyticon_2026_world_after_dark/` folder in a **public** GitHub repo.
Minimum files needed for the app to run:
```
streamlit_app.py
inline_build.py
requirements.txt
index.html
css/styles.css
js/data.js  js/starfield.js  js/narration.js  js/hud.js  js/main.js
.streamlit/config.toml
```

### 3. Deploy
1. Go to **share.streamlit.io** → *New app*.
2. Pick your repo/branch, set **Main file path** = `streamlit_app.py`.
3. Deploy. You get a public URL like `https://sharath-world-after-dark.streamlit.app`.
4. Submit that URL before **Aug 10**.

> Tip: In the app's *Settings → Sharing*, make sure it's public so judges can open it.

---

## Alternative hosts (all work — pick what you're comfortable with)

| Host | Best for | Notes |
|---|---|---|
| **Streamlit Community Cloud** | Matching the winner, zero cost | Recommended. `streamlit_app.py` is ready. |
| **GitHub Pages** | Pure static (no Python) | Push repo, enable Pages, point at `/` — `index.html` serves directly. Free public URL `*.github.io`. |
| **AWS Amplify Hosting / S3 + CloudFront** | AWS-native | Upload the folder as a static site. Compliant, but more setup than needed here. |
| **Amazon internal (Harmony)** | Internal-only sharing | Fine if judges are internal; a public URL is simpler for judging. |

Because the experience is just static HTML/JS/CSS, **GitHub Pages is the simplest
non-Streamlit option**: no build, no Python — just serve `index.html`.

---

## What to put in the submission form
- **Title:** The World After Dark — How the world lives beneath a vanishing sky
- **Author:** Sharath
- **Live URL:** your Streamlit (or Pages) link
- **Nominate for:** Best Use of GenAI → attach / link `GENAI_USAGE.md`
- **Data sources:** listed in `README.md` and in-story footer (Falchi 2016, Kyba 2023, NASA VIIRS, OWID, IDA)

---

## Pre-submission checklist
- [ ] `python build_data.py --check` passes
- [ ] `python build_selfcontained.py` opens cleanly in a browser
- [ ] ARIA voice toggles on; subtitles appear
- [ ] Bortle slider, world map hover, city picker all respond
- [ ] Tested on a phone width (layout stacks) and with keyboard (Tab through map)
- [ ] Public URL opens in an incognito window (confirms it's really public)
