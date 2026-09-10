/* Stay Unseen — product site behaviour.

   The job is engagement without the old cost. Everything the previous
   version removed for performance stays removed: there is no full-page
   canvas, no per-frame document-wide redraw, and no recurring animation
   except the small hero feed. What runs here is five things:

     - reveal each block once as it scrolls in (with a per-card stagger
       carried entirely in CSS);
     - the small touches: stat count-up, header progress bar, scrolled state;
     - the hero feed, a three-row window onto the counters that adds a row
       every couple of seconds while the hero is on screen;
     - a pointer spotlight on the panels, which writes --mx/--my on the
       hovered panel inside one rAF;
     - a few degrees of pointer tilt on the hero popup, likewise one rAF.

   The count-up is one-shot. The progress bar scales a 2px strip inside its
   own rAF tick. The feed is one interval, cleared the moment the block
   scrolls out of view or the tab is hidden, and both it and the pointer work
   are skipped entirely under prefers-reduced-motion. The interactive demo is
   still pure CSS (a checkbox and sibling selectors) — no script touches it.

   The screenshot slideshow is a class flip and a setInterval that only runs
   while the block is on screen; under the pointer or the keyboard it pauses,
   the first manual control stops it for good, and it never starts under
   prefers-reduced-motion. Without script the three figures keep stacking
   vertically in the page.

   Under prefers-reduced-motion, or without IntersectionObserver, everything is
   revealed in one pass instead. With scripting off entirely, the <noscript>
   style in the page keeps the .reveal blocks visible, the feed's static rows
   stay put, and the counters show their final values. */

