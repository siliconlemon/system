/* System: flags, theme, type tester, the cell controls in the bars, and runt control. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var segs = [];

  function store(key, fn) {
    try {
      var all = JSON.parse(localStorage.getItem(key) || "{}");
      fn(all);
      localStorage.setItem(key, JSON.stringify(all));
    } catch (e) {}
  }
  function relayout() { segs.forEach(function (g) { g.measure(); }); letter(); onRulers(); }

  /* Big type sits on the ruler lines by its ink, not by its box. A glyph's
     outline starts a side bearing in from its origin, so a 352 px S stood
     several pixels off the line, and round letters overshoot the cap height.
     Each big line's first glyph is drawn once on a canvas and scanned for
     where its ink starts, to a fraction of a pixel, and the line is pulled
     back by exactly that (text-indent, so margins stay the layout's). The
     cover word also gets --ink-rise, how far its ink climbs over the cap
     height, so the top guide meets the ink. Runs again after the fonts load,
     a resize or a language switch, since those change the glyphs. The Aa
     specimens are also sized so their ink ends on the next ruler line. */
  var BIG = ".cover-word, .sheet-title, .specimen, .tester, .e404, .landing-hero h3, .ink-sample, .feature-sample, .scale li > :nth-child(2), .wordmark, .paper-card p";
  var inkCache = {};
  function inkOf(font, text, spacing) {
    spacing = spacing || 0;
    var key = font + "|" + spacing + "|" + text;
    if (inkCache[key]) return inkCache[key];
    var S = 400, W = Math.ceil(S * (0.5 + 0.8 * text.length)), H = Math.ceil(S * 1.6), ox = S / 2, oy = Math.round(S * 1.15);
    var c = document.createElement("canvas");
    c.width = W; c.height = H;
    var x = c.getContext("2d", { willReadFrequently: true });
    x.font = font.replace("{size}", S + "px");
    x.fillStyle = "#000";
    x.textBaseline = "alphabetic";
    x.letterSpacing = (spacing * S) + "px";
    x.fillText(text, ox, oy);
    var d = x.getImageData(0, 0, W, H).data, colMax = new Uint8Array(W), rowMax = new Uint8Array(H);
    for (var y = 0; y < H; y++) for (var i = 0; i < W; i++) {
      var a = d[(y * W + i) * 4 + 3];
      if (a > colMax[i]) colMax[i] = a;
      if (a > rowMax[y]) rowMax[y] = a;
    }
    // the first column or row with ink, refined by its coverage: a half-covered edge pixel is half a pixel of ink
    var left = 0, right = 0, top = 0, bottom = 0;
    for (i = 0; i < W; i++) if (colMax[i]) { left = i + 1 - colMax[i] / 255; break; }
    for (i = W - 1; i >= 0; i--) if (colMax[i]) { right = i + colMax[i] / 255; break; }
    for (y = 0; y < H; y++) if (rowMax[y]) { top = y + 1 - rowMax[y] / 255; break; }
    for (y = H - 1; y >= 0; y--) if (rowMax[y]) { bottom = y + rowMax[y] / 255; break; }
    return (inkCache[key] = { left: (left - ox) / S, right: (right - ox) / S, top: (oy - top) / S, bottom: (bottom - oy) / S });
  }
  function onRulers() {
    document.querySelectorAll(BIG).forEach(function (el) {
      // a field's text is its value, which the reader may retype
      var text = (el.tagName === "TEXTAREA" ? el.value : el.textContent).trim();
      if (!text) return;
      var cs = getComputedStyle(el);
      var font = cs.fontStyle + " " + cs.fontWeight + " {size} " + cs.fontFamily;
      el.style.textIndent = (-inkOf(font, text.charAt(0)).left).toFixed(4) + "em";
      if (el.classList.contains("specimen")) {
        // the Aa's ink runs from the sheet's first ruler to the next one, three columns and three gaps over
        var g = getComputedStyle(el.closest(".grid")), track = 3 * (parseFloat(g.gridTemplateColumns) + parseFloat(g.columnGap));
        var ink = inkOf(font, text, (parseFloat(cs.letterSpacing) || 0) / parseFloat(cs.fontSize));
        el.style.fontSize = (track / (ink.right - ink.left)).toFixed(3) + "px";
      }
      if (el.classList.contains("cover-word")) {
        // the cap height is the top of a flat capital; the word's ink climbs over it by the overshoot
        var rise = inkOf(font, text).top - inkOf(font, "H").top;
        el.parentNode.style.setProperty("--ink-rise", (Math.max(0, rise) * parseFloat(cs.fontSize)).toFixed(2) + "px");
      }
    });
  }

  /* Drawings are in their own units, so lettering and strokes grew and
     shrank with every figure. Each drawing gets --vu, drawing units per
     sheet pixel: lettering is 12 px times --vu, strokes are the shared
     --line or --line-2 times --vu. Widths are read as a share of the
     sheet, so the canvas zoom and pan don't enter into it. */
  function letter() {
    document.querySelectorAll("main svg[viewBox]").forEach(function (svg) {
      var vb = svg.viewBox.baseVal, w = svg.getBoundingClientRect().width;
      var board = svg.closest(".board");
      if (board) w = w / board.getBoundingClientRect().width * board.offsetWidth;
      if (vb && vb.width && w) svg.style.setProperty("--vu", (vb.width / w).toFixed(4));
    });
  }

  /* ---------- Strings ----------
     Every piece of copy has a key, and each language has one resource file,
     strings/en.js and strings/cs.js. The markup carries the key and the
     English as a fallback: data-i18n for text, data-i18n-html where the copy
     holds inline markup, data-i18n-attr="aria-label=key title=key" for
     attributes. A missing key falls back to English. The head script picks
     the language before first paint. */

  var STRINGS = window.STRINGS || {};
  var lang = root.getAttribute("lang") || "en";
  function t(key) {
    var l = STRINGS[lang] || {};
    return key in l ? l[key] : (STRINGS.en || {})[key];
  }
  function attrKey(el, attr) {
    var m = (el.getAttribute("data-i18n-attr") || "").match(new RegExp("(?:^|\\s)" + attr + "=(\\S+)"));
    return m ? m[1] : null;
  }
  function applyStrings() {
    document.title = t("meta.title") || document.title;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n"));
      if (v == null) return;
      if (el.hasAttribute("data-i18n-html")) el.innerHTML = v;
      else el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(/\s+/).forEach(function (pair) {
        var i = pair.indexOf("="), v = t(pair.slice(i + 1));
        if (v != null) el.setAttribute(pair.slice(0, i), v);
      });
    });
  }

  /* ---------- With / without flags ---------- */

  document.querySelectorAll("[data-flag]").forEach(function (sw) {
    var flag = sw.getAttribute("data-flag");
    sw.setAttribute("aria-checked", String(root.getAttribute("data-" + flag) !== "without"));
    sw.addEventListener("click", function () {
      var on = sw.getAttribute("aria-checked") !== "true";
      sw.setAttribute("aria-checked", String(on));
      root.setAttribute("data-" + flag, on ? "with" : "without");
      store("system:flags", function (s) { s[flag] = on ? "with" : "without"; });
      relayout();
    });
  });

  /* ---------- Type tester ---------- */

  var tester = document.querySelector("[data-tester]");
  var size = document.querySelector("[data-tester-size]");
  var weight = document.querySelector("[data-tester-weight]");
  var out = document.querySelector("[data-tester-out]");
  function setType() {
    var px = +size.value;
    tester.style.fontSize = px + "px";
    tester.style.lineHeight = Math.ceil((px * 1.12) / 8) * 8 + "px";
    tester.style.fontWeight = weight.value;
    [size, weight].forEach(function (r) { r.style.setProperty("--p", (r.value - r.min) / (r.max - r.min) * 100); });
    out.textContent = px + " px · " + weight.value;
    // the weight changes the first letter's side bearing, so the line is pulled onto the ruler again
    onRulers();
  }
  if (tester && size && weight) {
    size.addEventListener("input", setType);
    weight.addEventListener("input", setType);
    tester.addEventListener("input", onRulers);
    setType();
  }

  /* ---------- Motion demos play on tap too ---------- */

  document.querySelectorAll(".motion-demo").forEach(function (d) {
    d.addEventListener("click", function () { d.classList.toggle("play"); });
  });

  /* ---------- Cell controls ----------
     One ink block under a row of cells. It moves to the chosen cell on
     the standard curve from the motion sheet (--t, --ease), sliding and
     resizing at once, with no stretch. A first placement or a jump
     lands without the move. */

  function Seg(box) {
    var layer = document.createElement("div");
    layer.className = "seg-layer";
    layer.setAttribute("aria-hidden", "true");
    var block = document.createElement("b");
    block.className = "seg-block";
    layer.appendChild(block);
    box.insertBefore(layer, box.firstChild);
    var items = [], slots = [], totalW = 0, boxW = 0, active = -1;

    function place(instant) {
      if (active < 0 || !slots[active]) return;
      if (instant) block.classList.add("still");
      block.style.transform = "translateX(" + slots[active].x + "px) scaleX(" + slots[active].w + ")";
      if (instant) {
        block.getBoundingClientRect();
        block.classList.remove("still");
      }
    }
    function measure() {
      items = Array.prototype.slice.call(box.children).filter(function (el) {
        return el.tagName === "A" || el.tagName === "BUTTON";
      });
      slots = items.map(function (el) { return { x: el.offsetLeft, w: el.offsetWidth }; });
      var last = slots[slots.length - 1];
      totalW = last ? last.x + last.w : 0;
      boxW = box.clientWidth;
      layer.style.width = totalW + "px";
      place(true);
      reveal("auto");
    }
    // keep the active cell in view when the cells overflow, and the row at its start when they fit again
    function reveal(behavior) {
      if (totalW <= boxW) { if (box.scrollLeft) box.scrollLeft = 0; return; }
      if (active < 0) return;
      var s = slots[active];
      box.scrollTo({ left: s.x - (boxW - s.w) / 2, behavior: behavior });
    }
    function set(i, jump) {
      if (i === active || !slots[i]) return;
      var firstTime = active < 0;
      active = i;
      items.forEach(function (el, j) {
        el.setAttribute(el.tagName === "A" ? "aria-current" : "aria-checked", String(j === i));
      });
      reveal(firstTime || jump ? "auto" : "smooth");
      place(firstTime || jump);
    }
    measure();
    return { measure: measure, set: set };
  }

  /* ---------- Theme: auto, light, dark ---------- */

  var themeBox = document.querySelector('[data-seg="theme"]');
  if (themeBox) {
    var themeSeg = Seg(themeBox);
    segs.push(themeSeg);
    var themeBtns = Array.prototype.slice.call(themeBox.querySelectorAll("[data-theme-set]"));
    var applyTheme = function (t, jump) {
      if (t === "auto") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", t);
      themeSeg.set(themeBtns.map(function (b) { return b.getAttribute("data-theme-set"); }).indexOf(t), jump);
    };
    // Paper is the default; dark and auto are there when someone asks.
    var theme = "light";
    try { theme = localStorage.getItem("system:theme") || "light"; } catch (e) {}
    applyTheme(theme, true);
    var names = themeBtns.map(function (b) { return b.getAttribute("data-theme-set"); });
    var phone = window.matchMedia("(max-width: 720px)");
    themeBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        // phones show only the current theme, a tap moves on to the next one
        if (phone.matches) {
          theme = names[(names.indexOf(theme) + 1) % names.length];
          applyTheme(theme, true);
          themeSeg.measure();
        } else {
          theme = b.getAttribute("data-theme-set");
          applyTheme(theme);
        }
        try { localStorage.setItem("system:theme", theme); } catch (e) {}
      });
    });
  }

  /* ---------- Sheet nav ----------
     An All cell, then one cell for every sheet, named by the sheet's own
     title, the one word the crumb chains onto System. too, so tab, title
     and crumb always agree. The cover has no title and names itself with
     data-nav. The canvas says which sheet is in view and its cell lights up. */

  var navBox = document.querySelector('[data-seg="nav"]');
  var here = document.querySelector("[data-here]");
  var zoomLabel = document.querySelector("[data-zoom-label]");
  var canvas = window.canvas;
  if (navBox && canvas) {
    var number = function (board) {
      var n = board.querySelector(".sheet-no b");
      return n ? n.textContent : "00";
    };
    // the sheet's one word and its string key: the title, or data-nav on the cover
    var sheetName = function (board) {
      var sec = board.querySelector("section"), title = sec.querySelector(".sheet-title");
      return title ? { key: title.getAttribute("data-i18n"), name: title.textContent }
        : { key: attrKey(sec, "data-nav"), name: sec.getAttribute("data-nav") || "" };
    };
    var cell = function (key, name, go) {
      var a = document.createElement("a");
      var label = document.createElement("span");
      a.href = go === "all" ? "#" : "#" + canvas.boards[go].querySelector("section").id;
      if (key) label.setAttribute("data-i18n", key);
      label.textContent = name;
      a.appendChild(label);
      a.addEventListener("click", function (e) { e.preventDefault(); canvas.go(go, true); });
      navBox.appendChild(a);
    };
    cell("bar.all", t("bar.all"), "all");
    canvas.boards.forEach(function (board, i) {
      var n = sheetName(board);
      cell(n.key, n.name, i);
    });
    var navSeg = Seg(navBox);
    segs.push(navSeg);
    // more cells to the right than fit: the zoom's fade shows (CSS)
    var more = function () { navBox.classList.toggle("more", navBox.scrollLeft + navBox.clientWidth < navBox.scrollWidth - 1); };
    navBox.addEventListener("scroll", more, { passive: true });
    // an ordinary mouse wheel over the cells runs them sideways; a trackpad's own sideways swipe passes
    navBox.addEventListener("wheel", function (e) {
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY) || navBox.scrollWidth <= navBox.clientWidth) return;
      e.preventDefault();
      navBox.scrollLeft += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    }, { passive: false });
    addEventListener("resize", more);
    // a language switch or a late font changes the cells' widths
    if (window.ResizeObserver) Array.prototype.forEach.call(navBox.children, function (c) { new ResizeObserver(more).observe(c); });
    more();

    var allBtn = document.querySelector("[data-all]");
    var cur = document.querySelector("[data-cur]");
    var steps = document.querySelectorAll("[data-step]");
    var last = canvas.boards.length - 1;
    var crumb = function (el, f) {
      el.innerHTML = "";
      var nb = document.createElement("b");
      var name = f === "all" ? t("bar.all") : sheetName(canvas.boards[f]).name;
      // All has no number, a sheet leads with its own
      if (f !== "all") {
        nb.textContent = number(canvas.boards[f]);
        el.appendChild(nb);
      }
      el.appendChild(document.createTextNode(name));
    };
    if (allBtn) allBtn.addEventListener("click", function () { canvas.go("all", true); });
    var home = document.querySelector("[data-home]");
    if (home) home.addEventListener("click", function (e) { e.preventDefault(); canvas.go("all", true); });
    // the pager runs All, cover, ..., the last sheet
    Array.prototype.forEach.call(steps, function (b) {
      b.addEventListener("click", function () {
        var f = canvas.focus(), i = f === "all" ? -1 : f, to = i + +b.getAttribute("data-step");
        canvas.go(to < 0 ? "all" : Math.min(last, to), true);
      });
    });

    var lastF = null, lastPct = 0;
    var bars = function (f, pct, force) {
      if (f !== lastF || force) {
        lastF = f;
        if (allBtn) allBtn.setAttribute("aria-pressed", String(f === "all"));
        // on phones the zoom cell mirrors All, so it takes the same pressed look
        if (zoomLabel) zoomLabel.setAttribute("aria-pressed", String(f === "all"));
        if (cur) crumb(cur, f);
        if (steps.length) {
          steps[0].disabled = f === "all";
          steps[1].disabled = f === last;
        }
        navSeg.set(f === "all" ? 0 : f + 1);
        // the crumb chains like the wordmark: System. on its own for all sheets, System.logo on a sheet
        if (here) {
          here.textContent = f === "all" ? "" : sheetName(canvas.boards[f]).name.toLocaleLowerCase(lang);
        }
      }
      if (pct !== lastPct || force) {
        lastPct = pct;
        if (zoomLabel) zoomLabel.textContent = pct + "%";
      }
    };
    canvas.onchange(bars);
    document.querySelectorAll("[data-zoom]").forEach(function (b) {
      b.addEventListener("click", function () {
        var d = +b.getAttribute("data-zoom");
        if (d) canvas.zoom(d); else canvas.go("all", true);
      });
    });
  }

  /* ---------- Language: English, Czech ----------
     A quiet twin of the theme switch: the accent edge marks the language,
     with no ink block, so the two never read as one control. On phones only
     the current language shows and a tap moves on to the next. The choice
     is remembered and kept in the address as ?lang=, which wins over the
     saved choice (the PDF render uses it too), and the head script falls
     back to the browser's languages. */

  var langBox = document.querySelector('[data-seg="lang"]');
  if (langBox) {
    var langSeg = Seg(langBox);
    segs.push(langSeg);
    var langBtns = Array.prototype.slice.call(langBox.querySelectorAll("[data-lang-set]"));
    var langs = langBtns.map(function (b) { return b.getAttribute("data-lang-set"); });
    var phoneLang = window.matchMedia("(max-width: 720px)");
    var setLang = function (l, jump) {
      lang = l;
      root.setAttribute("lang", l);
      applyStrings();
      noRunts();
      langSeg.set(langs.indexOf(l), jump);
      // the address carries the language, so a shared link opens in it
      var q = new URLSearchParams(location.search);
      if (q.get("lang") !== l) {
        q.set("lang", l);
        history.replaceState(history.state, "", location.pathname + "?" + q + location.hash);
      }
      relayout();
      if (window.canvas) window.canvas.relayout();
      if (typeof bars === "function") bars(lastF, lastPct, true);
    };
    setLang(langs.indexOf(lang) < 0 ? "en" : lang, true);
    langBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var l = phoneLang.matches ? langs[(langs.indexOf(lang) + 1) % langs.length] : b.getAttribute("data-lang-set");
        if (l === lang) return;
        setLang(l, phoneLang.matches);
        try { localStorage.setItem("system:lang", l); } catch (e) {}
      });
    });
  } else {
    applyStrings();
    noRunts();
  }

  /* ---------- Splash ----------
     The press run takes the first second from the start of the load, then
     the sheet lifts off and fades into the canvas. */

  var splash = document.querySelector(".splash");
  if (splash) {
    setTimeout(function () {
      splash.classList.add("out");
      setTimeout(function () { splash.remove(); }, reduce.matches ? 0 : 600);
    }, Math.max(0, 1050 - performance.now()));
  }

  /* ---------- No runts ----------
     Tie the last three words of every paragraph and heading together, so
     no block ends on a line with one or two lonely words. Czech also never
     leaves a one-letter word (v, k, s, z, o, u, a, i) at the end of a line,
     so those tie to the word after them. Runs again after every language
     switch, since that replaces the text. */

  function noRunts() {
    document.querySelectorAll("main p, main h2, main h3, main h4, main h5, main dd, main li, main figcaption").forEach(function (el) {
      if (lang === "cs") {
        var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), tn;
        while ((tn = w.nextNode())) tn.nodeValue = tn.nodeValue.replace(/(^|[\s(„])([kvszouaiKVSZOUAI]) +/g, "$1$2 ");
      }
      if (el.textContent.trim().split(/\s+/).length < 5) return;
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), node, last = null;
      while ((node = walker.nextNode())) if (node.nodeValue.trim()) last = node;
      if (!last) return;
      var v = last.nodeValue.replace(/\s+$/, ""), trail = last.nodeValue.slice(v.length);
      for (var n = 0; n < 2; n++) {
        var i = v.lastIndexOf(" ");
        if (i < 0) break;
        v = v.slice(0, i) + " " + v.slice(i + 1);
      }
      last.nodeValue = v + trail;
    });
  }

  window.addEventListener("resize", relayout);
  // glyphs measured before the fonts arrived were the fallback's
  if (document.fonts) document.fonts.ready.then(function () { inkCache = {}; relayout(); });
})();
