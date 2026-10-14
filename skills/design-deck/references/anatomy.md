# Anatomy

Plain HTML, CSS and JS with no build step, so any site can take the files as they are, and the markup reads like a Figma export. The scripts are TypeScript, which Node 22.18 or newer runs as it is, with nothing to install.

## Files

```
site/
  index.html          every sheet, in order, each a <section> after a banner comment
  css/system.css      tokens, the grid, the print layer, every component
  js/canvas.js        the pannable, zoomable canvas, the boards and the PDF page sizes
  js/system.js        flags, theme, language, the type tester, the bar cells, PDF link, runt control
  js/types.d.ts       the types canvas.js and system.js share, for the type check only. No page loads it
  strings/en.js       every string by key. English is the source
  strings/cs.js       every other language, the same keys
  assets/             the display font, the paper tile, the favicon, og.png (the link preview)
  system*.pdf         rendered by pdf.ts, one per language and flag set
scripts/
  prune.ts            cut sheets, renumber, drop unused strings
  strings.ts          check the strings against the page. Must pass
  pdf.ts              render the PDFs with headless Chrome or Edge
  package.json        marks the scripts as ES modules, so they run the same in any project
```

## Tokens (`:root` in system.css)

| Token | What it does |
| --- | --- |
| `--u` | The 8 px unit. Heights, gaps and the spacing scale are multiples of it |
| `--inset` | How far small labels keep from a ruler line |
| `--cols`, `--gap`, `--gut`, `--max` | The 12-column grid, its gap, the outer margin, and the 1440 px sheet |
| `--paper`, `--sheet`, `--canvas` | The page, the board and the desk the boards lie on |
| `--ink`, `--ink-2`, `--ink-3` | Text, secondary text and quiet text |
| `--rule`, `--rule-2`, `--fill`, `--fill-2` | Hairlines and flat fills |
| `--accent`, `--on-accent` | The one color, and the text that sits on it |
| `--display`, `--sans`, `--mono`, `--feature` | Display, text, mono and the one highlighted line |
| `--ease`, `--detent`, `--t` | The standard curve, the toggle curve with its overshoot, and the base duration |

The dark theme overrides the colors twice: under `prefers-color-scheme: dark` for `auto`, and under `[data-theme="dark"]`. Change both. Rename tokens freely once the idea calls for it, and update every use.

## A sheet

```html
<!-- ============ 07 Name ============ -->
<section class="sheet wrap" id="name">
  <div class="grid sheet-head">
    <span class="sheet-no"><b>07</b> / 18</span>
    <h2 class="sheet-title" data-i18n="name.title">Name</h2>
    <span class="sheet-tag label" data-i18n="name.tag">Tag</span>
    <p class="sheet-lede" data-i18n="name.lede">One or two sentences on what this sheet decides.</p>
  </div>
  <div class="grid row-gap">
    <div class="c-6">
      <div class="block-head"><span class="label ink" data-i18n="name.block">Block</span><span class="label">Spec</span></div>
      ...
    </div>
  </div>
</section>
```

- The banner comment is how `prune.ts` finds the sheet. Keep the format.
- The sheet title is one word: it names the cell in the bottom bar and the crumb in the top bar (`System.logo`).
- `c-1` to `c-12` span columns, `row-gap` spaces rows, and `block-head` is the labelled rule over a block.
- To add a sheet, add its row to the contents too. Then `node scripts/prune.ts --renumber` numbers the sheets and the contents in order.

## Strings

- Every visible string is a key: `data-i18n="sheet.thing"` on the element, with the English inside as a fallback.
- Attributes use `data-i18n-attr="aria-label=key title=key"`. Inline markup needs `data-i18n-html`.
- Key names: `sheet.thing`, with `common.thing` for copy shared across sheets. Split a key by context when a word translates differently.
- After any copy change, `node scripts/strings.ts` must pass: every key exists in every language, nothing is unused, and the fallbacks match `en.js`.
- Languages: the switch in the top bar (`data-lang-set`), the `?lang=` pattern and the browser-language fallback in the head script of `index.html`, and `LANGS` in `pdf.ts`.

