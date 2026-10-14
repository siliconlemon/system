# System

A template for starting the design of a new app, website or business: a zoomable deck of brand and product sheets in plain HTML, CSS and JS, with the TypeScript scripts that cut it down, check it and render it to PDF. It is for the prototyping phase, before real code. It has more sheets than any one project needs, by design.

## Two kinds of session

**Starting a project's design** ("make the design for X", "set up the brand for the repo at Y"): follow [skills/design-deck/SKILL.md](skills/design-deck/SKILL.md). The deck goes into the target project, never into this repo. If the user hasn't named a target repo or folder, ask.

**Working on the template itself** (a sheet, a component, the canvas, the scripts): the rules below apply. Every sheet stays generic, every flag keeps a fallback, and the skill's references in `skills/design-deck/references/` must stay true. When you change a sheet's id, a token, a script flag or the markup pattern, update them.

## Commands

```bash
npm install                             # once: TypeScript, for the check only
npm run check                           # tsc over the scripts and the deck
node scripts/strings.ts                 # must pass after any copy change
node scripts/pdf.ts                     # 16 PDFs: en and cs, each with every set of flags
node scripts/pdf.ts en                  # one language only
node scripts/prune.ts --list            # the sheets and their ids
node scripts/release.ts --check         # ready to tag: version, ?v=, full PDFs, none stale
node scripts/release.ts --bump X.Y.Z    # set the version and every ?v=, rerender stale PDFs
```

The scripts need Node 22.18 or newer, which runs `.ts` as it is. Preview: the `site` entry in `.claude/launch.json` serves `site/` on port 5178. Show the user changes there, on localhost, not on the Vercel site, which lags behind the work.

## House rules

- Paper over tech. When a choice could go modern-tech or 90s printed sheet, take the sheet.
- Four faces: Overused Grotesk for display, Hanken Grotesk for text, Azeret Mono for measuring, Courier Prime italic for one highlighted line a sheet.
- Rectangles everywhere, the bars included. No pills.
- Ruler lines mark the content edges only. Big type, body copy and pictures sit flush on a ruler line. Small legend text keeps `--inset` clear of it.
- Print effects never filter or blend, and motion only moves transform and opacity. Panning has to stay smooth.
- TypeScript without a build. The scripts are `.ts` that Node runs directly, so only syntax Node can erase: no enums, namespaces or parameter properties. The deck stays `.js` under `// @ts-check`, its types in JSDoc and `site/js/types.d.ts`. A type is a comment or a cast, never a change to what runs. `npm run check` passes after any change to either.
- Every string is a resource: a key in `strings/en.js` and every other language file.
- No block ends on a line with one or two words. In Czech no line ends on a one-letter word either.
- The version in `.claude-plugin/plugin.json` and every `?v=` in `site/index.html` are always the same; `release.ts --bump` sets both and rerenders the PDFs, and CI fails when they differ. The version is the newest tag or one step after it (after 1.0.1: 1.0.2, 1.1.0 or 2.0.0), so a pending bump is never bumped past. A release is an annotated `X.Y.Z` tag (no v) on main matching that version, its message one brief sentence on what the release is about, any lines after it following as they are; CI publishes it with the full PDF per language. The notes stay editable on GitHub after a release, the tag and the PDFs do not. Rerun `pdf.ts` when a sheet or a string changes.
