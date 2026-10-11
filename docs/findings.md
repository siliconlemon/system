# Findings

Agreed in the planning chat, 2026-10-09. Repo: `GIT/Personal/system` (github.com/siliconlemon/system, private).

## Goal

- A full sweep of **Viewgraft** (`GIT/Personal/viewgraft`) and **jobka-web-reference** (`GIT/Skeleton/jobka-web-reference`) covering features, behaviours, perf optimizations and scripts.
- Output: a **standalone template** plus a **skill**, with scripts included as snippets.
- The existing skill in misc is a reference only. It's weak and not standalone, so this replaces it rather than building on it.
- Lean on Viewgraft's setup (landing page + design manual + brand files + scripts). Both projects are useful sources.
- Universal use case: web, apps, type, marketing. Generic, with more screens than any one project needs. Every section is optional.
- The full sweep brief is still to come. The first template build (`site/`) runs on these notes alone.

## Visual direction: Swiss minimal blueprint

- **Infinite ruler lines:** thin hairlines that run edge to edge and past the content, like construction lines on a blueprint. Light gray or a faint tint. Diagonals are optional accents.
- **Mostly monochrome:** off-white or paper-gray background, near-black text, mid-gray secondary text. **A drop of colour:** one accent on a single block, key word or active state.
- **Type-led:** a neo-grotesk (Helvetica/Inter-like). Huge tight headlines against small labels, flush-left, lots of whitespace, few or no boxes, borders or shadows.
- **Annotations as UI:** spec labels (pt sizes, hex values, measurements), dimension lines with ticks. The page reads as a technical drawing.
- **Restraint:** no gradients, no soft rounded cards. At most a light paper or noise grain.
- Inspos (Zeka "Swiss Design", 1962 Fiat page, "Swiss Style 1950" poster, "Minimal+" spec sheet, metaball "Geometry" poster) set the mood only. Don't copy them.

### Sketch shapes (hairline, blueprint style)

- Construction circles with radius and angle marks, arcs, partial rings (3/4 circle)
- Dimension lines with ticks and arrows, crop marks, registration targets
- Golden-ratio and modular grid overlays, diagonals through key points
- Wireframe primitives: phone and browser frames, isometric boxes, nodes and connectors
- Type diagrams: baseline, cap height and x-height guides over large letters
- Metaball / bridged-circle geometry (from the Geometry poster)

### Picture placeholders

Systems usually have pictures, so the template ships placeholders in two styles:

- **Drafting frames:** plain rectangles where the edge lines overshoot the corners a little, like pencil construction marks on a technical drawing. They're always **filled with a slight gray and diagonally crossed** (corner to corner). Optionally add a dimension label (e.g. `16:9 · 1200 × 675`) and crop marks. This style suits smaller illustrations and thumbnails especially.
- **Flat illustrations:** simple flat scenes in the Viewgraft style, but in **shades of gray only**, not colourful. The single accent colour may show up as one small detail at most.

Real client imagery swaps in via the with/without flag (see below).

## Cover (screen 0)

- Typography is the main thing, like the Fiat page but less overkill.
- One huge tight wordmark or project name, possibly cropped by the page edge or a grid line.
- Small spec text tucked into the counters and gaps (version, date, descriptor, index).
- Monochrome, with the accent on one element at most.
- Blueprint lines and dimension marks measuring the big type.
- Optional variant: Fiat-style stacked layers.

## Screens and sections

0. Cover (type-led)
1. Landing page: hero, features, how it works, showcase, pricing/CTA, FAQ, footer
2. Manual index / contents
3. Logo: construction, clear space, minimum size, lockups, variants, misuse
4. Colour: palette (hex/RGB/CMYK), proportion bar, contrast pairs, light/dark
5. Typography: specimen, scale, pairings, weights, live type tester
6. Grid and layout: columns, spacing scale, breakpoints
7. Iconography and illustration: stroke rules, sketch-shape library
8. Imagery: photo treatment (duotone/accent), crops, do and don't
9. UI components: buttons, inputs, cards, nav, states, tokens
10. App screens: device mockups, flows, onboarding, empty/error/loading
11. Motion: easing, durations, demos
12. Voice and tone: naming, writing rules, vocabulary
13. Marketing: social posts/stories, OG images, banners, posters, email header, slides
14. Print and stationery: business card, letterhead, merch
15. Downloads: brand files page (ZIPs, SVG/PNG, tokens as JSON/CSS)
16. Utility: 404, changelog, legal, press kit stub

## With / without modes

Swiss minimal still works when the client brings nothing, because type and grid carry the identity. Each asset type gets a config flag. When an asset is missing, its section hides or swaps to a fallback, never an empty placeholder.

| Asset        | With                                  | Without                                                   |
| ------------ | ------------------------------------- | --------------------------------------------------------- |
| Logo         | construction, clear space, lockups    | typographic wordmark (face, tracking, weight rules); type-only cover |
| Icons        | grid, stroke, sizes                   | template's hairline sketch icons, or a type-only rule (labels/numerals) |
| Imagery      | treatment rules (duotone/accent)      | drafting frames or gray flat illustrations, blueprint shapes, big type |
| Colour       | brand colours mapped to tokens        | grays + one accent picked at setup                        |
| Illustration | framed brand art                      | sketch-shape library                                      |

The skill asks "what do you have?" up front and sets the flags.

## Bars and canvas

- Sheets are 1440 px artboards, as tall as their content, on a pannable, zoomable canvas, like the Viewgraft manual. Phones pinch and pan the same artboards, no reflow.
- The canvas carries a uniform grid of register crosses fixed to it, every 400 px from the first sheet's top-left corner. Each sheet's left edge sits on it, and each row starts on a grid line. The crosses are drawn on a canvas snapped to device pixels, so lines stay 1 px at any zoom.
- Sheet names are always one word. The top bar crumb chains them onto the wordmark like Viewgraft's: System.logo, System.colour, plain System. on the overview.
- Top and bottom bars run full width, glued to the screen edges. The top bar holds the crumb, the theme and the PDF. The bottom bar only moves you: sheet cells and zoom, centred.
- Phones follow Viewgraft: All, a pager whose arrows never move, zoom bottom right, and only the current theme up top, a tap moves on.
- Tap or click a sheet you are not on and the canvas flies to it, even over a link or a switch.
- The PDF is a file rendered by `scripts/pdf.py`, like Viewgraft's, not a print dialog.
- The bottom bar is a row of rectangular cells split by hairlines. One ink block with an accent top edge marks the current cell. When it moves, the leading edge runs ahead and the trailing edge follows, so it wipes across like a shutter. Labels use `mix-blend-mode: difference`, so they invert where the block passes.
- Logo sheet after Viewgraft's: lockups A to E (primary, stacked, on ink, reversed, mark only) and clear space of half the mark height around, two thirds after the name. The horizontal lockups centre on that clear space, so the open end of the word gets its room. The mark alone sits on its optical centre: the square outweighs the circle, so it shifts 7.2 units (3% of its width) left, shown with rulers on the sheet.
- The goo blob was dropped: round pills do not fit a Swiss sheet.

## Plumbing (to confirm in the sweep)

- Brand scripts as snippets (asset export, font wait)
- Manual top and bottom bars, navigation
- Theming tokens, dark mode, perf work, Vercel config
