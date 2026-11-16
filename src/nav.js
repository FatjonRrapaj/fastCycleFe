export function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelectorAll(".nav-links a");

  if (!toggle) return;

  const setOpen = (open) => {
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "site-menu");

  const menu = document.querySelector(".nav-links");
  if (menu && !menu.id) menu.id = "site-menu";

  toggle.addEventListener("click", () => {
    setOpen(!document.body.classList.contains("nav-open"));
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      setOpen(false);
    });

    const path = window.location.pathname.replace(/\/$/, "") || "/";
    const href = link.getAttribute("href");
    if (!href) return;

    const normalized =
      href === "/" ? "/" : href.replace(/^\//, "").replace(/\.html$/, "");
    const current =
      path === "/" || path.endsWith("/index.html")
        ? "/"
        : path.split("/").pop().replace(/\.html$/, "");

    if (
      (normalized === "/" && current === "/") ||
      (normalized !== "/" && current === normalized)
    ) {
      link.classList.add("is-active");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

export function initReveals() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const reveal = (el) => {
    el.classList.add("is-in");
  };

  // Eager: anything already near / in the first screen must show immediately.
  // Mobile + Lenis was leaving Notes cards at opacity:0 until 2–3 extra scrolls.
  const eagerBottom = window.innerHeight * 1.35;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: [0, 0.01, 0.08],
      // Prefetch reveals before they enter — no more “scroll twice” blank cards
      rootMargin: "28% 0px 40% 0px",
    }
  );

  items.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (
      rect.height > window.innerHeight * 0.75 ||
      rect.top < eagerBottom
    ) {
      reveal(el);
      return;
    }
    observer.observe(el);
  });
}
