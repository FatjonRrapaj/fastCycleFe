import "./styles.css";
import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import { initNav, initReveals } from "./nav";
import { mountAllPhoneDemos } from "./demos/phone-embed";

gsap.registerPlugin(ScrollTrigger);

initNav();
initReveals();
mountAllPhoneDemos();
initHeroCounters();

function initHeroCounters() {
  const root = document.querySelector(".hero-stats");
  if (!root) return;

  const values = root.querySelectorAll("[data-count]");
  let started = false;

  const animate = () => {
    if (started) return;
    started = true;

    values.forEach((el) => {
      const target = Number(el.dataset.count) || 0;
      const prefix = el.dataset.prefix ?? "+";
      const suffix = el.dataset.suffix ?? "";
      const state = { n: 0 };

      gsap.to(state, {
        n: target,
        duration: 1.45,
        ease: "power2.out",
        delay: 0.12,
        onUpdate: () => {
          el.textContent = `${prefix}${Math.round(state.n)}${suffix}`;
        },
      });
    });
  };

  if (root.classList.contains("is-in")) {
    animate();
    return;
  }

  const observer = new MutationObserver(() => {
    if (root.classList.contains("is-in")) {
      animate();
      observer.disconnect();
    }
  });
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
}

function initSkillsModal(lenis) {
  const trigger = document.querySelector(".skill-marquee");
  if (!trigger || document.querySelector(".skills-modal")) return;

  const skills = [];
  const seen = new Set();
  trigger.querySelectorAll(".skill-marquee__row > .skill-marquee__mover > .skill-marquee__track:first-child li").forEach((li) => {
    const img = li.querySelector("img");
    const label = li.querySelector("span")?.textContent?.trim();
    const src = img?.getAttribute("src");
    if (!label || !src || seen.has(label)) return;
    seen.add(label);
    skills.push({ src, label });
  });
  if (!skills.length) return;

  const dialog = document.createElement("dialog");
  dialog.className = "skills-modal";
  dialog.setAttribute("aria-label", "Full technologies list");
  dialog.innerHTML = `
    <button type="button" class="skills-modal__close" aria-label="Close skills">
      <span aria-hidden="true">×</span>
    </button>
    <ul class="skills-modal__grid">
      ${skills
        .map(
          (s, i) =>
            `<li style="--i:${i}"><img src="${s.src}" alt="" /><span>${s.label}</span></li>`
        )
        .join("")}
    </ul>
  `;
  document.body.appendChild(dialog);

  const closeBtn = dialog.querySelector(".skills-modal__close");
  let lastFocus = null;

  const setScrollLock = (locked) => {
    document.documentElement.classList.toggle("skills-modal-open", locked);
    document.body.classList.toggle("skills-modal-open", locked);
    if (locked) lenis?.stop();
    else lenis?.start();
  };

  const close = () => {
    dialog.classList.remove("is-open");
    if (dialog.open) dialog.close();
    setScrollLock(false);
    lastFocus?.focus?.();
    lastFocus = null;
  };

  const open = () => {
    lastFocus = document.activeElement;
    setScrollLock(true);
    dialog.classList.remove("is-open");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => dialog.classList.add("is-open"));
    });
    closeBtn.focus();
  };

  trigger.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
}

const lenis = new Lenis({
  duration: 1.1,
  smoothWheel: true,
  touchMultiplier: 1.4,
});

initSkillsModal(lenis);

lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

function prepareStroke(el) {
  const length = el.getTotalLength();
  el.style.strokeDasharray = `${length}`;
  el.style.strokeDashoffset = `${length}`;
  return length;
}

function prepareGroup(selector) {
  return gsap.utils.toArray(selector).map((el) => ({
    el,
    length: prepareStroke(el),
  }));
}

const lineParts = prepareGroup(".line");
const squareParts = prepareGroup(".square");
const placeholderParts = prepareGroup(".dronePlaceholder");
const sketchParts = prepareGroup(".droneSketch");
const detailParts = prepareGroup(".droneSketchInnerLines");

// Page start plays these as two beats: every ray, then the frame.
// Later sections keep a pair of beats each.
const markerParts = placeholderParts.slice(0, 4);
const bodyParts = placeholderParts.slice(4);

const svgEl = document.querySelector(".drone-svg");
const threeContainer = document.querySelector(".three-js-container");
const visualStage = document.querySelector(".visual-stage");
const droneStoryTitle = document.querySelector(".drone-story-title");
const droneStorySub = document.querySelector(".drone-story-sub");
const flightHint = document.querySelector(".flight-hint");
const flightHintText = document.querySelector(".flight-hint__text");

const DRONE_STAGES = {
  blank: {
    id: "blank",
    title: "Blank page",
    sub: "Product starts here",
  },
  frame: {
    id: "frame",
    title: "Blank page",
    sub: "Product starts here",
  },
  napkin: {
    id: "napkin",
    title: "Sketch the product",
    sub: "Structure before polish",
  },
  shape: {
    id: "shape",
    title: "Sketch the product",
    sub: "Structure before polish",
  },
  build: {
    id: "build",
    title: "Build the product",
    sub: "Design + engineering",
  },
  lift: {
    id: "lift",
    title: "Build the product",
    sub: "Design + engineering",
  },
  ship: {
    id: "ship",
    title: "Shipped",
    sub: "Live in production",
  },
};

let activeDroneStage = "";

function setDroneStory(stage) {
  if (!stage || stage.id === activeDroneStage) return;
  const prev = DRONE_STAGES[activeDroneStage];
  const sameCopy =
    prev && prev.title === stage.title && prev.sub === stage.sub;
  activeDroneStage = stage.id;
  if (sameCopy) return;
  if (droneStoryTitle) {
    droneStoryTitle.textContent = stage.title;
    droneStoryTitle.classList.remove("is-pop");
    void droneStoryTitle.offsetWidth;
    droneStoryTitle.classList.add("is-pop");
  }
  if (droneStorySub) droneStorySub.textContent = stage.sub;
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
threeContainer.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 3.2);
camera.lookAt(0, 0, 0);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const ambient = new THREE.AmbientLight(0xffffff, 1.45);
const key = new THREE.DirectionalLight(0xffffff, 2.1);
key.position.set(2.2, 3.4, 4.2);
const fill = new THREE.DirectionalLight(0xd8fff8, 1.15);
fill.position.set(-2.5, 1.2, 2);
const rim = new THREE.DirectionalLight(0xffffff, 0.95);
rim.position.set(0, -2.2, -3);
const bounce = new THREE.DirectionalLight(0xb8fff4, 0.7);
bounce.position.set(0, 4.5, -1.5);
scene.add(ambient, key, fill, rim, bounce);

const dronePivot = new THREE.Group();
scene.add(dronePivot);

/** Slight oversize so the 3D silhouette covers the SVG sketch. */
const SKETCH_BOOST = 1.05;

let droneModel = null;
let mixer = null;
let propellerActions = [];
let cameraActions = [];
let propellerAxes = [];
let cameraAxis = null;
let propellersPlaying = false;
const meshRecords = [];

