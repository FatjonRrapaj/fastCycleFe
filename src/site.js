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
