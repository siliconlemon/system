/* Check the string resources in site/strings against the page. Exits 1 on any problem.

- every key the page or the scripts use exists in en.js
- every language file has exactly the keys en.js has
- no key sits in en.js without being used
- the English fallback in the markup matches en.js, so the page reads right before the script runs
*/
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SITE = resolve(import.meta.dirname, "..", "site");
const VOID = new Set(["input", "br", "img", "meta", "link", "hr", "source"]);

type Strings = Record<string, string>;

function load(lang: string): Strings {
  const text = readFileSync(join(SITE, "strings", `${lang}.js`), "utf-8");
  return JSON.parse(text.slice(text.indexOf("= {") + 2, text.lastIndexOf("}") + 1));
}

function norm(t: string): string {
  return t.replace(/\s+/g, " ").trim();
}

// The character references the markup uses, as html.unescape reads them
const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function unescape(t: string): string {
  return t.replace(/&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, ref: string) =>
    ref[0] !== "#" ? NAMED[ref] ?? m : String.fromCodePoint(parseInt(ref.slice(1).replace(/^x/i, ""), /^#x/i.test(ref) ? 16 : 10)));
}

const src = readFileSync(join(SITE, "index.html"), "utf-8");

// Every key, and the raw markup inside each data-i18n element. Comments are skipped, and so is what a script
// or style holds, as an HTML parser would. An end tag closes the nearest open element of its name
const used = new Set<string>();
const fallbacks: [key: string, inner: string, isHtml: boolean][] = [];
const open: [tag: string, attrs: Map<string, string>, start: number][] = [];
const TOKEN = /<!--[\s\S]*?-->|<![^>]*>|<\/([a-zA-Z][^\s/>]*)[^>]*>|<([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
function close(tag: string, at: number) {
  while (open.length) {
    const [t, a, start] = open.pop()!;
    if (t === tag) {
      if (a.has("data-i18n")) fallbacks.push([a.get("data-i18n")!, src.slice(start, at), a.has("data-i18n-html")]);
      break;
    }
  }
}
for (let m; (m = TOKEN.exec(src));) {
  if (m[1]) { close(m[1].toLowerCase(), m.index); continue; }
  if (!m[2]) continue;
  const tag = m[2].toLowerCase(), rest = m[3], selfClosing = rest.endsWith("/");
  const a = new Map<string, string>();
  for (const [, name, ...v] of rest.matchAll(ATTR)) a.set(name.toLowerCase(), unescape(v.find((x) => x !== undefined) ?? ""));
  for (const pair of (a.get("data-i18n-attr") ?? "").split(/\s+/).filter(Boolean)) used.add(pair.split("=").slice(1).join("="));
  if (a.has("data-i18n")) used.add(a.get("data-i18n")!);
  if (!VOID.has(tag)) open.push([tag, a, TOKEN.lastIndex]);
  if (selfClosing) close(tag, m.index);
  // a script or a style is text up to its end tag
  if (tag === "script" || tag === "style") {
    const end = src.toLowerCase().indexOf("</" + tag, TOKEN.lastIndex);
    TOKEN.lastIndex = end < 0 ? src.length : end;
  }
}
// keys the scripts ask for by name, or set on elements they make
for (const js of readdirSync(join(SITE, "js")).filter((f) => f.endsWith(".js"))) {
  const code = readFileSync(join(SITE, "js", js), "utf-8");
  for (const m of code.matchAll(/\bt\("([a-z0-9.-]+)"\)/g)) used.add(m[1]);
  for (const m of code.matchAll(/"data-i18n",\s*"([a-z0-9.-]+)"/g)) used.add(m[1]);
}

const en = load("en");
const problems: string[] = [];
// the keys in one set and not in the other, sorted
const minus = (a: Iterable<string>, b: Iterable<string>) => {
  const has = new Set(b);
  return [...a].filter((k) => !has.has(k)).sort();
};
for (const k of minus(used, Object.keys(en))) problems.push(`used but not in en.js: ${k}`);
for (const k of minus(Object.keys(en), used)) problems.push(`in en.js but never used: ${k}`);
for (const f of readdirSync(join(SITE, "strings")).filter((f) => f.endsWith(".js")).sort()) {
  if (f === "en.js") continue;
  const other = load(f.slice(0, -3));
  for (const k of minus(Object.keys(en), Object.keys(other))) problems.push(`missing in ${f}: ${k}`);
  for (const k of minus(Object.keys(other), Object.keys(en))) problems.push(`extra in ${f}: ${k}`);
}
for (const [key, inner, isHtml] of fallbacks) {
  if (!(key in en)) continue;
  const have = isHtml ? norm(inner) : norm(unescape(inner));
  if (have !== norm(en[key])) {
    problems.push(`fallback differs from en.js: ${key}: ${JSON.stringify(have.slice(0, 60))} vs ${JSON.stringify(en[key].slice(0, 60))}`);
  }
}

for (const line of problems) console.log(line);
console.log(`${Object.keys(en).length} keys, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
