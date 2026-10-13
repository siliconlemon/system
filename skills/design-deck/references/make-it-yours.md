# Make it yours

The template's reusable parts are its plumbing: the canvas, the bars, the strings, the flags, the PDFs and the sheet structure. Its look, the Swiss blueprint on paper, is System's own brand. A deck that keeps that look and swaps the accent is still System.

## Find the idea

1. **Take it from the product's domain, not from design vocabulary.** What does the product do, what material or practice is it close to, and what words do its users use? "Clean and modern" is not an idea. "Grafting a scion onto rootstock" is one.
2. **Turn it into moves you can point at.** An idea that doesn't change a token name, a header, a shape or a habit is only a mood. Aim for three to five moves.
3. **Let the idea decide which parts of System go.** Rulers, paper grain, mono labels and crop marks belong to a technical drawing. Keep them only if the brand is close to one.
4. **Find the brand's own constraint.** Every strong deck has a rule that a generic one wouldn't: one accent per sheet, everything on a 4 px grid, no straight corners, numbering from an older manual.

## Two real decks built on the same plumbing

**Viewgraft** is a CLI and web tool that maps app screens into trees.
- The idea is grafting. The palette is `--root`, `--canopy`, `--scion`, `--shoot`, `--paper` and `--night`, so the token names tell the story before the colors do.
- Page headers read like a chain in its `.graft` file format, with colored arrows, so the manual speaks the product's syntax.
- The wordmark is kerned by hand, and typed arrows are replaced with an icon.
- The sheets are the product: workbench, CLI, terminal, `.graft` files, labels and edges, the export workspace. There is no generic "components" sheet; the real UI is built from `.vg-*` components with light and dark tokens, sized in em so they move into the app as they are.
- It skips grid, imagery, motion, voice, marketing, print and downloads, because the product didn't need them.
- Its scripts generate what the sheets show: lockups in every layout and theme, favicons with a keyline that gets heavier as the size drops, and a logo sync.

**JOBka web reference** is a design manual for a job platform that already had an official printed manual.
- Fidelity over invention: sheets keep the official manual's numbering (1.1 to 6.3), a pink section tab hangs from the top edge as it does in print, and the footer carries the claim.
- The brand is pink and rounded. The opposite of System's look, on the same canvas.
- Real constraints: the display face is optically centered with `ascent-override` and `descent-override`, there is a separate backoffice palette, and the render fails if a font is missing from the PDF.
- Theme switching darkens only the canvas; the pages keep the brand's colors, because the brand has no dark mode.
- It skips grid, marketing, print, downloads and utility.

Both decks dropped more than half of what System offers, and both use the sheets they kept to show their own product.

## The cover test

Hide the name on the cover and ask whether this could be another client's deck. If it could, the idea isn't in the deck yet. Signs of a deck that is only System with new colors:

- Token names are still `--accent` and `--ink-2`, with nothing from the idea
- The ledes are System's sentences with the name swapped
- The demo components are buttons and cards, not the product's own things
- Every sheet is still there
- The rulers and crop marks are there because they were there before

## Moves to reach for

- **Name things from the domain:** tokens, sheet titles, the crumb in the top bar (`Name.logo`), section numbers.
- **Change the frame:** the sheet header, the section marker, the footer, or how a page number reads.
- **One owned shape:** a corner, a cut, a tab, a dot, used on the logo and the UI alike.
- **One owned rhythm:** the unit, the column count, or how type sits on lines.
- **One owned habit in copy:** how buttons are worded, how errors speak, a word the brand never uses.
- **Theme behavior that fits:** a real dark theme, or none, or one that darkens only the canvas.
