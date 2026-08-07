"""
convert_heic.py — one-off: convert the author's HEIC dark-sky photo to a
web-friendly, high-quality JPEG. HEIC does not render in Chrome/Firefox/Edge,
so the site needs a JPEG.

- Applies EXIF orientation (so the photo isn't sideways).
- Preserves clarity: high JPEG quality, 4:4:4 chroma (no color subsampling),
  only downscales if the longest edge is very large (keeps it crisp but light).
"""
import os
from PIL import Image, ImageOps
import pillow_heif

pillow_heif.register_heif_opener()

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "assets", "my-dark-sky.HEIC")
DST = os.path.join(HERE, "assets", "my-dark-sky.jpg")

MAX_EDGE = 2200  # plenty sharp for full-width display; avoids a huge file

img = Image.open(SRC)
img = ImageOps.exif_transpose(img)          # honour camera rotation
if img.mode != "RGB":
    img = img.convert("RGB")

w, h = img.size
longest = max(w, h)
if longest > MAX_EDGE:
    scale = MAX_EDGE / longest
    img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)

img.save(DST, "JPEG", quality=90, subsampling=0, optimize=True, progressive=True)

out_kb = os.path.getsize(DST) / 1024
print(f"Source : {w}x{h}  ({os.path.getsize(SRC)/1024:.0f} KB HEIC)")
print(f"Saved  : {img.size[0]}x{img.size[1]}  ({out_kb:.0f} KB JPEG)  -> {DST}")
