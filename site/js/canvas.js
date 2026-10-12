/* System canvas: every sheet as an artboard on one pannable, zoomable canvas.
   Ported from the Viewgraft manual. Sheets here are tall and of different
   heights, so a sheet fits to its width and you pan down it, and the overview
   packs rows by their tallest sheet. Print ignores all of this. */
(function () {
  "use strict";

  var root = document.documentElement;
  var deck = document.querySelector("main");
  var template = document.querySelector(".rules");
  var topbar = document.querySelector(".bar.top");
  var bottombar = document.querySelector(".bar.bottom");
  if (!deck) return;

  /* ---------- Artboards ----------
     Each section goes into a board with its own ruler lines. The footer
     closes the last board. */

  deck.classList.add("deck");
  var foot = deck.querySelector(":scope > footer");
  var boards = Array.prototype.slice.call(deck.querySelectorAll(":scope > section")).map(function (sec, i) {
    var board = document.createElement("div");
    board.className = "board";
    deck.insertBefore(board, sec);
    if (template) board.appendChild(template.cloneNode(true));
    board.appendChild(sec);
    // Each sheet went through the press on its own, so its accent plate sits off by its own
    // amount, up to a pixel, the same on every visit (a hash of the index, not a random draw)
    var a = (i * 2.399963) % (2 * Math.PI), r = 0.45 + 0.5 * ((i * 0.618034) % 1);
    board.style.setProperty("--rx", (r * Math.cos(a)).toFixed(2) + "px");
    board.style.setProperty("--ry", (r * Math.sin(a)).toFixed(2) + "px");
    // the print code: the sheet's number, then the press run (system.js translates it)
    var no = sec.querySelector(".sheet-no b"), slug = document.createElement("p"), b = document.createElement("b"), run = document.createElement("span");
    slug.className = "slug label";
    slug.setAttribute("aria-hidden", "true");
    b.textContent = no ? no.textContent : "00";
    run.setAttribute("data-i18n", "common.slug");
    run.textContent = "System · Edition 1.0 · Offset, black and one spot color, uncoated 120 g/m²";
    slug.appendChild(b);
    slug.appendChild(run);
    board.appendChild(slug);
    return board;
  });
  if (foot && boards.length) boards[boards.length - 1].appendChild(foot);
  if (template) template.remove();
  var ids = boards.map(function (b) { return b.querySelector("section").id; });

  var cam = document.createElement("div");
  cam.className = "cam";
  deck.parentNode.insertBefore(cam, deck);
  cam.appendChild(deck);
  var marks = document.createElement("canvas");
  marks.className = "marks";
  marks.setAttribute("aria-hidden", "true");
  document.body.insertBefore(marks, document.body.firstChild);

  var GAP = 160;
  var view = { x: 0, y: 0, s: 1 }, z = 1, current = "all";
  var cols = 0, box = { w: 0, h: 0 }, rects = [];
  var listeners = [], lastFocus, lastPct;

  function phone() { return innerWidth <= 720; }

  /* ---------- Register crosses ----------
     A uniform grid of crosses fixed to the canvas, not the screen, every
     400 px from the first sheet's top-left corner. 400 divides a sheet
     column (1440 + 160 px), so every sheet's left edge lands on the grid,
     while rows follow their sheets. They are drawn on a
     screen-sized <canvas>, every cross snapped to whole device pixels, so
     the line is exactly 1 px and the cross 13 px across at any zoom (9 on
     phones, where the sheets are drawn smaller), like marks on the glass
     rather than on the paper. Every cross is drawn at every zoom; only
     where neighbors would touch, at the far end of the zoom out, does it
     fall back to every second one, and 800 still lands on every sheet
     column's edge. */

  var STEP = 400, ARM = 6, ARM_PHONE = 4;
  var ctx = marks.getContext("2d"), markColor = null, drawn = "";
  /* While crosses sit close together, as in the overview, the canvas is drawn once a tile larger
     than the screen and panning only slides it, modulo one spacing, with a GPU transform: no
     redraw and no re-upload per frame, which stuttered on phones. It is redrawn only when the
     spacing, size or color changes, that is while zooming. Far apart, as close up, the canvas is
     the screen and redraws, since the few crosses are cheap and a tile would be huge. */
  function crosses(x, y, s) {
    var dpr = window.devicePixelRatio || 1;
    var W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (!markColor) markColor = getComputedStyle(root).getPropertyValue("--canvas-mark").trim();
    var k = 1;
    var armPx = phone() ? ARM_PHONE : ARM;
    // every cross is drawn, the same density at any zoom, unless neighbors would touch: only at
    // the far end of the zoom out does it fall back to every second one
    while (k < 4 && STEP * k * s < 2 * armPx + 9) k *= 2;
    var t = STEP * k * s * dpr, lw = Math.max(1, Math.round(dpr)), arm = Math.round(armPx * dpr), reach = arm + lw;
    var x0 = x * dpr, y0 = y * dpr;
    var tiled = t <= Math.min(W, H) / 2;
    var cw = tiled ? W + Math.ceil(t) + reach + 1 : W, ch = tiled ? H + Math.ceil(t) + reach + 1 : H;
    if (tiled) {
      var key = [t, arm, lw, markColor, cw, ch].join();
      var ox = Math.round(((x0 % t) + t) % t), oy = Math.round(((y0 % t) + t) % t);
      if (key !== drawn) { draw(cw, ch, 0, 0, t, arm, lw, reach); drawn = key; }
      marks.style.transform = "translate(" + (ox - Math.round(t)) / dpr + "px," + (oy - Math.round(t)) / dpr + "px)";
    } else {
      drawn = "";
      marks.style.transform = "";
      draw(cw, ch, x0, y0, t, arm, lw, reach);
    }
  }
  function draw(cw, ch, x0, y0, t, arm, lw, reach) {
    var dpr = window.devicePixelRatio || 1;
    if (marks.width !== cw || marks.height !== ch) {
      marks.width = cw; marks.height = ch;
      marks.style.width = cw / dpr + "px"; marks.style.height = ch / dpr + "px";
    }
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = markColor;
    var i0 = Math.ceil((-reach - x0) / t), j0 = Math.ceil((-reach - y0) / t);
    for (var i = i0; x0 + i * t < cw + reach; i++) {
      var px = Math.round(x0 + i * t);
      for (var j = j0; y0 + j * t < ch + reach; j++) {
        var py = Math.round(y0 + j * t);
        ctx.fillRect(px - arm, py, 2 * arm + lw, lw);
        ctx.fillRect(px, py - arm, lw, 2 * arm + lw);
      }
    }
  }

  /* ---------- Layout ----------
     Columns follow the screen: the count whose overview comes out largest. */

  // A row is as tall as its tallest sheet, and the next one starts the same 160 gap below it as the
  // columns keep between them, so rows grow with their sheets and never pad out to a grid line.
  function rows(hs, n) {
    var out = [];
    for (var i = 0; i < hs.length; i += n) {
      var tall = Math.max.apply(null, hs.slice(i, i + n));
      out.push(i + n < hs.length ? tall + GAP : tall);
    }
    return out;
  }
  function measure(hs) {
    var z0 = deck.style.zoom;
    deck.style.zoom = 1;
    deck.style.gridTemplateColumns = "repeat(" + cols + ", 1440px)";
    deck.style.gridTemplateRows = rows(hs, cols).map(function (h) { return h + "px"; }).join(" ");
    deck.style.rowGap = "0px";
    rects = boards.map(function (b) { return { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight }; });
    box = { w: deck.offsetWidth, h: deck.offsetHeight };
    deck.style.zoom = z0;
  }
  function layout() {
    var z0 = deck.style.zoom;
    deck.style.zoom = 1;
    var w = boards[0].offsetWidth;
    var hs = boards.map(function (b) { return b.offsetHeight; });
    deck.style.zoom = z0;
    var a = area(), best = 1, bestS = 0;
    for (var n = 1; n <= 8; n++) {
      var h = rows(hs, n).reduce(function (sum, r) { return sum + r; }, 0);
      var s = Math.min((a.W - 80) / (n * w + (n - 1) * GAP), (a.H - 80) / h);
      if (s > bestS + 1e-6) { bestS = s; best = n; }
    }
    cols = best;
    measure(hs);
    pages();
  }

  // The space between the two bars
  function area() {
    var shown = function (el) { return el && getComputedStyle(el).display !== "none"; };
    var top = shown(topbar) ? topbar.getBoundingClientRect().bottom : 0;
    var bottom = shown(bottombar) ? bottombar.getBoundingClientRect().top : innerHeight;
    return { top: top, left: 0, W: root.getBoundingClientRect().width, H: bottom - top };
  }

  /* ---------- Camera ----------
     Moving only translates the camera. A zoom change scales it for the
     moment and then settles: the deck gets the new zoom as CSS zoom, so
     the sheets are drawn at their real size instead of as one scaled
     layer, and the camera drops its scale in the same frame. */

  // An edge can be dragged to the middle of the screen, no further
  function clamp() {
    var W = innerWidth, H = innerHeight, bw = box.w * view.s, bh = box.h * view.s;
    view.x = Math.min(Math.max(W - bw, W / 2), Math.max(Math.min(0, W / 2 - bw), view.x));
    view.y = Math.min(Math.max(H - bh, H / 2), Math.max(Math.min(0, H / 2 - bh), view.y));
  }
  var frame = 0;
  function live() {
    if (!frame) frame = requestAnimationFrame(function () { frame = 0; apply("live"); });
  }
  function flush() { if (frame) { cancelAnimationFrame(frame); frame = 0; apply("live"); } }
  var following = 0;
  function follow() {
    following = 0;
    if (!cam.classList.contains("fly")) return;
    var m = new DOMMatrix(getComputedStyle(cam).transform);
    crosses(m.e, m.f, m.a * z);
    hair(m.a * z, true);
    following = requestAnimationFrame(follow);
  }
  function apply(mode) {
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    if (mode !== "live") stopGlide();
    clamp();
    cam.classList.toggle("fly", mode === "fly");
    cam.style.transform = "translate(" + view.x + "px," + view.y + "px) scale(" + view.s / z + ")";
    if (mode !== "fly" && mode !== "live") settle();
    if (mode === "fly") {
      // on phones the lines take the target weight once: as a zoom in starts, or as a zoom out
      // ends (settle), so they never draw heavier than the view they're in
      if (phone() && view.s > z) hair(view.s);
      if (!following) following = requestAnimationFrame(follow);
    }
    else { crosses(view.x, view.y, view.s); hair(view.s, true); }
    tell();
  }
  function moving(on) { cam.classList.toggle("moving", on); }
  var settleTimer;
  function settle() {
    flush();
    clearTimeout(settleTimer);
    cam.classList.remove("fly", "moving");
    if (z !== view.s) { z = view.s; deck.style.zoom = z; }
    hair(z);
    cam.style.transform = "translate(" + view.x + "px," + view.y + "px)";
    crosses(view.x, view.y, view.s);
    syncHash();
    tell();
  }
  cam.addEventListener("transitionend", function (e) { if (e.target === cam) settle(); });

  // After a drag the canvas coasts on, a long way after a flick on touch, a bit with the mouse
  var glide = null;
  function stopGlide() { if (glide) { cancelAnimationFrame(glide); glide = null; } }
  function coast(vx, vy, friction) {
    if (Math.hypot(vx, vy) < 0.1) return settle();
    var last = performance.now();
    glide = requestAnimationFrame(function step(t) {
      var dt = Math.min(t - last, 32), k = Math.pow(friction, dt / 16);
      last = t; vx *= k; vy *= k;
      var x = view.x + vx * dt, y = view.y + vy * dt;
      view.x = x; view.y = y; apply("live");
      if (view.x !== x) vx = 0;
      if (view.y !== y) vy = 0;
      if (Math.hypot(vx, vy) < 0.02) { glide = null; settle(); return; }
      glide = requestAnimationFrame(step);
    });
  }

  // The sheet under the middle of the screen, or the closest one to it
  function nearest() {
    var a = area(), cx = (a.left + a.W / 2 - view.x) / view.s, cy = (a.top + a.H / 2 - view.y) / view.s, best = 0, bd = Infinity;
    rects.forEach(function (b, i) {
      var dx = Math.max(b.x - cx, 0, cx - b.x - b.w), dy = Math.max(b.y - cy, 0, cy - b.y - b.h);
      var d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  // A free view counts as all sheets once it's zoomed out as far as the overview fits them, or
  // further, so the bars hold on All instead of following whichever sheet is nearest the middle.
  function allScale() {
    var a = area(), p = phone() ? 16 : 40;
    return Math.min((a.W - 2 * p) / box.w, (a.H - 2 * p) / box.h);
  }
  function focus() {
    if (typeof current === "number") return current;
    if (current === "all" || view.s <= allScale() * 1.001) return "all";
    return nearest();
  }
  function tell() {
    var f = focus(), pct = Math.round(view.s * 100);
    if (f === lastFocus && pct === lastPct) return;
    lastFocus = f; lastPct = pct;
    listeners.forEach(function (fn) { fn(f, pct); });
  }

  // A sheet fits to its width. Short ones sit in the middle, tall ones start at the top and pan down.
  function go(target, fly) {
    current = target;
    var a = area();
    if (target === "all") {
      view.s = allScale();
      view.x = a.left + (a.W - box.w * view.s) / 2;
      view.y = a.top + (a.H - box.h * view.s) / 2;
    } else {
      var b = rects[target], pad = phone() ? 8 : 48;
      view.s = Math.min((a.W - 2 * pad) / b.w, 1);
      view.x = a.left + (a.W - b.w * view.s) / 2 - b.x * view.s;
      view.y = b.h * view.s <= a.H - 2 * pad
        ? a.top + (a.H - b.h * view.s) / 2 - b.y * view.s
        : a.top + pad - b.y * view.s;
    }
    apply(fly ? "fly" : null);
  }

  // The address follows the sheet in view: #type, #ui, none for the overview
  function syncHash() {
    var f = focus(), hash = f === "all" ? "" : "#" + ids[f];
    if (location.hash !== hash) history.replaceState(null, "", location.pathname + location.search + hash);
  }
  addEventListener("hashchange", function () {
    var i = ids.indexOf(location.hash.slice(1));
    go(i < 0 ? "all" : i, true);
  });

  // Zoom in steps of whole 10%, around the middle of the canvas
  function zoomStep(dir) {
    var p = view.s * 100;
    var next = dir > 0 ? (Math.floor(p / 10 + 1e-6) + 1) * 10 : (Math.ceil(p / 10 - 1e-6) - 1) * 10;
    if (Math.abs(next - p) < 5) next += dir * 10;
    var s = Math.min(4, Math.max(0.05, next / 100)), a = area(), cx = a.left + a.W / 2, cy = a.top + a.H / 2;
    view.x = cx - (cx - view.x) * (s / view.s);
    view.y = cy - (cy - view.y) * (s / view.s);
    view.s = s; current = null; apply("fly");
  }

  /* ---------- Hairlines that hold still ----------
     At rest the zoom is CSS zoom, which lays the sheets out again. Borders
     are never thinner than a device pixel, so a hairline takes more room
     the further out the zoom is and the text shifts as a zoom settles.
     On screen, solid borders up to the 2 px outlines become padding of the same width with
     an inset shadow drawing the line. Colors are read here, so this runs
     again when the theme or a flag changes.
     Like an SVG viewer, a line scales with the zoom but never draws thinner
     than one device pixel, and always as a whole number of them (see --k).
     Below one a line would land on a whole pixel or on none, so some lines
     vanished and others didn't. */

  // --k is device pixels per sheet pixel, s × dpr however the zoom splits between CSS zoom and the
  // camera's transform. Every line is drawn as a whole number of device pixels, at least one:
  // a 1 px line at 1.1 device pixels smeared over two columns on one side and not the other.
  // Each change of --k restyles every line on every sheet, so a running zoom only moves it when
  // the floor is in play (k below 1) and the hairlines, scaled by the camera meanwhile, have
  // drifted more than a fifth of a pixel from one: a handful of steps per zoom, not one a frame,
  // and the width still changes smoothly. When the zoom settles it lands exactly. Phones skip the
  // steps: a zoom in takes its target weight as it starts, a zoom out or a pinch as it settles.
  var lastK = 0;
  function hair(s, live) {
    var k = s * (window.devicePixelRatio || 1);
    if (live) {
      // phones restyle once, at the start of a fly (see apply), never in between: every step jolted
      if (phone()) return;
      if (k >= 1 && lastK >= 1) return;
      var drawn = Math.min(1, lastK) / Math.min(1, k);
      if (drawn > 0.8 && drawn < 1.25) return;
    }
    if (k === lastK) return;
    lastK = k;
    deck.style.setProperty("--k", k);
  }

  var steadySheet = null;
  function steady() {
    if (steadySheet) steadySheet.remove();
    Array.prototype.forEach.call(deck.querySelectorAll("[data-steady]"), function (el) { el.removeAttribute("data-steady"); });
    var z0 = deck.style.zoom, rules = [], n = 0;
    deck.style.zoom = 1;
    var sides = { Top: [0, 1], Right: [-1, 0], Bottom: [0, -1], Left: [1, 0] };
    Array.prototype.forEach.call(deck.querySelectorAll("*"), function (el) {
      var cs = getComputedStyle(el), decl = [], shadows = [];
      Object.keys(sides).forEach(function (side) {
        var w = parseFloat(cs["border" + side + "Width"]);
        if (!w || w > 3 || cs["border" + side + "Style"] !== "solid") return;
        decl.push("border-" + side.toLowerCase() + "-width: 0", "padding-" + side.toLowerCase() + ": " + (parseFloat(cs["padding" + side]) + w) + "px");
        // never thinner than one device pixel, so no line drops out when zoomed out
        // the shared line widths from system.css: 1 px borders draw as --line, 2 px ones as --line-2
        var v = w < 1.5 ? "var(--line)" : "var(--line-2)";
        var t = function (d) { return d ? "calc(" + d + " * " + v + ")" : "0"; };
        shadows.push("inset " + t(sides[side][0]) + " " + t(sides[side][1]) + " 0 0 " + cs["border" + side + "Color"]);
      });
      if (!decl.length) return;
      if (cs.boxShadow !== "none") shadows.push(cs.boxShadow);
      decl.push("box-shadow: " + shadows.join(", "));
      el.setAttribute("data-steady", ++n);
      rules.push('[data-steady="' + n + '"] { ' + decl.join(" !important; ") + " !important; }");
    });
    steadySheet = document.createElement("style");
    steadySheet.textContent = "@media screen {\n" + rules.join("\n") + "\n}";
    document.head.appendChild(steadySheet);
    deck.style.zoom = z0;
  }

  // Theme and flags live on the root: restyle, and if a flag changed the sheet heights, lay out again
  var restyle = 0;
  function refresh() {
    if (restyle) return;
    restyle = requestAnimationFrame(function () {
      restyle = 0;
      markColor = null; drawn = "";
      steady();
      layout();
      // a sheet or the overview in view gets fitted again, a free view just stays put
      if (current === null) apply(); else go(current, false);
    });
  }
  new MutationObserver(refresh).observe(root, { attributes: true });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", refresh);

  /* ---------- Input ----------
     Scroll pans like a document, ctrl + scroll or a pinch zooms. Dragging
     pans, over text the mouse selects like in a document, and controls
     inside a sheet work as usual. A click on another sheet flies to it. */

  var CONTROLS = "a, button, input, select, textarea, label, [role='switch'], .motion-demo";
  var wheelEnd;
  addEventListener("wheel", function (e) {
    if (e.target.closest(".bar")) return;
    e.preventDefault(); stopGlide();
    if (e.ctrlKey || e.metaKey) {
      var s = Math.min(4, Math.max(0.05, view.s * Math.exp(-e.deltaY * 0.01)));
      view.x = e.clientX - (e.clientX - view.x) * (s / view.s);
      view.y = e.clientY - (e.clientY - view.y) * (s / view.s);
      view.s = s;
    } else {
      view.x -= e.shiftKey ? e.deltaY : e.deltaX;
      view.y -= e.shiftKey ? 0 : e.deltaY;
    }
    current = null; moving(true); live();
    clearTimeout(wheelEnd); wheelEnd = setTimeout(settle, 250);
  }, { passive: false });

  function overText(x, y) {
    var r = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
    if (!r && document.caretPositionFromPoint) {
      var c = document.caretPositionFromPoint(x, y);
      if (c) { r = document.createRange(); r.setStart(c.offsetNode, c.offset); }
    }
    if (!r || r.startContainer.nodeType !== 3 || !r.startContainer.textContent.trim()) return false;
    var whole = document.createRange();
    whole.selectNodeContents(r.startContainer);
    return Array.prototype.some.call(whole.getClientRects(), function (b) {
      return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
    });
  }

  var drag = null, press = null, space = false, touches = {}, pinch = null, dragged = false, jumped = false;
  function pinchState() {
    var p = Object.keys(touches).map(function (k) { return touches[k]; });
    return { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
  }
  // Two fingers: pinch zoom around their midpoint and pan with it
  addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "touch" || e.target.closest(".bar")) return;
    touches[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (Object.keys(touches).length === 2) { drag = press = null; pinch = pinchState(); moving(true); }
  }, true);
  addEventListener("pointermove", function (e) {
    if (!touches[e.pointerId]) return;
    touches[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (!pinch || Object.keys(touches).length !== 2) return;
    var now = pinchState(), s = Math.min(4, Math.max(0.05, view.s * now.d / pinch.d));
    view.x = now.x - (pinch.x - view.x) * (s / view.s);
    view.y = now.y - (pinch.y - view.y) * (s / view.s);
    view.s = s; pinch = now; current = null; live();
  }, true);
  function lift(e) {
    if (!touches[e.pointerId]) return;
    var was = !!pinch;
    delete touches[e.pointerId];
    if (Object.keys(touches).length < 2) pinch = null;
    if (was && !pinch) settle();
  }
  addEventListener("pointerup", lift, true);
  addEventListener("pointercancel", lift, true);

  addEventListener("pointerdown", function (e) {
    stopGlide();
    dragged = jumped = false;
    if (e.target.closest(".bar") || pinch) return;
    var board = e.target.closest(".board");
    // A control works as itself on the sheet in view. On any other sheet, a tap or click flies there first
    if (!space && e.target.closest(CONTROLS) && boards.indexOf(board) === focus()) {
      if (e.pointerType === "touch") drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, board: null, moved: false, touch: true, hist: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }], soft: true };
      return;
    }
    if (board && !space && e.button === 0 && e.pointerType !== "touch" && overText(e.clientX, e.clientY) && boards.indexOf(board) === focus()) {
      press = { x: e.clientX, y: e.clientY, board: board };
      return;
    }
    e.preventDefault();
    getSelection().removeAllRanges();
    drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, board: board, moved: false,
      touch: e.pointerType === "touch", hist: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }] };
  });
  addEventListener("pointermove", function (e) {
    if (!drag || pinch) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < (drag.soft ? 8 : 4)) return;
    // a range slider keeps its own drag
    if (drag.soft && document.activeElement && document.activeElement.type === "range") { drag = null; return; }
    if (!drag.moved) moving(true);
    drag.moved = dragged = true;
    document.body.classList.add("panning");
    view.x = drag.vx + dx; view.y = drag.vy + dy; current = null; live();
    drag.hist.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    while (e.timeStamp - drag.hist[0].t > 100) drag.hist.shift();
  });
  function release(e) {
    var h = drag.hist, a = h[0], b = h[h.length - 1], dt = b.t - a.t;
    if (dt <= 0 || e.timeStamp - b.t > 60) return settle();
    var boost = drag.touch ? 1 : 0.5;
    coast((b.x - a.x) / dt * boost, (b.y - a.y) / dt * boost, drag.touch ? 0.95 : 0.85);
  }
  addEventListener("pointerup", function (e) {
    var clicked = drag && !drag.moved ? drag.board
      : press && Math.abs(e.clientX - press.x) + Math.abs(e.clientY - press.y) < 4 && getSelection().isCollapsed ? press.board : null;
    var i = boards.indexOf(clicked);
    if (clicked && i !== focus()) { jumped = true; go(i, true); }
    if (drag && drag.moved && !pinch) release(e);
    drag = press = null;
    if (!space) document.body.classList.remove("panning");
  });
  /* Whenever the view isn't the fitted sheet (zoomed in, zoomed out or
     panned), a double click on a sheet's paper, not on a control or on
     text (that still selects a word), flies to that sheet fitted, as the
     sheet nav would. Touch gets the same as a double tap. */
  function refit(e) {
    var board = e.target.closest(".board"), i = boards.indexOf(board);
    if (i < 0 || e.target.closest(CONTROLS) || overText(e.clientX, e.clientY)) return;
    if (current === i) return;
    e.preventDefault();
    getSelection().removeAllRanges();
    go(i, true);
  }
  deck.addEventListener("dblclick", refit);
  var lastTap = null;
  addEventListener("pointerup", function (e) {
    if (e.pointerType !== "touch" || dragged || pinch) return;
    if (lastTap && e.timeStamp - lastTap.t < 300 && Math.abs(e.clientX - lastTap.x) + Math.abs(e.clientY - lastTap.y) < 24) {
      lastTap = null;
      refit(e);
      return;
    }
    lastTap = { t: e.timeStamp, x: e.clientX, y: e.clientY };
  });

  // Links to a sheet fly to it. A click that ended a drag does nothing.
  deck.addEventListener("click", function (e) {
    var a = e.target.closest("a[href^='#']");
    // a click that ended a drag, or that flew to its sheet, does nothing more
    if (dragged || jumped) { e.preventDefault(); e.stopPropagation(); jumped = false; return; }
    if (!a) return;
    var i = ids.indexOf(a.getAttribute("href").slice(1));
    if (i < 0) return;
    e.preventDefault();
    go(i, true);
  }, true);

  function typing(e) { return e.target.closest("input, textarea, select, [contenteditable]"); }
  addEventListener("keyup", function (e) {
    if (e.key === " ") { space = false; if (!drag) document.body.classList.remove("panning"); }
  });
  addEventListener("keydown", function (e) {
    if (typing(e) || e.altKey || e.ctrlKey || e.metaKey) return;
    var f = focus(), i = f === "all" ? -1 : f;
    if (e.key === " " && !e.target.closest("button, a")) { e.preventDefault(); space = true; document.body.classList.add("panning"); return; }
    if (e.key === "ArrowRight") go(Math.min(boards.length - 1, i + 1), true);
    else if (e.key === "ArrowLeft") go(i <= 0 ? "all" : i - 1, true);
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      view.y += (e.key === "ArrowDown" ? -1 : 1) * innerHeight * 0.3; current = null; apply("fly");
    }
    else if (e.key === "0" || e.key === "Escape") go("all", true);
    else if (e.key === "+" || e.key === "=") zoomStep(1);
    else if (e.key === "-") zoomStep(-1);
    else return;
    e.preventDefault();
  });
  addEventListener("resize", function () {
    var f = current;
    layout();
    if (f === null) apply(); else go(f, false);
  });
  // iOS Safari applies :active only while a touch listener exists
  addEventListener("touchstart", function () {}, { passive: true });

  layout();
  var start = ids.indexOf(location.hash.slice(1));
  go(start < 0 ? "all" : start, false);
  if (document.fonts) document.fonts.ready.then(function () { steady(); layout(); go(current === null ? focus() : current, false); });

  /* ---------- PDF pages ----------
     Print, and scripts/pdf.py which renders system.pdf with it, gets one
     page per sheet, each cut to its sheet's real size. */

  function pages() {
    var css = boards.map(function (b, i) {
      b.setAttribute("data-page", i);
      return "@page s" + i + " { size: " + rects[i].w + "px " + rects[i].h + "px; margin: 0; }\n" +
        '.board[data-page="' + i + '"] { page: s' + i + "; height: " + rects[i].h + "px; break-inside: avoid; }";
    }).join("\n");
    var sheet = document.getElementById("pdf-pages") || document.head.appendChild(document.createElement("style"));
    sheet.id = "pdf-pages";
    sheet.textContent = "@media print {\n" + css + "\n}";
  }

  window.canvas = {
    boards: boards,
    go: go,
    zoom: zoomStep,
    focus: focus,
    // after anything that changes the sheets' size, like a language switch
    relayout: refresh,
    onchange: function (fn) { listeners.push(fn); fn(focus(), Math.round(view.s * 100)); }
  };
})();