## Flags

- `<html data-logo="with" data-icons="with" data-imagery="with">` holds the defaults. A visitor's switches are saved in localStorage, and `?without=logo,icons` sets them for one visit.
- Content for one state carries `data-when="logo"` or `data-when="no-logo"`, and likewise for icons and imagery. CSS shows only the matching branch.
- A new flag needs: the attribute on `<html>`, a switch on the contents sheet, the `data-when` CSS rules, `FLAGS` in `system.js` and in `pdf.ts`, and the defaults in the head script.

## PDFs

- `node scripts/pdf.ts [lang ...]` renders one PDF per language and flag set: 2 languages × 8 flag sets = 16 files. Each sheet is one page at its real size.
- Names: `system[.<lang>][.no-<flags>].pdf`, with English unmarked. The PDF button builds the same name from the current language and switches, so the download matches the screen.
- The script fails if a font didn't embed. Fonts load from Google Fonts, so it needs a connection.
- When a flag is gone for good, drop it from `FLAGS` in both places, which halves the number of files.

## Renaming System

`grep -rn -i system design/site design/scripts` and change every hit that is the template's own name:

- The wordmark (`cover-word`, `bar-name`, the landing nav, print, footer) and the `#lockup` and `#mark` symbols in the SVG sprite at the top of `index.html`
- `<title>`, `meta.title`, `common.slug` and the `print.*` contact details
- The `system:` localStorage keys in the head script and `system.js`
- The PDF stem in `pdf.ts` and in `pdfLink()` in `system.js`
- The favicon in `assets/`
- The link preview: `assets/og.png`, 1200 × 630, and the `og:` tags in the head of `index.html`, whose image and page addresses are absolute and point at the template's live deck
- Optionally the file names `system.css` and `system.js`, and their links

"Design system" in copy is a phrase, not the name. Leave it.

## Plumbing to keep

- **Performance:** a deck that stutters loses the appeal whatever the design, so smoothness is a core part of the deliverable. Motion animates only `transform` and `opacity`, and print effects never filter or blend. Panning and zooming have to stay smooth on a phone.
- **Line weights:** `--line` and `--line-2` come from `--k`, the zoom in device pixels. While the view moves, `canvas.js` steps `--k` on the boards on screen only, not on the whole deck, so a step restyles one or two boards instead of all of them. That only works because `main.deck > .board` repeats the `--line` declarations. A new line token derived from `--k` goes in both places.
- **Cache:** bump every `?v=` in `index.html` on a release, so no browser pairs new markup with an old stylesheet.
- **The canvas:** each `<section>` in `<main>` becomes a board. Don't nest sections. `canvas.js` measures the boards, so change their look in CSS, not in the script.
- **The bars:** the bottom bar's cells come from the sheet titles. The ink block (`Seg` in `system.js`) measures real cell edges, so restyle the cells in CSS and leave the measuring alone.
- **Ruler lines and type on lines:** `system.js` pulls large type onto the ruler by its ink. If the idea drops the rulers, remove the `.rules` layer in CSS and the type keeps working.
- **Types:** `canvas.js` and `system.js` run under `// @ts-check`, with their types in JSDoc comments and `types.d.ts`. A type is a comment or a cast and never changes what runs, so keep them that way when editing. The template checks them with `tsc`; a project that wants the same check copies `tsconfig.site.json` from the template.
- **Runts:** `noRunts()` keeps one- and two-word last lines from happening, and in Czech, one-letter words at line ends. Keep it for any language that needs it.

## Preview and deploy

- `.claude/launch.json` serves the deck: `npx -y serve@14.2.4 design/site -l <port>`.
- `vercel.json` sets `outputDirectory` to the site folder and turns off caching for css, js and assets.
