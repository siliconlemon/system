# System

A Swiss-minimal, blueprint-style template for brand manuals, landing pages and design systems. It covers web, apps, type and marketing, and comes with a skill that sets it up per project.

## Status

First template build in `site/`: a static page with no build step, served from `site/` on Vercel. The agreed design direction is in [docs/findings.md](docs/findings.md).

- `site/index.html`: cover plus sheets 01–16, each a 1440 px artboard as tall as its content
- `site/css/system.css`: tokens, the 8 px grid, ruler lines, every component
- `site/js/canvas.js`: the pannable, zoomable canvas the artboards float on, ported from Viewgraft
- `site/js/system.js`: with/without flags, theme, type tester, the bar cells, runt control
- `site/system.pdf`: the manual as one PDF, a page per sheet at its real size. The PDF button links to it
- `scripts/pdf.py`: renders `site/system.pdf` with headless Chrome or Edge. Rerun it after changing a sheet

## House rules

- Paper over tech. When a choice could go modern-tech or 90s printed sheet, take the sheet.
- Ruler lines mark the content edges only: the outer margins, the title column and the centre.
- Big type, body copy and pictures sit flush on a ruler line. Small legend text keeps `--inset` clear of it.
- Rectangles everywhere, the bars included. No pills.
- No block ends on a line with one or two words.

## Next

- Bottom bar: EN/CZ.
- Dense and breathing variants of each sheet, so the designer picks the density per project.
- The sweep of Viewgraft and jobka-web-reference, then the skill and the script snippets.
