"""Cut the manual down to the sheets a project needs. The template carries every sheet a brand and product could
want; most decks need a third of them.

    python scripts/prune.py --list
    python scripts/prune.py --keep logo,color,type,text,grid,ui
    python scripts/prune.py --drop marketing,print,downloads --site path/to/site
    python scripts/prune.py --renumber

Sheets are named by their section id (--list shows them). The cover and the contents always stay. What it does:

- removes the dropped sheets from index.html
- renumbers the rest, 01 / NN on each sheet, the contents list and the cover's sheet range, and rebalances the
  contents into two even columns
- points demo links at a dropped sheet to the cover
- deletes the strings nothing uses any more from every language file

The CSS of a dropped sheet stays: it costs nothing, and the sheet can come back. Run scripts/strings.py after, then
scripts/pdf.py.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("--site", default=str(Path(__file__).resolve().parent.parent / "site"))
g = ap.add_mutually_exclusive_group(required=True)
g.add_argument("--keep", help="comma-separated sheet ids to keep, the rest go")
g.add_argument("--drop", help="comma-separated sheet ids to drop")
g.add_argument("--list", action="store_true", help="list the sheets and exit")
g.add_argument("--renumber", action="store_true", help="drop nothing, only renumber, after adding or moving a sheet")
args = ap.parse_args()

SITE = Path(args.site)
page = SITE / "index.html"
src = page.read_text(encoding="utf-8")

# Each sheet runs from its banner comment to the next banner, or to the footer
MARK = re.compile(r"<!-- =+ (\d\d) (.+?) =+ -->\n")
marks = list(MARK.finditer(src))
end = src.index("<footer")
chunks = []
for i, m in enumerate(marks):
    stop = marks[i + 1].start() if i + 1 < len(marks) else end
    sid = re.search(r'<section[^>]*\bid="([^"]+)"', src[m.start():stop]).group(1)
    chunks.append({"id": sid, "name": m.group(2), "start": m.start(), "stop": stop})
FIXED = {"cover", "contents"}

if args.list:
    for c in chunks:
        print(f"{c['id']:<12}{c['name']}{'  (always kept)' if c['id'] in FIXED else ''}")
    sys.exit()

ids = [c["id"] for c in chunks]
named = {s.strip() for s in (args.keep or args.drop or "").split(",") if s.strip()}
unknown = named - set(ids)
if unknown:
    sys.exit(f"no such sheet: {', '.join(sorted(unknown))}. Sheets: {', '.join(ids)}")
drop = set() if args.renumber else (set(ids) - named - FIXED) if args.keep else (named - FIXED)

# 1. Cut the sheets
head, tail = src[:chunks[0]["start"]], src[end:]
body = "".join(src[c["start"]:c["stop"]] for c in chunks if c["id"] not in drop)
kept = [c for c in chunks if c["id"] not in drop]
src = head + body + tail

# 2. Renumber: the banners, the sheet numbers and the contents follow the new order, the cover is 00
num = {c["id"]: f"{i:02d}" for i, c in enumerate(kept)}
last = f"{len(kept) - 1:02d}"
for c in kept:
    src = re.sub(r"<!-- =+ \d\d " + re.escape(c["name"]) + r" =+ -->",
                 lambda m, c=c: f"<!-- ============ {num[c['id']]} {c['name']} ============ -->", src, count=1)
src = re.sub(r'(<section[^>]*\bid="([^"]+)"(?:(?!<section)[\s\S])*?<span class="sheet-no"><b>)\d\d(</b> / )\d\d',
             lambda m: m.group(1) + num[m.group(2)] + m.group(3) + last, src)

# 3. The contents: drop the dropped sheets' rows, renumber, split the rest into two even columns, cover last
navs = list(re.finditer(r'(<nav class="c-6 toc"[^>]*>\n)([\s\S]*?)(    </nav>\n)', src))
rows = [r for n in navs for r in re.findall(r"      <a href=\"#[^\"]+\">.*</a>\n", n.group(2))]
cover = [r for r in rows if 'href="#cover"' in r]
rows = [r for r in rows if 'href="#cover"' not in r and re.search(r'href="#([^"]+)"', r).group(1) not in drop]
rows = [re.sub(r'(<span class="label">)\d\d(</span>)', lambda m, r=r: m.group(1) + num[re.search(r'href="#([^"]+)"', r).group(1)] + m.group(2), r, count=1)
        for r in rows]
half = (len(rows) + 1) // 2
cols = [rows[:half], rows[half:] + cover]
for n, col in reversed(list(zip(navs, cols))):
    src = src[:n.start()] + n.group(1) + "".join(col) + n.group(3) + src[n.end():]

# 4. Demo links into a dropped sheet go to the cover
if drop:
    src = re.sub(r'href="#(' + "|".join(map(re.escape, drop)) + r')"', 'href="#cover"', src)

# 5. The cover's sheet range, in the markup fallback and every language
src = re.sub(r'(data-i18n="cover\.sheets-00-18">[^<]*?)\d\d(</span>)', lambda m: m.group(1) + last + m.group(2), src)
page.write_text(src, encoding="utf-8", newline="")

# 6. Strings nothing uses any more. Keys come from the markup and from the scripts, as in strings.py
used = set(re.findall(r'data-i18n="([^"]+)"', src))
for pairs in re.findall(r'data-i18n-attr="([^"]+)"', src):
    used |= {p.split("=", 1)[1] for p in pairs.split()}
for js in (SITE / "js").glob("*.js"):
    code = js.read_text(encoding="utf-8")
    used |= set(re.findall(r'\bt\("([a-z0-9.-]+)"\)', code))
    used |= set(re.findall(r'"data-i18n",\s*"([a-z0-9.-]+)"', code))
removed = 0
for f in sorted((SITE / "strings").glob("*.js")):
    text = f.read_text(encoding="utf-8")
    lines = text.split("\n")
    out = []
    for line in lines:
        m = re.match(r'  "([^"]+)": ', line)
        if m and m.group(1) not in used:
            removed += f.stem == "en"
            continue
        if m and m.group(1) == "cover.sheets-00-18":
            line = re.sub(r"\d\d(\D*\",?)$", lambda x: last + x.group(1), line)
        out.append(line)
    text = "\n".join(out)
    # the last entry before the closing brace has no comma
    text = re.sub(r',(\n\};)', r"\1", text)
    json.loads(text[text.index("= {") + 2: text.rindex("}") + 1])  # still valid
    f.write_text(text, encoding="utf-8", newline="")

print(f"dropped {len(drop)} sheets ({', '.join(c['id'] for c in chunks if c['id'] in drop)}), "
      f"kept {len(kept)}: 00-{last}, removed {removed} unused strings")