(function () {
  "use strict";

  var reduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- section reveals ---------------------------------------------------- */

  var items = document.querySelectorAll(".reveal");

  function revealAll() {
    for (var i = 0; i < items.length; i++) items[i].classList.add("is-in");
  }

  if (reduced || !("IntersectionObserver" in window) || !items.length) {
    revealAll();
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          entries[i].target.classList.add("is-in");
          // Unobserved on the way in: nothing re-animates, and the observer is
          // empty by the time you reach the footer.
          observer.unobserve(entries[i].target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
    );
    for (var j = 0; j < items.length; j++) observer.observe(items[j]);
  }

  /* --- hero stat count-up ---------------------------------------------------
     The HTML carries the final numbers, so no-JS and reduced-motion both show
     the truth. With motion allowed, the first view counts them up once. */

  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (isNaN(target)) return;
    var t0 = null;
    var DURATION = 700;
    function frame(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / DURATION);
      // ease-out cubic: fast start, gentle landing
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var stats = document.querySelectorAll(".stats b[data-count]");
  if (stats.length && !reduced && "IntersectionObserver" in window) {
    var statObs = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          countUp(entries[i].target);
          statObs.unobserve(entries[i].target);
        }
      },
      { threshold: 0.4 }
    );
    for (var k = 0; k < stats.length; k++) statObs.observe(stats[k]);
  }

  /* --- header scrolled state --------------------------------------------------
     Past a few pixels of scroll the header gains its depth shadow -- one
     class flip on a threshold, no per-frame styling. Runs regardless of the
     reduced-motion setting (it is a state, not an animation), coalesced into
     the same single rAF the progress bar uses. */

  var header = document.querySelector(".site-header");
  if (header) {
    var scrolled = false;
    var scrollPending = false;
    function applyScrolled() {
      scrollPending = false;
      var now = window.scrollY > 8;
      if (now !== scrolled) {
        scrolled = now;
        header.classList.toggle("is-scrolled", scrolled);
      }
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!scrollPending) {
          scrollPending = true;
          requestAnimationFrame(applyScrolled);
        }
      },
      { passive: true }
    );
    applyScrolled();
  }

  /* --- header progress bar --------------------------------------------------
     A 2px strip scaled along X. One passive scroll listener, coalesced into a
     single rAF: the scroll handler only sets a flag, the transform happens
     once per frame at most, and there is nothing to do when the bar is
     already at 1. */

  var bar = document.getElementById("progressBar");
  if (bar && !reduced) {
    var pending = false;
    var lastScale = -1;
    function update() {
      pending = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var scale = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (scale !== lastScale) {
        lastScale = scale;
        bar.style.transform = "scaleX(" + scale + ")";
      }
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!pending) {
          pending = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* --- popup screenshot slideshow -------------------------------------------
     script.js marks #shotShow is-live, which collapses the three figures
     into one cross-fading frame (see the .shots rules in styles.css). All
     state is one index; autoplay is a single interval that respects
     visibility, hover, focus and reduced motion. */

  var show = document.getElementById("shotShow");
  if (show) {
    var slides = show.querySelectorAll(".shot");
    var dots = show.querySelectorAll(".shot-dot");
    var prevBtn = document.getElementById("shotPrev");
    var nextBtn = document.getElementById("shotNext");
    var slide = 0;
    var inView = false;
    var timer = null;
    var stopped = false;

    function paint() {
      for (var i = 0; i < slides.length; i++) {
        slides[i].classList.toggle("is-active", i === slide);
        if (dots[i]) dots[i].setAttribute("aria-current", i === slide ? "true" : "false");
      }
    }

    function halt() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }

    function run() {
      if (stopped || reduced || !inView || timer !== null) return;
      timer = setInterval(function () {
        if (document.hidden) return;
        go(slide + 1);
      }, 7000);
    }

    function go(n, byUser) {
      slide = (n + slides.length) % slides.length;
      paint();
      if (byUser) {
        stopped = true;
        halt();
      }
    }

    if (slides.length > 1) {
      show.classList.add("is-live");
      paint();

      if (prevBtn) prevBtn.addEventListener("click", function () { go(slide - 1, true); });
      if (nextBtn) nextBtn.addEventListener("click", function () { go(slide + 1, true); });
      for (var d = 0; d < dots.length; d++) {
        (function (n) {
          dots[n].addEventListener("click", function () { go(n, true); });
        })(d);
      }

      show.addEventListener("mouseenter", halt);
      show.addEventListener("mouseleave", function () {
        if (!show.contains(document.activeElement)) run();
      });
      show.addEventListener("focusin", halt);
      show.addEventListener("focusout", function (e) {
        if (!e.relatedTarget || !show.contains(e.relatedTarget)) run();
      });

      if ("IntersectionObserver" in window) {
        var showObs = new IntersectionObserver(
          function (entries) {
            inView = entries[entries.length - 1].isIntersecting;
            if (inView) run();
            else halt();
          },
          { threshold: 0.25 }
        );
        showObs.observe(show);
      } else {
        inView = true;
        run();
      }
    }
  }

  /* --- nav scrollspy ---------------------------------------------------------
     Highlights the section you are actually in. One IntersectionObserver, no
     scroll listener: the callback fires on section boundaries only, and it
     toggles a class that drives a transform-only underline. In the hero (above
     the first section) nothing is active. */

  var navLinks = document.querySelectorAll(".nav a");

  if (navLinks.length && "IntersectionObserver" in window) {
    var linkById = {};
    var activeId = null;
    for (var i = 0; i < navLinks.length; i++) {
      var href = navLinks[i].getAttribute("href") || "";
      if (href.charAt(0) === "#") linkById[href.slice(1)] = navLinks[i];
    }

    var setActive = function (id) {
      if (activeId === id) return;
      activeId = id;
      for (var j = 0; j < navLinks.length; j++) {
        navLinks[j].classList.remove("active");
      }
      if (id && linkById[id]) linkById[id].classList.add("active");
    };

    var spy = new IntersectionObserver(
      function (entries) {
        var hit = null;
        for (var k = 0; k < entries.length; k++) {
          if (entries[k].isIntersecting) hit = entries[k].target.id;
        }
        if (hit) setActive(hit);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );

    var sections = document.querySelectorAll("main section[id]");
    for (var s = 0; s < sections.length; s++) spy.observe(sections[s]);

    var hero = document.querySelector(".hero");
    if (hero) {
      var heroObs = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) setActive(null);
        },
        { threshold: 0.25 }
      );
      heroObs.observe(hero);
    }
  }

  /* --- hero live feed -------------------------------------------------------
     Three rows that keep arriving while the hero is on screen: the running
     total ticks and a new row drops in. One interval, cleared whenever the
     block scrolls away or the tab is hidden, and never started under
     prefers-reduced-motion (the static rows in the HTML just stay put). */

  var feedList = document.getElementById("interceptList");
  var feedTotal = document.getElementById("interceptTotal");

  if (feedList && feedTotal && !reduced) {
    var FEED = [
      ["read", "Read receipt dropped"],
      ["story", "Story view held back"],
      ["typing", "Typing indicator cancelled"]
    ];
    var feedValue = parseInt(feedTotal.textContent, 10);
    if (isNaN(feedValue)) feedValue = 847;
    var feedStep = 0;
    var feedTimer = null;
    var feedInView = false;

    var feedAdd = function () {
      var kind = FEED[feedStep % FEED.length];
      feedStep++;

      feedValue++;
      feedTotal.textContent = String(feedValue);
      feedTotal.classList.remove("is-bump");
      // read the box once so removing and re-adding the class restarts the
      // keyframes instead of being coalesced away
      void feedTotal.offsetWidth;
      feedTotal.classList.add("is-bump");

      var row = document.createElement("li");
      row.className = "intercept-row is-new";
      var dot = document.createElement("span");
      dot.className = "idot " + kind[0];
      var label = document.createElement("span");
      label.className = "ilabel";
      label.textContent = kind[1];
      var time = document.createElement("span");
      time.className = "itime";
      time.textContent = "+1";
      row.appendChild(dot);
      row.appendChild(label);
      row.appendChild(time);
      feedList.insertBefore(row, feedList.firstChild);
      // same trick: one frame with the enter state, then settle it
      void row.offsetWidth;
      row.classList.remove("is-new");
      while (feedList.children.length > 3) feedList.removeChild(feedList.lastChild);
    };

    // The status line names the sites it is covering; it rotates on the same
    // clock as the feed, one swap every third row, so the two read as one
    // live panel rather than two unrelated animations.
    var statusText = document.getElementById("statusText");
    var STATUSES = [
      "Active on Facebook + Instagram",
      "Active on Instagram",
      "Active on Facebook"
    ];
    var statusStep = 0;
    var feedTick = 0;

    var cycleStatus = function () {
      if (!statusText) return;
      statusStep = (statusStep + 1) % STATUSES.length;
      statusText.classList.add("is-out");
      window.setTimeout(function () {
        statusText.textContent = STATUSES[statusStep];
        statusText.classList.remove("is-out");
      }, 280);
    };

    var feedRun = function () {
      if (feedTimer !== null || !feedInView || document.hidden) return;
      feedTimer = setInterval(function () {
        feedAdd();
        feedTick++;
        if (feedTick % 3 === 0) cycleStatus();
      }, 1800);
    };

    var feedHalt = function () {
      if (feedTimer !== null) {
        clearInterval(feedTimer);
        feedTimer = null;
      }
    };

    if ("IntersectionObserver" in window) {
      var feedObs = new IntersectionObserver(
        function (entries) {
          feedInView = entries[entries.length - 1].isIntersecting;
          if (feedInView) feedRun();
          else feedHalt();
        },
        { threshold: 0.2 }
      );
      feedObs.observe(feedList);
    } else {
      feedInView = true;
      feedRun();
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) feedHalt();
      else feedRun();
    });
  }

  /* --- panel pointer spotlight ----------------------------------------------
     Only on a real pointer: the cursor position goes into two custom
     properties on the panel being hovered, coalesced into one rAF. The inner
     gradient follows the pointer; nothing else is touched. */

  var glow = document.querySelectorAll(".card, .demo, .compare > div");
  var finePointer =
    window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (glow.length && finePointer && !reduced) {
    var glowMove = function (e) {
      var el = e.currentTarget;
      if (el.__spot) return;
      el.__spot = true;
      var x = e.clientX;
      var y = e.clientY;
      requestAnimationFrame(function () {
        el.__spot = false;
        var r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        el.style.setProperty("--mx", (((x - r.left) / r.width) * 100).toFixed(2) + "%");
        el.style.setProperty("--my", (((y - r.top) / r.height) * 100).toFixed(2) + "%");
      });
    };
    for (var gp = 0; gp < glow.length; gp++) {
      glow[gp].addEventListener("pointermove", glowMove, { passive: true });
    }
  }

  /* --- hero shot tilt -------------------------------------------------------
     A few degrees of parallax on the popup image, following the pointer over
     it: transform-only on one element, at most one rAF per frame. */

  var tilt = document.getElementById("heroTilt");

  if (tilt && finePointer && !reduced) {
    var tiltPending = false;
    var tiltX = 0;
    var tiltY = 0;

    var tiltApply = function () {
      tiltPending = false;
      var r = tilt.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var nx = (tiltX - (r.left + r.width / 2)) / (r.width / 2);
      var ny = (tiltY - (r.top + r.height / 2)) / (r.height / 2);
      nx = Math.max(-1, Math.min(1, nx));
      ny = Math.max(-1, Math.min(1, ny));
      tilt.style.setProperty("--hy", (nx * 5).toFixed(2) + "deg");
      tilt.style.setProperty("--hx", (-ny * 5).toFixed(2) + "deg");
    };

    tilt.addEventListener(
      "pointermove",
      function (e) {
        tiltX = e.clientX;
        tiltY = e.clientY;
        if (tiltPending) return;
        tiltPending = true;
        requestAnimationFrame(tiltApply);
      },
      { passive: true }
    );

    tilt.addEventListener("pointerleave", function () {
      tilt.style.setProperty("--hy", "0deg");
      tilt.style.setProperty("--hx", "0deg");
    });
  }

  /* --- interception flow ----------------------------------------------------
     The mechanism visual: one packet is moved with transform between three
     stops — the start, the filter, and Meta. A blocked request stops at the
     filter and takes the "blocked" tint; an allowed one carries on and takes
     the "passed" tint. The chips fire a request by hand; left alone it
     autoplays through them while it is on screen. Under reduced motion there
     is no autoplay and no travel: a click just places the packet at its
     destination and updates the verdict. */

  var flowRoot = document.getElementById("flow");

  if (flowRoot) {
    var flowStage = document.getElementById("flowStage");
    var flowPacket = document.getElementById("flowPacket");
    var flowVerdict = document.getElementById("flowVerdict");
    var flowChips = flowRoot.querySelectorAll(".flow-chip");

    var FLOW = {
      seen: {
        short: "seen",
        blocked: true,
        verdict:
          "<b>Story view</b> — stopped at the network rule. The write that would add you to the viewer list never leaves, so their count stays one lower."
      },
      read: {
        short: "read",
        blocked: true,
        verdict:
          "<b>Read receipt</b> — stopped at the network rule. Their message keeps saying Delivered, while your side still opens normally."
      },
      typing: {
        short: "typing…",
        blocked: true,
        verdict:
          "<b>Typing indicator</b> — stopped by the page patch, because these go out over a websocket with no address of their own to cancel."
      },
      send: {
        short: "Send: hey!",
        blocked: false,
        verdict:
          "<b>Send a message</b> — allowed through. A message you chose to send is not a signal to hide, so the other person is told."
      },
      load: {
        short: "GET /feed",
        blocked: false,
        verdict:
          "<b>Load the feed</b> — allowed through untouched. Only the seen, read and typing writes are matched against the list."
      }
    };

    var flowOrder = ["seen", "read", "typing", "send", "load"];
    var flowIndex = 0;
    var flowBusy = false;
    var flowInView = false;
    var flowTimer = null;
    var flowPausedUntil = 0;

    var flowActive = function (id) {
      for (var c = 0; c < flowChips.length; c++) {
        flowChips[c].classList.toggle(
          "active",
          flowChips[c].getAttribute("data-flow") === id
        );
      }
    };

    var flowFire = function (id) {
      var data = FLOW[id];
      if (!data || flowBusy) return;
      flowBusy = true;
      flowActive(id);
      if (flowVerdict) flowVerdict.innerHTML = data.verdict;
      flowPacket.textContent = data.short;

      // Anchor the travel to the real pieces rather than fixed offsets: the
      // packet leaves clear of the browser node and lands clear of the filter
      // or the Meta node, whatever the viewport width does to their boxes.
      var stageRect = flowStage.getBoundingClientRect();
      var pw = flowPacket.offsetWidth || 90;
      var aRight = flowStage.querySelector(".flow-a").getBoundingClientRect().right - stageRect.left;
      var bLeft = flowStage.querySelector(".flow-b").getBoundingClientRect().left - stageRect.left;
      var shieldRect = flowStage.querySelector(".flow-shield").getBoundingClientRect();
      var shieldLeft = shieldRect.left - stageRect.left;
      var shieldCentre = shieldLeft + shieldRect.width / 2;
      var startX = aRight + 12;
      // Stop short of the filter when there is room; on a narrow stage there
      // is not, so let the packet reach the filter itself and be swallowed.
      var beforeShield = shieldLeft - pw - 8;
      var blockedX =
        beforeShield >= startX ? beforeShield : Math.max(startX, shieldCentre - pw / 2);
      var endX = Math.max(startX, bLeft - pw - 12);
      var landX = data.blocked ? blockedX : endX;

      if (reduced) {
        flowPacket.classList.add("no-anim");
        flowPacket.classList.remove("is-blocked", "is-passed");
        flowPacket.style.setProperty("--px", landX + "px");
        flowPacket.classList.add(data.blocked ? "is-blocked" : "is-passed");
        flowPacket.style.opacity = "1";
        void flowPacket.offsetWidth;
        flowPacket.classList.remove("no-anim");
        flowBusy = false;
        return;
      }

      // snap back to the start, hidden, without animating the snap
      flowPacket.classList.add("no-anim");
      flowPacket.classList.remove("is-blocked", "is-passed");
      flowPacket.style.opacity = "0";
      flowPacket.style.setProperty("--px", startX + "px");
      void flowPacket.offsetWidth;
      flowPacket.classList.remove("no-anim");

      requestAnimationFrame(function () {
        flowPacket.style.opacity = "1";
        flowPacket.style.setProperty("--px", landX + "px");
        window.setTimeout(function () {
          flowPacket.classList.add(data.blocked ? "is-blocked" : "is-passed");
          window.setTimeout(function () {
            flowPacket.style.opacity = "0";
            window.setTimeout(function () {
              flowBusy = false;
            }, 360);
          }, 340);
        }, 900);
      });
    };

    var flowTick = function () {
      flowTimer = window.setTimeout(function () {
        flowTimer = null;
        if (flowInView && Date.now() >= flowPausedUntil) {
          flowFire(flowOrder[flowIndex % flowOrder.length]);
          flowIndex++;
        }
        flowTick();
      }, 2900);
    };

    var flowRun = function () {
      if (flowTimer !== null || reduced) return;
      flowTick();
    };

    var flowHalt = function () {
      if (flowTimer !== null) {
        window.clearTimeout(flowTimer);
        flowTimer = null;
      }
    };

    for (var cf = 0; cf < flowChips.length; cf++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          // hold the autoplay back so the request you picked stays put
          flowPausedUntil = Date.now() + 9000;
          flowFire(btn.getAttribute("data-flow"));
        });
      })(flowChips[cf]);
    }

    if (reduced) {
      // no travel and no autoplay, but still show one request parked at the
      // filter so the visual is not an empty stage
      flowFire("seen");
    } else if ("IntersectionObserver" in window) {
      var flowObs = new IntersectionObserver(
        function (entries) {
          flowInView = entries[entries.length - 1].isIntersecting;
          if (flowInView) flowRun();
          else flowHalt();
        },
        { threshold: 0.3 }
      );
      flowObs.observe(flowRoot);
    } else {
      flowInView = true;
      flowRun();
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) flowHalt();
      else if (flowInView) flowRun();
    });
  }
})();
