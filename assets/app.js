/* ==========================================================================
   Stay Unseen — landing page behaviour
   Vanilla JS + GSAP/ScrollTrigger. Every enhancement degrades gracefully:
   if the CDNs fail, the page remains readable and the artifacts static.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";

  /* If GSAP never arrived, drop the `.js` gate so reveal content stays visible. */
  if (!hasGsap) document.documentElement.classList.remove("js");

  /* ----------------------------------------------------------------------
     Icons
     ---------------------------------------------------------------------- */
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  /* ----------------------------------------------------------------------
     Browser detection → install CTAs
     ---------------------------------------------------------------------- */
  var STORES = {
    chrome: {
      label: "Add to Chrome",
      url: "https://chromewebstore.google.com/detail/stay-unseen-ig-fb-seen-bl/bfbajdhcgbnclhljgbcjficphhedlkje"
    },
    firefox: {
      label: "Add to Firefox",
      url: "https://addons.mozilla.org/en-US/firefox/addon/stay-unseen-ig-fb-seen-blocker/"
    },
    edge: {
      label: "Add to Edge",
      url: "https://microsoftedge.microsoft.com/addons/detail/stay-unseen-ig-fb-see/fnlnnfoeafbpbjgkkiihhkfncjhombai"
    }
  };

  (function detectBrowser() {
    var ua = navigator.userAgent || "";
    var id = /Edg\//.test(ua) ? "edge" : /Firefox|FxiOS/.test(ua) ? "firefox" : "chrome";
    var store = STORES[id];

    var labels = document.querySelectorAll("[data-browser-label]");
    for (var i = 0; i < labels.length; i++) labels[i].textContent = store.label;

    var ctas = document.querySelectorAll("[data-browser-cta]");
    for (var j = 0; j < ctas.length; j++) {
      ctas[j].setAttribute("href", store.url);
      ctas[j].setAttribute("target", "_blank");
      ctas[j].setAttribute("rel", "noopener noreferrer");
    }
  })();

  /* ----------------------------------------------------------------------
     Nav elevation on scroll
     ---------------------------------------------------------------------- */
  (function nav() {
    var el = document.querySelector("[data-nav]");
    if (!el) return;
    var onScroll = function () {
      el.classList.toggle(
        "shadow-[0_20px_50px_-30px_rgba(0,0,0,.95)]",
        window.scrollY > 12
      );
      el.classList.toggle("border-white/15", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  })();

  /* ----------------------------------------------------------------------
     Number helpers
     ---------------------------------------------------------------------- */
  function animateNumber(el, to) {
    if (!el) return;
    var from = parseFloat(String(el.textContent).replace(/[^0-9.-]/g, "")) || 0;
    if (reduceMotion || !hasGsap) {
      el.textContent = String(Math.round(to));
      return;
    }
    var proxy = { v: from };
    window.gsap.killTweensOf(proxy);
    window.gsap.to(proxy, {
      v: to,
      duration: 0.7,
      ease: "power2.out",
      snap: { v: 1 },
      onUpdate: function () {
        el.textContent = String(Math.round(proxy.v));
      }
    });
  }

  /* ----------------------------------------------------------------------
     Scroll reveals
     ---------------------------------------------------------------------- */
  (function reveals() {
    if (!hasGsap) return;
    var gsap = window.gsap;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

    var items = gsap.utils.toArray("[data-reveal]");
    if (reduceMotion || !window.ScrollTrigger) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }
    items.forEach(function (el) {
      gsap.fromTo(
        el,
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 86%", once: true }
        }
      );
    });
  })();

  /* ----------------------------------------------------------------------
     Animated counters (packet counter artifact)
     ---------------------------------------------------------------------- */
  (function counters() {
    var card = document.querySelector("[data-counter-card]");
    if (!card) return;
    var numbers = card.querySelectorAll("[data-count-to]");
    var bars = card.querySelectorAll("[data-count-bar]");

    function animateCount(el, to, duration, delay) {
      if (reduceMotion || !hasGsap) {
        el.textContent = String(to);
        return;
      }
      var proxy = { v: 0 };
      window.gsap.to(proxy, {
        v: to,
        duration: duration,
        delay: delay,
        ease: "power2.out",
        snap: { v: 1 },
        onUpdate: function () {
          el.textContent = String(Math.round(proxy.v));
        }
      });
    }

    function run() {
      for (var i = 0; i < numbers.length; i++) {
        var el = numbers[i];
        var to = parseInt(el.getAttribute("data-count-to"), 10) || 0;
        var duration = parseFloat(el.getAttribute("data-count-duration")) || 1.1;
        animateCount(el, to, duration, i * 0.08);
      }
      for (var b = 0; b < bars.length; b++) {
        var bar = bars[b];
        var pct = parseInt(bar.getAttribute("data-count-to-bar"), 10) || 0;
        window.setTimeout(
          (function (node, value) {
            return function () {
              node.style.transition = reduceMotion ? "none" : "width 1.1s cubic-bezier(.22,1,.36,1)";
              node.style.width = value + "%";
            };
          })(bar, pct),
          b * 90
        );
      }
    }

    if (reduceMotion) {
      run();
      return;
    }

    var done = false;
    function inView() {
      var r = card.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      return r.top < vh * 0.85 && r.bottom > 0;
    }
    function maybeRun() {
      if (done || !inView()) return;
      done = true;
      window.removeEventListener("scroll", maybeRun);
      window.removeEventListener("resize", maybeRun);
      run();
    }
    window.addEventListener("scroll", maybeRun, { passive: true });
    window.addEventListener("resize", maybeRun);
    maybeRun();
  })();

  /* ----------------------------------------------------------------------
     Popup artifact — real switches driving live metrics
     ---------------------------------------------------------------------- */
  (function popup() {
    var root = document.querySelector("[data-popup]");
    if (!root) return;

    var state = {
      story: true,
      read: true,
      typing: true,
      "fb-story": true,
      "fb-read": true,
      "fb-typing": true,
      keep: true
    };
    var counts = { story: 421, read: 328, typing: 98 };
    var lastBlock = "just now";

    var totalEl = document.getElementById("popTotal");
    var storyEl = document.getElementById("popStory");
    var readEl = document.getElementById("popRead");
    var typingEl = document.getElementById("popTyping");
    var lastEl = document.getElementById("popLast");
    var lastLabelEl = document.getElementById("popLastLabel");
    var statusEl = document.getElementById("popStatus");
    var taglineEl = document.getElementById("popTagline");

    function categoryFor(key) {
      if (key === "story" || key === "fb-story") return "story";
      if (key === "read" || key === "fb-read") return "read";
      if (key === "typing" || key === "fb-typing") return "typing";
      return null;
    }

    function blockingKeys() {
      return ["story", "read", "typing", "fb-story", "fb-read", "fb-typing"];
    }

    function isProtecting() {
      return blockingKeys().some(function (k) {
        return state[k];
      });
    }

    function total() {
      return counts.story + counts.read + counts.typing;
    }

    function render(animate) {
      var sum = total();
      if (animate) animateNumber(totalEl, sum);
      else if (totalEl) totalEl.textContent = String(sum);

      if (storyEl) storyEl.textContent = counts.story + " blocked";
      if (readEl) readEl.textContent = counts.read + " blocked";
      if (typingEl) typingEl.textContent = counts.typing + " blocked";
      if (lastEl) lastEl.textContent = lastBlock;
      if (lastLabelEl)
        lastLabelEl.textContent = lastBlock === "—" ? "no blocks yet" : "since last block";

      var protecting = isProtecting();
      if (statusEl) {
        statusEl.classList.toggle("off", !protecting);
        statusEl.classList.toggle("pulse", protecting);
      }
      if (taglineEl) {
        taglineEl.textContent = protecting
          ? "Active on Facebook + Instagram"
          : "Paused — all modules off";
      }
    }

    var toggles = root.querySelectorAll("[data-pop-toggle]");
    for (var i = 0; i < toggles.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-pop-toggle");
          var next = btn.getAttribute("aria-checked") !== "true";
          btn.setAttribute("aria-checked", next ? "true" : "false");
          state[key] = next;

          btn.classList.remove("glow");
          void btn.offsetWidth;
          btn.classList.add("glow");

          render(false);
        });
      })(toggles[i]);
    }

    render(false);

    /* Live local counting — only for categories that are switched on. */
    window.setInterval(function () {
      var active = [];
      if (state.story || state["fb-story"]) active.push("story");
      if (state.read || state["fb-read"]) active.push("read");
      if (state.typing || state["fb-typing"]) active.push("typing");
      if (!active.length) return;

      var pick = active[Math.floor(Math.random() * active.length)];
      counts[pick] += 1;
      lastBlock = "just now";

      var el = pick === "story" ? storyEl : pick === "read" ? readEl : typingEl;
      if (el) el.textContent = counts[pick] + " blocked";
      animateNumber(totalEl, total());
      if (lastEl) lastEl.textContent = lastBlock;
      if (lastLabelEl) lastLabelEl.textContent = "since last block";
    }, 2600);

    /* Reset counters — mirrors the extension's reset action. */
    var resetBtn = root.querySelector(".su-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        counts.story = 0;
        counts.read = 0;
        counts.typing = 0;
        lastBlock = "\u2014";
        render(true);
      });
    }
  })();

  /* ----------------------------------------------------------------------
     Control matrix
     ---------------------------------------------------------------------- */
  (function matrix() {
    var toggles = document.querySelectorAll("[data-matrix-toggle]");
    if (!toggles.length) return;

    for (var i = 0; i < toggles.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var next = btn.getAttribute("aria-checked") !== "true";
          btn.setAttribute("aria-checked", next ? "true" : "false");
          btn.classList.remove("glow");
          void btn.offsetWidth;
          btn.classList.add("glow");

          var scope = btn.closest("[data-matrix-row]") || btn.parentElement;
          var status = scope ? scope.querySelector("[data-matrix-status]") : null;
          if (status) {
            status.textContent = next ? "ENFORCING" : "BYPASSED";
            status.classList.toggle("text-typing", next);
            status.classList.toggle("text-muted", !next);
          }
        });
      })(toggles[i]);
    }
  })();

  /* ----------------------------------------------------------------------
     Interceptor terminal — streaming simulated network log
     ---------------------------------------------------------------------- */
  (function terminal() {
    var log = document.querySelector("[data-term-log]");
    if (!log) return;
    var blockedEl = document.querySelector("[data-term-blocked]");
    var passedEl = document.querySelector("[data-term-passed]");

    var blocked = 0;
    var passed = 0;

    var TEMPLATES = [
      { m: "POST", path: "/api/v1/direct_v2/threads/broadcast/seen/", tag: "instagram_messages", ok: false, note: "cancel → 200 OK spoofed" },
      { m: "POST", path: "/api/v1/media/3128.../seen/", tag: "instagram_stories", ok: false, note: "StoriesV3SeenMutation neutralised" },
      { m: "POST", path: "/api/v1/direct_v2/threads/broadcast/typing/", tag: "instagram_typing", ok: false, note: "frame dropped before send" },
      { m: "POST", path: "/ajax/mercury/change_read_status.php", tag: "facebook_messages", ok: false, note: "change_read_status cancelled" },
      { m: "POST", path: "/ajax/messaging/typ.php", tag: "facebook_typing", ok: false, note: "orca typing suppressed" },
      { m: "POST", path: "/api/graphql/ (mark_story_seen)", tag: "facebook_stories", ok: false, note: "mutation → empty changeset" },
      { m: "GET", path: "/api/v1/direct_v2/threads/3402.../items/", tag: "instagram_messages", ok: true, note: "allowlisted read — passes through" },
      { m: "GET", path: "/api/v1/media/3128.../info/", tag: "instagram_stories", ok: true, note: "allowlisted metadata" },
      { m: "POST", path: "/api/v1/direct_v2/threads/broadcast/text/", tag: "instagram_messages", ok: true, note: "outgoing message preserved" },
      { m: "POST", path: "/ajax/mercury/send_message.php", tag: "facebook_messages", ok: true, note: "send intent — never guarded" }
    ];

    var clock = function () {
      var d = new Date();
      var p = function (n) {
        return String(n).padStart(2, "0");
      };
      return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
    };

    function makeRow(t) {
      var row = document.createElement("div");
      row.className =
        "term-row grid grid-cols-[52px_78px_1fr] gap-x-3 border-b border-white/[0.04] py-1.5";

      var method = document.createElement("span");
      method.className = "text-muted";
      method.textContent = t.m;

      var status = document.createElement("span");
      status.className = t.ok ? "text-muted" : "text-typing";
      status.textContent = t.ok ? "200 OK" : "BLOCKED";

      var endpoint = document.createElement("span");
      endpoint.className = "min-w-0";
      var url = document.createElement("span");
      url.className = "block truncate " + (t.ok ? "text-muted" : "text-ink");
      url.textContent = t.path;
      var meta = document.createElement("span");
      meta.className = "block truncate text-[10px] text-muted/70";
      meta.textContent = clock() + " · " + t.tag + " · " + t.note;
      endpoint.appendChild(url);
      endpoint.appendChild(meta);

      row.appendChild(method);
      row.appendChild(status);
      row.appendChild(endpoint);
      return row;
    }

    function pushInitial() {
      for (var i = 0; i < 6; i++) {
        var t = TEMPLATES[i % TEMPLATES.length];
        if (t.ok) passed += 1;
        else blocked += 1;
        log.appendChild(makeRow(t));
      }
      updateTotals();
    }

    function updateTotals() {
      if (blockedEl) blockedEl.textContent = String(blocked);
      if (passedEl) passedEl.textContent = String(passed);
    }

    function stream() {
      /* Weighted toward blocked mutations, with a filler of allowlisted reads. */
      var pool = Math.random() < 0.78 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9];
      var t = TEMPLATES[pool[Math.floor(Math.random() * pool.length)]];
      if (t.ok) passed += 1;
      else blocked += 1;

      var row = makeRow(t);
      log.insertBefore(row, log.firstChild);
      updateTotals();

      while (log.childNodes.length > 13) log.removeChild(log.lastChild);
      log.scrollTop = 0;
    }

    pushInitial();
    if (reduceMotion) {
      stream();
    } else {
      window.setInterval(stream, 950);
    }
  })();

  /* ----------------------------------------------------------------------
     Magnetic buttons — subtle spring toward the cursor
     ---------------------------------------------------------------------- */
  (function magnetic() {
    if (!hasGsap || reduceMotion) return;
    if (!window.matchMedia || !window.matchMedia("(hover: hover)").matches) return;
    var gsap = window.gsap;

    var nodes = document.querySelectorAll(".magnetic");
    for (var i = 0; i < nodes.length; i++) {
      (function (el) {
        var xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" });
        var yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });

        el.addEventListener("mousemove", function (e) {
          var r = el.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
          yTo((e.clientY - (r.top + r.height / 2)) * 0.32);
        });
        el.addEventListener("mouseleave", function () {
          xTo(0);
          yTo(0);
        });
      })(nodes[i]);
    }
  })();

  /* ----------------------------------------------------------------------
     Footer year
     ---------------------------------------------------------------------- */
  (function year() {
    var el = document.querySelector("[data-year]");
    if (el) el.textContent = String(new Date().getFullYear());
  })();
})();
