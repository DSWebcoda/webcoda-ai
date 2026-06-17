(function () {
  "use strict";

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // ── Inline Lucide SVG icons ──────────────────────────────────────────────
  var ICONS = {
    "arrow-right": '<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    "move-right":  '<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8L22 12L18 16"/><path d="M2 12H22"/></svg>',
    "rotate-ccw":  '<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    "chevron-right":'<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  };
  function icon(name) { return ICONS[name] || ""; }

  // ── Inject move-right icons into pillar list items ───────────────────────
  function injectPillarIcons() {
    document.querySelectorAll(".pillar .items li").forEach(function (li) {
      if (!li.querySelector("svg")) {
        li.insertAdjacentHTML("afterbegin", icon("move-right") + " ");
      }
    });
  }

  // ── Inject arrow icons into static pill buttons ──────────────────────────
  function injectPillArrows() {
    document.querySelectorAll(".pill.js-arrow").forEach(function (btn) {
      if (!btn.querySelector(".arrow")) {
        btn.insertAdjacentHTML("beforeend", '<span class="arrow">' + icon("arrow-right") + "</span>");
      }
    });
  }

  // ── Looping typewriter headline ──────────────────────────────────────────
  // Three phrases that cycle: type in → hold → erase accent word → type next
  var LP_PHRASES = [
    { accent: "grow smarter",  label: "Helping businesses grow smarter with AI."  },
    { accent: "scale further", label: "Helping businesses scale further with AI." },
    { accent: "move faster",   label: "Helping businesses move faster with AI."   },
  ];
  var LP_PREFIX = "Helping businesses<br>";
  var LP_SUFFIX_SEGS = [{ t: " with " }, { t: "AI.", em: true }];

  function buildHTML(accentText, accentCount, suffixCount) {
    var inner = LP_PREFIX;
    var shown = accentText.slice(0, accentCount);
    if (shown) inner += '<span class="accent-word">' + shown + "</span>";
    var rem = suffixCount;
    for (var i = 0; i < LP_SUFFIX_SEGS.length; i++) {
      var s = LP_SUFFIX_SEGS[i];
      var show = Math.min(s.t.length, Math.max(0, rem));
      rem -= s.t.length;
      if (show > 0) {
        var txt = s.t.slice(0, show);
        inner += s.em ? "<i>" + txt + "</i>" : txt;
      }
    }
    inner += '<span class="type-caret"></span>';
    return '<span aria-hidden="true">' + inner + "</span>";
  }

  function initTypewriter() {
    var h1 = document.getElementById("hero-headline");
    if (!h1) return;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      h1.setAttribute("aria-label", LP_PHRASES[0].label);
      h1.innerHTML = '<span aria-hidden="true">' + LP_PREFIX
        + '<span class="accent-word">' + LP_PHRASES[0].accent + "</span>"
        + ' with <i>AI.</i></span>';
      return;
    }

    var SUFFIX_LEN = LP_SUFFIX_SEGS.reduce(function (n, s) { return n + s.t.length; }, 0);
    var TYPE_MS = 55, ERASE_MS = 28, HOLD_MS = 2200, PAUSE_MS = 400;

    // Lock min-height to the tallest phrase so layout never shifts between lines
    function reserveHeight() {
      var maxH = 0;
      LP_PHRASES.forEach(function (p) {
        h1.innerHTML = buildHTML(p.accent, p.accent.length, SUFFIX_LEN);
        maxH = Math.max(maxH, h1.offsetHeight);
      });
      h1.style.minHeight = maxH + "px";
      h1.innerHTML = buildHTML("", 0, 0);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(reserveHeight);
    } else {
      reserveHeight();
    }
    var phraseIdx = 0, accentCount = 0, suffixCount = 0;
    var phase = "type-accent"; // type-accent | type-suffix | hold | erase-suffix | erase-accent | pause

    function tick() {
      var phrase = LP_PHRASES[phraseIdx];
      var accentLen = phrase.accent.length;
      var delay;

      if (phase === "type-accent") {
        accentCount++;
        h1.setAttribute("aria-label", phrase.label);
        h1.innerHTML = buildHTML(phrase.accent, accentCount, 0);
        if (accentCount >= accentLen) { phase = "type-suffix"; delay = TYPE_MS; }
        else delay = TYPE_MS;

      } else if (phase === "type-suffix") {
        suffixCount++;
        h1.innerHTML = buildHTML(phrase.accent, accentLen, suffixCount);
        if (suffixCount >= SUFFIX_LEN) { phase = "hold"; delay = HOLD_MS; }
        else delay = TYPE_MS;

      } else if (phase === "hold") {
        phase = "erase-suffix"; delay = ERASE_MS;

      } else if (phase === "erase-suffix") {
        suffixCount--;
        h1.innerHTML = buildHTML(phrase.accent, accentLen, suffixCount);
        if (suffixCount <= 0) { phase = "erase-accent"; delay = ERASE_MS; }
        else delay = ERASE_MS;

      } else if (phase === "erase-accent") {
        accentCount--;
        h1.innerHTML = buildHTML(phrase.accent, accentCount, 0);
        if (accentCount <= 0) { phase = "pause"; delay = PAUSE_MS; }
        else delay = ERASE_MS;

      } else { // pause
        phraseIdx = (phraseIdx + 1) % LP_PHRASES.length;
        phase = "type-accent";
        delay = TYPE_MS;
      }

      setTimeout(tick, delay);
    }

    h1.innerHTML = buildHTML("", 0, 0);
    setTimeout(tick, 600);
  }

  // ── Self-assessment ──────────────────────────────────────────────────────
  var QUESTIONS = [
    {
      q: "Has anyone in your business shipped <i>something</i> with AI in the last 12 months?",
      options: [
        "No, and we're not sure where to start",
        "Some people are using ChatGPT or Copilot, but nothing official",
        "Yes, we've shipped one or two things",
        "Yes, AI is part of how we operate",
      ],
    },
    {
      q: "When you think about AI in your business, <i>what's the bigger worry?</i>",
      options: [
        "Falling behind competitors",
        "Wasting money on the wrong thing",
        "Our data and security aren't ready",
        "Our people won't adopt it",
      ],
    },
    {
      q: "What would <i>“good”</i> look like in 12 months?",
      options: [
        "A clear plan we're actually working",
        "One AI capability live and earning its keep",
        "Multiple AI systems integrated across the business",
        "AI changing how we make money, not just how we work",
      ],
    },
  ];

  var ARCHETYPES = [
    {
      key: "curious", name: "Curious",
      blurb: "You&rsquo;re paying attention but you haven't committed yet — which is sensible. The biggest risk for you isn't moving too slowly; it's spending money on the wrong thing first. Start with a strategy workshop: half a day with your leadership team to map where AI fits and where it doesn't, before you buy a single tool.",
      next: "AI Strategy Workshop",
    },
    {
      key: "experimenting", name: "Experimenting",
      blurb: "You've got pockets of AI use but no shared playbook. That's the most expensive stage to stay in — duplicated effort, no measurement, governance gaps you don't know you have. A two-week diagnostic will tell you what's worth keeping, what's worth killing, and what you should build next.",
      next: "2-Week AI Diagnostic",
    },
    {
      key: "building", name: "Building",
      blurb: "You&rsquo;re past the question of whether — now it's how well. The patterns that hurt at this stage are integration debt, weak data foundations, and prototypes that never make it to production. We help you ship the next thing properly and harden what's already live.",
      next: "Build engagement",
    },
    {
      key: "scaling", name: "Scaling",
      blurb: "You&rsquo;re in the small group of businesses where AI is actually operational. The work now is consolidation, governance, and growing ROI — not more pilots. An embedded engagement gives you senior AI capability without hiring a head of AI.",
      next: "Embedded AI Practice",
    },
  ];

  var GFX_MAP = { curious: "curious", experimenting: "experimenting", building: "build", scaling: "scale" };

  var assessState = { started: false, answers: [null, null, null] };

  function stepDots(currentIdx, isComplete) {
    return [0, 1, 2].map(function (i) {
      var cls = isComplete ? "done" : (i === currentIdx ? "active" : i < currentIdx ? "done" : "");
      return '<div class="dot ' + cls + '"></div>';
    }).join("");
  }

  function renderStart() {
    return '<div class="assess-start">'
      + '<h3 class="assess-start-head">Find out if you&rsquo;re <i>Curious</i>, <i>Experimenting</i>,<br><i>Building</i>, or <i>Scaling</i>.</h3>'
      + '<p class="assess-start-body">Answer three quick questions for an honest read on where your business actually sits with AI — plus the one move worth making next.</p>'
      + '<button class="pill" id="assess-start-btn">Start the assessment<span class="arrow">' + icon("arrow-right") + "</span></button>"
      + "</div>";
  }

  function renderQuestion(currentIdx) {
    var q = QUESTIONS[currentIdx];
    var num = String(currentIdx + 1).padStart(2, "0");
    var opts = q.options.map(function (opt, i) {
      return '<button class="assess-option" data-idx="' + i + '">'
        + '<span class="opt-num">' + String(i + 1).padStart(2, "0") + "</span>"
        + '<span class="opt-text">' + opt + "</span>"
        + '<span class="opt-arrow">' + icon("arrow-right") + "</span>"
        + "</button>";
    }).join("");
    return '<div class="assess-progress">'
      + '<span class="t-meta">Question ' + num + " / 03</span>"
      + '<div class="step-dots">' + stepDots(currentIdx, false) + "</div>"
      + "</div>"
      + '<h3 class="assess-question">' + q.q + "</h3>"
      + '<div class="assess-hint"><span class="t-meta t-meta-dim">Choose the answer closest to your business</span></div>'
      + '<div class="assess-options">' + opts + "</div>";
  }

  function renderResult(archetype) {
    var gfxKind = GFX_MAP[archetype.key] || "build";
    return '<div class="assess-progress">'
      + '<span class="t-meta">Result</span>'
      + '<div class="step-dots">' + stepDots(0, true) + "</div>"
      + "</div>"
      + '<div class="assess-result">'
      + '<div class="result-gfx" data-result-gfx="' + gfxKind + '"></div>'
      + '<div class="result-head">'
      + "<div class=\"label\">You&rsquo;re</div>"
      + '<h3 class="you-are"><i>' + archetype.name + ".</i></h3>"
      + '<button class="assess-restart">' + icon("rotate-ccw") + " Restart assessment</button>"
      + "</div>"
      + '<div class="right">'
      + '<p class="t-callout" style="margin:0">' + archetype.blurb + "</p>"
      + '<div class="next">'
      + "<div>"
      + '<span class="t-meta t-meta-dim">Recommended next move</span>'
      + '<div style="font-family:var(--font-sans);font-weight:600;font-size:var(--fs-lead);letter-spacing:-0.01em;margin-top:2px">' + archetype.next + "</div>"
      + "</div>"
      + '<a href="https://meetings-ap1.hubspot.com/sshevelev?archetype=' + encodeURIComponent(archetype.name) + '&next=' + encodeURIComponent(archetype.next) + '" target="_blank" rel="noopener" class="pill">Book a discovery call<span class="arrow">' + icon("arrow-right") + "</span></a>"
      + "</div></div></div>";
  }

  function bindAssessment(body) {
    var currentIdx = assessState.answers.findIndex(function (a) { return a === null; });
    var isComplete = currentIdx === -1;

    var startBtn = body.querySelector("#assess-start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        assessState.started = true;
        renderAssessment();
      });
    }

    body.querySelectorAll(".assess-option").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = parseInt(btn.getAttribute("data-idx"), 10);
        var next = assessState.answers.slice();
        next[currentIdx] = i;
        assessState.answers = next;
        renderAssessment();
      });
    });

    var restartBtn = body.querySelector(".assess-restart");
    if (restartBtn) {
      restartBtn.addEventListener("click", function () {
        assessState = { started: false, answers: [null, null, null] };
        renderAssessment();
      });
    }

    if (isComplete) {
      var host = body.querySelector("[data-result-gfx]");
      if (host && window.renderPillarGfx) {
        window.renderPillarGfx(host, host.getAttribute("data-result-gfx"));
      }
    }
  }

  function renderAssessment() {
    var body = document.getElementById("assess-body");
    if (!body) return;

    var currentIdx = assessState.answers.findIndex(function (a) { return a === null; });
    var isComplete = currentIdx === -1;

    if (!assessState.started) {
      body.innerHTML = renderStart();
    } else if (!isComplete) {
      body.innerHTML = renderQuestion(currentIdx);
    } else {
      var avg = (assessState.answers[0] + assessState.answers[2]) / 2;
      var archetype = ARCHETYPES[Math.round(avg)];
      body.innerHTML = renderResult(archetype);
    }

    bindAssessment(body);
  }

  // ── Insights list ────────────────────────────────────────────────────────
  var BASE = "https://ai-checker.webcoda.com.au";

  function initInsights() {
    var list = document.getElementById("insights-list");
    var countEl = document.getElementById("insights-count");
    if (!list) return;

    fetch("articles.json")
      .then(function (r) { return r.json(); })
      .then(function (articles) {
        if (countEl) countEl.innerHTML = "";

        // Floating thumbnail
        var thumb = document.createElement("div");
        thumb.className = "insight-thumb";
        document.body.appendChild(thumb);

        document.addEventListener("mousemove", function (e) {
          thumb.style.left = e.clientX + "px";
          thumb.style.top  = e.clientY + "px";
        });

        list.innerHTML = articles.map(function (a, i) {
          var num = "N° " + String(i + 1).padStart(2, "0");
          var thumbUrl = a.image ? (BASE + a.image) : (BASE + "/images/articles/" + a.slug + "/" + a.slug + "-hero-lg.webp");
          return '<a class="insight-row" href="' + BASE + '/articles/' + a.slug + '" target="_blank" rel="noopener" data-thumb="' + thumbUrl + '">'
            + '<span class="insight-num">' + num + '</span>'
            + '<span class="insight-title">' + a.title + '</span>'
            + '<span class="insight-cat">' + a.category + '</span>'
            + '<span class="insight-time">' + a.readTime + '</span>'
            + '<span class="insight-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>'
            + '</a>';
        }).join("");

        list.querySelectorAll(".insight-row").forEach(function (row) {
          row.addEventListener("mouseenter", function () {
            thumb.style.backgroundImage = 'url("' + row.getAttribute("data-thumb") + '")';
            thumb.classList.add("visible");
          });
          row.addEventListener("mouseleave", function () {
            thumb.classList.remove("visible");
          });
        });
      })
      .catch(function () {
        list.innerHTML = '<p class="t-meta t-meta-dim" style="padding:24px 0">Could not load articles.</p>';
      });
  }

  // ── Footer year ──────────────────────────────────────────────────────────
  function setYear() {
    var el = document.getElementById("copyright-year");
    if (el) el.textContent = new Date().getFullYear();
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    injectPillarIcons();
    injectPillArrows();
    initTypewriter();
    renderAssessment();
    initInsights();
    setYear();

    // scroll-fx and pillar-gfx need a settled DOM
    if (window.initScrollFX) window.initScrollFX();
    if (window.initPillarGfx) window.initPillarGfx();
  });
})();
