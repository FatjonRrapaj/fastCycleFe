import { gsap } from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Observer } from "gsap/Observer";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(ScrollTrigger, Observer, MotionPathPlugin);

//OBSERVING W Blocked SCROLLING
const svgParts = [
  { class: ".line", length: 522, stagger: false, duration: 1 },
  { class: ".square", length: 2488, stagger: false, duration: 1 },
  { class: ".dronePlaceholder", length: 999, stagger: 0.3, duration: 1 },
  { class: ".droneSketch", length: 2630.2, stagger: false, duration: 3 },
];

let sections = document.querySelectorAll(".section");
let outerWrappers = gsap.utils.toArray(".outer");
let headings = gsap.utils.toArray(".section-heading");

let splitHeadings = headings.map(
  (heading) =>
    new SplitType(heading, {
      type: "chars,words,lines",
      linesClass: "clip-text",
    })
);

console.log("splitHeadings: ", splitHeadings);

let wrap = gsap.utils.wrap(0, sections.length);
let currentIndex = -1;
let animating = false;

function gotoSection(index, direction) {
  console.log("direction: ", direction);
  animating = true;
  let fromTop = direction === 1;
  let dFactor = fromTop ? -1 : 1;
  let tl = gsap.timeline({
    defaults: { ease: "power1.out" },
    onComplete: () => {
      animating = false;
    },
  });
  if (currentIndex >= 0) {
    gsap.set(sections[currentIndex], {
      autoAlpha: 0,
    });
    tl.set(sections[currentIndex], {
      autoAlpha: 0,
    });
  }
  gsap.set(sections[index], { autoAlpha: 1, zIndex: 1 });
  const svgPartsIndex = direction === 1 ? index : index + 1;
  tl.fromTo(
    [outerWrappers[index]],
    {
      yPercent: (i) => (i ? 100 * dFactor : -100 * dFactor),
      duration: 0.7,
    },
    {
      yPercent: 0,
    },
    0
  )
    .to(svgParts[svgPartsIndex].class, {
      strokeDashoffset: direction === 1 ? 0 : svgParts[svgPartsIndex].length,
      duration: svgParts[svgPartsIndex].duration,
      stagger: svgParts[svgPartsIndex].stagger,
    })
    .fromTo(
      splitHeadings[index].chars,
      {
        autoAlpha: 0.1,
        yPercent: 150 * dFactor,
      },
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.5,
        ease: "power1.out",
        stagger: {
          each: 0.02,
          from: "random",
        },
      },
      0.1
    );
  currentIndex = index;
}

Observer.create({
  type: "wheel,touch,pointer",
  wheelSpeed: -1,
  onDown: () =>
    !animating && currentIndex - 1 >= 0 && gotoSection(currentIndex - 1, -1),
  onUp: () =>
    !animating &&
    currentIndex + 1 < sections.length &&
    gotoSection(currentIndex + 1, 1),
  tolerance: 300,
  preventDefault: true,
});

gotoSection(0, 1);

const lenis = new Lenis();
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
