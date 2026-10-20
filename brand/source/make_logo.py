"""Generate the Al Tayebat logo family as SVG.

The emblem is the museum seen from Rayhanat Al Jazirah Street, cut down to the
five things that make it unmistakable: the stacked teak rawasheen, the pointed
door, the crenellated roofline, the minaret with its green cap, the green dome.
Wordmarks are converted to outlines (HarfBuzz shaping + fontTools pens) so the
files render identically everywhere.
"""
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = Path(__file__).parent
OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

TEAK = "#3a2316"
GREEN = "#2d6b50"
PLASTER = "#faf6ee"


def text_path(text, font_file, size, features=None):
    """Return (svg path d, advance width) for `text` set at `size` px, baseline at y=0."""
    data = Path(font_file).read_bytes()
    face = hb.Face(data)
    font = hb.Font(face)
    upem = face.upem
    font.scale = (upem, upem)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, features or {})
    tt = TTFont(font_file)
    glyph_set = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    scale = size / upem
    pen = SVGPathPen(glyph_set)
    x = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        tpen = TransformPen(pen, (scale, 0, 0, -scale, (x + pos.x_offset) * scale, -pos.y_offset * scale))
        glyph_set[name].draw(tpen)
        x += pos.x_advance
    return pen.getCommands(), x * scale


# ---------- the emblem (viewBox 0 0 120 140) ----------
def emblem(ink="currentColor", green=GREEN, house_fill="none", cut=PLASTER):
    teeth = "M38 60 " + " ".join(f"L{38 + i * 12 + 6} 54 L{38 + (i + 1) * 12} 60" for i in range(6))
    roshan = []
    for (x, y, w, h) in [(46, 66, 20, 15), (46, 86, 20, 15), (46, 106, 20, 14), (90, 72, 13, 12), (90, 94, 13, 12)]:
        roshan.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{ink}"/>')
        # lattice cut into the box: two thin lines and a cross, in the background colour
        roshan.append(f'<path d="M{x} {y + h / 3:.1f} H{x + w} M{x} {y + 2 * h / 3:.1f} H{x + w} M{x + 2} {y + 2} L{x + w - 2} {y + h - 2} M{x + w - 2} {y + 2} L{x + 2} {y + h - 2}" stroke="{cut}" stroke-width="1" stroke-opacity="0.9" fill="none"/>')
    return f'''<g id="tyb-mark" stroke-linejoin="round" stroke-linecap="round">
  <!-- dome -->
  <path d="M70 58 A18 18 0 0 1 106 58 Z" fill="{green}"/>
  <path d="M88 40 V33" stroke="{ink}" stroke-width="2.4"/>
  <circle cx="88" cy="30" r="2.4" fill="{ink}"/>
  <!-- house -->
  <path d="M38 60 V124 H110 V60" fill="{house_fill}" stroke="{ink}" stroke-width="3"/>
  <path d="{teeth}" fill="{house_fill}" stroke="{ink}" stroke-width="3"/>
  <!-- rawasheen -->
  {''.join(roshan)}
  <!-- door -->
  <path d="M71 124 V110 Q71 100 78 97 Q85 100 85 110 V124 Z" fill="{ink}"/>
  <!-- minaret -->
  <path d="M18 124 V50 H32 V124" fill="{house_fill}" stroke="{ink}" stroke-width="3"/>
  <rect x="14" y="72" width="22" height="5" fill="{ink}"/>
  <rect x="21" y="40" width="8" height="10" fill="{house_fill}" stroke="{ink}" stroke-width="3"/>
  <path d="M13 40 H37 L25 18 Z" fill="{green}"/>
  <path d="M25 18 V12" stroke="{ink}" stroke-width="2.4"/>
  <circle cx="25" cy="9.5" r="2.4" fill="{ink}"/>
  <!-- street -->
  <path d="M8 124 H112" stroke="{ink}" stroke-width="3"/>
  <path d="M8 131 H112" stroke="{ink}" stroke-width="1.4" stroke-dasharray="4 3"/>
</g>'''


