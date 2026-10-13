/* Render the PDFs the PDF button links to: one per language and set of with/without flags, so a download is the
manual as it looked on screen. system.pdf and system.cs.pdf have everything, system.no-logo.pdf,
system.cs.no-icons-imagery.pdf and the rest switch flags off, named as system.js names them.
Rerun it after changing a sheet or a string. Pass a language (en, cs) to render only that one.

One page per sheet, each page cut to its sheet's real size (canvas.js writes the @page sizes), rendered with
headless Chrome or Edge, like the Viewgraft manual. Set CHROME to use another browser.
*/
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SITE = resolve(import.meta.dirname, "..", "site");
const LANGS = process.argv.length > 2 ? process.argv.slice(2) : ["en", "cs"];
// the flags in system.js's order; every subset of them switched off
const FLAGS = ["logo", "icons", "imagery"];
const OFF = Array.from({ length: 2 ** FLAGS.length }, (_, n) => FLAGS.filter((_, i) => n >> i & 1));
// file -> query, ?lang= picks the language and ?without= the flags for the render
const PDFS = new Map<string, string>();
for (const lang of LANGS) {
  for (const off of OFF) {
    const name = "system" + (lang === "en" ? "" : "." + lang) + (off.length ? ".no-" + off.join("-") : "") + ".pdf";
    PDFS.set(join(SITE, name), `?lang=${lang}` + (off.length ? `&without=${off.join(",")}` : ""));
  }
}

// The first match for a command on PATH, with Windows' extensions
function which(cmd: string): string | undefined {
  const exts = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE").split(";") : [""];
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    for (const ext of exts) {
      const p = join(dir, cmd + ext);
      if (dir && existsSync(p)) return p;
    }
  }
  return undefined;
}
// An unset variable leaves the path undefined, and it is skipped
const env = (name: string, ...rest: string[]) => process.env[name] && join(process.env[name], ...rest);
const CANDIDATES = [
  process.env.CHROME,
  which("chrome"), which("google-chrome"), which("chromium"), which("chromium-browser"),
  env("ProgramFiles", "Google", "Chrome", "Application", "chrome.exe"),
  env("ProgramFiles(x86)", "Google", "Chrome", "Application", "chrome.exe"),
  env("LOCALAPPDATA", "Google", "Chrome", "Application", "chrome.exe"),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  which("msedge"), which("microsoft-edge"),
  env("ProgramFiles(x86)", "Microsoft", "Edge", "Application", "msedge.exe"),
  env("ProgramFiles", "Microsoft", "Edge", "Application", "msedge.exe"),
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];
const chrome = CANDIDATES.find((c) => c && existsSync(c));
if (!chrome) {
  console.error("Chrome or Edge not found, set CHROME to render the PDF");
  process.exit(1);
}

// The fonts come from Google Fonts. Virtual time stands still while they download, and the budget is how long
// the page may then run before the capture, so they are in before it. The PDF is checked for them after
const FONT_WAIT_MS = 30000;
const FONTS = ["OverusedGrotesk", "HankenGrotesk", "AzeretMono", "CourierPrime"];
for (const [pdf, query] of PDFS) {
  const name = pdf.split(/[\\/]/).pop();
  const profile = mkdtempSync(join(tmpdir(), "pdf-")); // separate profile, so a running Chrome doesn't interfere
  try {
    // headless Chrome now and then stalls on a render and never exits: give it two minutes, then one more try
    for (const attempt of [1, 2]) {
      const run = spawnSync(chrome, ["--headless=new", "--disable-gpu", `--user-data-dir=${profile}`,
        `--virtual-time-budget=${FONT_WAIT_MS}`, "--no-pdf-header-footer", `--print-to-pdf=${pdf}`,
        pathToFileURL(join(SITE, "index.html")).href + query], { timeout: 120000 });
      if (run.error && (run.error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
        if (attempt === 2) {
          console.error(`${name} stalled twice, rerun`);
          process.exit(1);
        }
        console.log(`${name} stalled, trying again`);
        continue;
      }
      if (run.error) throw run.error;
      if (run.status !== 0) {
        console.error(run.stderr.toString());
        console.error(`${chrome} exited with ${run.status}`);
        process.exit(1);
      }
      break;
    }
  } finally {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  }
  const data = readFileSync(pdf).toString("latin1");
  // Embedded font names drop the spaces and may add hyphens, AAAAAA+HankenGrotesk-Medium
  const embedded = Array.from(data.matchAll(/\/FontName\s*\/([^\s/<>\[\]]+)/g), (m) => m[1]).join(" ").toLowerCase().replace(/[^a-z]/g, "");
  const missing = FONTS.filter((f) => !embedded.includes(f.toLowerCase()));
  if (missing.length) {
    console.error(`${name} has no ${missing.join(", ")}, the fonts did not load in time. Check the connection and rerun`);
    process.exit(1);
  }
  const pages = (data.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  console.log(`rendered ${name}, ${pages} pages`);
}
