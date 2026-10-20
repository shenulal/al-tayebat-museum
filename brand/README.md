# Al Tayebat International City — brand files

Emblem: the museum seen from Rayhanat Al Jazirah Street, reduced to the five things that make it unmistakable — stacked teak rawasheen, the pointed door, the crenellated roofline, the minaret with its green cap, and the green dome. The dashed line is the route through the houses.

Colours: teak #3a2316 (ink), dome green #2d6b50, plaster #faf6ee (paper).
Type in the lockups: Amiri 700, Playfair Display 500, Inter 500 — all converted to outlines, no fonts needed to render.

| File | Use |
|---|---|
| logo.svg | Horizontal lockup, teak on light backgrounds |
| logo-on-teak.svg | Same lockup, plaster on a teak panel |
| logo-on-ink.svg | Plaster lockup, transparent, for dark footers |
| logo-stacked.svg | Centred lockup for covers and signage |
| logo-compact.svg | Emblem with the short bilingual name, for small spaces |
| logo-mark.svg | Emblem only; `currentColor` drives the teak, so it recolours with CSS |
| favicon.svg | Emblem on a rounded plaster tile |
| emblem-inline.svg | The `<g>` used as an inline `<symbol>` in index.html; set `--logo-bg` to the background colour so the lattice cuts show |

Regenerate: `pip install uharfbuzz fonttools` then `python3 source/make_logo.py <output-dir>` (fonts in source/fonts, all under the SIL Open Font License).