const WIRE_COLOR = 0x9aa8ad;

const droneState = {
  // Matched to the SVG top-down sketch during morph
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  floatY: 0,
  colorT: 0,
  camTilt: 0,
};

let themeLocked = false;
let dockedScale = 1;
let takeoffTimer = null;
let takeoffPending = false;

const STORY_STORAGE_KEY = "fc-drone-story-complete";

function persistStoryComplete() {
  try {
    sessionStorage.setItem(STORY_STORAGE_KEY, "1");
  } catch (_) {
    /* ignore */
  }
}

function wasStoryCompleted() {
  try {
    return sessionStorage.getItem(STORY_STORAGE_KEY) === "1";
  } catch (_) {
    return false;
  }
}

const _flyDesired = new THREE.Vector3();
const _flyQuat = new THREE.Quaternion();
const _flyCross = new THREE.Vector3();
const _flyScreen = new THREE.Vector3();
const _flyRay = new THREE.Vector3();
const _flyWorldUp = new THREE.Vector3(0, 1, 0);
const _flyFacing = new THREE.Vector3();
const _flyRight = new THREE.Vector3();
const _flyPitchQ = new THREE.Quaternion();
const _flyRollQ = new THREE.Quaternion();
const _flyTmp = new THREE.Vector3();
const _flyVel = new THREE.Vector3();

const flight = {
  active: false,
  staged: false,
  holdDock: false,
  mouseBound: false,
  bindDepth: 0,
  pointerX: 0,
  pointerY: 0,
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  dockHeading: new THREE.Vector3(0, 0, 1),
  dockFlat: new THREE.Vector3(0, 0, 1),
  dockQuat: new THREE.Quaternion(),
  dockPos: new THREE.Vector3(),
  dockScale: 1,
  target: new THREE.Vector3(),
  mouseWorld: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  roll: 0,
  yawRate: 0,
  nextTargetAt: 0,
  scale: 1,
  legBoost: 1,
  laneDir: 1,
};

function flightBounds() {
  // Fullscreen canvas — deeper roam, a little past the edges.
  const dist = Math.max(camera.position.z, 0.5);
  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist;
  const aspect = Math.max(camera.aspect || 1, 0.7);
  const pad = 0.95;
  return {
    x: halfH * aspect * pad,
    y: halfH * pad * 0.92,
    zNear: -1.55,
    zFar: 1.75,
  };
}

function capturePivotScreen() {
  dronePivot.updateMatrixWorld(true);
  _flyScreen.copy(dronePivot.position).project(camera);
  const rect = threeContainer.getBoundingClientRect();
  return {
    clientX: (_flyScreen.x * 0.5 + 0.5) * rect.width + rect.left,
    clientY: (-_flyScreen.y * 0.5 + 0.5) * rect.height + rect.top,
    z: dronePivot.position.z,
    quat: dronePivot.quaternion.clone(),
    scale: dronePivot.scale.x,
  };
}

