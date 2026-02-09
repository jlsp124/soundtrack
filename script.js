(() => {
  const html = document.documentElement;
  const body = document.body;
  html.classList.remove("no-js");

  const shell = document.getElementById("horizontalShell");
  const track = document.getElementById("horizontalTrack");
  const panels = Array.from(document.querySelectorAll(".panel"));

  const sideRail = document.getElementById("sideRail");
  const menuToggle = document.getElementById("menuToggle");
  const railScrim = document.getElementById("railScrim");
  const progressFill = document.getElementById("edgeProgressFill");

  const railItems = Array.from(document.querySelectorAll(".rail-item"));
  const subItems = Array.from(document.querySelectorAll(".rail-subitem"));
  const jumpLinks = [...railItems, ...subItems];

  const headings = Array.from(document.querySelectorAll(".anim-heading"));
  const cards = Array.from(document.querySelectorAll(".anim-card"));
  const lines = Array.from(document.querySelectorAll(".anim-line"));
  const mediaLayers = Array.from(document.querySelectorAll(".panel-media"));
  const parallaxItems = Array.from(document.querySelectorAll(".parallax-soft"));
  const paperCards = Array.from(document.querySelectorAll(".paper-card"));
  const heroPortrait = document.querySelector(".hero-portrait img");
  const heroPortraitFrame = document.querySelector(".hero-portrait");
  const collageImages = Array.from(document.querySelectorAll(".cover-collage img, .sources-collage img, .together-collage img"));
  const images = Array.from(document.querySelectorAll("img"));
  const revealMedia = Array.from(document.querySelectorAll(".reveal-media"));

  const MEDIA_MAP = {
    cover_graduation: "assets/cover_graduation.webp",
    extragraduation: "assets/extragraduation.webp",
    cover_timeout: "assets/cover_timeout.webp",
    fiveextra: "assets/fiveextra.webp",
    gm_support_01: "assets/gm_support_01.webp",
    gm_support_02: "assets/gm_support_02.webp",
    gm_hero: "assets/gm_hero.webp",
    tf_support_01: "assets/tf_support_01.webp",
    tf_support_02: "assets/tf_support_02.webp"
  };

  if (!shell || !track || panels.length === 0) {
    return;
  }

  const MOTION_KEY = "soundtrack.motion";
  const allowedMotion = new Set(["on", "off", "auto"]);
  const debugEnabled = new URLSearchParams(window.location.search).get("debug") === "1";

  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let motionSetting = "on";
  let reducedMotion = false;
  let engine = "none";

  let masterTween = null;
  let masterTrigger = null;
  let observer = null;

  let lenis = null;
  let lenisTicker = null;

  let railTimeline = null;

  let verticalProgressHandler = null;

  const nativeState = {
    active: false,
    maxX: 0,
    currentX: 0,
    targetX: 0,
    scrollHandler: null,
    resizeHandler: null,
    raf: 0
  };

  let debugNode = null;

  const safeStorageGet = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  };

  const safeStorageSet = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // ignore
    }
  };

  const resolveMotionSetting = () => {
    let mode = (body.dataset.motion || "on").toLowerCase();

    if (!allowedMotion.has(mode)) {
      mode = "on";
    }

    const queryValue = (new URLSearchParams(window.location.search).get("motion") || "").toLowerCase();

    if (allowedMotion.has(queryValue)) {
      mode = queryValue;
      safeStorageSet(MOTION_KEY, mode);
    } else {
      const saved = (safeStorageGet(MOTION_KEY) || "").toLowerCase();
      if (allowedMotion.has(saved)) {
        mode = saved;
      }
    }

    body.dataset.motion = mode;
    return mode;
  };

  const computeReducedMotion = () => {
    if (motionSetting === "on") return false;
    if (motionSetting === "off") return true;
    return reduceQuery.matches;
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const collapsedRailWidth = () => (window.matchMedia("(max-width: 900px)").matches ? 76 : 92);
  const expandedRailWidth = () => (window.matchMedia("(max-width: 900px)").matches ? Math.min(window.innerWidth * 0.88, 320) : 320);

  const distanceX = () => Math.max(0, track.scrollWidth - window.innerWidth);

  const snapPoints = () => {
    const distance = distanceX() || 1;
    return panels.map((panel) => Math.min(1, panel.offsetLeft / distance));
  };

  const indexFromProgress = (progress) => {
    const points = snapPoints();
    let result = 0;

    points.forEach((point, idx) => {
      if (progress + 0.001 >= point) {
        result = idx;
      }
    });

    return result;
  };

  const chapterFromIndex = (index) => {
    if (index <= 1) return "intro";
    if (index <= 7) return "good-morning";
    if (index <= 14) return "take-five";
    if (index === 15) return "reflection";
    return "sources";
  };

  const setActiveNav = (index) => {
    const chapter = chapterFromIndex(index);

    railItems.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.chapter === chapter);
    });

    subItems.forEach((button) => {
      button.classList.toggle("is-current", Number(button.dataset.targetIndex) === index);
    });
  };

  const updateProgressBar = (progress) => {
    if (!progressFill) return;
    const value = clamp(progress, 0, 1);
    progressFill.style.transform = `scaleY(${value})`;
  };

  const ensureDebugOverlay = () => {
    if (!debugEnabled || debugNode) return;

    debugNode = document.createElement("aside");
    debugNode.className = "debug-overlay";
    debugNode.innerHTML = [
      "<p class=\"debug-title\">Debug</p>",
      "<div class=\"debug-line\"><span>engine</span><strong data-k=\"engine\">-</strong></div>",
      "<div class=\"debug-line\"><span>motionMode</span><strong data-k=\"motion\">-</strong></div>",
      "<div class=\"debug-line\"><span>prefersReduced</span><strong data-k=\"prefers\">-</strong></div>",
      "<div class=\"debug-line\"><span>distanceX</span><strong data-k=\"distance\">-</strong></div>",
      "<div class=\"debug-line\"><span>scrollY</span><strong data-k=\"scroll\">-</strong></div>",
      "<div class=\"debug-line\"><span>trackW / innerW</span><strong data-k=\"widths\">-</strong></div>",
      "<div class=\"debug-line\"><span>GSAP/ST/Lenis</span><strong data-k=\"libs\">-</strong></div>"
    ].join("");

    body.appendChild(debugNode);
  };

  const updateDebugOverlay = () => {
    if (!debugEnabled) return;
    ensureDebugOverlay();
    if (!debugNode) return;

    const gsapOk = !!window.gsap;
    const stOk = !!window.ScrollTrigger;
    const lenisOk = !!window.Lenis;

    const set = (key, value) => {
      const el = debugNode.querySelector(`[data-k="${key}"]`);
      if (el) el.textContent = value;
    };

    set("engine", engine);
    set("motion", motionSetting);
    set("prefers", String(reduceQuery.matches));
    set("distance", String(distanceX()));
    set("scroll", String(Math.round(window.scrollY)));
    set("widths", `${Math.round(track.scrollWidth)} / ${Math.round(window.innerWidth)}`);
    set("libs", `${gsapOk}/${stOk}/${lenisOk}`);
  };

  const slotToDatasetKey = (slot) => `media${slot
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")}`;

  const setPanelMediaSlots = () => {
    panels.forEach((panel) => {
      const bgKey = panel.dataset.mediaBg;
      const bgSrc = bgKey ? MEDIA_MAP[bgKey] : "";

      if (bgSrc) {
        panel.style.setProperty("--bg-image", `url("${bgSrc}")`);
      } else {
        panel.style.removeProperty("--bg-image");
      }

      const slotImages = panel.querySelectorAll("img[data-media-slot]");
      slotImages.forEach((img) => {
        const slot = img.dataset.mediaSlot || "";
        const datasetKey = slotToDatasetKey(slot);
        const mediaKey = panel.dataset[datasetKey] || panel.dataset.media || "";
        const src = MEDIA_MAP[mediaKey];

        if (src) {
          img.src = src;
        } else {
          img.removeAttribute("src");
        }
      });
    });
  };

  const clearParallaxStyles = () => {
    [...mediaLayers, ...parallaxItems, ...paperCards].forEach((element) => {
      element.style.transform = "";
    });

    if (heroPortrait) {
      heroPortrait.style.transform = "";
    }

    collageImages.forEach((image) => {
      image.style.transform = "";
    });
  };

  const setupImageFallbacks = () => {
    images.forEach((img) => {
      img.addEventListener(
        "error",
        () => {
          const holder = img.closest(".hero-portrait, .panel-figure, .cover-collage, .sources-collage, .together-collage, .stamp-media");
          if (holder) {
            if (holder.classList.contains("hero-portrait")) {
              holder.style.display = "none";
              img.style.display = "none";
              return;
            }

            holder.style.background = "linear-gradient(140deg, rgba(255,255,255,0.2), rgba(10,10,16,0.4))";
            holder.style.minHeight = "220px";
          }

          const railButton = img.closest(".rail-btn");
          if (railButton) {
            railButton.textContent = "=";
            railButton.style.fontSize = "1.2rem";
            railButton.style.color = "#fff";
          }

          img.style.display = "none";
        },
        { once: true }
      );
    });
  };

  const waitForImages = async () => {
    const decodeTasks = images.map((img) => {
      if (!img.complete) {
        if (img.loading === "lazy") {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          const timer = window.setTimeout(resolve, 800);
          const done = () => {
            window.clearTimeout(timer);
            resolve();
          };

          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      }

      if (typeof img.decode === "function") {
        return img.decode().catch(() => {});
      }

      return Promise.resolve();
    });

    await Promise.allSettled(decodeTasks);
  };

  const tuneLandingMedia = () => {
    if (!heroPortrait || !heroPortraitFrame) return;
    const w = heroPortrait.naturalWidth || 0;
    const h = heroPortrait.naturalHeight || 0;
    if (!w || !h) return;

    const ratio = w / h;
    if (ratio < 1.1) {
      heroPortraitFrame.style.aspectRatio = `${w} / ${h}`;
    } else {
      heroPortraitFrame.style.aspectRatio = "3 / 4.2";
    }
  };

  const clearObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  const attachVerticalObserver = () => {
    clearObserver();

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.index || "0");
            setActiveNav(idx);
          }
        });
      },
      { threshold: 0.56 }
    );

    panels.forEach((panel) => observer.observe(panel));
  };

  const attachVerticalProgress = () => {
    if (verticalProgressHandler) {
      window.removeEventListener("scroll", verticalProgressHandler);
      verticalProgressHandler = null;
    }

    verticalProgressHandler = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      updateProgressBar(window.scrollY / maxScroll);
    };

    window.addEventListener("scroll", verticalProgressHandler, { passive: true });
    verticalProgressHandler();
  };

  const detachVerticalProgress = () => {
    if (!verticalProgressHandler) return;
    window.removeEventListener("scroll", verticalProgressHandler);
    verticalProgressHandler = null;
  };

  const stopLenis = () => {
    if (lenisTicker && window.gsap) {
      window.gsap.ticker.remove(lenisTicker);
      lenisTicker = null;
    }

    if (lenis) {
      lenis.destroy();
      lenis = null;
    }
  };

  const initLenis = () => {
    if (
      reducedMotion ||
      body.dataset.lenis === "off" ||
      !window.Lenis ||
      !window.gsap ||
      !window.ScrollTrigger
    ) {
      stopLenis();
      return;
    }

    stopLenis();

    try {
      lenis = new window.Lenis({
        duration: 1.08,
        lerp: 0.1,
        smoothWheel: true,
        smoothTouch: false,
        wheelMultiplier: 1,
        gestureOrientation: "vertical"
      });

      lenis.on("scroll", () => {
        window.ScrollTrigger.update();
      });

      lenisTicker = (time) => {
        lenis.raf(time * 1000);
      };

      window.gsap.ticker.add(lenisTicker);
      window.gsap.ticker.lagSmoothing(0);
    } catch (_error) {
      stopLenis();
    }
  };

  const killGsapHorizontal = () => {
    if (masterTween) {
      masterTween.kill();
      masterTween = null;
    }

    masterTrigger = null;

    if (window.ScrollTrigger) {
      window.ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    }

    if (window.gsap) {
      window.gsap.set(track, { clearProps: "transform" });
    } else {
      track.style.transform = "";
    }
  };

  const stopNativeHorizontal = () => {
    if (!nativeState.active) return;

    if (nativeState.scrollHandler) {
      window.removeEventListener("scroll", nativeState.scrollHandler);
      nativeState.scrollHandler = null;
    }

    if (nativeState.resizeHandler) {
      window.removeEventListener("resize", nativeState.resizeHandler);
      nativeState.resizeHandler = null;
    }

    if (nativeState.raf) {
      window.cancelAnimationFrame(nativeState.raf);
      nativeState.raf = 0;
    }

    nativeState.active = false;
    nativeState.maxX = 0;
    nativeState.currentX = 0;
    nativeState.targetX = 0;

    body.classList.remove("native-horizontal");
    body.style.height = "";
    track.style.transform = "";
  };

  const updateNativeParallax = (y, maxX) => {
    const ratio = maxX > 0 ? y / maxX : 0;

    mediaLayers.forEach((media, idx) => {
      const drift = (idx % 2 ? -1 : 1) * ratio * 34;
      media.style.transform = `translate3d(${drift}px, 0, 0) scale(1.1)`;
    });

    parallaxItems.forEach((item, idx) => {
      const dx = (idx % 2 ? -1 : 1) * ratio * 20;
      const dy = (idx % 2 ? 1 : -1) * ratio * 14;
      item.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    });

    paperCards.forEach((card, idx) => {
      const dy = (idx % 2 ? 1 : -1) * ratio * 10;
      card.style.transform = `translate3d(0, ${dy}px, 0)`;
    });

    if (heroPortrait) {
      const scale = 1.02 + ratio * 0.06;
      const x = ratio * 12;
      heroPortrait.style.transform = `translate3d(${x}px, 0, 0) scale(${scale})`;
    }

    collageImages.forEach((image, idx) => {
      const drift = (idx % 2 ? -1 : 1) * ratio * 12;
      image.style.transform = `translate3d(${drift}px, 0, 0)`;
    });
  };

  const initNativeHorizontal = () => {
    stopLenis();
    killGsapHorizontal();
    clearObserver();
    detachVerticalProgress();

    body.classList.remove("reduced-motion");
    body.classList.add("native-horizontal");

    const updateMetrics = () => {
      nativeState.maxX = Math.max(0, track.scrollWidth - window.innerWidth);
      body.style.height = `${window.innerHeight + nativeState.maxX}px`;
    };

    const render = () => {
      nativeState.raf = 0;
      nativeState.currentX += (nativeState.targetX - nativeState.currentX) * 0.14;
      if (Math.abs(nativeState.targetX - nativeState.currentX) < 0.2) {
        nativeState.currentX = nativeState.targetX;
      }

      track.style.transform = `translate3d(${-nativeState.currentX}px, 0, 0)`;

      const progress = nativeState.maxX > 0 ? nativeState.currentX / nativeState.maxX : 0;
      updateProgressBar(progress);
      setActiveNav(indexFromProgress(progress));
      updateNativeParallax(nativeState.currentX, nativeState.maxX);

      panels.forEach((panel) => {
        const left = panel.offsetLeft - nativeState.currentX;
        const right = left + panel.offsetWidth;
        const visible = right > window.innerWidth * 0.15 && left < window.innerWidth * 0.85;
        panel.classList.toggle("is-visible", visible);
      });

      updateDebugOverlay();

      if (Math.abs(nativeState.targetX - nativeState.currentX) > 0.2) {
        nativeState.raf = window.requestAnimationFrame(render);
      }
    };

    const requestRender = () => {
      nativeState.targetX = clamp(window.scrollY, 0, nativeState.maxX);
      if (nativeState.raf) return;
      nativeState.raf = window.requestAnimationFrame(render);
    };

    nativeState.scrollHandler = requestRender;
    nativeState.resizeHandler = () => {
      updateMetrics();
      requestRender();
    };

    updateMetrics();

    window.addEventListener("scroll", nativeState.scrollHandler, { passive: true });
    window.addEventListener("resize", nativeState.resizeHandler);

    nativeState.active = true;
    engine = "native";

    requestRender();
    console.log("[soundtrack] engine=native motion=%s distanceX=%d", motionSetting, nativeState.maxX);
    updateDebugOverlay();
    return true;
  };

  const initGsapHorizontal = () => {
    if (!window.gsap || !window.ScrollTrigger) {
      return false;
    }

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    stopNativeHorizontal();
    clearObserver();
    detachVerticalProgress();
    body.classList.remove("reduced-motion");

    const initialDistance = distanceX();
    if (initialDistance <= 8) {
      return false;
    }

    try {
      gsap.registerPlugin(ScrollTrigger);
      killGsapHorizontal();
      clearParallaxStyles();

      masterTween = gsap.to(track, {
        x: () => -distanceX(),
        ease: "none",
        scrollTrigger: {
          id: "horizontal-master",
          trigger: shell,
          start: "top top",
          end: () => `+=${distanceX()}`,
          pin: true,
          scrub: 0.98,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          snap: {
            snapTo: (value) => gsap.utils.snap(snapPoints(), value),
            duration: { min: 0.2, max: 0.62 },
            ease: "power1.inOut",
            inertia: false
          },
          onUpdate: (self) => {
            updateProgressBar(self.progress);
            setActiveNav(indexFromProgress(self.progress));
            updateDebugOverlay();
          }
        }
      });
    } catch (_error) {
      killGsapHorizontal();
      return false;
    }

    masterTrigger = masterTween.scrollTrigger;
    if (!masterTrigger || masterTrigger.end - masterTrigger.start <= 8) {
      killGsapHorizontal();
      return false;
    }

    initLenis();

    headings.forEach((heading, idx) => {
      gsap.from(heading, {
        x: idx % 2 ? 64 : 48,
        autoAlpha: 0,
        duration: 0.82,
        ease: "power2.out",
        scrollTrigger: {
          trigger: heading.closest(".panel"),
          containerAnimation: masterTween,
          start: "left 74%",
          toggleActions: "play none none reverse"
        }
      });
    });

    cards.forEach((card) => {
      gsap.from(card, {
        y: 28,
        autoAlpha: 0,
        duration: 0.76,
        ease: "power2.out",
        scrollTrigger: {
          trigger: card.closest(".panel"),
          containerAnimation: masterTween,
          start: "left 76%",
          toggleActions: "play none none reverse"
        }
      });
    });

    lines.forEach((line, idx) => {
      gsap.from(line, {
        scaleX: 0,
        transformOrigin: idx % 2 ? "right center" : "left center",
        autoAlpha: 0,
        duration: 0.95,
        ease: "power2.out",
        scrollTrigger: {
          trigger: line.closest(".panel"),
          containerAnimation: masterTween,
          start: "left 70%",
          toggleActions: "play none none reverse"
        }
      });
    });

    revealMedia.forEach((item) => {
      gsap.fromTo(
        item,
        { clipPath: "inset(0 0 100% 0)" },
        {
          clipPath: "inset(0 0 0% 0)",
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: item.closest(".panel"),
            containerAnimation: masterTween,
            start: "left 70%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });

    mediaLayers.forEach((media, idx) => {
      gsap.fromTo(
        media,
        { xPercent: 0, scale: 1.04 },
        {
          xPercent: idx % 2 ? 8 : -8,
          scale: 1.14,
          ease: "none",
          scrollTrigger: {
            trigger: media.closest(".panel"),
            containerAnimation: masterTween,
            start: "left right",
            end: "right left",
            scrub: true
          }
        }
      );
    });

    parallaxItems.forEach((item, idx) => {
      gsap.fromTo(
        item,
        { xPercent: idx % 2 ? -2 : 2, yPercent: idx % 2 ? 2 : -2 },
        {
          xPercent: idx % 2 ? 6 : -6,
          yPercent: idx % 2 ? -10 : 10,
          ease: "none",
          scrollTrigger: {
            trigger: item.closest(".panel"),
            containerAnimation: masterTween,
            start: "left right",
            end: "right left",
            scrub: true
          }
        }
      );
    });

    paperCards.forEach((card, idx) => {
      gsap.fromTo(
        card,
        { yPercent: idx % 2 ? 2 : -2 },
        {
          yPercent: idx % 2 ? -2 : 2,
          ease: "none",
          scrollTrigger: {
            trigger: card.closest(".panel"),
            containerAnimation: masterTween,
            start: "left right",
            end: "right left",
            scrub: true
          }
        }
      );
    });

    if (heroPortrait) {
      gsap.fromTo(
        heroPortrait,
        { xPercent: -2, scale: 1.02 },
        {
          xPercent: 6,
          scale: 1.08,
          ease: "none",
          scrollTrigger: {
            trigger: "#section-0",
            containerAnimation: masterTween,
            start: "left right",
            end: "right left",
            scrub: true
          }
        }
      );
    }

    collageImages.forEach((image, idx) => {
      gsap.fromTo(
        image,
        { yPercent: idx % 2 ? 1 : -1 },
        {
          yPercent: idx % 2 ? -8 : 8,
          xPercent: idx % 2 ? 4 : -4,
          ease: "none",
          scrollTrigger: {
            trigger: image.closest(".panel"),
            containerAnimation: masterTween,
            start: "left right",
            end: "right left",
            scrub: true
          }
        }
      );
    });

    ScrollTrigger.refresh();
    if (distanceX() <= 8) {
      killGsapHorizontal();
      return false;
    }

    engine = "gsap";
    console.log("[soundtrack] engine=gsap motion=%s distanceX=%d", motionSetting, distanceX());
    updateDebugOverlay();
    return true;
  };

  const initReducedMode = () => {
    stopLenis();
    killGsapHorizontal();
    stopNativeHorizontal();

    body.classList.add("reduced-motion");
    clearParallaxStyles();

    attachVerticalObserver();
    attachVerticalProgress();

    setActiveNav(0);
    engine = "reduced";
    console.log("[soundtrack] engine=reduced motion=%s distanceX=%d", motionSetting, distanceX());
    updateDebugOverlay();
  };

  const initializeEngine = () => {
    reducedMotion = computeReducedMotion();

    if (reducedMotion) {
      initReducedMode();
      return;
    }

    body.classList.remove("reduced-motion");

    const gsapReady = initGsapHorizontal();
    if (!gsapReady) {
      initNativeHorizontal();
    }

    updateDebugOverlay();
  };

  const jumpToPanel = (rawIndex) => {
    const idx = clamp(Number(rawIndex), 0, panels.length - 1);
    if (Number.isNaN(idx)) return;

    if (engine === "gsap" && masterTrigger) {
      const dist = Math.max(1, distanceX());
      const targetX = clamp(panels[idx].offsetLeft, 0, dist);
      const progress = targetX / dist;
      const totalScroll = masterTrigger.end - masterTrigger.start;
      const y = masterTrigger.start + totalScroll * progress;

      if (lenis) {
        lenis.scrollTo(y, { duration: 1.02 });
      } else {
        window.scrollTo({ top: y, behavior: reducedMotion ? "auto" : "smooth" });
      }
      return;
    }

    if (engine === "native") {
      const y = Math.min(panels[idx].offsetLeft, nativeState.maxX);
      window.scrollTo({ top: y, behavior: "smooth" });
      return;
    }

    panels[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onRailClosed = () => {
    body.classList.remove("rail-open");
    if (railScrim) {
      railScrim.hidden = true;
    }

    if (window.gsap) {
      window.gsap.set(sideRail, { clearProps: "width" });
      window.gsap.set(subItems, { clearProps: "opacity,transform" });
    } else {
      subItems.forEach((item) => {
        item.style.opacity = "";
        item.style.transform = "";
      });
    }
  };

  const buildRailTimeline = () => {
    if (!window.gsap || !sideRail) {
      railTimeline = null;
      return;
    }

    const gsap = window.gsap;

    if (railTimeline) {
      railTimeline.kill();
      railTimeline = null;
    }

    gsap.set(subItems, { autoAlpha: 0, y: 14 });

    railTimeline = gsap.timeline({ paused: true });
    railTimeline
      .to(
        sideRail,
        {
          width: () => expandedRailWidth(),
          duration: 0.58,
          ease: "power3.out"
        },
        0
      )
      .to(
        subItems,
        {
          autoAlpha: 1,
          y: 0,
          stagger: 0.03,
          duration: 0.34,
          ease: "power2.out"
        },
        0.18
      );
  };

  const openRail = () => {
    if (body.classList.contains("rail-open")) return;

    body.classList.add("rail-open");
    menuToggle?.setAttribute("aria-expanded", "true");

    if (railScrim) {
      railScrim.hidden = false;
    }

    if (window.gsap && !reducedMotion) {
      if (!railTimeline) {
        buildRailTimeline();
      }

      window.gsap.set(sideRail, { width: collapsedRailWidth() });
      railTimeline?.play(0);
    } else {
      subItems.forEach((item) => {
        item.style.opacity = "1";
        item.style.transform = "translateY(0)";
      });
    }
  };

  const closeRail = () => {
    if (!body.classList.contains("rail-open")) return;

    menuToggle?.setAttribute("aria-expanded", "false");

    if (window.gsap && railTimeline && !reducedMotion) {
      railTimeline.eventCallback("onReverseComplete", onRailClosed);
      railTimeline.reverse();
      return;
    }

    onRailClosed();
  };

  const toggleRail = () => {
    if (body.classList.contains("rail-open")) {
      closeRail();
    } else {
      openRail();
    }
  };

  jumpLinks.forEach((button) => {
    button.addEventListener("click", () => {
      jumpToPanel(button.dataset.targetIndex || "0");
      if (body.classList.contains("rail-open")) {
        closeRail();
      }
    });
  });

  menuToggle?.addEventListener("click", toggleRail);
  railScrim?.addEventListener("click", closeRail);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.classList.contains("rail-open")) {
      closeRail();
    }
  });

  const onMotionMediaChange = (event) => {
    if (body.dataset.motion !== "auto") return;
    reducedMotion = event.matches;
    initializeEngine();
  };

  if (typeof reduceQuery.addEventListener === "function") {
    reduceQuery.addEventListener("change", onMotionMediaChange);
  } else if (typeof reduceQuery.addListener === "function") {
    reduceQuery.addListener(onMotionMediaChange);
  }

  window.addEventListener("resize", () => {
    if (engine === "gsap" && window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }

    if (engine === "native" && nativeState.resizeHandler) {
      nativeState.resizeHandler();
    }

    if (body.classList.contains("rail-open") && window.gsap) {
      buildRailTimeline();
      window.gsap.set(sideRail, { width: expandedRailWidth() });
      window.gsap.set(subItems, { autoAlpha: 1, y: 0 });
    }

    updateDebugOverlay();
  });

  window.addEventListener("load", () => {
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }

    if (engine === "native" && nativeState.resizeHandler) {
      nativeState.resizeHandler();
    }

    updateDebugOverlay();
  });

  const boot = async () => {
    setupImageFallbacks();
    setPanelMediaSlots();

    motionSetting = resolveMotionSetting();
    reducedMotion = computeReducedMotion();
    ensureDebugOverlay();

    setActiveNav(0);
    updateProgressBar(0);

    await waitForImages();
    tuneLandingMedia();

    buildRailTimeline();
    initializeEngine();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      boot();
    }, { once: true });
  } else {
    boot();
  }
})();
