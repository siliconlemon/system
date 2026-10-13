"""Render the PDFs the PDF button links to: one per language and set of with/without flags, so a download is the
manual as it looked on screen. system.pdf and system.cs.pdf have everything, system.no-logo.pdf,
system.cs.no-icons-imagery.pdf and the rest switch flags off, named as system.js names them.
Rerun it after changing a sheet or a string. Pass a language (en, cs) to render only that one.

One page per sheet, each page cut to its sheet's real size (canvas.js writes the @page sizes), rendered with
headless Chrome or Edge, like the Viewgraft manual. Set CHROME to use another browser.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
LANGS = sys.argv[1:] or ["en", "cs"]
# the flags in system.js's order; every subset of them switched off
FLAGS = ["logo", "icons", "imagery"]
OFF = [[f for i, f in enumerate(FLAGS) if n >> i & 1] for n in range(2 ** len(FLAGS))]
# file -> query, ?lang= picks the language and ?without= the flags for the render
PDFS = {SITE / ("system" + ("" if lang == "en" else "." + lang) + (".no-" + "-".join(off) if off else "") + ".pdf"):
        f"?lang={lang}" + (f"&without={','.join(off)}" if off else "") for lang in LANGS for off in OFF}

CANDIDATES = [
    os.environ.get("CHROME"),
    shutil.which("chrome"), shutil.which("google-chrome"), shutil.which("chromium"), shutil.which("chromium-browser"),
    os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
    os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    shutil.which("msedge"), shutil.which("microsoft-edge"),
    os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
    os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]
# Unset variables stay as %NAME% after expandvars, those paths simply don't exist
chrome = next((c for c in CANDIDATES if c and Path(c).exists()), None)
if not chrome:
    sys.exit("Chrome or Edge not found, set CHROME to render the PDF")

# The fonts come from Google Fonts. Virtual time stands still while they download, and the budget is how long
# the page may then run before the capture, so they are in before it. The PDF is checked for them after
FONT_WAIT_MS = 30000
FONTS = ("OverusedGrotesk", "HankenGrotesk", "AzeretMono", "CourierPrime")
for pdf, query in PDFS.items():
    with tempfile.TemporaryDirectory() as profile:  # separate profile, so a running Chrome doesn't interfere
        # headless Chrome now and then stalls on a render and never exits: give it two minutes, then one more try
        for attempt in (1, 2):
            try:
                subprocess.run([chrome, "--headless=new", "--disable-gpu", f"--user-data-dir={profile}",
                                f"--virtual-time-budget={FONT_WAIT_MS}", "--no-pdf-header-footer", f"--print-to-pdf={pdf}",
                                (SITE / "index.html").as_uri() + query], check=True, capture_output=True, timeout=120)
                break
            except subprocess.TimeoutExpired:
                if attempt == 2:
                    sys.exit(f"{pdf.name} stalled twice, rerun")
                print(f"{pdf.name} stalled, trying again")
    data = pdf.read_bytes()
    # Embedded font names drop the spaces and may add hyphens, AAAAAA+HankenGrotesk-Medium
    embedded = re.sub(rb"[^a-z]", b"", b" ".join(re.findall(rb"/FontName\s*/([^\s/<>\[\]]+)", data)).lower())
    missing = [f for f in FONTS if f.lower().encode() not in embedded]
    if missing:
        sys.exit(f"{pdf.name} has no {', '.join(missing)}, the fonts did not load in time. Check the connection and rerun")
    pages = len(re.findall(rb"/Type\s*/Page[^s]", data))
    print(f"rendered {pdf.name}, {pages} pages")
