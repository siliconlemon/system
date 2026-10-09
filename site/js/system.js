/* System: flags, theme, type tester, the goo controls in the bars, and runt control. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var goos = [];

  function store(key, fn) {
    try {
      var all = JSON.parse(localStorage.getItem(key) || "{}");
      fn(all);
      localStorage.setItem(key, JSON.stringify(all));
    } catch (e) {}
  }
  function relayout() { goos.forEach(function (g) { g.measure(); }); }

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

  /* ---------- Goo controls ----------
     Two pills under one goo filter. The head follows the target with a
     stiff spring, the tail with a loose one, so on a long jump the fluid
     stretches, necks between them and snaps back together. A dot in each
     slot swells while the fluid passes, so it seems to drip through. */

  var NS = "http://www.w3.org/2000/svg";
  var H = 40;

  function Goo(box) {
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "goo-layer");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = '<g filter="url(#goo)"><g></g><rect class="fluid" rx="20"/><rect class="fluid" rx="20"/></g>';
    box.insertBefore(svg, box.firstChild);
    var dots = svg.querySelector("g g");
    var rects = svg.querySelectorAll("rect");
    var tail = rects[0], head = rects[1];
    var items = [], slots = [];
    var hd = spring(0.16, 0.68), tl = spring(0.07, 0.74);
    var target = { x: 0, w: 0 }, active = -1, raf = 0;

    function spring(k, d) { return { x: 0, w: 0, vx: 0, vw: 0, k: k, d: d }; }
    function step(s) {
      s.vx = (s.vx + (target.x - s.x) * s.k) * s.d;
      s.vw = (s.vw + (target.w - s.w) * s.k) * s.d;
      s.x += s.vx;
      s.w += s.vw;
    }
    function settle() {
      hd.x = tl.x = target.x;
      hd.w = tl.w = target.w;
      hd.vx = tl.vx = hd.vw = tl.vw = 0;
    }
    function draw() {
      [[head, hd], [tail, tl]].forEach(function (p) {
        // the faster a pill moves, the thinner it gets, like a stretched drop
        var squeeze = Math.min(Math.abs(p[1].vx) * 0.35, 10);
        p[0].setAttribute("x", p[1].x);
        p[0].setAttribute("width", Math.max(p[1].w, H));
        p[0].setAttribute("y", squeeze / 2);
        p[0].setAttribute("height", H - squeeze);
      });
      var lo = Math.min(hd.x, tl.x), hi = Math.max(hd.x, tl.x) + target.w;
      Array.prototype.forEach.call(dots.children, function (c, i) {
        var mid = slots[i].x + slots[i].w / 2;
        c.setAttribute("r", mid > lo && mid < hi && i !== active ? 9 : 0);
      });
    }
    function loop() {
      step(hd);
      step(tl);
      draw();
      if (Math.abs(hd.vx) + Math.abs(tl.vx) + Math.abs(target.x - tl.x) + Math.abs(target.x - hd.x) < 0.2) {
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
      svg.setAttribute("width", last ? last.x + last.w : 0);
      svg.setAttribute("height", H);
      dots.innerHTML = "";
      slots.forEach(function (s) {
        var c = document.createElementNS(NS, "circle");
        c.setAttribute("class", "fluid");
        c.setAttribute("cx", s.x + s.w / 2);
        c.setAttribute("cy", H / 2);
        c.setAttribute("r", 0);
        dots.appendChild(c);
      });
      if (active >= 0) {
        target = { x: slots[active].x, w: slots[active].w };
        settle();
        draw();
      }
    }
    function set(i, jump) {
      if (i === active || !slots[i]) return;
      var firstTime = active < 0;
      active = i;
      items.forEach(function (el, j) {
        el.setAttribute(el.tagName === "A" ? "aria-current" : "aria-checked", String(j === i));
      });
      target = { x: slots[i].x, w: slots[i].w };
      // keep the active item in view when the bar scrolls on phones
      if (box.scrollWidth > box.clientWidth) {
        var el = items[i];
        box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: firstTime || jump ? "auto" : "smooth" });
      }
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

  var themeBox = document.querySelector('[data-goo="theme"]');
  if (themeBox) {
    var themeGoo = Goo(themeBox);
    goos.push(themeGoo);
    var themeBtns = Array.prototype.slice.call(themeBox.querySelectorAll("[data-theme-set]"));
    var applyTheme = function (t, jump) {
      if (t === "auto") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", t);
      themeGoo.set(themeBtns.map(function (b) { return b.getAttribute("data-theme-set"); }).indexOf(t), jump);
    };
    // Paper is the default; dark and auto are there when someone asks.
    var theme = "light";
    try { theme = localStorage.getItem("system:theme") || "light"; } catch (e) {}
    applyTheme(theme, true);
    themeBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        theme = b.getAttribute("data-theme-set");
        applyTheme(theme);
        try { localStorage.setItem("system:theme", theme); } catch (e) {}
      });
    });
  }

  /* ---------- Sheet nav ---------- */

  var navBox = document.querySelector('[data-goo="nav"]');
  var here = document.querySelector("[data-here]");
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
  var sheets = Array.prototype.slice.call(document.querySelectorAll("main > section"));
  if (navBox && sections.length) {
    sections.forEach(function (sec) {
      var a = document.createElement("a");
      a.href = "#" + sec.id;
      a.textContent = sec.getAttribute("data-nav");
      navBox.appendChild(a);
    });
    var navGoo = Goo(navBox);
    goos.push(navGoo);

    // The active sheet is the last one whose top has passed 40% of the viewport.
    var ticking = false;
    var pick = function () {
      ticking = false;
      var line = window.innerHeight * 0.4, idx = 0, cur = null;
      sections.forEach(function (s, i) { if (s.getBoundingClientRect().top <= line) idx = i; });
      sheets.forEach(function (s) { if (s.getBoundingClientRect().top <= line) cur = s; });
      navGoo.set(idx);
      if (here) {
        var t = cur && cur.querySelector(".sheet-title");
        here.textContent = t ? t.textContent : "Cover";
      }
    };
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(pick);
      }
    }, { passive: true });
    pick();
  }

  /* ---------- No runts ----------
     Tie the last three words of every paragraph and heading together,
     so no block ends on a line with one or two lonely words. */

  document.querySelectorAll("main p, main h2, main h3, main h4, main h5, main dd, main figcaption").forEach(function (el) {
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

  window.addEventListener("resize", relayout);
  if (document.fonts) document.fonts.ready.then(relayout);
})();
