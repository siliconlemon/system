# The sheets

Nineteen sheets, `00 cover` to `18 utility`. Ids are the `<section id>`, which is what `prune.py --keep` takes. The cover and the contents always stay.

## Minimum per surface

Start here, then add a sheet only when the brief gives it something real to say.

| Project | Start with |
| --- | --- |
| Any project | cover, contents, color, type, grid |
| Has a logo, or needs one | + logo |
| Marketing site | + landing, imagery or icons (whichever carries the pages), voice |
| Web or mobile app | + ui, app, motion if anything moves, icons |
| Backoffice or internal tool | + ui, app. Drop landing, marketing and print |
| Physical presence: shop, studio, events | + print, marketing |
| Others will build from it | + downloads, utility |
| Long-form reading: docs, editorial | + text, and mono if there is code or data |

`type` (display), `text` and `mono` are three separate sheets because System uses three families. A brand with one family folds them into `type`: keep `type` and drop the other two, or keep `text` only when body setting needs its own rules.

## Catalogue

| Id | Shows | Keep when | Rewrite for the project |
| --- | --- | --- | --- |
| `cover` | The wordmark large, with cap-height and baseline guides, a lede and the surfaces | Always | The name, the lede and the surfaces line. The cover should show the idea at a glance. |
| `contents` | The sheet index, the with/without switches and what each falls back to | Always | Nothing by hand: `prune.py` renumbers it. Cut the switch for a flag whose sheets are gone. |
| `landing` | A landing page mock: nav, headline, one action, three reasons | There is a marketing site | The real headline, the real action and the product's own three reasons |
| `logo` | Construction, clear space, optical center, lockups A–E, wordmark, rules. With `without`, a typographic wordmark | Always, unless the name has no mark and won't get one | The mark's own geometry and its reasoning. Lockups only in the layouts the project uses. |
| `color` | Swatches with HEX, RGB and CMYK, proportion bar, contrast pairs | Always | The palette, named from the idea rather than "primary/secondary", with real proportions and pairs that pass contrast |
| `type` | Display face: rules, scale, tester, weights | Always | The project's display face, its scale and its rules |
| `text` | Body face: setting, scale, ink, weights | Reading matters, or the body face differs from the display face | The body face, line length and paragraph rules |
| `mono` | Mono for measuring, the one highlighted line, the start-from-type fallback | Code, data or spec labels are part of the brand | The mono face, or cut it |
| `grid` | Columns, the spacing scale and breakpoints | Always | The unit, the columns and the breakpoints the code will use |
| `icons` | Anatomy, the set, glyph cells (`without`), sketch shapes | The product shows icons | The real set (Lucide, Carbon, Phosphor or custom), its grid and stroke, and its sizes |
| `imagery` | Photo treatment or drafting frames (`without`) | Pictures carry the brand | The treatment: crop, tone, duotone, do and don't, with the client's own pictures |
| `ui` | Buttons, chips and checks, fields, cards, tokens, tabs | There is a product UI | The product's own components, with the class names the code will use |
| `app` | Device frames with welcome, empty, loading and error states | There is an app or a web app | The product's real screens and states, with real copy |
| `motion` | Curves with click-to-play demos: standard, enter, detent, spring | Anything moves | The curves the code will use, as tokens, with durations |
| `voice` | Rules and before-and-after rewrites | Copy matters: marketing, onboarding, errors | Rewrites of the product's own sentences |
| `marketing` | Social post, story, OG image, banner | The brand posts or advertises | The formats actually used, filled with real campaigns |
| `print` | Business card and letterhead in millimeters, CMYK and bleed | Paper exists | Only the items that exist |
| `downloads` | The brand files list: logo package, tokens, fonts, this manual | Others will build from it | Real files and real sizes, or cut it |
| `utility` | 404, changelog, favicon and its rules | A website ships | The project's 404 and favicon, and the deck's real changelog |

## Flags

| Flag | `with` | `without` |
| --- | --- | --- |
| `logo` | Construction, clear space, lockups. Print uses the mark | A typographic wordmark with face, tracking and weight rules, and a type-only cover |
| `icons` | The set, its anatomy and grid | Mono glyph cells and sketch shapes |
| `imagery` | Treatment rules over the client's pictures | Drafting frames, blueprint shapes and big type |

Content for one state carries `data-when="logo"` or `data-when="no-logo"`, and the same pattern for icons and imagery. A deck for a client who will never have the asset deletes the other branch instead of keeping it switchable.