/** Keep the drone on the same pixel after the canvas goes fullscreen. */
function placePivotAtScreen(snap) {
  const rect = threeContainer.getBoundingClientRect();
  const ndcX = ((snap.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
  const ndcY = -(((snap.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
  _flyScreen.set(ndcX, ndcY, 0.5).unproject(camera);
  _flyRay.copy(_flyScreen).sub(camera.position).normalize();
  const t =
    Math.abs(_flyRay.z) > 1e-5
      ? (snap.z - camera.position.z) / _flyRay.z
      : 0;
  dronePivot.position.copy(camera.position).addScaledVector(_flyRay, t);
  dronePivot.position.z = snap.z;
  dronePivot.quaternion.copy(snap.quat);
  dronePivot.scale.setScalar(snap.scale);
}

function setFlightHint(bound) {
  if (!flightHint || !flightHintText) return;
  flightHint.hidden = false;
  flightHint.classList.add("is-on");
  flightHint.classList.toggle("is-bound", !!bound);
  flightHintText.textContent = bound
    ? "Release — let it fly"
    : "Hold — steer the drone";
}

function scheduleTakeoff(delayMs) {
  if (takeoffTimer) clearTimeout(takeoffTimer);
  const launch = () => {
    takeoffTimer = null;
    if (!droneModel) {
      takeoffPending = true;
      return;
    }
    takeoffPending = false;
    startFreeFlight();
  };
  if (delayMs <= 0) {
    launch();
    return;
  }
  takeoffTimer = window.setTimeout(launch, delayMs);
}

function markStoryComplete(options = {}) {
  const immediate = !!options.immediate;
  if (themeLocked) {
    if (immediate && !flight.active && !flight.staged) scheduleTakeoff(0);
    return;
  }
  // Theme only — do not touch layout/pose. Flight starts later on its own.
  themeLocked = true;
  persistStoryComplete();
  applyThemeProgress(1);
  document.body.classList.add("theme-live", "story-complete");
  // Sketch drawing is done — clear it before free-flight.
  if (svgEl) svgEl.style.opacity = "0";
  // Scroll prompt is done once the sketch is fully real.
  document.querySelectorAll(".scroll-hint").forEach((el) => {
    el.hidden = true;
  });
  // Freeze the finished scroll pose (drop idle bob) so takeoff doesn't snap-tilt.
  droneState.rotY = dronePivot.rotation.y;
  droneState.floatY = dronePivot.position.y;
  flight.holdDock = true;

  scheduleTakeoff(immediate ? 0 : 1000);
}

/** Finished scroll attitude — glass tipped toward the viewer. */
function applyFinishedDockPose() {
  droneState.rotX = -1.35;
  droneState.rotY = -0.55;
  droneState.rotZ = 0;
  droneState.floatY = 0.035;
  droneState.camTilt = 0;
  dronePivot.rotation.set(droneState.rotX, droneState.rotY, droneState.rotZ);
  dronePivot.position.set(0, droneState.floatY, 0);
  if (droneModel) matchSketchSize();
}

/** Returning home after a finished story — skip sketch, keep live theme + flight. */
function restoreCompletedStory() {
  if (!wasStoryCompleted()) return false;

  introStarted = true;
  intro.lines = 1;
  intro.frame = 1;
  if (introTl) introTl.kill();

  sectionLocal.forEach((_, i) => {
    sectionLocal[i] = 1;
  });

  applyFinishedDockPose();
  markStoryComplete({ immediate: true });
  if (droneModel) applyColorProgress(1);
  applySectionSequences();
  return true;
}

function pickFlightTarget(t) {
  const b = flightBounds();
  const x0 = flight.pos.x;
  const y0 = flight.pos.y;
  const z0 = flight.pos.z;
  let x = x0;
  let y = y0;
  let z = z0;

  // Keep sweeping the same way until we near an edge — then flip for the next pass.
  if (x0 > b.x * 0.62) flight.laneDir = -1;
  else if (x0 < -b.x * 0.62) flight.laneDir = 1;
  else if (!flight.laneDir) flight.laneDir = Math.random() > 0.5 ? 1 : -1;

  // Mostly long lateral / diagonal passes continuing in laneDir (no mid-pass U-turns).
  const roll = Math.random();
  let mode = "side";
  if (roll < 0.38) mode = "side";
  else if (roll < 0.6) mode = "diagonal";
  else if (roll < 0.72) mode = "approach";
  else if (roll < 0.84) mode = "deep";
  else if (roll < 0.92) mode = "climb";
  else mode = "descend";

  if (mode === "side") {
    x = flight.laneDir * b.x * (0.78 + Math.random() * 0.22);
    y = THREE.MathUtils.clamp(y0 + (Math.random() - 0.5) * 0.18, -b.y * 0.85, b.y * 0.85);
    z = THREE.MathUtils.clamp(z0 + (Math.random() - 0.5) * 0.65, b.zNear * 0.6, b.zFar * 0.85);
    flight.legBoost = 1.35;
  } else if (mode === "diagonal") {
    const ySign =
      Math.abs(y0) > 0.12 ? -Math.sign(y0) : Math.random() > 0.5 ? 1 : -1;
    x = flight.laneDir * b.x * (0.72 + Math.random() * 0.26);
    y = ySign * b.y * (0.4 + Math.random() * 0.5);
    z = gsap.utils.interpolate(b.zNear * 0.65, b.zFar * 0.9, Math.random());
    flight.legBoost = 1.3;
  } else if (mode === "approach") {
    // Drift closer while still finishing the lateral direction.
    x = THREE.MathUtils.clamp(
      x0 + flight.laneDir * b.x * (0.35 + Math.random() * 0.4),
      -b.x * 0.9,
      b.x * 0.9
    );
    y = THREE.MathUtils.clamp(y0 + (Math.random() - 0.5) * 0.2, -b.y * 0.55, b.y * 0.55);
    z = gsap.utils.interpolate(0.9, b.zFar, 0.4 + Math.random() * 0.6);
    flight.legBoost = 1.25;
  } else if (mode === "deep") {
    x = THREE.MathUtils.clamp(
      x0 + flight.laneDir * b.x * (0.4 + Math.random() * 0.45),
      -b.x * 0.95,
      b.x * 0.95
    );
    y = (Math.random() - 0.5) * b.y * 0.55;
    z = gsap.utils.interpolate(b.zNear, b.zNear * 0.4, Math.random());
    flight.legBoost = 1.25;
  } else if (mode === "climb") {
    // Straight up — hold horizontal station.
    x = x0;
    y = b.y * (0.65 + Math.random() * 0.32);
    z = z0;
    flight.legBoost = 1.2;
  } else {
    // Straight down.
    x = x0;
    y = -b.y * (0.6 + Math.random() * 0.35);
    z = z0;
    flight.legBoost = 1.2;
  }

  flight.target.set(x, y, z);
  // Short legs — retarget soon so it doesn't hover in place.
  flight.nextTargetAt = t + 1.6 + Math.random() * 1.1;
}

/**
 * Glass-first forward at the docked pose = toward the viewer
 * (tilt already aims the lens at the user). Body→camera is the gimbal arm, not the lens.
 */
function readGlassForward(out) {
  dronePivot.getWorldPosition(_flyCross);
  out.copy(camera.position).sub(_flyCross);
  if (out.lengthSq() < 1e-8) out.set(0, 0, 1);
  return out.normalize();
}

function startFreeFlight() {
  if (flight.active || flight.staged || !droneModel) return;

  // Keep the on-screen pose as-is — do not re-apply Euler (that snaps the tilt).
  matchSketchSize();
  const beforeRect = threeContainer.getBoundingClientRect();
  const snap = capturePivotScreen();
  snap.beforeH = beforeRect.height;

  flight.staged = true;
  visualStage.classList.add("is-flying");

  // Wait a frame so fullscreen CSS applies, then pin to the same screen pixels + size.
  requestAnimationFrame(() => {
    const width = threeContainer.clientWidth || 1;
    const height = threeContainer.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);

    placePivotAtScreen(snap);
    const afterRect = threeContainer.getBoundingClientRect();
    // Taller fullscreen viewport would otherwise look like a sudden zoom-in.
    const scaleFix = snap.beforeH / Math.max(afterRect.height, 1);
    flight.scale = snap.scale * scaleFix;
    dronePivot.scale.setScalar(flight.scale);

    flight.dockPos.copy(dronePivot.position);
    flight.dockQuat.copy(dronePivot.quaternion);
    flight.dockScale = flight.scale;
    dockedScale = flight.scale;

    readGlassForward(flight.dockHeading);
    flight.dockFlat.set(flight.dockHeading.x, 0, flight.dockHeading.z);
    if (flight.dockFlat.lengthSq() < 1e-6) flight.dockFlat.set(0, 0, 1);
    else flight.dockFlat.normalize();
    flight.pos.copy(dronePivot.position);
    flight.vel.set(0, 0, 0);
    flight.yaw = 0;
    flight.pitch = 0;
    flight.roll = 0;
    flight.yawRate = 0;
    flight.legBoost = 1;
    flight.laneDir = Math.random() > 0.5 ? 1 : -1;
    flight.mouseBound = false;
    tagFrontPropellers();
    flight.holdDock = false;
    flight.active = true;
    setFlightHint(false);

    // Hold the exact dock briefly, then roam from this same pose.
    flight.target.copy(flight.pos);
    flight.nextTargetAt = clock.getElapsedTime() + 0.85;
  });
}

/** Mark the two prop axes on the glass-forward side as front motors. */
function tagFrontPropellers() {
  const body = droneModel?.getObjectByName("droneBody") || droneModel;
  if (!body || !propellerAxes.length) return;
  body.updateWorldMatrix(true, true);
  _flyFacing.copy(flight.dockFlat);
  if (_flyFacing.lengthSq() < 1e-8) return;
  body.getWorldPosition(_flyScreen);

  const scored = propellerAxes.map((axis) => {
    axis.getWorldPosition(_flyRay);
    return {
      axis,
      score: _flyTmp.copy(_flyRay).sub(_flyScreen).dot(_flyFacing),
    };
  });
  scored.sort((a, b) => b.score - a.score);
  scored.forEach((entry, i) => {
    entry.axis.userData.isFront = i < 2;
  });
  propellerActions.forEach((action) => {
    const axis = propAxisForAction(action);
    action.userData.isFront = !!axis?.userData.isFront;
  });
}

function propAxisForAction(action) {
  const idx = action.userData?.propIndex;
  if (idx == null) return null;
  const want = `p${idx}axis`;
  return propellerAxes.find((a) => a.name.toLowerCase() === want) || null;
}

function syncPropThrottles() {
  if (!propellersPlaying || !propellerActions.length) return;
  getFlightFacing(_flyFacing);
  const fwd = Math.max(0, flight.vel.dot(_flyFacing));
  const climb = flight.vel.y;

  propellerActions.forEach((action) => {
    const isFront = !!action.userData.isFront;

    // Cruise baseline
    let ts = 2.6;

    // Vertical collective — up spins hard, down eases off
    if (climb > 0.1) {
      ts = 3.6 + Math.min(climb, 2.5) * 1.05; // ~3.6 → 6.2
    } else if (climb < -0.1) {
      ts = 2.3 + Math.max(climb, -2.5) * 0.55; // ~2.3 → 0.9
    }

    // Forward: glass-side (front) motors push harder — additive, not either/or
    if (fwd > 0.05) {
      ts += isFront ? 1.1 + fwd * 2.8 : 0.15 + fwd * 0.4;
    }

    const cur = action.getEffectiveTimeScale();
    action.setEffectiveTimeScale(THREE.MathUtils.lerp(cur, ts, 0.28));
  });
}

function getFlightFacing(out) {
  return out
    .copy(flight.dockFlat)
    .applyAxisAngle(_flyWorldUp, flight.yaw)
    .normalize();
}

function shortestAngleDelta(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function clientToWorldOnDepth(clientX, clientY, depthZ, out) {
  const rect = threeContainer.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
  const ndcY = -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
  _flyScreen.set(ndcX, ndcY, 0.5).unproject(camera);
  _flyRay.copy(_flyScreen).sub(camera.position).normalize();
  const t =
    Math.abs(_flyRay.z) > 1e-5
      ? (depthZ - camera.position.z) / _flyRay.z
      : 0;
  out.copy(camera.position).addScaledVector(_flyRay, t);
  out.z = depthZ;
  return out;
}

/** Dock pose + smooth yaw, with forward pitch and side bank. */
function applyQuadAttitude() {
  getFlightFacing(_flyFacing);
  if (Math.abs(flight.yaw) < 1e-4) {
    _flyQuat.copy(flight.dockQuat);
  } else {
    _flyQuat
      .setFromUnitVectors(flight.dockFlat, _flyFacing)
      .multiply(flight.dockQuat);
  }

  _flyRight.crossVectors(_flyWorldUp, _flyFacing);
  if (_flyRight.lengthSq() < 1e-6) _flyRight.set(1, 0, 0);
  else _flyRight.normalize();

  _flyPitchQ.setFromAxisAngle(_flyRight, flight.pitch);
  _flyRollQ.setFromAxisAngle(_flyFacing, flight.roll);
  dronePivot.quaternion
    .copy(_flyRollQ)
    .multiply(_flyPitchQ)
    .multiply(_flyQuat);
}

function bindDroneToPointer(clientX, clientY) {
  if (!flight.active) return;
  flight.mouseBound = true;
  flight.bindDepth = flight.pos.z;
  flight.pointerX = clientX;
  flight.pointerY = clientY;
  flight.vel.set(0, 0, 0);
  setFlightHint(true);
}

function releaseDroneFromPointer() {
  if (!flight.mouseBound) return;
  flight.mouseBound = false;
  flight.target.copy(flight.pos);
  flight.nextTargetAt = clock.getElapsedTime() + 1.1;
  setFlightHint(false);
}

function onFlightPointerDown(e) {
  if (!flight.active || e.button !== 0) return;
  // Don't steal clicks from links / UI.
  if (e.target?.closest?.("a, button, input, textarea, .dg")) return;
  bindDroneToPointer(e.clientX, e.clientY);
}

function onFlightPointerMove(e) {
  if (!flight.active || !flight.mouseBound) return;
  flight.pointerX = e.clientX;
  flight.pointerY = e.clientY;
}

function onFlightPointerUp(e) {
  if (e.button != null && e.button !== 0) return;
  releaseDroneFromPointer();
}

window.addEventListener("pointerdown", onFlightPointerDown);
window.addEventListener("pointermove", onFlightPointerMove);
window.addEventListener("pointerup", onFlightPointerUp);
window.addEventListener("pointercancel", onFlightPointerUp);

function updateFreeFlight(dt, t) {
  if (!flight.active) return;
  const b = flightBounds();

  if (flight.mouseBound) {
    clientToWorldOnDepth(
      flight.pointerX,
      flight.pointerY,
      flight.bindDepth,
      flight.mouseWorld
    );
    flight.target.copy(flight.mouseWorld);
  } else if (t >= flight.nextTargetAt) {
    pickFlightTarget(t);
  } else if (
    flight.pos.distanceToSquared(flight.target) < 0.09 &&
    flight.vel.lengthSq() < 0.05
  ) {
    // Arrived early — leave immediately instead of parking until the timer.
    pickFlightTarget(t);
  }

  _flyDesired.subVectors(flight.target, flight.pos);
  const dist = _flyDesired.length();

  // Desired velocity — arrive gently, vertical can be direct.
  const maxSpd = flight.mouseBound
    ? 3.4
    : 3.2 * (flight.legBoost || 1);
  const desiredSpd = Math.min(maxSpd, dist * (flight.mouseBound ? 2.4 : 1.55));
  if (dist > 1e-5) {
    _flyVel.copy(_flyDesired).multiplyScalar(desiredSpd / dist);
  } else {
    _flyVel.set(0, 0, 0);
  }

  // Smooth accel — mouse chase snaps harder; free roam still eased.
  const horizLerp = 1 - Math.exp(-dt * (flight.mouseBound ? 3.6 : 1.85));
  const vertLerp = 1 - Math.exp(-dt * (flight.mouseBound ? 4.2 : 2.8));
  flight.vel.x += (_flyVel.x - flight.vel.x) * horizLerp;
  flight.vel.z += (_flyVel.z - flight.vel.z) * horizLerp;
  flight.vel.y += (_flyVel.y - flight.vel.y) * vertLerp;

  flight.pos.addScaledVector(flight.vel, dt);

  if (flight.mouseBound) {
    flight.pos.z = flight.bindDepth;
    flight.vel.z = 0;
  } else {
    flight.pos.z = THREE.MathUtils.clamp(flight.pos.z, b.zNear, b.zFar);
  }
  flight.pos.x = THREE.MathUtils.clamp(flight.pos.x, -b.x * 1.12, b.x * 1.12);
  flight.pos.y = THREE.MathUtils.clamp(flight.pos.y, -b.y * 1.12, b.y * 1.12);

  // Slow yaw toward horizontal travel — never snap 180°.
  _flyCross.set(flight.vel.x, 0, flight.vel.z);
  const horizSpeed = _flyCross.length();
  if (horizSpeed > 0.12) {
    _flyCross.multiplyScalar(1 / horizSpeed);
    const desiredYaw = Math.atan2(
      flight.dockFlat.x * _flyCross.z - flight.dockFlat.z * _flyCross.x,
      flight.dockFlat.dot(_flyCross)
    );
    const dyaw = shortestAngleDelta(flight.yaw, desiredYaw);
    const maxTurn = (flight.mouseBound ? 2.4 : 1.45) * dt;
    const stepYaw = THREE.MathUtils.clamp(dyaw, -maxTurn, maxTurn);
    flight.yaw += stepYaw;
    flight.yawRate = stepYaw / Math.max(dt, 1e-4);
  } else {
    flight.yawRate *= 1 - Math.exp(-dt * 4);
  }

  getFlightFacing(_flyFacing);
  _flyRight.crossVectors(_flyWorldUp, _flyFacing);
  if (_flyRight.lengthSq() < 1e-6) _flyRight.set(1, 0, 0);
  else _flyRight.normalize();

  const fwdSpd = flight.vel.dot(_flyFacing);
  const latSpd = flight.vel.dot(_flyRight);
  // Tip glass-forward a little when pushing ahead; stay flat on pure vertical.
  let targetPitch = THREE.MathUtils.clamp(-fwdSpd * 0.28, -0.42, 0.1);
  let targetRoll = THREE.MathUtils.clamp(
    -latSpd * 0.22 - flight.yawRate * 0.12,
    -0.34,
    0.34
  );
  if (Math.abs(flight.vel.y) > 0.35 && horizSpeed < 0.22) {
    targetPitch = 0;
    targetRoll *= 0.2;
  }
  flight.pitch += (targetPitch - flight.pitch) * (1 - Math.exp(-dt * 2.4));
  flight.roll += (targetRoll - flight.roll) * (1 - Math.exp(-dt * 2.2));

  applyQuadAttitude();
  syncPropThrottles();
  dronePivot.position.copy(flight.pos);
  dronePivot.scale.setScalar(flight.scale);
}

const _fitBox = new THREE.Box3();
const _fitCorner = new THREE.Vector3();
const _fitProj = new THREE.Vector3();
const FIT_SKIP = /camera/i;

function resizeRenderer() {
  const width = threeContainer.clientWidth || 1;
  const height = threeContainer.clientHeight || 1;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  if (!droneModel || flight.active) return;
  // fitDroneToSketch zeroes pivot rotation — that kills the wireframe tilt.
  // Until free-flight, keep normal sketch fitting only.
  if (themeLocked) matchSketchSize();
  else fitDroneToSketch();
}

function isFitMesh(object) {
  if (!object?.isMesh) return false;
  const label = `${object.name || ""} ${object.parent?.name || ""}`;
  return !FIT_SKIP.test(label);
}

function getSilhouetteBox(target = _fitBox) {
  target.makeEmpty();
  droneModel.updateMatrixWorld(true);
  droneModel.traverse((object) => {
    if (!isFitMesh(object) || !object.geometry) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    const meshBox = object.geometry.boundingBox;
    for (let xi = 0; xi < 2; xi += 1) {
      for (let yi = 0; yi < 2; yi += 1) {
        for (let zi = 0; zi < 2; zi += 1) {
          _fitCorner.set(
            xi ? meshBox.max.x : meshBox.min.x,
            yi ? meshBox.max.y : meshBox.min.y,
            zi ? meshBox.max.z : meshBox.min.z
          );
          _fitCorner.applyMatrix4(object.matrixWorld);
          target.expandByPoint(_fitCorner);
        }
      }
    }
  });
  return target;
}

function getSketchScreenRect() {
  const svgRect = svgEl.getBoundingClientRect();
  const frame = threeContainer.getBoundingClientRect();
  const vb = svgEl.viewBox.baseVal;
  if (!svgRect.width || !frame.width || !vb.width) return null;

  const fit = Math.min(svgRect.width / vb.width, svgRect.height / vb.height);
  const padX = (svgRect.width - vb.width * fit) / 2;
  const padY = (svgRect.height - vb.height * fit) / 2;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  svgEl.querySelectorAll(".droneSketch, .dronePlaceholder").forEach((el) => {
    const box = el.getBBox();
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  });
  if (!Number.isFinite(minX)) {
    const box = svgEl.querySelector(".droneSketch")?.getBBox();
    if (!box) return null;
    minX = box.x;
    minY = box.y;
    maxX = box.x + box.width;
    maxY = box.y + box.height;
  }

  const left = svgRect.left + padX + minX * fit;
  const top = svgRect.top + padY + minY * fit;
  const right = svgRect.left + padX + maxX * fit;
  const bottom = svgRect.top + padY + maxY * fit;

  const nx = (px) => ((px - frame.left) / frame.width) * 2 - 1;
  const ny = (py) => 1 - ((py - frame.top) / frame.height) * 2;

  return {
    minX: nx(left),
    maxX: nx(right),
    minY: ny(bottom),
    maxY: ny(top),
  };
}

function projectedSilhouette() {
  const box = getSilhouetteBox(_fitBox);
  const { min, max } = box;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let xi = 0; xi < 2; xi += 1) {
    for (let yi = 0; yi < 2; yi += 1) {
      for (let zi = 0; zi < 2; zi += 1) {
        _fitCorner.set(xi ? max.x : min.x, yi ? max.y : min.y, zi ? max.z : min.z);
        _fitProj.copy(_fitCorner).project(camera);
        minX = Math.min(minX, _fitProj.x);
        maxX = Math.max(maxX, _fitProj.x);
        minY = Math.min(minY, _fitProj.y);
        maxY = Math.max(maxY, _fitProj.y);
      }
    }
  }

  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

function centerModelInPivot() {
  dronePivot.position.set(0, 0, 0);
  dronePivot.rotation.set(0, 0, 0);
  dronePivot.scale.set(1, 1, 1);
  droneModel.position.set(0, 0, 0);
  droneModel.rotation.set(0, 0, 0);
  droneModel.scale.set(1, 1, 1);

  // noYUp.glb already has +90° X on body/camera nodes — leave scene at identity
  // so the flat fit is top-down on the sketch (extra tip made it edge-on / belly-up).
  droneModel.updateMatrixWorld(true);

  const box = getSilhouetteBox(_fitBox);
  const center = box.getCenter(new THREE.Vector3());
  droneModel.position.set(-center.x, -center.y, -center.z);
}

function matchSketchSize() {
  const target = getSketchScreenRect();
  if (!target || !droneModel) return;

  const boost = SKETCH_BOOST;
  const targetW = Math.max(target.maxX - target.minX, 0.0001) * boost;
  const targetH = Math.max(target.maxY - target.minY, 0.0001) * boost;
  const targetCx = (target.minX + target.maxX) / 2;
  const targetCy = (target.minY + target.maxY) / 2;

  const saved = propellerAxes.map((axis) => axis.quaternion.clone());
  propellerAxes.forEach((axis) => {
    if (axis.userData.restQuat) axis.quaternion.copy(axis.userData.restQuat);
  });

  const baseY = dronePivot.position.y;
  const fov = THREE.MathUtils.degToRad(camera.fov);
  dronePivot.position.set(0, baseY, 0);

  let scale = 1;
  let projected = null;
  for (let i = 0; i < 8; i += 1) {
    dronePivot.scale.setScalar(scale);
    dronePivot.updateMatrixWorld(true);
    projected = projectedSilhouette();
    const factor = Math.min(
      targetW / Math.max(projected.w, 0.0001),
      targetH / Math.max(projected.h, 0.0001)
    );
    scale *= factor;
    if (Math.abs(factor - 1) < 0.0015) break;
  }
  dronePivot.scale.setScalar(scale);

  for (let i = 0; i < 5; i += 1) {
    dronePivot.updateMatrixWorld(true);
    projected = projectedSilhouette();
    const center = _fitBox.getCenter(_fitCorner);
    const dist = Math.max(camera.position.z - center.z, 0.2);
    const planeH = 2 * Math.tan(fov / 2) * dist;
    const planeW = planeH * camera.aspect;
    const cx = (projected.minX + projected.maxX) / 2;
    const cy = (projected.minY + projected.maxY) / 2;
    dronePivot.position.x += (targetCx - cx) * planeW * 0.5;
    dronePivot.position.y += (targetCy - cy) * planeH * 0.5;

    const factor = Math.min(
      targetW / Math.max(projected.w, 0.0001),
      targetH / Math.max(projected.h, 0.0001)
    );
    if (Math.abs(factor - 1) > 0.002) {
      scale *= factor;
      dronePivot.scale.setScalar(scale);
    }
  }

  saved.forEach((quat, i) => propellerAxes[i].quaternion.copy(quat));
}

function fitDroneToSketch() {
  if (!droneModel) return;
  centerModelInPivot();
  matchSketchSize();
}

function asMaterialList(mat) {
  return Array.isArray(mat) ? mat : [mat];
}

function setWireframeMode(enabled) {
  meshRecords.forEach(({ mesh, wire, solid }) => {
    mesh.material = enabled ? wire : solid;
    asMaterialList(enabled ? wire : solid).forEach((mat) => {
      mat.wireframe = enabled;
    });
  });
}

function applyThemeProgress(t) {
  const themeT = gsap.utils.clamp(0, 1, t);
  document.documentElement.style.setProperty("--theme-t", themeT.toFixed(4));
  document.body.classList.toggle("theme-live", themeT > 0.55);
}

function applyColorProgress(t) {
  const colorT = gsap.utils.clamp(0, 1, t);
  droneState.colorT = colorT;
  applyThemeProgress(colorT);

  if (colorT <= 0) {
    setWireframeMode(true);
    meshRecords.forEach(({ wire }) => {
      asMaterialList(wire).forEach((mat) => {
        mat.color.setHex(WIRE_COLOR);
        mat.opacity = 0.72;
      });
    });
    stopPropellers();
    return;
  }

  // Mid-crossfade: drop grey wireframe and bring solid color in
  if (colorT < 0.55) {
    setWireframeMode(true);
    meshRecords.forEach(({ wire }) => {
      asMaterialList(wire).forEach((mat) => {
        mat.color.setHex(WIRE_COLOR);
        mat.opacity = 0.72 - colorT * 0.25;
      });
    });
  } else {
    setWireframeMode(false);
    const solidT = (colorT - 0.55) / 0.45;
    meshRecords.forEach(({ solid }) => {
      asMaterialList(solid).forEach((mat) => {
        const isGlass = !!mat.userData?.isGlass;
        if (isGlass) {
          // Stay opaque while fading in — transmission/see-through was showing the arms.
          mat.transparent = solidT < 1;
          mat.opacity = 0.45 + solidT * 0.55;
          mat.depthWrite = true;
          if (solidT >= 1) {
            mat.transparent = false;
            mat.opacity = 1;
          }
        } else if (solidT < 1) {
          mat.transparent = true;
          mat.opacity = 0.55 + solidT * 0.45;
        } else {
          mat.transparent = false;
          mat.opacity = 1;
        }
      });
    });
  }

  if (colorT > 0.7) startPropellers();
  else stopPropellers();
}

function startPropellers() {
  // Don't latch "playing" before clips exist (restore can call color before load).
  if (!propellerActions.length) return;
  if (propellersPlaying) return;
  propellerActions.forEach((action) => {
    action.enabled = true;
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.setEffectiveTimeScale(3.2);
    action.setEffectiveWeight(1);
    action.play();
  });
  cameraActions.forEach((action) => {
    action.enabled = true;
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.play();
  });
  propellersPlaying = true;
}

function stopPropellers() {
  if (!propellersPlaying) return;
  propellerActions.forEach((action) => {
    action.stop();
    action.reset();
  });
  cameraActions.forEach((action) => {
    action.stop();
    action.reset();
  });
  if (cameraAxis?.userData.restQuat) {
    cameraAxis.quaternion.copy(cameraAxis.userData.restQuat);
  }
  propellersPlaying = false;
}

resizeRenderer();
window.addEventListener("resize", () => {
  resizeRenderer();
  ScrollTrigger.refresh();
});

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// 4-step luminance ramp for MeshToonMaterial — soft cel shading, not harsh bands.
function isGlassSlot(matName, partName) {
  // Camera lens disc (Material.005) — same glassy mint as the canopy.
  if (partName.includes("camera") && matName === "material.005") return true;
  // Canopy window only — camera ball/oval stay solid dark, not glass.
  if (partName.includes("camera")) return false;
  return matName === "material";
}

function makeGlassMaterial(source) {
  // Opaque glassy canopy/lens — clearcoat sheen, no see-through wings.
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x3a3c3c,
    metalness: 0.12,
    roughness: 0.06,
    transmission: 0,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    side: THREE.FrontSide,
    envMapIntensity: 1.35,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    reflectivity: 0.85,
  });
  glass.name = source?.name || "glass";
  glass.userData.isGlass = true;
  glass.needsUpdate = true;
  return glass;
}

function styleSolidMaterial(mesh, source) {
  const matName = (source.name || "").toLowerCase();
  const partName = `${mesh.name || ""} ${mesh.parent?.name || ""}`.toLowerCase();

  if (isGlassSlot(matName, partName)) {
    return makeGlassMaterial(source);
  }

  const solid = source.clone();
  solid.name = source.name;
  solid.side = THREE.FrontSide;
  solid.transparent = false;
  solid.opacity = 1;
  solid.userData.isGlass = false;

  // Propeller blades only (Material.001) → deeper mint so they read on light paper.
  if (matName === "material.001") {
    solid.color.setHex(0x0a8f82);
    solid.metalness = 0.12;
    solid.roughness = 0.4;
  }

  // Camera globe — matte dark shell, not a lens.
  if (partName.includes("camera")) {
    solid.color.setHex(0x141414);
    solid.metalness = 0.35;
    solid.roughness = 0.45;
  }

  solid.needsUpdate = true;
  return solid;
}

function mountDroneGltf(gltf) {
  droneModel = gltf.scene;
  dronePivot.add(droneModel);

  droneModel.traverse((object) => {
    if (!object.isMesh) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const solids = materials.map((mat) => styleSolidMaterial(object, mat));
    const wires = materials.map(() => {
      const wire = new THREE.MeshStandardMaterial({
        color: WIRE_COLOR,
        wireframe: true,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        metalness: 0,
        roughness: 1,
      });
      return wire;
    });

    object.material = wires.length === 1 ? wires[0] : wires;
    meshRecords.push({
      mesh: object,
      wire: wires.length === 1 ? wires[0] : wires,
      solid: solids.length === 1 ? solids[0] : solids,
    });
  });

  mixer = new THREE.AnimationMixer(droneModel);
  propellerActions = gltf.animations
    .filter((clip) => /propeller/i.test(clip.name))
    .map((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      // A bit faster so shaft spin reads without a manual off-axis boost.
      action.timeScale = 3.2;
      const m = clip.name.match(/(\d+)/);
      action.userData = {
        propIndex: m ? Number(m[1]) : null,
        isFront: false,
      };
      return action;
    });
  cameraActions = gltf.animations
    .filter((clip) => /camera/i.test(clip.name))
    .map((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      return action;
    });

  propellerAxes = [];
  cameraAxis = null;
  droneModel.traverse((object) => {
    if (/^p[1-4]Axis$/i.test(object.name)) {
      object.userData.restQuat = object.quaternion.clone();
      propellerAxes.push(object);
    }
    if (object.name === "droneCameraAxis") {
      cameraAxis = object;
      cameraAxis.userData.baseRotX = object.rotation.x;
      cameraAxis.userData.restQuat = object.quaternion.clone();
    }
  });

  fitDroneToSketch();
  // fitDroneToSketch zeros pivot rotation — restore glass-first dock if story is done.
  if (themeLocked) applyFinishedDockPose();
  propellersPlaying = false;
  applyColorProgress(themeLocked ? 1 : 0);
  window.__meshRecords = meshRecords;
  window.__droneReady = true;
  if (themeLocked && (takeoffPending || (!flight.active && !flight.staged))) {
    takeoffPending = false;
    scheduleTakeoff(0);
  }
}

function loadDroneModel() {
  return new Promise((resolve, reject) => {
    loader.load(
      "/noYUp.glb",
      (gltf) => {
        try {
          mountDroneGltf(gltf);
          resolve(gltf);
        } catch (error) {
          console.error("Failed to style drone model", error);
          window.__droneError = String(error?.stack || error);
          reject(error);
        }
      },
      undefined,
      (error) => {
        console.error("Failed to load drone model", error);
        window.__droneError = String(error?.stack || error);
        reject(error);
      }
    );
  });
}

function setBootProgress(t, label) {
  const bar = document.getElementById("boot-bar");
  const pct = document.getElementById("boot-pct");
  const status = document.getElementById("boot-status");
  const clamped = Math.max(0, Math.min(1, t));
  if (bar) bar.style.width = `${(clamped * 100).toFixed(1)}%`;
  if (pct) pct.textContent = String(Math.round(clamped * 100)).padStart(2, "0");
  if (status && label) status.textContent = label;
}

const PRELOAD_PAGES = [
  "/experience.html",
  "/projects.html",
  "/contact.html",
  "/about.html",
  "/how-i-work.html",
  "/site.bundle.js",
];

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

function preloadFetch(url) {
  return fetch(url, { credentials: "same-origin" })
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null);
}

function dismissBootScreen() {
  const boot = document.getElementById("boot-screen");
  document.documentElement.classList.add("is-booted");
  document.body.classList.add("is-booted");
  if (!boot) return;
  boot.setAttribute("aria-busy", "false");
  boot.classList.add("is-done");
  window.setTimeout(() => boot.remove(), 400);
}

/** Keep the drone mounted under the SVG at opacity 0 — no pop-in on morph. */
function seatHiddenDroneUnderSketch() {
  if (!droneModel || themeLocked || flight.active || flight.staged) return;
  dronePivot.rotation.set(0, 0, 0);
  dronePivot.position.set(0, 0, 0);
  fitDroneToSketch();
  applyColorProgress(0);
  threeContainer.style.opacity = "0";
  threeContainer.style.pointerEvents = "none";
  if (typeof renderer.compile === "function") {
    renderer.compile(scene, camera);
  }
  renderer.render(scene, camera);
  renderer.render(scene, camera);
}

function warmThreeScene() {
  const width = threeContainer.clientWidth || window.innerWidth || 1;
  const height = threeContainer.clientHeight || window.innerHeight || 1;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.render(scene, camera);
}

async function runHomeBoot() {
  setBootProgress(0.05, "TYPE");
  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((r) => setTimeout(r, 1800)),
    ]);
  }

  setBootProgress(0.16, "SVG");
  const svgSrcs = [
    ...new Set(
      [...document.querySelectorAll('img[src$=".svg"]')].map((img) => img.src)
    ),
  ];
  const rasterSrcs = [
    ...new Set(
      [...document.querySelectorAll('img[src*="/projects/"]')].map(
        (img) => img.src
      )
    ),
  ];
  await Promise.all([...svgSrcs, ...rasterSrcs].map(preloadImage));

  setBootProgress(0.32, "PAGES");
  await Promise.all(PRELOAD_PAGES.map(preloadFetch));

  setBootProgress(0.44, "DECODER");
  await Promise.all([
    preloadFetch("/draco/draco_decoder.wasm"),
    preloadFetch("/draco/draco_wasm_wrapper.js"),
    preloadFetch("/draco/draco_decoder.js"),
  ]);

  setBootProgress(0.55, "SCENE");
  warmThreeScene();

  setBootProgress(0.66, "MODEL");
  try {
    await loadDroneModel();
    // Drone is in the scene now — seated under the sketch, fully hidden.
    seatHiddenDroneUnderSketch();
  } catch (_) {
    // Still reveal the page — sketch works without the GLB.
  }

  setBootProgress(1, "READY");
  await new Promise((r) => setTimeout(r, 120));
  dismissBootScreen();

  requestAnimationFrame(() => {
    resizeRenderer();
    seatHiddenDroneUnderSketch();
    ScrollTrigger.refresh();
    startPageIntro();
  });
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const t = clock.getElapsedTime();

  if (mixer) mixer.update(delta);

  if (droneModel) {
    if (flight.active) {
      updateFreeFlight(Math.min(delta, 0.05), t);
    } else if (flight.staged) {
      // Fullscreen handoff — leave captured pose alone until flight owns it.
    } else {
      const live = flight.holdDock ? 0 : droneState.colorT;
      dronePivot.rotation.x = droneState.rotX;
      dronePivot.rotation.y =
        droneState.rotY + Math.sin(t * 0.35) * 0.03 * live;
      dronePivot.rotation.z = droneState.rotZ;
      dronePivot.position.set(
        0,
        droneState.floatY + Math.sin(t * 0.9) * 0.025 * live,
        0
      );
      // Scroll creation: always stay glued to the sketch frame.
      matchSketchSize();
      dockedScale = dronePivot.scale.x || dockedScale;
    }

    // Camera gimbal motion comes from the GLB clips — don't overwrite while playing.
    if (cameraAxis && !propellersPlaying) {
      cameraAxis.rotation.x =
        (cameraAxis.userData.baseRotX || 0) + droneState.camTilt;
    }
  }

  renderer.render(scene, camera);
}

