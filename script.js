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

  const railItems = Array.from(document.querySelectorAll(".rail-item"));
  const drawerLinks = Array.from(document.querySelectorAll(".drawer-link"));
  const jumpLinks = [...railItems, ...drawerLinks];

  const headings = Array.from(document.querySelectorAll(".anim-heading"));
  const cards = Array.from(document.querySelectorAll(".anim-card"));
  const lines = Array.from(document.querySelectorAll(".anim-line"));
  const mediaLayers = Array.from(document.querySelectorAll(".panel-media"));
  const parallaxItems = Array.from(document.querySelectorAll(".parallax-soft"));
  const tickFive = document.getElementById("tickFive");
  const images = Array.from(document.querySelectorAll("img"));

  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = reduceQuery.matches;

  let masterTween = null;
  let masterTrigger = null;
  let drawerTween = null;
  let observer = null;
  let lenis = null;
  let lenisTicker = null;

  const chapterFromIndex = (index) => {
    if (index <= 1) return "intro";
    if (index <= 7) return "good-morning";
    if (index <= 14) return "take-five";
    if (index === 15) return "reflection";
    return "sources";
  };

  const setActiveNav = (index) => {
    const chapter = chapterFromIndex(index);

    railItems.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.chapter === chapter);
    });

    drawerLinks.forEach((btn) => {
      btn.classList.toggle("is-current", Number(btn.dataset.targetIndex) === index);
    });
  };

  const distanceX = () => Math.max(0, track.scrollWidth - window.innerWidth);

  const snapPoints = () => {
    const distance = distanceX() || 1;
    return panels.map((panel) => Math.min(1, panel.offsetLeft / distance));
  };

  const indexFromProgress = (progress) => {
    const points = snapPoints();
    let match = 0;

    points.forEach((point, idx) => {
      if (progress + 0.001 >= point) {
        match = idx;
      }
    });

    return match;
  };

  const clampIndex = (idx) => Math.max(0, Math.min(panels.length - 1, idx));

  const jumpToPanel = (rawIdx) => {
    const idx = clampIndex(Number(rawIdx));
    if (Number.isNaN(idx)) return;

    if (reducedMotion || !masterTrigger) {
      panels[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const points = snapPoints();
    const progress = points[idx] ?? 0;
    const y = masterTrigger.start + (masterTrigger.end - masterTrigger.start) * progress;

    if (lenis) {
      lenis.scrollTo(y, { immediate: false, duration: 1.05 });
    } else {
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const openMenu = () => {
    body.classList.add("menu-open");
    menuToggle?.setAttribute("aria-expanded", "true");

    if (menuScrim) {
      menuScrim.hidden = false;
    }

    if (window.gsap && !reducedMotion) {
      if (drawerTween) drawerTween.kill();

      window.gsap.set(drawerLinks, { y: 20, autoAlpha: 0 });
      drawerTween = window.gsap.to(drawerLinks, {
        y: 0,
        autoAlpha: 1,
        duration: 0.55,
        stagger: 0.05,
        ease: "power3.out",
        delay: 0.16
      });
    } else {
      drawerLinks.forEach((link) => {
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

  const setupImageFallbacks = () => {
    images.forEach((img) => {
      img.addEventListener(
        "error",
        () => {
          const holder = img.closest(".hero-figure, .panel-figure");
          if (holder) {
            holder.style.background = "linear-gradient(140deg, rgba(255,255,255,0.22), rgba(11,11,18,0.35))";
            holder.style.minHeight = "220px";
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
    if (
      reducedMotion ||
      body.dataset.lenis === "off" ||
      !window.Lenis ||
      !window.gsap ||
      !window.ScrollTrigger
    ) {
      killLenis();
      return;
    }

    killLenis();

    try {
      lenis = new window.Lenis({
        duration: 1.05,
        lerp: 0.11,
        wheelMultiplier: 1,
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
    } catch (_error) {
      killLenis();
    }
  };

  const setupVerticalObserver = () => {
    if (observer) {
      observer.disconnect();
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.index || "0");
            setActiveNav(idx);
          }
        });
      },
      {
        threshold: 0.58
      }
    );

    panels.forEach((panel) => observer.observe(panel));
  };

  const killHorizontal = () => {
    if (!window.ScrollTrigger || !window.gsap) return;

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

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    gsap.registerPlugin(ScrollTrigger);
    killHorizontal();

    masterTween = gsap.to(track, {
      x: () => -distanceX(),
      ease: "none",
      scrollTrigger: {
        id: "horizontal-master",
        trigger: shell,
        start: "top top",
        end: () => `+=${distanceX()}`,
        pin: true,
        scrub: 0.85,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        snap: {
          snapTo: (value) => gsap.utils.snap(snapPoints(), value),
          duration: { min: 0.2, max: 0.58 },
          ease: "power1.inOut",
          inertia: false
        },
        onUpdate: (self) => {
          setActiveNav(indexFromProgress(self.progress));
        }
      }
    });

    masterTrigger = masterTween.scrollTrigger;
    initLenis();

    headings.forEach((heading) => {
      gsap.from(heading, {
        x: 64,
        autoAlpha: 0,
        duration: 0.8,
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
        y: 30,
        autoAlpha: 0,
        duration: 0.72,
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
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: line.closest(".panel"),
          containerAnimation: masterTween,
          start: "left 70%",
          toggleActions: "play none none reverse"
        }
      });
    });

    mediaLayers.forEach((media, idx) => {
      gsap.fromTo(
        media,
        { xPercent: 0, scale: 1.02 },
        {
          xPercent: idx % 2 ? 10 : -10,
          scale: 1.11,
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
        { yPercent: idx % 2 ? 0 : -4 },
        {
          yPercent: idx % 2 ? -16 : 12,
          xPercent: idx % 2 ? 5 : -5,
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

    if (tickFive) {
      gsap.to(tickFive, {
        autoAlpha: 1,
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: "#section-12",
          containerAnimation: masterTween,
          start: "left 56%",
          end: "center center",
          scrub: true
        }
      });
    }

    ScrollTrigger.refresh();
  };

  jumpLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.targetIndex || "0");
      jumpToPanel(idx);
      if (body.classList.contains("menu-open")) closeMenu();
    });
  });

  menuToggle?.addEventListener("click", openMenu);
  menuClose?.addEventListener("click", closeMenu);
  menuScrim?.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.classList.contains("menu-open")) {
      closeMenu();
    }
  });

  const onMotionChange = (event) => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      body.classList.add("reduced-motion");
    } else {
      body.classList.remove("reduced-motion");
    }
    initHorizontal();
  };

  if (typeof reduceQuery.addEventListener === "function") {
    reduceQuery.addEventListener("change", onMotionChange);
  } else if (typeof reduceQuery.addListener === "function") {
    reduceQuery.addListener(onMotionChange);
  }

  window.addEventListener("resize", () => {
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  });

  window.addEventListener("load", () => {
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  });

  setupImageFallbacks();
  setActiveNav(0);
  initHorizontal();
})();