AR_FONT = HERE / "fonts/Amiri.ttf"
EN_FONT = HERE / "fonts/Newsreader.ttf"
SM_FONT = HERE / "fonts/HankenGrotesk.ttf"

ar_d, ar_w = text_path("مدينة الطيبات العالمية", AR_FONT, 34)
en_d, en_w = text_path("Al Tayebat International City", EN_FONT, 30)
sm_d, sm_w = text_path("Museum of Science and Knowledge · Jeddah", SM_FONT, 12.5)
short_ar_d, short_ar_w = text_path("الطيبات", AR_FONT, 44)
short_en_d, short_en_w = text_path("Al Tayebat", EN_FONT, 30)


INK = "#19120d"

def svg(width, height, body, bg=None, color=TEAK):
    rect = f'<rect width="{width}" height="{height}" fill="{bg}"/>' if bg else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img" aria-label="Al Tayebat International City" color="{color}">
{rect}
{body}
</svg>
'''


# 1. Mark only (and favicon)
(OUT / "logo-mark.svg").write_text(svg(120, 140, emblem()))
(OUT / "favicon.svg").write_text(svg(140, 140, f'<rect width="140" height="140" rx="22" fill="{PLASTER}"/><g transform="translate(10 0)">{emblem()}</g>'))

# 2. Horizontal lockup: emblem left, three lines right
text_x = 150
def lockup(cut):
    return f'''<g transform="translate(0 6)">{emblem(cut=cut)}</g>
<g transform="translate({text_x} 52)"><path d="{ar_d}" fill="currentColor"/></g>
<g transform="translate({text_x} 96)"><path d="{en_d}" fill="currentColor"/></g>
<g transform="translate({text_x} 122)"><path d="{sm_d}" fill="currentColor" fill-opacity="0.72"/></g>
<path d="M{text_x} 106 H{text_x + max(ar_w, en_w, sm_w):.0f}" stroke="currentColor" stroke-width="1" stroke-opacity="0.35"/>'''
W = int(text_x + max(ar_w, en_w, sm_w) + 16)
(OUT / "logo.svg").write_text(svg(W, 152, lockup(PLASTER)))
(OUT / "logo-on-teak.svg").write_text(svg(W, 152, lockup(TEAK), bg=TEAK, color=PLASTER))
(OUT / "logo-on-ink.svg").write_text(svg(W, 152, lockup(INK), color=PLASTER))

# 3. Stacked lockup: emblem centred over the name
cw = max(ar_w, en_w, sm_w) + 40
cx = cw / 2
body = f'''<g transform="translate({cx - 60:.1f} 0)">{emblem()}</g>
<g transform="translate({cx - ar_w / 2:.1f} 190)"><path d="{ar_d}" fill="currentColor"/></g>
<g transform="translate({cx - en_w / 2:.1f} 232)"><path d="{en_d}" fill="currentColor"/></g>
<path d="M{cx - 60:.0f} 246 H{cx + 60:.0f}" stroke="currentColor" stroke-width="1" stroke-opacity="0.35"/>
<g transform="translate({cx - sm_w / 2:.1f} 266)"><path d="{sm_d}" fill="currentColor" fill-opacity="0.72"/></g>'''
(OUT / "logo-stacked.svg").write_text(svg(int(cw), 284, body))

# 4. Compact lockup for small spaces: emblem + short bilingual name
body = f'''<g transform="translate(0 0) scale(0.6)">{emblem()}</g>
<g transform="translate(86 40)"><path d="{short_ar_d}" fill="currentColor"/></g>
<g transform="translate(86 74)"><path d="{short_en_d}" fill="currentColor"/></g>'''
(OUT / "logo-compact.svg").write_text(svg(int(86 + max(short_ar_w, short_en_w) + 10), 86, body))

# 5. Emblem markup for inlining in the page (no fixed colours but the dome green)
(OUT / "emblem-inline.svg").write_text(emblem(cut="var(--logo-bg, #faf6ee)"))

print("written:", ", ".join(p.name for p in sorted(OUT.glob("*.svg"))))
print(f"lockup width {W}px; arabic {ar_w:.0f}px, english {en_w:.0f}px, small {sm_w:.0f}px")