animate();

function mapRange(value, start, end) {
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / (end - start);
}

function drawUniform(parts, t) {
  const progress = gsap.utils.clamp(0, 1, t);
  parts.forEach(({ el, length }) => {
    el.style.strokeDashoffset = String(length * (1 - progress));
  });
}

// Long outline paths need a softer scrub so the tip doesn't race.
function drawLongPaths(parts, t) {
  const progress = gsap.parseEase("power1.inOut")(gsap.utils.clamp(0, 1, t));
  parts.forEach(({ el, length }) => {
    el.style.strokeDashoffset = String(length * (1 - progress));
  });
}

/**
 * Even two-beat split across a full section scroll (0 → 1).
 * Short geometry uses this; long sketch/detail paths use the whole section.
 */
function sequencePair(local) {
  return {
    a: gsap.utils.clamp(0, 1, mapRange(local, 0.0, 0.48)),
    b: gsap.utils.clamp(0, 1, mapRange(local, 0.52, 1.0)),
  };
}

const SECTION_ORDER = ["about", "skills", "work", "experience"];
const scrollSections = SECTION_ORDER.map((id) =>
  document.getElementById(id)
).filter(Boolean);

const sectionLocal = scrollSections.map(() => 0);

// Owns the two entrance beats. Scroll must not snap these on load,
// because the hero is already on screen and would skip the draw.
const intro = { lines: 0, frame: 0 };
let introTl = null;
let introStarted = false;

