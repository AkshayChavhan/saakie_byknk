#!/usr/bin/env python3
"""Generate the PWA / home-screen icons from the side-menu wordmark.

Run from the repo root:  python3 scripts/generate-icons.py

Why this exists, and why it centres the way it does
---------------------------------------------------
`public/images/saakieLogo.png` is the wordmark the side menu shows. Despite the
extension it is a JPEG, 14173x7087, with a black background baked in and a
maroon swash sweeping behind the letters.

Centring on the image's pixel bounds puts the wordmark visibly high and left,
because the swash reaches further down and left than the letters do:

    content incl. swash (lum > 10)   centre (6612, 3910)
    the letters alone   (lum > 90)   centre (7040, 3466)   <- what the eye reads

So the letters are isolated by brightness and *their* centre is what gets
pinned to the middle of the tile. The rest of the source is pasted along with
them, so the swash still appears — it simply no longer drags the composition
off centre. Anything past the tile edge is cropped, which is invisible because
the source background and the canvas are both pure black.

Pure black is also the manifest's `background_color`, so the icon, its splash
screen and the letterboxing all agree and there is no seam.

Requires Pillow (`pip install Pillow`). The previous Node version of this
script was removed: it pointed at `public/images/saakie.jpg`, which no longer
exists in the repo, and `sharp` is not resolvable from this project.
"""

# Builtin generics in annotations (`tuple[int, ...]`) need this on Python 3.8,
# which is what this machine runs.
from __future__ import annotations

from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

SRC = Path("public/images/saakieLogo.png")
ICONS_DIR = Path("public/icons")

# Brightness above which a pixel counts as part of the wordmark rather than the
# swash or JPEG noise. 90 and 140 give an identical box, so the letters are
# cleanly separated from everything else and the exact value is not delicate.
LETTER_THRESHOLD = 90

BACKGROUND = (0, 0, 0)


def letter_box(image: Image.Image) -> tuple[int, int, int, int]:
    """Bounding box of the white lettering, ignoring the swash behind it."""
    mask = image.convert("L").point(lambda v: 255 if v > LETTER_THRESHOLD else 0)
    box = mask.getbbox()
    if box is None:
        raise SystemExit(f"No lettering found in {SRC} above luminance {LETTER_THRESHOLD}")
    return box


def render(source: Image.Image, box, size: int, letter_width: float, out: Path) -> None:
    """Square icon with the lettering `letter_width` wide and dead centre.

    `letter_width` is a fraction of the tile: it constrains the *letters*, not
    the whole source image, which is what keeps every icon optically the same
    weight regardless of how much swash happens to surround it.
    """
    left, top, right, bottom = box
    scale = (size * letter_width) / (right - left)

    scaled = source.resize(
        (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
        Image.LANCZOS,
    )

    # Where the letters' centre landed after scaling, and the offset that moves
    # it to the middle of the tile.
    centre_x = ((left + right) / 2) * scale
    centre_y = ((top + bottom) / 2) * scale

    canvas = Image.new("RGB", (size, size), BACKGROUND)
    canvas.paste(scaled, (round(size / 2 - centre_x), round(size / 2 - centre_y)))

    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, "PNG", optimize=True)
    print(f"  {out}  ({size}x{size}, letters {letter_width:.0%} wide)")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source image: {SRC}")

    source = Image.open(SRC).convert("RGB")
    box = letter_box(source)
    print(f"Source {source.size}, lettering {box[2] - box[0]}x{box[3] - box[1]} at {box}")

    # Regular icons: the wordmark is long, so 78% still reads comfortably while
    # leaving margin on the sides.
    render(source, box, 192, 0.78, ICONS_DIR / "icon-192.png")
    render(source, box, 512, 0.78, ICONS_DIR / "icon-512.png")

    # Maskable: Android may crop to a circle inscribed in the middle 80% of the
    # tile. At the wordmark's ~4:1 ratio, 60% wide keeps every corner of the
    # lettering inside that circle with room to spare.
    render(source, box, 512, 0.60, ICONS_DIR / "maskable-512.png")

    # Apple rounds the corners itself and never crops to a circle.
    render(source, box, 180, 0.76, ICONS_DIR / "apple-icon-180.png")

    # Next.js file conventions — these produce the <link rel="icon"> tags.
    render(source, box, 512, 0.78, Path("app/icon.png"))
    render(source, box, 180, 0.76, Path("app/apple-icon.png"))


if __name__ == "__main__":
    main()
