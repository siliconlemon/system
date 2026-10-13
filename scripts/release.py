"""Check the repo is ready to release and write the release: notes and the PDFs to attach. Exits 1 on any problem.

  python scripts/release.py --check            the checks only, on any commit
  python scripts/release.py 1.0.1 --out DIR     the checks, then DIR/notes.md and one PDF per language

A release is an annotated tag, and its message opens the notes: one brief sentence on what the release is
about, git tag -a 1.0.1 -m "...". The rest is generated.

The checks: the tag is X.Y.Z, annotated, and matches the version in .claude-plugin/plugin.json, every language has its
full PDF (system.pdf, system.cs.pdf: every sheet, logo, icons and imagery on), and no PDF is older than the last
commit that changed what it renders. The release attaches only the full PDFs, named system.1.0.1-en.pdf and so
on. The other flag sets stay on the live deck's PDF button.

The CI release workflow runs this, then hands the notes and the PDFs to gh release create. The notes link the
changes since the previous X.Y.Z tag, when there is one.
"""
import argparse
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
LIVE = "https://siliconlemon-system.vercel.app"
NAMES = {"en": "English", "cs": "Čeština"}  # a language without a name here shows its code
# Everything a render reads. A commit touching any of it after the PDFs means they are stale
RENDERED = ["site/index.html", "site/css", "site/js", "site/strings", "site/assets"]


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()


def last_change(*paths):
    out = git("log", "-1", "--format=%ct", "--", *paths)
    return int(out) if out else 0


def languages():
    langs = sorted(p.stem for p in (SITE / "strings").glob("*.js"))
    return sorted(langs, key=lambda l: l != "en")  # English first, it is the source


def full_pdf(lang):
    return SITE / ("system.pdf" if lang == "en" else f"system.{lang}.pdf")


def pages(pdf):
    return len(re.findall(rb"/Type\s*/Page[^s]", pdf.read_bytes()))



def repo():
    if os.environ.get("GITHUB_REPOSITORY"):
        return os.environ["GITHUB_REPOSITORY"]
    url = git("remote", "get-url", "origin")
    return re.sub(r"^.*github\.com[:/]|\.git$", "", url)


def message(tag):
    """The annotated tag's message, without a signature. Empty for a lightweight or missing tag."""
    try:
        if git("cat-file", "-t", f"refs/tags/{tag}") != "tag":
            return ""
    except subprocess.CalledProcessError:
        return ""
    subject = git("tag", "-l", "--format=%(contents:subject)", tag)
    body = git("tag", "-l", "--format=%(contents:body)", tag)
    return "\n\n".join(p for p in (subject, body) if p)


def check(tag):
    problems = []
    version = json.loads((ROOT / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))["version"]
    if tag is not None:
        if not re.fullmatch(r"\d+\.\d+\.\d+", tag):
            problems.append(f"{tag} is not an X.Y.Z tag")
        elif tag != version:
            problems.append(f"{tag} does not match version {version} in .claude-plugin/plugin.json")
        if not message(tag):
            problems.append(f"{tag} has no message, tag it with git tag -a {tag} -m \"what the release is about\"")
    rendered = last_change(*RENDERED)
    for lang in languages():
        pdf = full_pdf(lang)
        if not pdf.exists():
            problems.append(f"{pdf.name} is missing, run python scripts/pdf.py {lang}")
            continue
        if last_change(str(pdf.relative_to(ROOT))) < rendered:
            problems.append(f"{pdf.name} is older than the last change to the deck, run python scripts/pdf.py")
    return problems


def previous(tag):
    """The highest X.Y.Z tag below this one, or None for the first release."""
    key = lambda t: tuple(map(int, t.split(".")))
    older = [t for t in git("tag", "--list").splitlines() if re.fullmatch(r"\d+\.\d+\.\d+", t) and key(t) < key(tag)]
    return max(older, key=key, default=None)


def notes(tag, out):
    version, base = tag, f"https://github.com/{repo()}"
    sha = git("rev-parse", "HEAD")
    date = datetime.datetime.fromtimestamp(int(git("log", "-1", "--format=%ct")), datetime.UTC).date().isoformat()
    sheets = 0
    for lang in languages():
        pdf = full_pdf(lang)
        shutil.copyfile(pdf, out / f"system.{version}-{lang}.pdf")
        sheets = max(sheets, pages(pdf))
    codes = [l.upper() for l in languages()]
    langs = ", ".join(codes)
    spoken = " and ".join([", ".join(codes[:-1]), codes[-1]] if len(codes) > 1 else codes)
    text = "\n".join([
        message(tag),
        "",
        f"- {sheets} sheets, light & dark theme, in {spoken}.",
        "- The PDFs in Assets have every sheet, with logo, icons and imagery on.",
        f"- The other flag sets download from the PDF button on the [live deck]({LIVE}).",
        "",
        f"| Release | `{tag}` |",
        "| --- | --- |",
        f"| Commit | [`{sha[:7]}`]({base}/commit/{sha}) |",
        f"| Date | {date} |",
        f"| Sheets | {sheets} |",
        f"| Languages | {langs} |",
        f"| Live deck | [{LIVE.removeprefix('https://')}]({LIVE}) |",
        f"| Template | [Use this template]({base}/generate) |",
        f"| Plugin | `/plugin install system@system`, version {version} |",
        *changes,
        "",
    ])
    (out / "notes.md").write_text(text, encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("tag", nargs="?", help="the release tag, X.Y.Z")
    ap.add_argument("--check", action="store_true", help="run the checks only")
    ap.add_argument("--out", type=Path, help="where to write notes.md and the PDFs")
    a = ap.parse_args()
    if not a.check and (a.tag is None or a.out is None):
        ap.error("give a tag and --out, or --check")
    problems = check(a.tag)
    for p in problems:
        print(p, file=sys.stderr)
    if problems:
        sys.exit(1)
    if a.check:
        print("ready to release")
        return
    a.out.mkdir(parents=True, exist_ok=True)
    notes(a.tag, a.out)
    print(f"wrote {a.out / 'notes.md'} and {len(languages())} PDFs")


if __name__ == "__main__":
    main()
