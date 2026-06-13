// Scroll-reveal effects for the Webcoda AI landing page.
// Blocks rise+fade in on scroll; section headlines reveal line-by-line.
// Uses IntersectionObserver when it fires, plus a scroll-position fallback
// so reveals are guaranteed in any environment.
// Respects prefers-reduced-motion and degrades to static content without JS.
(function () {
  "use strict";

  function init() {
    if (window.__scrollFXDone) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var main = document.querySelector("main");
    if (!main) return;
    window.__scrollFXDone = true;

    var pending = [];

    function show(el) {
      el.classList.add("fx-in");
      var i = pending.indexOf(el);
      if (i !== -1) pending.splice(i, 1);
    }

    var io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });
    }

    function watch(el) {
      pending.push(el);
      if (io) io.observe(el);
    }

    function reveal(el, delayMs) {
      if (!el || el.classList.contains("fx-r")) return;
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * 0.9 && r.bottom > 0) {
        // Already in viewport — load animation handles it, skip scroll-fx entirely
        return;
      }
      el.classList.add("fx-r");
      if (delayMs) el.style.setProperty("--fx-d", delayMs + "ms");
      watch(el);
    }

    // Fallback: reveal anything whose top edge is inside the viewport
    // (with the same -10% bottom margin as the observer).
    function checkPending() {
      if (!pending.length) return;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var limit = vh * 0.9;
      // iterate over a copy; show() mutates pending
      pending.slice().forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < limit && r.bottom > 0) {
          show(el);
          if (io) io.unobserve(el);
        }
      });
    }

    // ── Block reveals ────────────────────────────────────────────────
    main.querySelectorAll(".wc-container").forEach(function (sec) {
      Array.prototype.forEach.call(sec.children, function (child) {
        if (child.classList.contains("sp-120")) return;
        if (child.classList.contains("two-col-head")) {
          var right = child.querySelector(":scope > .right");
          if (right) reveal(right, 220);
          return;
        }
        if (child.classList.contains("steps") || child.classList.contains("pillars")) {
          Array.prototype.forEach.call(child.children, function (item, i) {
            reveal(item, i * 110);
          });
          return;
        }
        if (child.classList.contains("hero-grid")) {
          var lead = child.querySelector(".t-lead");
          if (lead) reveal(lead, 250); // typed headline animates itself
          return;
        }
        reveal(child, 0);
      });
    });

    // ── Headline line-by-line reveals ────────────────────────────────
    var heads = main.querySelectorAll("h2.t-section-head");

    function splitWords(el) {
      if (el.dataset.fxSplit) return;
      el.dataset.fxSplit = "1";
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (node) {
        if (!node.textContent.trim()) return;
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          var w = document.createElement("span");
          w.className = "fx-w";
          w.textContent = part;
          frag.appendChild(w);
        });
        node.parentNode.replaceChild(frag, node);
      });
      el.classList.add("fx-split");
    }

    heads.forEach(splitWords);

    // Group words into visual lines (by offsetTop) for staggered delays.
    function groupLines() {
      heads.forEach(function (el) {
        if (el.classList.contains("fx-in")) return;
        var line = -1, lastTop = null;
        el.querySelectorAll(".fx-w").forEach(function (w) {
          var top = w.offsetTop;
          if (lastTop === null || Math.abs(top - lastTop) > 4) {
            line += 1;
            lastTop = top;
          }
          w.style.setProperty("--fx-line", line);
        });
      });
    }

    groupLines();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(groupLines);
    heads.forEach(function (el) { watch(el); });

    // Scroll/resize fallback + initial pass for above-the-fold content.
    var sT;
    window.addEventListener("scroll", function () {
      if (sT) return;
      sT = requestAnimationFrame(function () { sT = null; checkPending(); });
    }, { passive: true });

    var rT;
    window.addEventListener("resize", function () {
      clearTimeout(rT);
      rT = setTimeout(function () { groupLines(); checkPending(); }, 150);
    });

    checkPending();
    // Late pass: fonts/layout settling can move things into view.
    setTimeout(checkPending, 400);
  }

  window.initScrollFX = init;

  // ── Anchor nav: align the target section's rule line with the nav's
  //    bottom edge (CSS scroll-margin can't account for the rule's inset).
  //    Runs for everyone, independent of the reduced-motion FX gate.
  (function setupAnchorScroll() {
    function wire() {
      document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute("href");
        if (!id || id === "#") return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var nav = document.querySelector(".wc-nav");
        var navH = nav ? nav.getBoundingClientRect().height : 0;
        var rule = target.querySelector(".rule") || target;
        // Use offsetTop traversal — unaffected by CSS transforms (fx-r translateY)
        var y = 0, el = rule;
        while (el && el !== document.body) { y += el.offsetTop; el = el.offsetParent; }
        y -= navH;
        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: reduce ? "auto" : "smooth" });
        if (history.replaceState) history.replaceState(null, "", id);
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", wire);
    } else {
      wire();
    }
  })();
})();
