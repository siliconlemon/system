<p align="center"><img src="docs/lockups.png" alt="System lockups" width="888"></p>

# System

A starting point for designing a brand, a website or an app. It is a design manual you can zoom around, with every decision a product needs laid out on sheets of paper: the logo, the colors, the type, the grid, the icons, the buttons, the screens, how things move, how the words sound, even the business card.

**See it live:** [siliconlemon-system.vercel.app](https://siliconlemon-system.vercel.app)

## Start familiar, then make it yours

System is dressed in Swiss style: big tight type, thin lines, lots of white space, one strong color. It is one of the most copied looks in design, and that is the point. You start from something you already know works, then turn it into your own.

Don't keep it as it is. A manual that is only System with new colors still looks like System. Find something that belongs to your project and let it change the sheets:

- **What does your project do?** A plant shop could name its colors after soil, leaf and bloom. A game could number its sheets like levels.
- **Pick one shape that's only yours,** such as a cut corner, a dot or a tab, and use it on the logo and on the buttons alike.
- **Pick one rule you'll keep everywhere,** such as one color per page, only round corners, or everything on a 4 px grid.
- **Throw out what you don't need.** System has 19 sheets because it tries to cover every project. Yours probably needs five to eight.

Hide your name on the cover. If the page could still belong to someone else, keep going.

## What's inside

| Sheet | What it decides |
| --- | --- |
| Cover, Contents | The name, and the list of everything that follows |
| Landing | What the first page of the website says and does |
| Logo | How the logo is built, how much room it needs, and how not to use it |
| Color | The palette, how much of each color, and which pairs are readable |
| Display, Text, Mono | The typefaces for headings, for reading and for numbers and labels |
| Grid | Columns, spacing and screen sizes |
| Icons, Imagery | The icon set and how pictures are treated |
| Components | Buttons, fields, cards and tabs |
| Apps | Screens for welcome, empty, loading and error |
| Motion | How things move, with curves you can click to play |
| Voice | How the product talks, with before-and-after sentences |
| Marketing, Print | Social posts, banners, business card and letterhead |
| Downloads, Utility | Brand files to hand out, the 404 page and the favicon |

A few things come with every sheet:

- **No logo yet? No pictures?** The switches on the contents sheet swap in clean fallbacks, so there are no empty boxes.
- **Light and dark**, in English and Czech.
- **A PDF of whatever you're looking at.** The PDF button downloads the manual with the same switches and language you have on screen.
- **It works on a phone.** Pinch and drag around the sheets.

It is plain HTML, CSS and JavaScript with nothing to install or build. The files look like what you'd export from Figma, and you can drop them into any website.

## Set up in Claude Code

System comes with a skill: a set of instructions that teaches Claude how to turn the template into your project's own design. The skill asks about your project, picks the sheets you need, helps you find your idea, and builds the manual in your project's folder.

**Option 1: install it as a plugin.** Do this once, and the skill works in every project. In Claude Code, run:

```
/plugin marketplace add siliconlemon/system
/plugin install system@system
```

Then open your project and say:

```
Start the design for this project with the design-deck skill.
```

You can tell it more right away, too:

```
Start the design for this project. It's a <what it is, in one sentence>.
We have <a logo / nothing yet>, and it should feel <two or three words>.
```

**Option 2: make your own copy.** Click **Use this template** at the top of this page on GitHub. You get a fresh repo of your own, with none of this one's history or settings. Open Claude Code inside it and tell it where your project lives, or just start changing things.

Either way, your design is made in your project, and you can keep coming back to System for reference.

**Without Claude:** make your own copy as above and open `site/index.html` in a browser. Change the colors and fonts at the top of `site/css/system.css`, and the words in `site/strings/en.js`.

## Under the hood

- `site/`: the manual itself. `index.html` holds the sheets, `css/system.css` the colors, fonts and every component, `strings/` every word in every language, and `js/` the zoomable canvas and the controls.
- `scripts/`: small Python helpers. `prune.py --keep logo,color,type` cuts the manual down to the sheets you name. `strings.py` checks that no word is missing in any language. `pdf.py` renders the PDFs.
- `skills/design-deck/`: the skill, with notes on every sheet, on making a design your own, and on how the files fit together.

The fonts are Overused Grotesk, Hanken Grotesk, Azeret Mono and Courier Prime, all free under the SIL Open Font License.
