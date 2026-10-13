"""Check the repo is ready to release and write the release: notes and the PDFs to attach. Exits 1 on any problem.

  python scripts/release.py --check            the checks only, on any commit
  python scripts/release.py --bump 1.0.2       set the version, rerender the PDFs if they are stale, then the checks
  python scripts/release.py 1.0.1 --out DIR     the checks, then DIR/notes.md and one PDF per language

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
PLUGIN = ROOT / ".claude-plugin" / "plugin.json"
INDEX = SITE / "index.html"
CACHE = re.compile(r"\?v=([^\"'&\s>]+)")  # the ?v= on every stylesheet, script, icon and the PDF link
X_Y_Z = re.compile(r"\d+\.\d+\.\d+")


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


def version():
    return json.loads(PLUGIN.read_text(encoding="utf-8"))["version"]


def key(v):
    return tuple(map(int, v.split(".")))


def tags():
    return [t for t in git("tag", "--list").splitlines() if X_Y_Z.fullmatch(t)]


def released(but=None):
    """The newest X.Y.Z tag, leaving out but, or None before the first release."""
    return max((t for t in tags() if t != but), key=key, default=None)


def previous(tag):
    """The highest X.Y.Z tag below this one, or None for the first release."""
    return max((t for t in tags() if key(t) < key(tag)), key=key, default=None)


def steps(last):
    """The versions that may follow the release last: the next patch, minor or major."""
    major, minor, patch = key(last)
    return [f"{major}.{minor}.{patch + 1}", f"{major}.{minor + 1}.0", f"{major + 1}.0.0"]


def skips(v, last):
    """Why v cannot follow the release last, or None. The anchor is the tag, so an unreleased bump stays put."""
    if last is None or v == last or v in steps(last):
        return None
    return f"{v} does not follow the release {last}, the next is {' or '.join(steps(last))}"


def check(tag):
    problems = []
    current = version()
    if not X_Y_Z.fullmatch(current):
        problems.append(f"version {current} in .claude-plugin/plugin.json is not X.Y.Z")
    elif why := skips(current, released(but=tag)):
        problems.append(f"version {why}")
    off =sorted({v for v in CACHE.findall(INDEX.read_text(encoding="utf-8")) if v != current})
    if off:
        problems.append(f"site/index.html has ?v={', ?v='.join(off)} where the version {current} belongs, "
                        f"run python scripts/release.py --bump {current}")
    if tag is not None:
        if not X_Y_Z.fullmatch(tag):
            problems.append(f"{tag} is not an X.Y.Z tag")
        elif tag != current:
            problems.append(f"{tag} does not match version {current} in .claude-plugin/plugin.json")
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


def bump(new):
    """Write the version to plugin.json and every ?v=, then rerender the PDFs, which the change left stale."""
    if not X_Y_Z.fullmatch(new):
        sys.exit(f"{new} is not X.Y.Z")
    if why := skips(new, released()):
        sys.exit(f"{why}. A bump waiting for its release already counts, bump again only to pick another of those")
    # bytes in and out, so the files keep their line endings
    plugin = PLUGIN.read_bytes().decode("utf-8")
    PLUGIN.write_bytes(re.sub(r'("version"\s*:\s*")[^"]*"', rf'\g<1>{new}"', plugin, count=1).encode("utf-8"))
    INDEX.write_bytes(CACHE.sub(f"?v={new}", INDEX.read_bytes().decode("utf-8")).encode("utf-8"))
    # A render-affecting change not yet committed, the bump's own included, leaves the PDFs behind
    if git("status", "--porcelain", "--", *RENDERED) or check(None):
        subprocess.run([sys.executable, str(ROOT / "scripts" / "pdf.py")], check=True)
    else:
        print("the PDFs are current")


def notes(tag, out):
    version, base = tag, f"https://github.com/{repo()}"
    sha = git("rev-parse", "HEAD")
    date = datetime.datetime.fromtimestamp(int(git("log", "-1", "--format=%ct")), datetime.UTC).date().isoformat()
    sheets = 0
    for lang in languages():
        pdf = full_pdf(lang)
        shutil.copyfile(pdf, out / f"system.{version}-{lang}.pdf")
        sheets = max(sheets, pages(pdf))
    langs = ", ".join(l.upper() for l in languages())
    prev = previous(tag)
    changes = [f"| Changes | [{prev}...{tag}]({base}/compare/{prev}...{tag}) |"] if prev else []
    text = "\n".join([
        message(tag),
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
    ap.add_argument("--bump", metavar="X.Y.Z", help="set the version everywhere and rerender stale PDFs, then check")
    a = ap.parse_args()
    if a.bump:
        bump(a.bump)
        a.check = True
    if not a.check and (a.tag is None or a.out is None):
        ap.error("give a tag and --out, --bump X.Y.Z, or --check")
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
