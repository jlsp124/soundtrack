(() => {
  const html = document.documentElement;
  const body = document.body;
  html.classList.remove("no-js");

  const shell = document.getElementById("horizontalShell");
  const track = document.getElementById("horizontalTrack");
  const panels = Array.from(document.querySelectorAll(".panel"));

  const menuToggle = document.getElementById("menuToggle");
  const menuClose = document.getElementById("menuClose");
  const menuScrim = document.getElementById("menuScrim");

  const railLinks = Array.from(document.querySelectorAll(".rail-link"));
  const menuLinks = Array.from(document.querySelectorAll(".menu-link"));
  const jumpButtons = Array.from(document.querySelectorAll("[data-target-index]"));
  const splitLines = Array.from(document.querySelectorAll(".split-reveal span"));
  const listenCards = Array.from(document.querySelectorAll(".listen-card"));
  const images = Array.from(document.querySelectorAll("img"));

  const mediaQueryReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = mediaQueryReduce.matches;

  let masterTween = null;
  let masterTrigger = null;
  let menuTween = null;
  let sectionObserver = null;
  let lenis = null;
  let lenisTicker = null;

  const chapterForIndex = (index) => {
    if (index <= 1) return "intro";
    if (index <= 8) return "good-morning";
    if (index <= 15) return "take-five";
    if (index === 16) return "reflection";
    return "sources";
  };

  const setActiveChapter = (index) => {
    const chapter = chapterForIndex(index);
    railLinks.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.chapter === chapter));
    menuLinks.forEach((btn) => btn.classList.toggle("is-current", Number(btn.dataset.targetIndex) === index));
  };

  const getDistance = () => Math.max(0, track.scrollWidth - window.innerWidth);

  const panelProgressPoints = () => {
    const distance = getDistance() || 1;
    return panels.map((panel) => Math.min(1, panel.offsetLeft / distance));
  };

  const panelIndexFromProgress = (progress) => {
    const points = panelProgressPoints();
    let idx = 0;
    points.forEach((point, i) => {
      if (progress + 0.001 >= point) {
        idx = i;
      }
    });
    return idx;
  };

  const clampIndex = (index) => Math.max(0, Math.min(panels.length - 1, index));

  const jumpToPanel = (rawIndex) => {
    const index = clampIndex(Number(rawIndex));
    if (Number.isNaN(index)) return;

    if (reducedMotion || !masterTrigger) {
      panels[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const points = panelProgressPoints();
    const targetProgress = points[index] ?? 0;
    const y = masterTrigger.start + (masterTrigger.end - masterTrigger.start) * targetProgress;

    if (lenis) {
      lenis.scrollTo(y, { immediate: false, duration: 1.05 });
    } else {
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const openMenu = () => {
    body.classList.add("menu-open");
    menuToggle?.setAttribute("aria-expanded", "true");
    if (menuScrim) menuScrim.hidden = false;

    if (window.gsap && !reducedMotion) {
      if (menuTween) menuTween.kill();
      window.gsap.set(menuLinks, { y: 20, autoAlpha: 0 });
      menuTween = window.gsap.to(menuLinks, {
        y: 0,
        autoAlpha: 1,
        duration: 0.48,
        stagger: 0.05,
        ease: "power3.out",
        delay: 0.14
      });
    } else {
      menuLinks.forEach((link) => {
        link.style.opacity = "1";
        link.style.transform = "translateY(0)";
      });
    }
  };

  const closeMenu = () => {
    body.classList.remove("menu-open");
    menuToggle?.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      if (!body.classList.contains("menu-open") && menuScrim) {
        menuScrim.hidden = true;
      }
    }, 420);
  };

  const setupListenCards = () => {
    listenCards.forEach((card) => {
      const btn = card.querySelector(".listen-toggle");
      if (!btn) return;

      btn.addEventListener("click", () => {
        const isOpen = card.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", String(isOpen));
      });
    });
  };

  const setupImageFallbacks = () => {
    images.forEach((img) => {
      img.addEventListener(
        "error",
        () => {
          const mediaCard = img.closest(".media-card, .cover-shot");
          if (mediaCard) {
            mediaCard.style.background = "linear-gradient(140deg, rgba(255,255,255,0.2), rgba(12,12,18,0.35))";
            mediaCard.style.minHeight = "220px";
          }

          const railBtn = img.closest(".rail-btn");
          if (railBtn) {
            railBtn.textContent = "=";
            railBtn.style.fontSize = "1.2rem";
            railBtn.style.color = "#fff";
          }

          img.style.display = "none";
        },
        { once: true }
      );
    });
  };

  const setupVerticalObserver = () => {
    if (sectionObserver) sectionObserver.disconnect();

    sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.index || 0);
            setActiveChapter(idx);
          }
        });
      },
      { threshold: 0.55 }
    );

    panels.forEach((panel) => sectionObserver.observe(panel));
  };

  const killLenis = () => {
    if (!window.gsap) return;
    if (lenisTicker) {
      window.gsap.ticker.remove(lenisTicker);
      lenisTicker = null;
    }
    if (lenis) {
      lenis.destroy();
      lenis = null;
    }
  };

  const initLenis = () => {
    if (body.dataset.lenis === "off" || reducedMotion || !window.Lenis || !window.gsap || !window.ScrollTrigger) {
      killLenis();
      return;
    }

    killLenis();

    lenis = new window.Lenis({
      duration: 1.1,
      wheelMultiplier: 1,
      lerp: 0.12,
      smoothWheel: true,
      smoothTouch: false,
      gestureOrientation: "vertical"
    });

    lenis.on("scroll", () => window.ScrollTrigger.update());

    lenisTicker = (time) => {
      lenis.raf(time * 1000);
    };

    window.gsap.ticker.add(lenisTicker);
    window.gsap.ticker.lagSmoothing(0);
  };

  const killHorizontal = () => {
    if (!window.gsap || !window.ScrollTrigger) return;
    if (masterTween) {
      masterTween.kill();
      masterTween = null;
    }
    window.ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    window.gsap.set(track, { clearProps: "transform" });
    masterTrigger = null;
  };

  const initHorizontal = () => {
    if (!window.gsap || !window.ScrollTrigger || reducedMotion) {
      body.classList.add("reduced-motion");
      killHorizontal();
      killLenis();
      setupVerticalObserver();
      return;
    }

    body.classList.remove("reduced-motion");

    if (sectionObserver) {
      sectionObserver.disconnect();
      sectionObserver = null;
    }

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    gsap.registerPlugin(ScrollTrigger);

    killHorizontal();

    masterTween = gsap.to(track, {
      x: () => -getDistance(),
      ease: "none",
      scrollTrigger: {
        id: "masterHorizontal",
        trigger: shell,
        start: "top top",
        end: () => `+=${getDistance()}`,
        pin: true,
        scrub: 0.88,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        snap: {
          snapTo: (value) => gsap.utils.snap(panelProgressPoints(), value),
          duration: { min: 0.18, max: 0.55 },
          ease: "power1.inOut",
          inertia: false
        },
        onUpdate: (self) => {
          const idx = panelIndexFromProgress(self.progress);
          setActiveChapter(idx);
        }
      }
    });

    masterTrigger = masterTween.scrollTrigger;

    initLenis();

    gsap.to(".scroll-cue", {
      y: 5,
      duration: 1.35,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });

    gsap.utils.toArray(".panel-media").forEach((media, i) => {
      gsap.fromTo(
        media,
        { xPercent: 0, scale: 1.02 },
        {
          xPercent: i % 2 === 0 ? -10 : 10,
          scale: 1.1,
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

    splitLines.forEach((line) => {
      gsap.from(line, {
        clipPath: "inset(0 100% 0 0)",
        x: 36,
        autoAlpha: 0,
        duration: 0.85,
        ease: "power2.out",
        scrollTrigger: {
          trigger: line.closest(".panel"),
          containerAnimation: masterTween,
          start: "left 74%",
          toggleActions: "play none none reverse"
        }
      });
    });

    gsap.utils.toArray(".info-card, .listen-card, .prose-block, .resources-wrap").forEach((el) => {
      gsap.from(el, {
        y: 28,
        autoAlpha: 0,
        duration: 0.72,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el.closest(".panel"),
          containerAnimation: masterTween,
          start: "left 76%",
          toggleActions: "play none none reverse"
        }
      });
    });

    gsap.from(".line-left", {
      xPercent: -120,
      autoAlpha: 0,
      duration: 1.05,
      ease: "power3.out",
      scrollTrigger: {
        trigger: "#section-8",
        containerAnimation: masterTween,
        start: "left 68%",
        toggleActions: "play none none reverse"
      }
    });

    gsap.from(".line-right", {
      xPercent: 120,
      autoAlpha: 0,
      duration: 1.05,
      ease: "power3.out",
      scrollTrigger: {
        trigger: "#section-8",
        containerAnimation: masterTween,
        start: "left 68%",
        toggleActions: "play none none reverse"
      }
    });

    gsap.to("#beatFive", {
      autoAlpha: 1,
      scale: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "#section-13",
        containerAnimation: masterTween,
        start: "left 58%",
        end: "center center",
        scrub: true
      }
    });

    gsap.to(".cover-shot:first-child", {
      xPercent: -14,
      yPercent: -10,
      rotate: -1.5,
      ease: "none",
      scrollTrigger: {
        trigger: "#section-17",
        containerAnimation: masterTween,
        start: "left right",
        end: "right left",
        scrub: true
      }
    });

    gsap.to(".cover-shot:last-child", {
      xPercent: 14,
      yPercent: 12,
      rotate: 1.6,
      ease: "none",
      scrollTrigger: {
        trigger: "#section-17",
        containerAnimation: masterTween,
        start: "left right",
        end: "right left",
        scrub: true
      }
    });

    ScrollTrigger.refresh();
  };

  jumpButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = Number(btn.dataset.targetIndex || 0);
      jumpToPanel(target);
      if (body.classList.contains("menu-open")) closeMenu();
    });
  });

  menuToggle?.addEventListener("click", openMenu);
  menuClose?.addEventListener("click", closeMenu);
  menuScrim?.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.classList.contains("menu-open")) closeMenu();
  });

  mediaQueryReduce.addEventListener("change", (event) => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      body.classList.add("reduced-motion");
    } else {
      body.classList.remove("reduced-motion");
    }
    initHorizontal();
  });

  window.addEventListener("resize", () => {
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  });

  setupImageFallbacks();
  setupListenCards();
  setActiveChapter(0);
  initHorizontal();
})();
