"""
inline_build.py — bundle the multi-file site into ONE self-contained HTML string.

Used by:
  - streamlit_app.py     (renders the bundle inside a Streamlit component)
  - build_selfcontained.py (writes dist/world_after_dark.html for a package submission)

It inlines local CSS and JS (in the correct order) and leaves the pinned CDN
libraries (d3, topojson, scrollama, fonts) as external <script>/<link> tags —
those load fine from any host and keep the bundle small.
"""

import os
import re
import base64
import mimetypes

HERE = os.path.dirname(os.path.abspath(__file__))

# local JS files in load order (must match index.html)
JS_ORDER = ["js/data.js", "js/starfield.js", "js/narration.js", "js/hud.js", "js/stardust.js", "js/main.js"]
CSS_FILE = "css/styles.css"


def _read(rel):
    with open(os.path.join(HERE, rel), "r", encoding="utf-8") as f:
        return f.read()


def build_inline_html():
    html = _read("index.html")

    # 1) inline stylesheet
    css = _read(CSS_FILE)
    html = html.replace(
        '<link rel="stylesheet" href="css/styles.css" />',
        f"<style>\n{css}\n</style>",
    )

    # 2) inline each local script (keep CDN <script src="https://..."> intact)
    for rel in JS_ORDER:
        code = _read(rel)
        pattern = re.compile(r'<script src="%s"></script>' % re.escape(rel))
        html = pattern.sub(lambda m: f"<script>\n{code}\n</script>", html)

    # 2b) inline local images (e.g. assets/my-dark-sky.jpg) as data URIs so the
    #     single-file bundle is fully self-contained. CDN/remote images are left
    #     alone; missing local files are left as-is (the onerror fallback covers them).
    def _inline_img(m):
        quote, rel = m.group(1), m.group(2)
        path = os.path.join(HERE, rel)
        if not os.path.isfile(path):
            return m.group(0)
        mime = mimetypes.guess_type(path)[0] or "image/jpeg"
        with open(path, "rb") as fh:
            b64 = base64.b64encode(fh.read()).decode("ascii")
        return f'src={quote}data:{mime};base64,{b64}{quote}'

    html = re.sub(r'src=(["\'])((?!https?:|data:)[^"\']+\.(?:jpg|jpeg|png|gif|webp|svg))\1',
                  _inline_img, html, flags=re.IGNORECASE)

    # 3) progressive enhancement: let the Streamlit component iframe fill the window
    fit = """
<script>
(function () {
  function fit() {
    try {
      var fe = window.frameElement;
      if (fe && window.parent) {
        fe.style.height = window.parent.innerHeight + "px";
        fe.style.width = "100%";
        fe.setAttribute("scrolling", "yes");
      }
    } catch (e) { /* cross-origin: harmless, falls back to fixed height */ }
  }
  fit();
  window.addEventListener("resize", fit);
  setTimeout(fit, 400); setTimeout(fit, 1200);
})();
</script>
"""
    html = html.replace("</body>", fit + "\n</body>")
    return html


if __name__ == "__main__":
    print(f"Bundle size: {len(build_inline_html()):,} chars")
