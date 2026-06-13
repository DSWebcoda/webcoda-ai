// Pillar graphics for Assess / Build / Scale — GSAP-animated inline SVG.
// Monochrome ink + accent, matching the editorial system. Respects
// prefers-reduced-motion (renders the static end state, no animation).
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function makeSvg(host) {
    var svg = el("svg", { viewBox: "30 0 220 160", "aria-hidden": "true", focusable: "false" });
    host.appendChild(svg);
    return svg;
  }

  // ── Assess: dot matrix swept by a scan line ─────────────────────────
  function buildAssess(host, animate) {
    var svg = makeSvg(host);
    var cols = 10, rows = 6, x0 = 45, y0 = 22, w = 190, h = 116;
    var colDots = [];
    for (var i = 0; i < cols; i++) {
      var arr = [];
      for (var j = 0; j < rows; j++) {
        arr.push(el("circle", {
          cx: x0 + (i * w) / (cols - 1),
          cy: y0 + (j * h) / (rows - 1),
          r: 2, fill: "var(--ink)", opacity: 0.22,
        }, svg));
      }
      colDots.push(arr);
    }
    var line = el("line", { x1: x0, y1: 12, x2: x0, y2: 148, stroke: "var(--accent)", "stroke-width": 1.5 }, svg);
    if (!animate) { line.setAttribute("opacity", "0"); return; }

    // Flag a few random dots to be "read" (turn red) as the line passes.
    var all = [];
    colDots.forEach(function (arr) { arr.forEach(function (d) { all.push(d); }); });
    var pool = all.slice(), flagged = [];
    // Guarantee one in the top row, then a few more at random.
    var topRow = colDots.map(function (arr) { return arr[0]; });
    var firstPick = topRow[Math.floor(Math.random() * topRow.length)];
    flagged.push(firstPick);
    pool.splice(pool.indexOf(firstPick), 1);
    for (var f = 0; f < 7 && pool.length; f++) {
      flagged.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    flagged.forEach(function (d) { d.dataset.flag = "1"; });

    var sweep = 2.9, hold = 1.3, travel = w + 12;
    var tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4 });
    tl.fromTo(line, { x: 0, opacity: 1 }, { x: travel, duration: sweep, ease: "none" }, 0)
      .to(line, { opacity: 0, duration: 0.3 }, sweep + hold);
    colDots.forEach(function (arr, i) {
      var colX = (i * w) / (cols - 1);
      var t = sweep * (colX / travel);
      arr.forEach(function (dot) {
        tl.to(dot, { opacity: 0.95, duration: 0.15, ease: "power1.out" }, t);
        if (dot.dataset.flag) {
          // read → turn red and stay lit until the bar finishes
          tl.set(dot, { attr: { fill: "var(--accent)", r: 3 } }, t + 0.05);
        } else {
          tl.to(dot, { opacity: 0.22, duration: 1.1, ease: "power2.out" }, t + 0.22);
        }
      });
    });
    // Hold the read state a beat, then fade flagged dots out with the bar.
    tl.to(flagged, { opacity: 0.22, duration: 0.4, ease: "power1.out" }, sweep + hold);
    tl.set(flagged, { attr: { fill: "var(--ink)", r: 2 } }, sweep + hold + 0.4);
  }

  // ── Build: a workflow graph that assembles itself, node by node ─────
  function buildBuild(host, animate) {
    var svg = makeSvg(host);

    // Radial network: one centre node, an inner ring, an outer ring.
    var CX = 140, CY = 80, RING1 = 34, RING2 = 66, COUNT = 6;
    var nodes = [{ x: CX, y: CY }];
    for (var k = 0; k < COUNT; k++) {
      var a = (-90 + k * (360 / COUNT)) * Math.PI / 180;
      nodes.push({ x: CX + RING1 * Math.cos(a), y: CY + RING1 * Math.sin(a) });
    }
    for (var k2 = 0; k2 < COUNT; k2++) {
      var a2 = (-90 + k2 * (360 / COUNT)) * Math.PI / 180;
      nodes.push({ x: CX + RING2 * Math.cos(a2), y: CY + RING2 * Math.sin(a2) });
    }
    // Edges in reveal order: centre → inner ring, then inner → outer.
    var edges = [];
    for (var e1 = 0; e1 < COUNT; e1++) edges.push([0, 1 + e1]);
    for (var e2 = 0; e2 < COUNT; e2++) edges.push([1 + e2, 1 + COUNT + e2]);

    var lines = edges.map(function (e) {
      var p = nodes[e[0]], q = nodes[e[1]];
      return el("line", {
        x1: p.x, y1: p.y, x2: q.x, y2: q.y,
        stroke: "var(--ink)", "stroke-width": 1.25,
        opacity: 0, "stroke-linecap": "round",
      }, svg);
    });
    // All nodes the same size; each carries a red centre dot.
    var R = nodes.map(function () { return 6.5; });

    var outers = nodes.map(function (n, i) {
      return el("circle", {
        cx: n.x, cy: n.y, r: R[i],
        fill: "var(--cream)", stroke: "var(--ink)", "stroke-width": 1.5, opacity: 0.92,
      }, svg);
    });
    var dots = nodes.map(function (n, i) {
      return el("circle", {
        cx: n.x, cy: n.y, r: Math.max(1.6, R[i] * 0.42),
        fill: "var(--accent)", opacity: 1,
      }, svg);
    });

    if (!animate) return;

    lines.forEach(function (ln) {
      var len = Math.hypot(ln.x2.baseVal.value - ln.x1.baseVal.value,
                           ln.y2.baseVal.value - ln.y1.baseVal.value);
      ln.style.strokeDasharray = len;
      ln.style.strokeDashoffset = len;
      ln.dataset.len = len;
    });
    outers.forEach(function (c, i) {
      c.dataset.r = R[i];
      gsap.set(c, { attr: { r: 0.5 }, opacity: 0 });
    });
    dots.forEach(function (d, i) {
      d.dataset.r = Math.max(1.6, R[i] * 0.42);
      gsap.set(d, { attr: { r: 0 }, opacity: 0 });
    });

    var rt = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });

    function appear(i, t) {
      rt.to(outers[i], {
        attr: { r: outers[i].dataset.r }, opacity: 1,
        duration: 0.5, ease: "back.out(2.4)",
      }, t);
      rt.to(dots[i], {
        attr: { r: dots[i].dataset.r }, opacity: 1,
        duration: 0.4, ease: "back.out(3)",
      }, t + 0.18);
    }
    function draw(idxs, t) {
      idxs.forEach(function (i) {
        rt.to(lines[i], { strokeDashoffset: 0, opacity: 0.55, duration: 0.5, ease: "power1.inOut" }, t);
      });
    }

    // ── Assemble outward: centre → inner ring → outer ring ───────────
    appear(0, 0.1);
    var innerDraw = [], outerDraw = [];
    for (var di = 0; di < COUNT; di++) { innerDraw.push(di); outerDraw.push(COUNT + di); }
    draw(innerDraw, 0.5);
    for (var ai = 0; ai < COUNT; ai++) appear(1 + ai, 1.0 + ai * 0.07);
    draw(outerDraw, 1.9);
    for (var ao = 0; ao < COUNT; ao++) appear(1 + COUNT + ao, 2.4 + ao * 0.07);

    // ── Alive: edges shimmer (no node movement) ───────────────────────
    rt.to(lines, {
      opacity: 0.85, duration: 0.7, ease: "sine.inOut", repeat: 1, yoyo: true,
      stagger: { each: 0.04 },
    }, 3.6);

    // ── Reset for a clean loop ────────────────────────────────────────
    rt.to(outers, { opacity: 0, attr: { r: 0.5 }, duration: 0.45, ease: "power1.in", stagger: { each: 0.025 } }, 5.6);
    rt.to(dots, { opacity: 0, attr: { r: 0 }, duration: 0.4, ease: "power1.in", stagger: { each: 0.025 } }, 5.6);
    rt.to(lines, { opacity: 0, duration: 0.4, ease: "power1.in" }, 5.6);
    rt.set(lines, { strokeDashoffset: function (i, tgt) { return tgt.dataset.len; } }, 6.15);
  }

  // ── Scale: concentric squares rippling outward ──────────────────────
  function buildScale(host, animate) {
    var svg = makeSvg(host);
    var cx = 140, cy = 80;
    var core = el("rect", { x: cx - 5, y: cy - 5, width: 10, height: 10, fill: "var(--accent)" }, svg);
    var sizes = [36, 70, 106, 144];
    var rings = sizes.map(function (s) {
      return el("rect", {
        x: cx - s / 2, y: cy - s / 2, width: s, height: s,
        fill: "none", stroke: "var(--ink)", "stroke-width": 1, opacity: 0.85,
      }, svg);
    });
    if (!animate) return;
    gsap.set(rings, { transformOrigin: "50% 50%" });
    gsap.set(core, { transformOrigin: "50% 50%" });
    var tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6 });
    rings.forEach(function (r, i) {
      tl.fromTo(r, { scale: 0.55, opacity: 0 },
        { scale: 1, opacity: 0.85, duration: 0.8, ease: "power2.out" }, i * 0.16);
    });
    tl.fromTo(core, { scale: 0 }, { scale: 1, duration: 0.45, ease: "back.out(2.5)" }, 0);
  }

  // ── Curious: a single core that "looks around" — sonar pings ────────
  function buildCurious(host, animate) {
    var svg = makeSvg(host);
    var cx = 140, cy = 80;
    var pts = [{ x: 64, y: 44 }, { x: 214, y: 52 }, { x: 92, y: 122 }, { x: 200, y: 118 }, { x: 150, y: 28 }];
    var dots = pts.map(function (p) {
      return el("circle", { cx: p.x, cy: p.y, r: 3, fill: "var(--ink)", opacity: 0.22 }, svg);
    });
    var ring1 = el("circle", { cx: cx, cy: cy, r: 8, fill: "none", stroke: "var(--accent)", "stroke-width": 1.5, opacity: 0 }, svg);
    var ring2 = el("circle", { cx: cx, cy: cy, r: 8, fill: "none", stroke: "var(--accent)", "stroke-width": 1.5, opacity: 0 }, svg);
    var core = el("circle", { cx: cx, cy: cy, r: 7, fill: "var(--accent)" }, svg);

    if (!animate) return;

    gsap.set([ring1, ring2, core], { transformOrigin: cx + "px " + cy + "px" });
    gsap.to(core, { scale: 1.22, duration: 0.95, ease: "sine.inOut", repeat: -1, yoyo: true });

    var tl = gsap.timeline({ repeat: -1 });
    [ring1, ring2].forEach(function (r, i) {
      tl.fromTo(r, { attr: { r: 8 }, opacity: 0.7 },
        { attr: { r: 122 }, opacity: 0, duration: 2.2, ease: "power1.out" }, i * 1.1);
    });
    dots.forEach(function (d, i) {
      var dist = Math.hypot(pts[i].x - cx, pts[i].y - cy);
      var t = (dist / 122) * 2.2;
      tl.to(d, { opacity: 1, attr: { r: 4.5 }, duration: 0.2, ease: "power1.out" }, t)
        .to(d, { opacity: 0.22, attr: { r: 3 }, duration: 0.9, ease: "power1.out" }, t + 0.25);
    });
  }

  // ── Experimenting: a centre source probes candidates radially —
  //    some stick, some fail. Centred + symmetric to match the others. ─
  function buildExperimenting(host, animate) {
    var svg = makeSvg(host);
    var src = { x: 140, y: 80 };
    var RAD = 58, COUNT = 6;
    var cand = [];
    for (var c = 0; c < COUNT; c++) {
      var a = (-90 + c * (360 / COUNT)) * Math.PI / 180;
      cand.push({ x: src.x + RAD * Math.cos(a), y: src.y + RAD * Math.sin(a) });
    }
    var success = [false, true, false, true, true, false];

    var lines = cand.map(function (p) {
      return el("line", {
        x1: src.x, y1: src.y, x2: p.x, y2: p.y,
        stroke: "var(--ink)", "stroke-width": 1.25, opacity: 0, "stroke-linecap": "round",
      }, svg);
    });
    var nodes = cand.map(function (p) {
      return el("circle", {
        cx: p.x, cy: p.y, r: 5,
        fill: "var(--cream)", stroke: "var(--ink)", "stroke-width": 1.5, opacity: 0.35,
      }, svg);
    });
    var srcNode = el("circle", { cx: src.x, cy: src.y, r: 7.5, fill: "var(--accent)" }, svg);

    lines.forEach(function (ln) {
      var len = Math.hypot(ln.x2.baseVal.value - ln.x1.baseVal.value, ln.y2.baseVal.value - ln.y1.baseVal.value);
      ln.style.strokeDasharray = len;
      ln.style.strokeDashoffset = len;
      ln.dataset.len = len;
    });

    if (!animate) {
      // static: show the successful experiments connected
      cand.forEach(function (p, i) {
        if (success[i]) {
          lines[i].style.strokeDashoffset = 0;
          lines[i].setAttribute("opacity", "0.55");
          nodes[i].setAttribute("fill", "var(--accent)");
          nodes[i].setAttribute("stroke", "none");
          nodes[i].setAttribute("opacity", "1");
        }
      });
      return;
    }

    gsap.set(srcNode, { transformOrigin: src.x + "px " + src.y + "px" });
    gsap.to(srcNode, { scale: 1.16, duration: 0.85, ease: "sine.inOut", repeat: -1, yoyo: true });

    var step = 0.62;
    var tl = gsap.timeline({ repeat: -1, repeatDelay: 0.7 });
    cand.forEach(function (p, i) {
      var t = 0.2 + i * step;
      tl.to(lines[i], { strokeDashoffset: 0, opacity: 0.6, duration: 0.32, ease: "power1.inOut" }, t);
      if (success[i]) {
        tl.set(nodes[i], { attr: { fill: "var(--accent)", stroke: "none" } }, t + 0.32);
        tl.to(nodes[i], { opacity: 1, attr: { r: 6.5 }, duration: 0.28, ease: "back.out(2.4)" }, t + 0.32);
      } else {
        tl.to(nodes[i], { opacity: 0.75, duration: 0.18, ease: "power1.out" }, t + 0.32)
          .to(nodes[i], { opacity: 0.35, duration: 0.3, ease: "power1.out" }, t + 0.56)
          .to(lines[i], { strokeDashoffset: lines[i].dataset.len, opacity: 0, duration: 0.32, ease: "power1.in" }, t + 0.56);
      }
    });

    // Reset for a clean loop
    var endT = 0.2 + cand.length * step + 0.5;
    tl.set(nodes, { attr: { fill: "var(--cream)", stroke: "var(--ink)" } }, endT);
    tl.to(nodes, { opacity: 0.35, attr: { r: 5 }, duration: 0.4, ease: "power1.in" }, endT);
    tl.to(lines, { strokeDashoffset: function (i, tgt) { return tgt.dataset.len; }, opacity: 0, duration: 0.35, ease: "power1.in" }, endT);
  }

  var KINDS = {
    assess: buildAssess, build: buildBuild, scale: buildScale,
    curious: buildCurious, experimenting: buildExperimenting,
  };

  function renderInto(host, kind) {
    if (!host || !kind) return;
    if (host.dataset.gfxRendered === kind) return;
    if (typeof gsap !== "undefined") {
      try { gsap.killTweensOf(host.querySelectorAll("*")); } catch (e) {}
    }
    while (host.firstChild) host.removeChild(host.firstChild);
    host.dataset.gfxRendered = kind;
    var fn = KINDS[kind];
    if (!fn) return;
    var animate = typeof gsap !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fn(host, animate);
  }

  function init() {
    document.querySelectorAll("[data-gfx]").forEach(function (host) {
      renderInto(host, host.getAttribute("data-gfx"));
    });
  }

  window.initPillarGfx = init;
  window.renderPillarGfx = renderInto;
})();
