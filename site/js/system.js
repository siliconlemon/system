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
  function relayout() { segs.forEach(function (g) { g.measure(); }); }

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
  }
  if (tester && size && weight) {
    size.addEventListener("input", setType);
    weight.addEventListener("input", setType);
    setType();
  }

  /* ---------- Motion demos play on tap too ---------- */

  document.querySelectorAll(".motion-demo").forEach(function (d) {
    d.addEventListener("click", function () { d.classList.toggle("play"); });
  });

  /* ---------- Cell controls ----------
     One ink block under a row of cells. Each edge has its own spring:
     the edge on the side of travel is stiff, the other one loose, so on
     a long jump the block stretches into a wipe and closes up behind. */

  function Seg(box) {
    var layer = document.createElement("div");
    layer.className = "seg-layer";
    layer.setAttribute("aria-hidden", "true");
    var block = document.createElement("b");
    block.className = "seg-block";
    box.insertBefore(layer, box.firstChild);
    var items = [], slots = [];
    var lo = edge(), hi = edge();
    var active = -1, raf = 0;

    function edge() { return { x: 0, v: 0, to: 0, k: 0.2 }; }
    function step(e) {
      e.v = (e.v + (e.to - e.x) * e.k) * 0.62;
      e.x += e.v;
    }
    function settle() {
      lo.x = lo.to;
      hi.x = hi.to;
      lo.v = hi.v = 0;
    }
    function draw() {
      block.style.transform = "translateX(" + lo.x + "px)";
      block.style.width = Math.max(hi.x - lo.x, 0) + "px";
    }
    function loop() {
      step(lo);
      step(hi);
      draw();
      if (Math.abs(lo.v) + Math.abs(hi.v) + Math.abs(lo.to - lo.x) + Math.abs(hi.to - hi.x) < 0.3) {
        settle();
        draw();
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
    }
    function measure() {
      items = Array.prototype.slice.call(box.children).filter(function (el) {
        return el.tagName === "A" || el.tagName === "BUTTON";
      });
      slots = items.map(function (el) { return { x: el.offsetLeft, w: el.offsetWidth }; });
      var last = slots[slots.length - 1];
      layer.style.width = (last ? last.x + last.w : 0) + "px";
      // a hairline between neighboring cells, none on the outer edges
      layer.innerHTML = "";
      slots.slice(1).forEach(function (s) {
        var i = document.createElement("i");
        i.style.left = s.x + "px";
        layer.appendChild(i);
      });
      layer.appendChild(block);
      if (active >= 0) {
        lo.to = slots[active].x;
        hi.to = slots[active].x + slots[active].w;
        settle();
        draw();
      }
      reveal("auto");
    }
    // keep the active cell in view when the cells overflow, and the row at its start when they fit again
    function reveal(behavior) {
      if (box.scrollWidth <= box.clientWidth) { box.scrollLeft = 0; return; }
      if (active < 0) return;
      var el = items[active];
      box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: behavior });
    }
    function set(i, jump) {
      if (i === active || !slots[i]) return;
      var firstTime = active < 0;
      active = i;
      items.forEach(function (el, j) {
        el.setAttribute(el.tagName === "A" ? "aria-current" : "aria-checked", String(j === i));
      });
      var to = slots[i].x;
      var right = to > lo.to;
      lo.to = to;
      hi.to = to + slots[i].w;
      (right ? hi : lo).k = 0.22;
      (right ? lo : hi).k = 0.09;
      reveal(firstTime || jump ? "auto" : "smooth");
      if (firstTime || jump || reduce.matches) {
        settle();
        draw();
        return;
      }
      if (!raf) raf = requestAnimationFrame(loop);
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
     An All cell, then one cell per sheet with a data-nav name. The canvas
     says which sheet is in view, and the cell of that sheet's chapter
     lights up. The crumb in the top bar names the sheet itself. */

  var navBox = document.querySelector('[data-seg="nav"]');
  var here = document.querySelector("[data-here]");
  var zoomLabel = document.querySelector("[data-zoom-label]");
  var canvas = window.canvas;
  if (navBox && canvas) {
    var number = function (board) {
      var n = board.querySelector(".sheet-no b");
      return n ? n.textContent : "00";
    };
    var chapters = [];
    var cell = function (num, key, name, go) {
      var a = document.createElement("a");
      var b = document.createElement("b");
      var label = document.createElement("span");
      a.href = go === "all" ? "#" : "#" + canvas.boards[go].querySelector("section").id;
      if (num) {
        b.textContent = num;
        a.appendChild(b);
      }
      if (key) label.setAttribute("data-i18n", key);
      label.textContent = name;
      a.appendChild(label);
      a.addEventListener("click", function (e) { e.preventDefault(); canvas.go(go, true); });
      navBox.appendChild(a);
    };
    cell("", "bar.all", t("bar.all"), "all");
    canvas.boards.forEach(function (board, i) {
      var sec = board.querySelector("section"), name = sec.getAttribute("data-nav");
      if (!name) return;
      chapters.push(i);
      cell(number(board), attrKey(sec, "data-nav"), name, i);
    });
    var navSeg = Seg(navBox);
    segs.push(navSeg);

    var allBtn = document.querySelector("[data-all]");
    var cur = document.querySelector("[data-cur]");
    var steps = document.querySelectorAll("[data-step]");
    var last = canvas.boards.length - 1;
    var crumb = function (el, f) {
      el.innerHTML = "";
      var nb = document.createElement("b");
      // the short chapter name where there is one, the sheet title otherwise
      var name = t("bar.all");
      if (f !== "all") {
        var sec = canvas.boards[f].querySelector("section"), title = sec.querySelector(".sheet-title");
        name = sec.getAttribute("data-nav") || (title ? title.textContent : "");
      }
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

    var lastF = "all", lastPct = 100;
    var bars = function (f, pct) {
      lastF = f;
      lastPct = pct;
      if (allBtn) allBtn.setAttribute("aria-pressed", String(f === "all"));
      // on phones the zoom cell mirrors All, so it takes the same pressed look
      if (zoomLabel) zoomLabel.setAttribute("aria-pressed", String(f === "all"));
      if (cur) crumb(cur, f);
      if (steps.length) {
        steps[0].disabled = f === "all";
        steps[1].disabled = f === last;
      }
      var idx = 0;
      if (f !== "all") chapters.forEach(function (c, j) { if (c <= f) idx = j + 1; });
      navSeg.set(idx);
      if (zoomLabel) zoomLabel.textContent = pct + "%";
      // the crumb chains like the wordmark: System. on its own for all sheets, System.logo on a sheet
      if (here) {
        var title = f === "all" ? null : canvas.boards[f].querySelector(".sheet-title");
        here.textContent = f === "all" ? "" : (title ? title.textContent : "cover").toLocaleLowerCase(lang);
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
      if (typeof bars === "function") bars(lastF, lastPct);
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
     The ring takes the first second from the start of the load, then the
     spring zoom and fade hand over to the canvas. */

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
  if (document.fonts) document.fonts.ready.then(relayout);
})();
