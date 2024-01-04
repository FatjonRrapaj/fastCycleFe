gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(Observer);

//SVG DRAWING
let timeline = gsap.timeline({
  paused: true,
  scrollTrigger: {
    trigger: ".container",
    start: "-0.5% 0",
    end: "40% top",
    ease: "power2.out",
    scrub: 3,
  },
});
timeline.to(".line", {
  strokeDashoffset: 0,
  visibility: "visible",
  duration: 70,
});
timeline.to(".square", {
  strokeDashoffset: 0,
  duration: 70,
});
timeline.to(".circle", {
  strokeDashoffset: 0,
  duration: 70,
});
timeline.to(".drone", {
  strokeDashoffset: 0,
  duration: 300,
  ease: "power4.out",
  stagger: 10,
});

//SNAPPING
let sections = gsap.utils.toArray(".section");
gsap.to(sections, {
  yPercent: -100 * (sections.length - 1),
  ease: "none",
  scrollTrigger: {
    trigger: ".container",
    scrub: 0.2,
    pin: true,
    snap: {
      onStart: () => disableScroll(),
      onSnapComplete: () => enableScroll(),
      snapTo: 1 / (sections.length - 1),
      duration: { min: 0.7, max: 1 },
      inertia: true,
    },
    end: () => "+=" + document.querySelector(".container").offsetHeight,
  },
});

//LENIS
const lenis = new Lenis();
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