function applySectionSequences() {
  // about → markers/body, skills → outer sketch, work → inner detail,
  // experience → morph / tilt / color
  const aboutT = sectionLocal[0] || 0;
  const skillsT = sectionLocal[1] || 0;
  const workT = sectionLocal[2] || 0;
  const experienceT = sectionLocal[3] || 0;
  const about = sequencePair(aboutT);

  // Self-playing intro (not scroll-linked).
  drawUniform(lineParts, intro.lines);
  drawUniform(squareParts, intro.frame);

  drawUniform(markerParts, about.a);
  drawUniform(bodyParts, about.b);

  // Long paths: one continuous draw across the whole section.
  drawLongPaths(sketchParts, skillsT);
  drawLongPaths(detailParts, workT);

  const morphT = gsap.utils.clamp(0, 1, mapRange(experienceT, 0.0, 0.34));
  const tiltT = gsap.utils.clamp(0, 1, mapRange(experienceT, 0.34, 0.67));
  const colorT = gsap.utils.clamp(0, 1, mapRange(experienceT, 0.67, 1.0));

  // Only after the full wireframe → tilt → color story is done.
  if (colorT >= 1) markStoryComplete();

  if (themeLocked || flight.active) {
    // Drawing is finished — hide the sketch for free-flight.
    svgEl.style.opacity = "0";
    threeContainer.style.opacity = "1";
    threeContainer.style.pointerEvents = "none";
  } else {
    // Drone is already mounted under the SVG; opacity crossfades in with morph.
    svgEl.style.opacity = String(1 - morphT);
    threeContainer.style.opacity = String(morphT);
    threeContainer.style.pointerEvents = morphT > 0.05 ? "auto" : "none";
  }

  // Theme can lock for the page chrome; color/pose stay scroll-driven until flight.
  applyColorProgress(themeLocked ? 1 : colorT);

  if (flight.active || flight.staged || flight.holdDock) {
    // Dock hold / free-flight owns the pose — don't let scroll rewrite it.
  } else {
    // Pure scroll story: morph → tilt wireframe → color. No flight layout mixed in.
    droneState.rotX = gsap.utils.interpolate(0, -1.35, tiltT);
    droneState.rotY = gsap.utils.interpolate(0, -0.55, tiltT);
    droneState.camTilt = 0;
    droneState.floatY = gsap.utils.interpolate(0, 0.035, colorT);
  }

  // Captions follow the same section ownership as the draws.
  let stage = DRONE_STAGES.blank;
  if (colorT > 0.2 || themeLocked) stage = DRONE_STAGES.ship;
  else if (morphT > 0.15) stage = DRONE_STAGES.lift;
  else if (workT > 0.08) stage = DRONE_STAGES.build;
  else if (skillsT > 0.08) stage = DRONE_STAGES.shape;
  else if (aboutT > 0.05 || intro.frame >= 1) stage = DRONE_STAGES.napkin;
  else if (intro.frame > 0.15) stage = DRONE_STAGES.frame;
  setDroneStory(stage);

  if (flight.active && droneStoryTitle) {
    // Flight hint replaces the story captions once the drone is free.
    if (droneStoryTitle.parentElement) {
      droneStoryTitle.parentElement.style.opacity = "0";
    }
  }

  if (themeLocked) {
    visualStage.style.opacity = "1";
  } else {
    const built =
      (intro.lines +
        intro.frame +
        aboutT +
        skillsT +
        workT +
        experienceT) /
      6;
    visualStage.style.opacity = window.matchMedia("(max-width: 980px)").matches
      ? String(0.5 + built * 0.28)
      : String(0.8 + built * 0.2);
  }
}

