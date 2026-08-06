"""
build_selfcontained.py — write ONE portable HTML file to dist/.
Use this if you'd rather submit a self-contained package than a hosted URL.
Open dist/world_after_dark.html directly in any browser (needs internet only
for the pinned CDN libraries and the world-map TopoJSON).

    python build_selfcontained.py
"""
import os
from inline_build import build_inline_html

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "dist")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    html = build_inline_html()
    out = os.path.join(OUT_DIR, "world_after_dark.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Wrote {out}  ({len(html):,} chars)")


if __name__ == "__main__":
    main()
