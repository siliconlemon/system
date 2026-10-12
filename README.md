<p align="center"><img src="docs/lockups.png" alt="System lockups" width="888"></p>

# System

A Swiss-minimal, blueprint-style template for brand manuals, landing pages and design systems. It covers web, apps, type and marketing, and comes with a skill that sets it up per project.

## Status

First template build in `site/`: a static page with no build step, served from `site/` on Vercel. The agreed design direction is in [docs/findings.md](docs/findings.md).

- `site/index.html`: cover plus sheets 01–18, each a 1440 px artboard as tall as its content
- `site/css/system.css`: tokens, the 8 px grid, ruler lines, the print layer (paper, ink gain, registration, crop marks), every component
- `site/assets/paper.png`: the paper texture tile, 512 px drawn at 256
- `site/js/canvas.js`: the pannable, zoomable canvas the artboards float on, ported from Viewgraft
- `site/js/system.js`: with/without flags, theme, type tester, the bar cells, runt control
- `site/strings/en.js`, `site/strings/cs.js`: every string on the page, by key. English is the source, the markup carries the key and the English as a fallback
- `site/system.pdf`, `site/system.cs.pdf`: the manual as one PDF per language, a page per sheet at its real size. The PDF button links to the one for the language
- `scripts/pdf.py`: renders both PDFs with headless Chrome or Edge. Rerun it after changing a sheet or a string
- `scripts/strings.py`: checks the string resources: every used key exists, every language has every key, nothing unused, the fallbacks match

## House rules

- Paper over tech. When a choice could go modern-tech or 90s printed sheet, take the sheet.
- Four faces: Overused Grotesk for display, Hanken Grotesk for text, Azeret Mono for measuring, Courier Prime italic for one highlighted line a sheet. All OFL.
- Big type sits on the rulers by its ink, not its box: system.js measures the first glyph and pulls it onto the line.
- Print effects never filter or blend, and motion only moves transform and opacity. Panning has to stay smooth.
- Ruler lines mark the content edges only: the outer margins, the title column and the center.
- Big type, body copy and pictures sit flush on a ruler line. Small legend text keeps `--inset` clear of it.
- Rectangles everywhere, the bars included. No pills.
- No block ends on a line with one or two words. In Czech no line ends on a one-letter word either.
- Every string is a resource. New copy gets a key in `strings/en.js` and every other language file, then `python scripts/strings.py` passes.

## Next

- Dense and breathing variants of each sheet, so the designer picks the density per project.
- The sweep of Viewgraft and jobka-web-reference, then the skill and the script snippets.
