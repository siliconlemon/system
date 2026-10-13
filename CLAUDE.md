# System

A template for starting the design of a new app, website or business: a zoomable deck of brand and product sheets in plain HTML, CSS and JS, with the scripts that cut it down, check it and render it to PDF. It is for the prototyping phase, before real code. It has more sheets than any one project needs, by design.

## Two kinds of session

**Starting a project's design** ("make the design for X", "set up the brand for the repo at Y"): follow [skills/design-deck/SKILL.md](skills/design-deck/SKILL.md). The deck goes into the target project, never into this repo. If the user hasn't named a target repo or folder, ask.

**Working on the template itself** (a sheet, a component, the canvas, the scripts): the rules below apply. Every sheet stays generic, every flag keeps a fallback, and the skill's references in `skills/design-deck/references/` must stay true. When you change a sheet's id, a token, a script flag or the markup pattern, update them.

## Commands

```bash
python scripts/strings.py                 # must pass after any copy change
python scripts/pdf.py                     # 16 PDFs: en and cs, each with every set of flags
python scripts/pdf.py en                  # one language only
python scripts/prune.py --list            # the sheets and their ids
python scripts/release.py --check         # ready to tag: version, ?v=, full PDFs, none stale
python scripts/release.py --bump X.Y.Z    # set the version and every ?v=, rerender stale PDFs
```

Preview: the `site` entry in `.claude/launch.json` serves `site/` on port 5178.

## House rules

- Paper over tech. When a choice could go modern-tech or 90s printed sheet, take the sheet.
- Four faces: Overused Grotesk for display, Hanken Grotesk for text, Azeret Mono for measuring, Courier Prime italic for one highlighted line a sheet.
- Rectangles everywhere, the bars included. No pills.
- Ruler lines mark the content edges only. Big type, body copy and pictures sit flush on a ruler line. Small legend text keeps `--inset` clear of it.
- Print effects never filter or blend, and motion only moves transform and opacity. Panning has to stay smooth.
- Every string is a resource: a key in `strings/en.js` and every other language file.
- No block ends on a line with one or two words. In Czech no line ends on a one-letter word either.
- The version in `.claude-plugin/plugin.json` and every `?v=` in `site/index.html` are always the same; `release.py --bump` sets both and rerenders the PDFs, and CI fails when they differ. The version is the newest tag or one step after it (after 1.0.1: 1.0.2, 1.1.0 or 2.0.0), so a pending bump is never bumped past. A release is an annotated `X.Y.Z` tag (no v) on main matching that version, its message one brief sentence on what the release is about, any lines after it following as they are; CI publishes it with the full PDF per language. The notes stay editable on GitHub after a release, the tag and the PDFs do not. Rerun `pdf.py` when a sheet or a string changes.
