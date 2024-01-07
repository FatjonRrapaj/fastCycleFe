gsap.registerPlugin(ScrollTrigger);
const lenis = new Lenis();
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

let sections = gsap.utils.toArray(".section");

gsap.to(sections, {
  yPercent: -100 * (sections.length - 1),
  ease: "none",
  scrollTrigger: {
    trigger: ".container",
    scrub: 1,
    pin: true,
    snap: 1 / (sections.length - 1),
    end: () => "+=" + document.querySelector(".container").offsetHeight,
  },
});

gsap.to(".line", {
  strokeDashoffset: 0,
  ease: "none",
  scrollTrigger: {
    start: "top center",
    end: "center center",
    trigger: "#s1",
    scrub: true,
  },
});

gsap.to(".square", {
  strokeDashoffset: 0,
  ease: "none",
  scrollTrigger: {
    trigger: "#s2",
    start: "center center",
    end: "bottom center",
    scrub: true,
  },
});
gsap.to(".circle", {
  strokeDashoffset: 0,
  ease: "none",
  duration: 3,
  scrollTrigger: {
    trigger: "#s3",
    scrub: true,
    start: "center center",
    end: "bottom center",
  },
});
gsap.to(".drone", {
  strokeDashoffset: 0,
  ease: "none",
  scrollTrigger: {
    trigger: "#s4",
    scrub: true,
    start: "top center",
    end: "bottom bottom",
    markers: true,
  },
});
