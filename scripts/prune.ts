/* Cut the manual down to the sheets a project needs. The template carries every sheet a brand and product could
want; most decks need a third of them.

    node scripts/prune.ts --list
    node scripts/prune.ts --keep logo,color,type,text,grid,ui
    node scripts/prune.ts --drop marketing,print,downloads --site path/to/site
    node scripts/prune.ts --renumber

Sheets are named by their section id (--list shows them). The cover and the contents always stay. What it does:

- removes the dropped sheets from index.html
- renumbers the rest, 01 / NN on each sheet, the contents list and the cover's sheet range, and rebalances the
  contents into two even columns
- points demo links at a dropped sheet to the cover
- deletes the strings nothing uses any more from every language file

The CSS of a dropped sheet stays: it costs nothing, and the sheet can come back. Run scripts/strings.ts after, then
scripts/pdf.ts.
*/
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

const USAGE = "usage: node scripts/prune.ts (--keep IDS | --drop IDS | --list | --renumber) [--site DIR]";
let args;
try {
  ({ values: args } = parseArgs({ options: {
    site: { type: "string", default: resolve(import.meta.dirname, "..", "site") },
    keep: { type: "string" },   // comma-separated sheet ids to keep, the rest go
    drop: { type: "string" },   // comma-separated sheet ids to drop
    list: { type: "boolean" },  // list the sheets and exit
    renumber: { type: "boolean" }, // drop nothing, only renumber, after adding or moving a sheet
  } }));
} catch (e) {
  console.error(`${USAGE}\n${(e as Error).message}`);
  process.exit(2);
}
if ([args.keep, args.drop, args.list, args.renumber].filter((v) => v !== undefined).length !== 1) {
  console.error(`${USAGE}\none of --keep, --drop, --list or --renumber is required, and only one`);
  process.exit(2);
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// as Python reads text: every line ends in \n
const read = (path: string) => readFileSync(path, "utf-8").replace(/\r\n?/g, "\n");

const SITE = args.site;
const page = join(SITE, "index.html");
let src = read(page);

// Each sheet runs from its banner comment to the next banner, or to the footer
const MARK = /<!-- =+ (\d\d) (.+?) =+ -->\n/g;
const marks = [...src.matchAll(MARK)];
const end = src.indexOf("<footer");
type Chunk = { id: string; name: string; start: number; stop: number };
const chunks: Chunk[] = marks.map((m, i) => {
  const stop = i + 1 < marks.length ? marks[i + 1].index : end;
  const sid = /<section[^>]*\bid="([^"]+)"/.exec(src.slice(m.index, stop))![1];
  return { id: sid, name: m[2], start: m.index, stop };
});
const FIXED = new Set(["cover", "contents"]);

if (args.list) {
  for (const c of chunks) console.log(`${c.id.padEnd(12)}${c.name}${FIXED.has(c.id) ? "  (always kept)" : ""}`);
  process.exit();
}

