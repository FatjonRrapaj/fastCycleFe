import "./styles.css";
import { initNav, initReveals } from "./nav";
import { mountAllPhoneDemos } from "./demos/phone-embed";
import { initDemoModal } from "./demos/demo-modal";

initNav();
initReveals();
mountAllPhoneDemos();
initDemoModal();
