"""Check the string resources in site/strings against the page. Exits 1 on any problem.

- every key the page or the scripts use exists in en.js
- every language file has exactly the keys en.js has
- no key sits in en.js without being used
- the English fallback in the markup matches en.js, so the page reads right before the script runs
"""
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
VOID = {"input", "br", "img", "meta", "link", "hr", "source"}


def load(lang):
    text = (SITE / "strings" / f"{lang}.js").read_text(encoding="utf-8")
    return json.loads(text[text.index("= {") + 2: text.rindex("}") + 1])


def norm(t):
    return re.sub(r"[\s ]+", " ", t).strip()


src = (SITE / "index.html").read_text(encoding="utf-8")
starts = [0]
for line in src.split("\n")[:-1]:
    starts.append(starts[-1] + len(line) + 1)


class Keys(HTMLParser):
    """Collects every key, and the raw markup inside each data-i18n element."""

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.used, self.fallbacks, self.open = set(), [], []

    def off(self):
        line, col = self.getpos()
        return starts[line - 1] + col

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for pair in (a.get("data-i18n-attr") or "").split():
            self.used.add(pair.split("=", 1)[1])
        if "data-i18n" in a:
            self.used.add(a["data-i18n"])
        if tag not in VOID:
            self.open.append((tag, a, self.off() + len(self.get_starttag_text())))

    def handle_endtag(self, tag):
        while self.open:
            t, a, start = self.open.pop()
            if t == tag:
                if "data-i18n" in a:
                    inner = src[start:self.off()]
                    self.fallbacks.append((a["data-i18n"], inner, "data-i18n-html" in a))
                break


p = Keys()
p.feed(src)
used = set(p.used)
# keys the scripts ask for by name, or set on elements they make
for js in (SITE / "js").glob("*.js"):
    code = js.read_text(encoding="utf-8")
    used |= set(re.findall(r'\bt\("([a-z0-9.-]+)"\)', code))
    used |= set(re.findall(r'"data-i18n",\s*"([a-z0-9.-]+)"', code))

en = load("en")
problems = []
for k in sorted(used - en.keys()):
    problems.append(f"used but not in en.js: {k}")
for k in sorted(en.keys() - used):
    problems.append(f"in en.js but never used: {k}")
for f in sorted((SITE / "strings").glob("*.js")):
    if f.stem == "en":
        continue
    other = load(f.stem)
    for k in sorted(en.keys() - other.keys()):
        problems.append(f"missing in {f.name}: {k}")
    for k in sorted(other.keys() - en.keys()):
        problems.append(f"extra in {f.name}: {k}")
for key, inner, is_html in p.fallbacks:
    if key not in en:
        continue
    have = norm(inner) if is_html else norm(html.unescape(inner))
    if have != norm(en[key]):
        problems.append(f"fallback differs from en.js: {key}: {have[:60]!r} vs {en[key][:60]!r}")

for line in problems:
    print(line)
print(f"{len(en)} keys, {len(problems)} problems")
sys.exit(1 if problems else 0)
