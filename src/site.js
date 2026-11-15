import "./styles.css";
import { initNav, initReveals } from "./nav";
import { mountAllPhoneDemos } from "./demos/phone-embed";
import { initDemoModal } from "./demos/demo-modal";
import { mountFooterMark } from "./footer-mark";

document.documentElement.classList.add("is-booted");
document.body.classList.add("is-booted");

initNav();
initReveals();
mountAllPhoneDemos();
initDemoModal();
mountFooterMark();

// Warm decode so skill/project images aren't blank after back/forward.
requestAnimationFrame(() => {
  [...document.images].forEach((img) => {
    if (img.decode) img.decode().catch(() => {});
    if (!img.complete && img.src) {
      const warm = new Image();
      warm.src = img.currentSrc || img.src;
    }
  });
});
