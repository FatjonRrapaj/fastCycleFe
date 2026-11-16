export function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelectorAll(".nav-links a");

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    document.body.classList.toggle("nav-open");
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
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
}

export function initReveals() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );

  items.forEach((el) => {
    // Tall blocks (full lesson bodies) never reach threshold 0.18 in one
    // viewport — show them immediately instead of leaving opacity: 0 forever.
    if (el.getBoundingClientRect().height > window.innerHeight * 0.85) {
      el.classList.add("is-in");
      return;
    }
    observer.observe(el);
  });
}
