---
name: design-deck
description: Start the design of a new app, website or business from the System template - a zoomable deck of brand and product sheets (logo, color, type, grid, icons, imagery, components, app states, motion, voice, marketing, print, downloads) in plain HTML, CSS and JS, with PDFs per language. Interviews for the brief, cuts the template down to the sheets the project needs, finds the brand's own idea before touching tokens, and rebuilds the kept sheets around the real product so the result is not System with new colors. Use for "design manual", "brand manual", "design system", "style guide", "design deck", "prototype the look", "brand for my new app/web/startup", "set up the design before we code", "make this template ours", "navrhni značku", "design manuál", "grafický manuál".
---

# Design deck from the System template

The template is a bazooka: 19 sheets for every surface a brand could have. Most projects need a butter knife. Your job is to hand over the smallest deck that settles the decisions the build needs, and to make it look like the project, not like System.

## Where things are

- **Template:** `${CLAUDE_PLUGIN_ROOT}` when this runs as an installed plugin. When the session runs inside the template repo itself, it is the repo root. Either way it holds `site/` (the deck) and `scripts/` (`prune.ts`, `strings.ts`, `pdf.ts`). The scripts are TypeScript and need Node 22.18 or newer, which runs them as they are; check `node --version` before the scaffold.
- **Target:** the new project's repo. If the user has not said where it is, ask. The deck goes in `<target>/design/`, unless the user names another folder or `design/` is already taken (Kotlin and Android projects often use it). Then ask.
- **References**, read when the step says so:
  - [references/sheets.md](references/sheets.md): what each sheet is for, when to keep it, and what to rewrite in it
  - [references/make-it-yours.md](references/make-it-yours.md): how to find the brand's idea, with two real decks as examples
  - [references/anatomy.md](references/anatomy.md): files, tokens, markup, strings, flags, PDFs, and the plumbing not to break

## Workflow

### 1. Read before asking

Look at the target repo first: README, package.json or equivalent, existing CSS, Tailwind config or tokens, `public/` and asset folders, any old manual or PDF. Note what already exists: a logo, colors, fonts, screens, copy, languages. Never ask for what you can read.

### 2. Brief: one round of questions

Ask only what the repo didn't answer, in a single round (use AskUserQuestion if you have it):

- What it is, in one sentence, and who it is for
- Surfaces: marketing site, web app, mobile app, backoffice, print, social
- What exists: logo, icon set, photography or illustration, colors, fonts
- Languages
- Two or three words for how it should feel, and one brand it must not look like
- Is this a prototype to decide the direction, or a manual someone builds from?

### 3. Pick the sheets

Read [references/sheets.md](references/sheets.md). Start from the minimum for the surfaces, then add a sheet only when the brief gives it something real to say. A sheet with nothing project-specific on it is cut, not kept "for later": `prune.ts` can't bring it back, but the template still has it.

Set the three flags from what exists: logo, icons, imagery, each `with` or `without`. Without one, its sheets show the template's fallback (wordmark, glyph cells, drafting frames) instead of a hole.

Show the plan before building: the sheets kept, with one line each on what it shows for this project; the flags; the languages. Wait for a yes.

### 4. Find the idea before the tokens

Read [references/make-it-yours.md](references/make-it-yours.md). Write `design/CONCEPT.md`, under a page:

- **The idea:** one sentence, taken from the product's own domain, not from design vocabulary
- **Signature moves:** three to five concrete things the idea produces, such as token names, a header pattern, a shape, a way of numbering, or a texture
- **Kept from System and replaced:** a line each

Test it: hide the name on the cover. If the deck could belong to another client, the idea isn't in it yet. Recoloring and swapping fonts doesn't pass this test.

### 5. Scaffold

1. Copy the template's `site/` and `scripts/` into `<target>/design/`. Delete the template's `system*.pdf` files from the copy.
2. Run `node design/scripts/prune.ts --keep <ids>` (`--list` shows the ids). It renumbers the sheets and the contents and drops the strings nothing uses.
3. Rename System everywhere it is the template's own name; [references/anatomy.md](references/anatomy.md) lists every place. That covers the wordmark, title and meta, the `system:` storage keys, the PDF file stem in `pdf.ts` and `system.js`, the favicon, the link preview (`og.png` and the `og:` tags, with the project's own address), and the footer.
4. Set the flag defaults on `<html data-logo data-icons data-imagery>`.
5. Languages: keep `strings/en.js` as the source, add or delete the other language files, and update the language switch and the `?lang=` pattern in the head script.
6. Add a `.claude/launch.json` entry that serves `design/site`, so the deck can be previewed.

### 6. Build it out, sheet by sheet

Tokens first: both themes in `:root`, the faces, the accent, the unit if the idea needs a different rhythm. After that, go through every kept sheet, cover first:

- Real content only: the product's name, its screens, its copy, its states, its numbers. No lorem ipsum, no "Acme".
- Replace the template's demo components with the product's own, such as its table, its card or its empty state, and use the names the code uses.
- Keep the plumbing working: every new string is a key in every language file, motion animates only transform and opacity, and `?v=` is bumped on a release.
- Keep it smooth. However good the design, a deck that stutters on a pan or a zoom loses the room, so smoothness is part of what you hand over, not a polish pass at the end. No heavy filters, blurs or big shadows over large areas, no images far bigger than they show, and nothing that restyles every sheet while the view moves.
- Change the look as far as the idea asks. The Swiss blueprint layer (rulers, paper grain, crop marks, register crosses) is System's own identity. Keep it only if it suits this brand.

### 7. Verify

- `node design/scripts/strings.ts` passes.
- Preview every sheet in light and dark, at desktop size and at phone width. Check the bars, the flags, the language switch and the zoom.
- Pan, pinch and double-click zoom on a phone, or with the CPU throttled 4× in DevTools. It has to stay smooth; if it stutters, find what the sheets added that the template didn't, and fix that before handing over.
- Run `node design/scripts/pdf.ts` and open one PDF: fonts are embedded and every sheet is on its own page.
- Run the cover test from step 4 again.

### 8. Hand over

Write `design/README.md`: what the deck decides, how to preview it and render the PDFs, and how the tokens and components move into the real code. The CSS custom properties copy over as they are. Hand over the link, not the files.

## Don't

- Ship all 19 sheets because they exist.
- Recolor System and call it a brand.
- Invent assets the client has, or claim ones they don't (that is what the flags are for).
- Leave template copy in: "System", its ledes, its demo names.
- Touch `canvas.js` or the bars to change the look. Restyle with CSS, and see what anatomy.md says the plumbing needs.
- Hand over a deck that looks right and moves badly. Choppy is broken.
