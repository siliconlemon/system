/* Check the repo is ready to release and write the release: notes and the PDFs to attach. Exits 1 on any problem.

  node scripts/release.ts --check            the checks only, on any commit
  node scripts/release.ts --bump 1.0.2       set the version, rerender the PDFs if they are stale, then the checks
  node scripts/release.ts 1.0.1 --out DIR     the checks, then DIR/notes.md and one PDF per language

The version lives in .claude-plugin/plugin.json and in every ?v= in site/index.html, and the two always match.
--bump writes both, so commit its changes and the PDFs together. The version is the newest X.Y.Z tag or one step
after it, the next patch, minor or major: after 1.0.1 that is 1.0.2, 1.1.0 or 2.0.0. A bump waiting for its release
already counts, so a second bump cannot skip past it.

A release is an annotated tag, and its message opens the notes: one brief sentence on what the release is about,
git tag -a 1.0.2 -m "...". Lines after the first follow it as they are, bullets included. The rest is generated.
The notes stay editable on GitHub after the release, the tag and the PDFs do not.

The checks: the version is one step after the newest release at most, every ?v= matches it, the tag is X.Y.Z,
annotated, and matches the version, every language has its full PDF (system.pdf, system.cs.pdf: every sheet, logo,
icons and imagery on), and no PDF is older than the last commit that changed what it renders. The release attaches only the full PDFs, named system.1.0.1-en.pdf and so
on. The other flag sets stay on the live deck's PDF button.

The CI release workflow runs this, then hands the notes and the PDFs to gh release create. The notes link the
changes since the previous X.Y.Z tag, when there is one.
*/
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

