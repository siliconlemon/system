# System

A Swiss-minimal, blueprint-style template for brand manuals, landing pages and design systems. It covers web, apps, type and marketing, and comes with a skill that sets it up per project.

## Status

First template build in `site/`: a static page with no build step, served from `site/` on Vercel. The agreed design direction is in [docs/findings.md](docs/findings.md).

- `site/index.html`: cover plus sheets 01–16
- `site/css/system.css`: tokens, the 8 px grid, ruler lines, every component
- `site/js/system.js`: with/without flags, theme, type tester, the goo bars, runt control

## House rules

- Paper over tech. When a choice could go modern-tech or 90s printed sheet, take the sheet.
- Ruler lines mark the content edges only: the outer margins, the title column and the centre.
- Big type, body copy and pictures sit flush on a ruler line. Small legend text keeps `--inset` clear of it.
- Rectangles everywhere. The only round shapes are the blobs inside the top and bottom bars.
- No block ends on a line with one or two words.

## Next

- Sheets float as artboards on a pannable grid canvas, like the JOBka and Viewgraft manuals.
- Bottom bar: All, EN/CZ and zoom controls.
- Top bar: breadcrumbs and a PDF download.
- Dense and breathing variants of each sheet, so the designer picks the density per project.
- The sweep of Viewgraft and jobka-web-reference, then the skill and the script snippets.
