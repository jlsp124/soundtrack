(() => {
  const html = document.documentElement;
  const body = document.body;
  html.classList.remove("no-js");

  const shell = document.getElementById("horizontalShell");
  const track = document.getElementById("horizontalTrack");
  const sections = Array.from(document.querySelectorAll(".panel"));

  const menuToggle = document.getElementById("menuToggle");
  const menuClose = document.getElementById("menuClose");
  const menuPanel = document.getElementById("menuPanel");
  const menuScrim = document.getElementById("menuScrim");
  const imageNodes = Array.from(document.querySelectorAll("img"));

  const railLinks = Array.from(document.querySelectorAll(".rail-link"));
  const menuLinks = Array.from(document.querySelectorAll(".menu-link"));
  const jumpButtons = Array.from(document.querySelectorAll("[data-target-index]"));

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  imageNodes.forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        const visualHost = img.closest(".visual-quote, .cover-item");
        if (visualHost) {
          visualHost.classList.add("asset-fallback");
        }

        const lineHost = img.closest(".transition-lines");
        if (lineHost) {
          lineHost.classList.add("line-fallback");
        }

        const railHost = img.closest(".rail-button");
        if (railHost && !railHost.querySelector(".icon-fallback")) {
          railHost.textContent = "";
          const fallback = document.createElement("span");
          fallback.className = "icon-fallback";
          fallback.setAttribute("aria-hidden", "true");
          fallback.textContent = "+";
          railHost.appendChild(fallback);
        }

        const cueHost = img.closest(".scroll-cue");
        if (cueHost) {
          cueHost.classList.add("wave-fallback");
          if (!cueHost.querySelector(".wave-text")) {
            cueHost.textContent = "";
            const cueText = document.createElement("span");
            cueText.className = "wave-text";
            cueText.textContent = "SCROLL";
            cueHost.appendChild(cueText);
          }
        }

        img.style.display = "none";
      },
      { once: true }
    );
  });

  if (reducedMotion) {
    body.classList.add("reduced-motion");
  }

  let masterTween = null;
  let masterTrigger = null;
  let menuStagger = null;
  let verticalObserver = null;

  const chapterByIndex = (index) => {
    if (index <= 7) return "good-morning";
    if (index <= 13) return "take-five";
    if (index === 14) return "reflection";
    return "sources";
  };

  const setActiveState = (index) => {
    const chapter = chapterByIndex(index);

    railLinks.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.chapter === chapter);
    });

    menuLinks.forEach((button) => {
      const target = Number(button.dataset.targetIndex);
      button.classList.toggle("is-current", target === index);
    });
  };

  const clampIndex = (index) => Math.min(sections.length - 1, Math.max(0, index));

  const jumpToSection = (rawIndex) => {
    const index = clampIndex(Number(rawIndex));

    if (Number.isNaN(index)) return;

    if (reducedMotion || !masterTrigger) {
      sections[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const progress = index / (sections.length - 1);
    const y = masterTrigger.start + (masterTrigger.end - masterTrigger.start) * progress;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const openMenu = () => {
    body.classList.add("menu-open");
    menuToggle?.setAttribute("aria-expanded", "true");
    if (menuScrim) menuScrim.hidden = false;

    if (window.gsap && !reducedMotion) {
      if (menuStagger) menuStagger.kill();
      window.gsap.set(menuLinks, { y: 22, autoAlpha: 0 });
      menuStagger = window.gsap.to(menuLinks, {
        y: 0,
        autoAlpha: 1,
        duration: 0.56,
        ease: "power3.out",
        stagger: 0.05,
        delay: 0.16
      });
    } else {
      menuLinks.forEach((button) => {
        button.style.opacity = "1";
        button.style.transform = "translateY(0)";
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

  const setupVerticalObserver = () => {
    if (verticalObserver) {
      verticalObserver.disconnect();
    }

    verticalObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.dataset.index || "0");
            setActiveState(index);
          }
        });
      },
      {
        threshold: 0.58
      }
    );

    sections.forEach((section) => verticalObserver.observe(section));
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
      setupVerticalObserver();
      return;
    }

    body.classList.remove("reduced-motion");

    if (verticalObserver) {
      verticalObserver.disconnect();
      verticalObserver = null;
    }

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

    masterTween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        id: "master-horizontal",
        trigger: shell,
        start: "top top",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.95,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const current = Math.round(self.progress * (sections.length - 1));
          setActiveState(current);
        }
      }
    });

    masterTrigger = masterTween.scrollTrigger;

    gsap.to(".scroll-cue", {
      y: 8,
      duration: 1.4,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });

    gsap.fromTo(
      ".hero-media",
      { xPercent: 0, scale: 1.02 },
      {
        xPercent: -16,
        scale: 1.15,
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

    gsap.utils.toArray(".panel-media").forEach((media, index) => {
      if (media.classList.contains("hero-media")) return;
      gsap.to(media, {
        xPercent: index % 2 ? 9 : -9,
        scale: 1.1,
        ease: "none",
        scrollTrigger: {
          trigger: media.closest(".panel"),
          containerAnimation: masterTween,
          start: "left right",
          end: "right left",
          scrub: true
        }
      });
    });

    gsap.fromTo(
      "#gmMainWord",
      { xPercent: 36, scale: 1.15 },
      {
        xPercent: 0,
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: "#section-2",
          containerAnimation: masterTween,
          start: "left 86%",
          end: "center center",
          scrub: true
        }
      }
    );

    gsap.to("#gmMainWord", {
      scale: 0.45,
      xPercent: -55,
      yPercent: -40,
      transformOrigin: "left top",
      ease: "none",
      scrollTrigger: {
        trigger: "#section-2",
        containerAnimation: masterTween,
        start: "center center",
        end: "right center",
        scrub: true
      }
    });

    gsap.fromTo(
      "#gmCorner",
      { autoAlpha: 0, y: 20 },
      {
        autoAlpha: 1,
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: "#section-2",
          containerAnimation: masterTween,
          start: "center center",
          end: "right center",
          scrub: true
        }
      }
    );

    gsap.fromTo(
      "#tfMainWord",
      { xPercent: 24, scale: 1.1 },
      {
        xPercent: 0,
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: "#section-8",
          containerAnimation: masterTween,
          start: "left 90%",
          end: "center center",
          scrub: true
        }
      }
    );

    gsap.to("#tfMainWord", {
      scale: 0.48,
      xPercent: -48,
      yPercent: -35,
      transformOrigin: "left top",
      ease: "none",
      scrollTrigger: {
        trigger: "#section-8",
        containerAnimation: masterTween,
        start: "center 58%",
        end: "right 42%",
        scrub: true
      }
    });

    gsap.fromTo(
      "#tfCorner",
      { autoAlpha: 0, y: 16 },
      {
        autoAlpha: 1,
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: "#section-8",
          containerAnimation: masterTween,
          start: "center center",
          end: "right center",
          scrub: true
        }
      }
    );

    gsap.utils.toArray(".morph-line").forEach((line) => {
      gsap.from(line, {
        clipPath: "inset(0 100% 0 0)",
        x: 44,
        scaleX: 1.06,
        autoAlpha: 0,
        duration: 1.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: line.closest(".panel"),
          containerAnimation: masterTween,
          start: "left 74%",
          toggleActions: "play none none reverse"
        }
      });
    });

    gsap.utils.toArray(".text-card, .text-block, .resource-copy").forEach((block) => {
      gsap.from(block, {
        y: 40,
        autoAlpha: 0,
        duration: 0.78,
        ease: "power2.out",
        scrollTrigger: {
          trigger: block.closest(".panel"),
          containerAnimation: masterTween,
          start: "left 76%",
          toggleActions: "play none none reverse"
        }
      });
    });

    gsap.from(".line-left", {
      xPercent: -120,
      autoAlpha: 0,
      duration: 1.18,
      ease: "power3.out",
      scrollTrigger: {
        trigger: "#section-7",
        containerAnimation: masterTween,
        start: "left 68%",
        toggleActions: "play none none reverse"
      }
    });

    gsap.from(".line-right", {
      xPercent: 120,
      autoAlpha: 0,
      duration: 1.18,
      ease: "power3.out",
      scrollTrigger: {
        trigger: "#section-7",
        containerAnimation: masterTween,
        start: "left 68%",
        toggleActions: "play none none reverse"
      }
    });

    gsap.from(".transition-stats .stat", {
      y: 24,
      autoAlpha: 0,
      duration: 0.72,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: "#section-7",
        containerAnimation: masterTween,
        start: "left 64%",
        toggleActions: "play none none reverse"
      }
    });

    gsap.to("#beatFive", {
      autoAlpha: 1,
      scale: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "#section-11",
        containerAnimation: masterTween,
        start: "left 56%",
        end: "center center",
        scrub: true
      }
    });

    gsap.to(".cover-a", {
      xPercent: -15,
      yPercent: -12,
      rotate: -2,
      ease: "none",
      scrollTrigger: {
        trigger: "#section-15",
        containerAnimation: masterTween,
        start: "left right",
        end: "right left",
        scrub: true
      }
    });

    gsap.to(".cover-b", {
      xPercent: 15,
      yPercent: 13,
      rotate: 2,
      ease: "none",
      scrollTrigger: {
        trigger: "#section-15",
        containerAnimation: masterTween,
        start: "left right",
        end: "right left",
        scrub: true
      }
    });

    ScrollTrigger.refresh();
  };

  jumpButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = Number(button.dataset.targetIndex || "0");
      jumpToSection(target);
      if (body.classList.contains("menu-open")) {
        closeMenu();
      }
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

  motionQuery.addEventListener("change", (event) => {
    reducedMotion = event.matches;

    if (reducedMotion) {
      body.classList.add("reduced-motion");
      killHorizontal();
      setupVerticalObserver();
    } else {
      body.classList.remove("reduced-motion");
      initHorizontal();
    }
  });

  setActiveState(0);
  initHorizontal();
})();

