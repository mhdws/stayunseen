/* Stay Unseen — product site behaviour.

   Three jobs, all cheap: reveal each block once as it scrolls in, drive
   the small touches (stat count-up, header progress bar), and rotate the
   popup screenshots. Everything the old script did (a full-page canvas
   particle field sized to the whole document, a pointer-tracked 3D card
   tilt, an accent switcher) has been removed — the canvas was the main
   reason the page dropped frames, since it cleared and redrew a
   viewport-wide, document-tall bitmap on every animation frame.

   The count-up and progress bar are one-shot or transform-only work: the
   counter writes text for under a second on first view, the progress bar
   scales a 2px strip inside its own rAF tick, and both stop entirely under
   prefers-reduced-motion. The interactive demo is pure CSS (a checkbox and
   sibling selectors) — no script touches it.

   The screenshot slideshow is a class flip and a setInterval that only
   runs while the block is on screen, under the pointer or the keyboard it
   pauses, the first manual control stops it for good, and it never starts
   under prefers-reduced-motion. Without script the three figures keep
   stacking vertically in the page.

   Under prefers-reduced-motion, or without IntersectionObserver, everything is
   revealed in one pass instead. With scripting off entirely, the <noscript>
   style in the page keeps the .reveal blocks visible and the counters show
   their final values. */

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
})();