const ROOT = resolve(import.meta.dirname, "..");
const SITE = join(ROOT, "site");
const LIVE = "https://siliconlemon-system.vercel.app";
const NAMES: Record<string, string> = { en: "English", cs: "Čeština" }; // a language without a name here shows its code
// Everything a render reads. A commit touching any of it after the PDFs means they are stale
const RENDERED = ["site/index.html", "site/css", "site/js", "site/strings", "site/assets"];
const PLUGIN = join(ROOT, ".claude-plugin", "plugin.json");
const INDEX = join(SITE, "index.html");
const CACHE = /\?v=([^"'&\s>]+)/g; // the ?v= on every stylesheet, script, icon and the PDF link
const X_Y_Z = /^\d+\.\d+\.\d+$/;

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function lastChange(...paths: string[]): number {
  const out = git("log", "-1", "--format=%ct", "--", ...paths);
  return out ? Number(out) : 0;
}

function languages(): string[] {
  const langs = readdirSync(join(SITE, "strings")).filter((f) => f.endsWith(".js")).map((f) => f.slice(0, -3)).sort();
  return [...langs.filter((l) => l === "en"), ...langs.filter((l) => l !== "en")]; // English first, it is the source
}

function fullPdf(lang: string): string {
  return join(SITE, lang === "en" ? "system.pdf" : `system.${lang}.pdf`);
}

function pages(pdf: string): number {
  return (readFileSync(pdf).toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

function repo(): string {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  return git("remote", "get-url", "origin").replace(/^.*github\.com[:/]|\.git$/g, "");
}

// The annotated tag's message, without a signature. Empty for a lightweight or missing tag
function message(tag: string): string {
  try {
    if (git("cat-file", "-t", `refs/tags/${tag}`) !== "tag") return "";
  } catch {
    return "";
  }
  const subject = git("tag", "-l", "--format=%(contents:subject)", tag);
  const body = git("tag", "-l", "--format=%(contents:body)", tag);
  return [subject, body].filter(Boolean).join("\n\n");
}

function version(): string {
  return JSON.parse(readFileSync(PLUGIN, "utf-8")).version;
}

function key(v: string): number[] {
  return v.split(".").map(Number);
}

function compare(a: string, b: string): number {
  const ka = key(a), kb = key(b);
  return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
}

function tags(): string[] {
  return git("tag", "--list").split("\n").filter((t) => X_Y_Z.test(t));
}

// The newest X.Y.Z tag, leaving out but, or undefined before the first release
function released(but?: string): string | undefined {
  return tags().filter((t) => t !== but).sort(compare).pop();
}

// The highest X.Y.Z tag below this one, or undefined for the first release
function previous(tag: string): string | undefined {
  return tags().filter((t) => compare(t, tag) < 0).sort(compare).pop();
}

// The versions that may follow the release last: the next patch, minor or major
function steps(last: string): string[] {
  const [major, minor, patch] = key(last);
  return [`${major}.${minor}.${patch + 1}`, `${major}.${minor + 1}.0`, `${major + 1}.0.0`];
}

// Why v cannot follow the release last, or undefined. The anchor is the tag, so an unreleased bump stays put
function skips(v: string, last: string | undefined): string | undefined {
  if (last === undefined || v === last || steps(last).includes(v)) return undefined;
  return `${v} does not follow the release ${last}, the next is ${steps(last).join(" or ")}`;
}

function check(tag: string | undefined): string[] {
  const problems: string[] = [];
  const current = version();
  let why;
  if (!X_Y_Z.test(current)) problems.push(`version ${current} in .claude-plugin/plugin.json is not X.Y.Z`);
  else if ((why = skips(current, released(tag)))) problems.push(`version ${why}`);
  const off = [...new Set(Array.from(readFileSync(INDEX, "utf-8").matchAll(CACHE), (m) => m[1]))].filter((v) => v !== current).sort();
  if (off.length) {
    problems.push(`site/index.html has ?v=${off.join(", ?v=")} where the version ${current} belongs, ` +
      `run node scripts/release.ts --bump ${current}`);
  }
  if (tag !== undefined) {
    if (!X_Y_Z.test(tag)) problems.push(`${tag} is not an X.Y.Z tag`);
    else if (tag !== current) problems.push(`${tag} does not match version ${current} in .claude-plugin/plugin.json`);
    if (!message(tag)) problems.push(`${tag} has no message, tag it with git tag -a ${tag} -m "what the release is about"`);
  }
  const rendered = lastChange(...RENDERED);
  for (const lang of languages()) {
    const pdf = fullPdf(lang), name = relative(SITE, pdf);
    if (!existsSync(pdf)) {
      problems.push(`${name} is missing, run node scripts/pdf.ts ${lang}`);
      continue;
    }
    if (lastChange(relative(ROOT, pdf).replaceAll("\\", "/")) < rendered) {
      problems.push(`${name} is older than the last change to the deck, run node scripts/pdf.ts`);
    }
  }
  return problems;
}

// Write the version to plugin.json and every ?v=, then rerender the PDFs, which the change left stale
function bump(next: string) {
  if (!X_Y_Z.test(next)) fail(`${next} is not X.Y.Z`);
  const why = skips(next, released());
  if (why) fail(`${why}. A bump waiting for its release already counts, bump again only to pick another of those`);
  // the text goes back as it came, so the files keep their line endings
  const plugin = readFileSync(PLUGIN, "utf-8");
  writeFileSync(PLUGIN, plugin.replace(/("version"\s*:\s*")[^"]*"/, (_, a: string) => `${a}${next}"`), "utf-8");
  writeFileSync(INDEX, readFileSync(INDEX, "utf-8").replace(CACHE, `?v=${next}`), "utf-8");
  // A render-affecting change not yet committed, the bump's own included, leaves the PDFs behind
  if (git("status", "--porcelain", "--", ...RENDERED) || check(undefined).length) {
    execFileSync(process.execPath, [join(ROOT, "scripts", "pdf.ts")], { stdio: "inherit" });
  } else {
    console.log("the PDFs are current");
  }
}

function notes(tag: string, out: string) {
  const base = `https://github.com/${repo()}`;
  const sha = git("rev-parse", "HEAD");
  const date = new Date(Number(git("log", "-1", "--format=%ct")) * 1000).toISOString().slice(0, 10);
  let sheets = 0;
  for (const lang of languages()) {
    const pdf = fullPdf(lang);
    copyFileSync(pdf, join(out, `system.${tag}-${lang}.pdf`));
    sheets = Math.max(sheets, pages(pdf));
  }
  const langs = languages().map((l) => l.toUpperCase()).join(", ");
  const prev = previous(tag);
  const changes = prev ? [`| Changes | [${prev}...${tag}](${base}/compare/${prev}...${tag}) |`] : [];
  const text = [
    message(tag),
    "",
    `| Release | \`${tag}\` |`,
    "| --- | --- |",
    `| Commit | [\`${sha.slice(0, 7)}\`](${base}/commit/${sha}) |`,
    `| Date | ${date} |`,
    `| Sheets | ${sheets} |`,
    `| Languages | ${langs} |`,
    `| Live deck | [${LIVE.replace(/^https:\/\//, "")}](${LIVE}) |`,
    `| Template | [Use this template](${base}/generate) |`,
    `| Plugin | \`/plugin install system@system\`, version ${tag} |`,
    ...changes,
    "",
  ].join("\n");
  writeFileSync(join(out, "notes.md"), text, "utf-8");
}

function fail(why: string): never {
  console.error(why);
  process.exit(1);
}

const USAGE = "usage: node scripts/release.ts [tag] [--check] [--out DIR] [--bump X.Y.Z]";
function usage(why: string): never {
  console.error(`${USAGE}\n${why}`);
  process.exit(2);
}

function main() {
  let parsed;
  try {
    parsed = parseArgs({ allowPositionals: true, options: {
      check: { type: "boolean", default: false }, // run the checks only
      out: { type: "string" },                    // where to write notes.md and the PDFs
      bump: { type: "string" },                   // set the version everywhere and rerender stale PDFs, then check
    } });
  } catch (e) {
    usage((e as Error).message);
  }
  const { values: a, positionals } = parsed;
  if (positionals.length > 1) usage(`one tag at most, not ${positionals.join(" ")}`);
  const tag: string | undefined = positionals[0];
  if (a.bump !== undefined) {
    bump(a.bump);
    a.check = true;
  }
  if (!a.check && (tag === undefined || a.out === undefined)) usage("give a tag and --out, --bump X.Y.Z, or --check");
  const problems = check(tag);
  for (const p of problems) console.error(p);
  if (problems.length) process.exit(1);
  if (a.check) {
    console.log("ready to release");
    return;
  }
  const out = resolve(a.out!);
  mkdirSync(out, { recursive: true });
  notes(tag!, out);
  console.log(`wrote ${join(out, "notes.md")} and ${languages().length} PDFs`);
}

main();
