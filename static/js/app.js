(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const hasGsap = !!window.gsap;
  const hasScrollTrigger = hasGsap && !!window.ScrollTrigger;

  if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* Shared scrolling flag: heavy effects pause while the user scrolls */
  let isScrolling = false;
  let scrollTimer = 0;
  window.addEventListener(
    "scroll",
    () => {
      isScrolling = true;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        isScrolling = false;
      }, 150);
    },
    { passive: true }
  );

  /* Preloader + hero entrance */
  const hideLoader = () => {
    const loader = $("#loader");
    if (!loader || loader.dataset.done) return;
    loader.dataset.done = "1";

    if (hasGsap && !reduce) {
      gsap
        .timeline()
        .to(loader, {
          opacity: 0,
          duration: 0.45,
          onComplete: () => loader.remove()
        })
        .from(
          ".ln i",
          { yPercent: 110, duration: 0.8, stagger: 0.08, ease: "power3.out" },
          "-=.15"
        )
        .from(
          ".hi,.role,.lead,.btns",
          { y: 18, opacity: 0, stagger: 0.1, duration: 0.55 },
          "-=.5"
        )
        .from(
          ".scene",
          { scale: 0.92, opacity: 0, duration: 0.8, ease: "power2.out" },
          "-=.7"
        );
    } else {
      loader.remove();
    }
  };

  window.addEventListener("load", () => window.setTimeout(hideLoader, 500), {
    once: true
  });
  window.setTimeout(hideLoader, 2500);

  /* Navigation (throttled with requestAnimationFrame) */
  const nav = $("#nav");
  const burger = $("#burger");
  const menu = $("#menu");

  let navTicking = false;
  const updateNav = () => {
    navTicking = false;
    if (nav) nav.classList.toggle("sc", window.scrollY > 30);
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!navTicking) {
        navTicking = true;
        window.requestAnimationFrame(updateNav);
      }
    },
    { passive: true }
  );
  updateNav();

  if (burger && menu) {
    burger.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    $$("#menu a").forEach(link => {
      link.addEventListener("click", () => {
        menu.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  const links = $$("#menu a");
  if ("IntersectionObserver" in window && links.length) {
    const spy = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          links.forEach(link => {
            link.classList.toggle(
              "on",
              link.getAttribute("href") === `#${entry.target.id}`
            );
          });
        });
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );

    [
      "home",
      "about",
      "skills",
      "projects",
      "education",
      "certificates",
      "contact"
    ].forEach(id => {
      const section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }

  /* Native browser scrolling */
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const target = $(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start"
      });
    });
  });

  const topButton = $("#top");
  if (topButton) {
    topButton.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  /* Typing effect */
  const roles = ["Software Developer", "AI/ML Engineer", "Problem Solver"];
  const typeElement = $("#type");

  if (typeElement) {
    if (reduce) {
      typeElement.textContent = roles[0];
    } else {
      let roleIndex = 0;
      let charIndex = 0;
      let deleting = false;

      const typeTick = () => {
        const current = roles[roleIndex];
        typeElement.textContent = current.slice(0, charIndex);

        if (!deleting && charIndex === current.length) {
          deleting = true;
          window.setTimeout(typeTick, 1400);
          return;
        }

        if (deleting && charIndex === 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
        }

        charIndex += deleting ? -1 : 1;
        window.setTimeout(typeTick, deleting ? 38 : 75);
      };

      typeTick();
    }
  }

  /* Lightweight particle background (pauses while scrolling) */
  const canvas = $("#fx");

  if (canvas) {
    const context = canvas.getContext("2d", { alpha: true });

    if (context) {
      let width = 0;
      let height = 0;
      let particles = [];
      let animationFrame = 0;
      let lastFrameTime = 0;
      let pointerX = -10000;
      let pointerY = -10000;
      const glow = $(".glow");

      const frameInterval = 1000 / 24;
      const connectionDistance = 100;
      const connectionDistanceSq = connectionDistance * connectionDistance;

      const drawParticles = moveParticles => {
        context.clearRect(0, 0, width, height);

        if (moveParticles) {
          for (const particle of particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > height) particle.vy *= -1;
          }
        }

        context.lineWidth = 0.7;

        for (let i = 0; i < particles.length; i++) {
          const a = particles[i];

          for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < connectionDistanceSq) {
              const alpha =
                0.12 * (1 - Math.sqrt(distanceSq) / connectionDistance);
              context.strokeStyle = `rgba(139,92,246,${alpha})`;
              context.beginPath();
              context.moveTo(a.x, a.y);
              context.lineTo(b.x, b.y);
              context.stroke();
            }
          }
        }

        context.fillStyle = "rgba(53,205,235,0.48)";

        for (const particle of particles) {
          context.beginPath();
          context.arc(particle.x, particle.y, 1.35, 0, Math.PI * 2);
          context.fill();
        }

        if (fine && glow && pointerX > -1000) {
          const dx = pointerX - width / 2;
          const dy = pointerY - height / 2;
          glow.style.transform = `translate3d(${dx}px,${dy}px,0)`;
          glow.style.opacity = "0.75";
        }
      };

      const resizeCanvas = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1);
        width = window.innerWidth;
        height = window.innerHeight;

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = width < 600 ? 12 : width < 1000 ? 16 : 22;

        particles = Array.from({ length: count }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.32,
          vy: (Math.random() - 0.5) * 0.32
        }));

        drawParticles(false);
      };

      const animateParticles = timestamp => {
        animationFrame = 0;
        if (document.hidden) return;

        if (!isScrolling && timestamp - lastFrameTime >= frameInterval) {
          lastFrameTime = timestamp;
          drawParticles(true);
        }

        animationFrame = window.requestAnimationFrame(animateParticles);
      };

      const startParticles = () => {
        if (reduce || document.hidden || animationFrame) return;
        lastFrameTime = 0;
        animationFrame = window.requestAnimationFrame(animateParticles);
      };

      const stopParticles = () => {
        if (animationFrame) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
      };

      resizeCanvas();

      let resizeTimer = 0;
      window.addEventListener(
        "resize",
        () => {
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(resizeCanvas, 150);
        },
        { passive: true }
      );

      if (fine) {
        window.addEventListener(
          "pointermove",
          event => {
            pointerX = event.clientX;
            pointerY = event.clientY;
          },
          { passive: true }
        );
      }

      if (reduce) {
        drawParticles(false);
      } else {
        startParticles();

        document.addEventListener("visibilitychange", () => {
          if (document.hidden) stopParticles();
          else startParticles();
        });
      }
    }
  }

  /* Card tilt */
  if (fine && !reduce) {
    $$(".tilt").forEach(element => {
      let rect;

      element.addEventListener(
        "pointerenter",
        () => {
          rect = element.getBoundingClientRect();
        },
        { passive: true }
      );

      element.addEventListener(
        "pointermove",
        event => {
          if (isScrolling) return;
          if (!rect) rect = element.getBoundingClientRect();

          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;

          element.style.transform = `perspective(800px) rotateY(${
            x * 5
          }deg) rotateX(${-y * 5}deg)`;
        },
        { passive: true }
      );

      element.addEventListener("pointerleave", () => {
        rect = null;
        element.style.transform = "";
      });
    });
  }

  /* Scroll reveal animations */
  if (hasScrollTrigger && !reduce) {
    gsap.utils.toArray("h2").forEach(heading => {
      gsap.from(heading, {
        y: 24,
        opacity: 0,
        duration: 0.55,
        ease: "power2.out",
        scrollTrigger: { trigger: heading, start: "top 90%", once: true }
      });
    });

    [
      [".sk-card", "#skills"],
      [".lang", "#education"],
      [".cert", "#certificates"],
      [".pj article", "#projects"],
      [".chips span", "#explore"]
    ].forEach(([selector, trigger]) => {
      if (!$(trigger) || !$(selector)) return;

      gsap.from(selector, {
        y: 24,
        opacity: 0,
        duration: 0.5,
        stagger: 0.07,
        ease: "power2.out",
        scrollTrigger: { trigger, start: "top 82%", once: true }
      });
    });

    if ($("#about .cards .g") && $("#about")) {
      gsap.from("#about .cards .g", {
        y: 24,
        opacity: 0,
        duration: 0.5,
        stagger: 0.07,
        scrollTrigger: { trigger: "#about", start: "top 82%", once: true }
      });
    }

    if ($("#about .txt p") && $("#about")) {
      gsap.from("#about .txt p", {
        y: 18,
        opacity: 0,
        stagger: 0.08,
        duration: 0.45,
        scrollTrigger: { trigger: "#about", start: "top 82%", once: true }
      });
    }

    if ($(".line") && $("#education")) {
      gsap.from(".line", {
        scaleY: 0,
        duration: 0.7,
        scrollTrigger: { trigger: "#education", start: "top 82%", once: true }
      });
    }

    if ($(".tl-i") && $("#education")) {
      gsap.from(".tl-i", {
        x: 24,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        scrollTrigger: { trigger: "#education", start: "top 82%", once: true }
      });
    }

    if ($("#contact .two > *") && $("#contact")) {
      gsap.from("#contact .two > *", {
        y: 24,
        opacity: 0,
        stagger: 0.1,
        duration: 0.5,
        scrollTrigger: { trigger: "#contact", start: "top 85%", once: true }
      });
    }

    $$("[data-n]").forEach(element => {
      const counter = { value: 0 };

      gsap.to(counter, {
        value: Number(element.dataset.n) || 0,
        duration: 1,
        ease: "power1.out",
        onUpdate: () => {
          element.textContent = Math.round(counter.value);
        },
        scrollTrigger: { trigger: element, start: "top 90%", once: true }
      });
    });
  } else {
    $$("[data-n]").forEach(element => {
      element.textContent = element.dataset.n;
    });
  }

  /* Contact form (email is the only required field) */
  const form = $("#form");
  const status = $("#status");
  const sendButton = $("#send");

  if (form && status && sendButton) {
    form.addEventListener("submit", async event => {
      event.preventDefault();

      const emailValue = (form.elements["email"]?.value || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(emailValue)) {
        status.className = "err";
        status.textContent = "Please enter a valid email address.";
        return;
      }

      status.className = "";
      status.textContent = "";
      sendButton.disabled = true;
      sendButton.textContent = "Sending…";

      try {
        // Drop empty fields so only the email is required
        const payload = Object.fromEntries(
          [...new FormData(form)].filter(([, v]) => String(v).trim() !== "")
        );

        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            Array.isArray(result.detail)
              ? "Please enter a valid email address."
              : result.detail
          );
        }

        status.className = "ok";
        status.textContent = result.detail;
        form.reset();
      } catch (error) {
        status.className = "err";
        status.textContent =
          error.message || "Could not send. Please email me directly.";
      } finally {
        sendButton.disabled = false;
        sendButton.textContent = "Send message";
      }
    });
  }

  /* Visitor counter */
  fetch("/api/visit", { method: "POST" })
    .then(response => response.json())
    .then(data => {
      const visits = $("#visits");
      if (visits && data.visits != null) {
        visits.textContent = data.visits;
      }
    })
    .catch(() => {});

  /* Project filters */
  const filterButtons = $$(".fb");
  const projectCards = $$(".pj article");

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      filterButtons.forEach(item => {
        item.classList.toggle("on", item === button);
      });

      projectCards.forEach(card => {
        const show =
          button.dataset.f === "all" || card.dataset.t === button.dataset.f;

        card.hidden = !show;

        if (show && hasGsap && !reduce) {
          gsap.fromTo(
            card,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.3, overwrite: true }
          );
        }
      });
    });
  });

  /* Certificate file check */
  fetch("assets/certificates/cyber-awareness-certificate.pdf", {
    method: "HEAD"
  })
    .then(response => {
      const note = $("#cnote");
      if (!response.ok && note) note.hidden = false;
    })
    .catch(() => {
      const note = $("#cnote");
      if (note) note.hidden = false;
    });

  /* Skill bars */
  const skillsSection = $("#skills");

  if (skillsSection) {
    $$("#skills .bar-s i b").forEach((bar, index) => {
      bar.style.setProperty("--d", (reduce ? 0 : index * 0.1) + "s");
    });

    const fillBars = () => {
      skillsSection.classList.add("bars-on");
    };

    if (reduce || !("IntersectionObserver" in window)) {
      fillBars();
    } else {
      const observer = new IntersectionObserver(
        entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            fillBars();
            observer.disconnect();
          }
        },
        { rootMargin: "0px 0px -10% 0px" }
      );

      observer.observe(skillsSection);
    }
  }

  /* Refresh ScrollTrigger after page load */
  if (hasScrollTrigger) {
    window.addEventListener("load", () => ScrollTrigger.refresh(), {
      once: true
    });
  }
})();