function syncSectionProgress(index, progress) {
  sectionLocal[index] = gsap.utils.clamp(0, 1, progress);
  applySectionSequences();
}

function forceDroneReady() {
  sectionLocal.forEach((_, i) => {
    sectionLocal[i] = 1;
  });
  intro.lines = 1;
  intro.frame = 1;
  if (introTl && introTl.isActive()) introTl.progress(1);
  markStoryComplete();
  applySectionSequences();
}

function startPageIntro() {
  if (introStarted) return;
  // Finished story in this tab — come back to live theme + flying drone.
  if (restoreCompletedStory()) return;
  introStarted = true;
  if (window.scrollY > 80) {
    intro.lines = 1;
    intro.frame = 1;
    applySectionSequences();
    return;
  }
  playIntro();
}

window.__forceDroneReady = forceDroneReady;

applySectionSequences();

// One section → one animation family. Full section height = full draw.
scrollSections.forEach((section, i) => {
  const longPath = section.id === "skills" || section.id === "work";
  ScrollTrigger.create({
    trigger: section,
    start: "top 70%",
    end: "bottom 30%",
    scrub: longPath ? 0.55 : 0.35,
    onUpdate: (self) => syncSectionProgress(i, self.progress),
    onLeave: () => syncSectionProgress(i, 1),
    onLeaveBack: () => syncSectionProgress(i, 0),
    onRefresh: (self) => syncSectionProgress(i, self.progress),
  });
});

ScrollTrigger.create({
  trigger: "#cta",
  start: "top 85%",
  onEnter: forceDroneReady,
});

function playIntro() {
  intro.lines = 0;
  intro.frame = 0;
  applySectionSequences();

  // Beat 1: rays. Hold. Beat 2: frame. Enough air that each read lands.
  introTl = gsap.timeline({ delay: 0.85 });
  introTl
    .to(intro, {
      lines: 1,
      duration: 1.7,
      ease: "power1.inOut",
      onUpdate: applySectionSequences,
    })
    .to(
      intro,
      {
        frame: 1,
        duration: 1.35,
        ease: "power1.inOut",
        onUpdate: applySectionSequences,
      },
      "+=0.35"
    );
}

runHomeBoot();

window.addEventListener("load", () => {
  if (droneModel) {
    fitDroneToSketch();
    if (themeLocked) applyFinishedDockPose();
  }
  ScrollTrigger.refresh();
  applySectionSequences();
});