const ids = chunks.map((c) => c.id);
const named = new Set((args.keep ?? args.drop ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const unknown = [...named].filter((s) => !ids.includes(s));
if (unknown.length) {
  console.error(`no such sheet: ${unknown.sort().join(", ")}. Sheets: ${ids.join(", ")}`);
  process.exit(1);
}
const drop = new Set(args.renumber ? [] : args.keep !== undefined
  ? ids.filter((s) => !named.has(s) && !FIXED.has(s))
  : [...named].filter((s) => !FIXED.has(s)));

// 1. Cut the sheets
const head = src.slice(0, chunks[0].start), tail = src.slice(end);
const kept = chunks.filter((c) => !drop.has(c.id));
src = head + kept.map((c) => src.slice(c.start, c.stop)).join("") + tail;

// 2. Renumber: the banners, the sheet numbers and the contents follow the new order, the cover is 00
const num: Record<string, string> = Object.fromEntries(kept.map((c, i) => [c.id, String(i).padStart(2, "0")]));
const last = String(kept.length - 1).padStart(2, "0");
for (const c of kept) {
  src = src.replace(new RegExp("<!-- =+ \\d\\d " + esc(c.name) + " =+ -->"),
    () => `<!-- ============ ${num[c.id]} ${c.name} ============ -->`);
}
src = src.replace(/(<section[^>]*\bid="([^"]+)"(?:(?!<section)[\s\S])*?<span class="sheet-no"><b>)\d\d(<\/b> \/ )\d\d/g,
  (_, a: string, id: string, b: string) => a + num[id] + b + last);

// 3. The contents: drop the dropped sheets' rows, renumber, split the rest into two even columns, cover last
const navs = [...src.matchAll(/(<nav class="c-6 toc"[^>]*>\n)([\s\S]*?)(    <\/nav>\n)/g)];
const href = (r: string) => /href="#([^"]+)"/.exec(r)![1];
let rows = navs.flatMap((n) => n[2].match(/      <a href="#[^"]+">.*<\/a>\n/g) ?? []);
const cover = rows.filter((r) => r.includes('href="#cover"'));
rows = rows.filter((r) => !r.includes('href="#cover"') && !drop.has(href(r)))
  .map((r) => r.replace(/(<span class="label">)\d\d(<\/span>)/, (_, a: string, b: string) => a + num[href(r)] + b));
const half = Math.floor((rows.length + 1) / 2);
const cols = [rows.slice(0, half), [...rows.slice(half), ...cover]];
for (const [i, n] of [...navs.entries()].reverse()) {
  if (i >= cols.length) continue;
  src = src.slice(0, n.index) + n[1] + cols[i].join("") + n[3] + src.slice(n.index + n[0].length);
}

// 4. Demo links into a dropped sheet go to the cover
if (drop.size) src = src.replace(new RegExp('href="#(' + [...drop].map(esc).join("|") + ')"', "g"), 'href="#cover"');

// 5. The cover's sheet range, in the markup fallback and every language
src = src.replace(/(data-i18n="cover\.sheets-00-18">[^<]*?)\d\d(<\/span>)/g, (_, a: string, b: string) => a + last + b);
writeFileSync(page, src, "utf-8");

// 6. Strings nothing uses any more. Keys come from the markup and from the scripts, as in strings.ts
const used = new Set(Array.from(src.matchAll(/data-i18n="([^"]+)"/g), (m) => m[1]));
for (const [, pairs] of src.matchAll(/data-i18n-attr="([^"]+)"/g)) {
  for (const p of pairs.split(/\s+/).filter(Boolean)) used.add(p.split("=").slice(1).join("="));
}
for (const js of readdirSync(join(SITE, "js")).filter((f) => f.endsWith(".js"))) {
  const code = read(join(SITE, "js", js));
  for (const m of code.matchAll(/\bt\("([a-z0-9.-]+)"\)/g)) used.add(m[1]);
  for (const m of code.matchAll(/"data-i18n",\s*"([a-z0-9.-]+)"/g)) used.add(m[1]);
}
let removed = 0;
for (const f of readdirSync(join(SITE, "strings")).filter((f) => f.endsWith(".js")).sort()) {
  const out: string[] = [];
  for (let line of read(join(SITE, "strings", f)).split("\n")) {
    const m = /^  "([^"]+)": /.exec(line);
    if (m && !used.has(m[1])) {
      if (f === "en.js") removed++;
      continue;
    }
    if (m && m[1] === "cover.sheets-00-18") line = line.replace(/\d\d(\D*",?)$/, (_, a: string) => last + a);
    out.push(line);
  }
  // the last entry before the closing brace has no comma
  const text = out.join("\n").replace(/,(\n\};)/g, "$1");
  JSON.parse(text.slice(text.indexOf("= {") + 2, text.lastIndexOf("}") + 1)); // still valid
  writeFileSync(join(SITE, "strings", f), text, "utf-8");
}

console.log(`dropped ${drop.size} sheets (${chunks.filter((c) => drop.has(c.id)).map((c) => c.id).join(", ")}), ` +
  `kept ${kept.length}: 00-${last}, removed ${removed} unused strings`);
