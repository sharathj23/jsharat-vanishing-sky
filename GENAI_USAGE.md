# GenAI Usage Log — "The World After Dark"
### Submitted for the Analyticon 2026 "Best Use of GenAI" award

This entry treated GenAI (Claude, via the Kiro IDE) as a **virtual teammate** across
the full pipeline — discovery, engineering, narrative, and QA — while every factual
claim was verified against primary peer-reviewed sources by a human. This log records
*how* GenAI was used and, importantly, *where human judgment overrode it*.

---

## 1. Topic discovery & framing
- Brainstormed candidate angles within "How the world lives, thrives, and connects,"
  filtered against topics already claimed by the team and a scan of a competing
  entrant's public submission log (to avoid the crowded "unpaid-labor / time-use" lane).
- GenAI proposed the **"lost Milky Way"** angle and stress-tested it against the
  five judging criteria before we committed.
- **Human decision:** chose this topic over a more build-heavy "planetary heartbeat"
  concept specifically because of the 6-day timeline — a risk call GenAI surfaced but
  the human made.

## 2. Data discovery & verification
- GenAI identified the authoritative sources: **Falchi et al. 2016 (Science Advances)**
  and **Kyba et al. 2023 (Science)**, plus the Bortle scale and NASA VIIRS.
- Headline figures (33% / 60% / 80% / 83% / 9.6%/yr) were **cross-checked by a human
  against the papers' abstracts** before being embedded. Country/city values are the
  published atlas estimates, rounded — documented in `build_data.py`.
- GenAI wrote `build_data.py` as a provenance + validation harness so the numbers are
  reproducible, not asserted.

## 3. Code generation
- The **canvas star-field engine** (`starfield.js`) — star magnitude cutoff, Milky Way
  puff-field, light-pollution dome, meteors — was generated and iteratively debugged
  with GenAI.
- **D3** world choropleth, animated big-stat counter, and generational-loss line chart
  scaffolded by GenAI, then tuned by hand for palette + accessibility.
- **Scrollama** wiring that syncs scroll position → live sky state → narration.

## 4. Narrative & copywriting
- GenAI drafted the 9-act arc and Drasa's per-act narration script, then revised for
  concision (removing em-dash/run-on crutches, tightening to spoken cadence).
- **Human edit pass:** rewrote several lines for emotional restraint and to make sure
  the hopeful Act 7 ("recoverable pollution") landed before the call to action.

## 5. Accessibility & QA
- GenAI ran an accessibility checklist: WCAG-AA contrast on the palette, keyboard focus
  on map countries, `aria-live` subtitles, `prefers-reduced-motion` fallbacks, chart
  `role="img"` + summaries.
- Adversarial review: GenAI was asked to attack its own headline claims ("is 33%
  defensible? what does the paper actually say?") and hedge anything unsupported.

## 6. The Drasa voice
- GenAI implemented the zero-dependency Web Speech narrator (tuned to a warm, husky
  female delivery) and documented the compliant upgrade path to **Amazon Polly Neural /
  Nova Sonic**, so voice generation can stay
  on AWS infrastructure for internal use.

---

### Honest limitations
- Country/city values are **atlas-derived published estimates**, rounded for display —
  not a fresh raster computation. `build_data.py` documents the exact re-derivation
  path (`--from-raster`) for anyone who wants cell-level precision.
- Web Speech voice quality varies by browser; subtitles guarantee the narrative
  regardless of audio.

**Bottom line:** GenAI compressed roughly a week of solo engineering + writing into a
few days, but every published number was human-verified and every emotional beat was
human-tuned. GenAI was the teammate; the editorial judgment stayed human.
