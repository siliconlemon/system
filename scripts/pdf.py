"""Render site/system.pdf, the file the PDF button in the top bar links to. Rerun it after changing a sheet.

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
PDF = SITE / "system.pdf"

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
FONTS = ("InterTight", "IBMPlexMono")
with tempfile.TemporaryDirectory() as profile:  # separate profile, so a running Chrome doesn't interfere
    subprocess.run([chrome, "--headless=new", "--disable-gpu", f"--user-data-dir={profile}",
                    f"--virtual-time-budget={FONT_WAIT_MS}", "--no-pdf-header-footer", f"--print-to-pdf={PDF}",
                    (SITE / "index.html").as_uri()], check=True, capture_output=True)

data = PDF.read_bytes()
# Embedded font names drop the spaces and may add hyphens, AAAAAA+InterTight-Medium
embedded = re.sub(rb"[^a-z]", b"", b" ".join(re.findall(rb"/FontName\s*/([^\s/<>\[\]]+)", data)).lower())
missing = [f for f in FONTS if f.lower().encode() not in embedded]
if missing:
    sys.exit(f"system.pdf has no {', '.join(missing)}, the fonts did not load in time. Check the connection and rerun")
pages = len(re.findall(rb"/Type\s*/Page[^s]", data))
print(f"rendered system.pdf, {pages} pages")
