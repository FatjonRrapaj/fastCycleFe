import "./styles.css";
import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import { GUI } from "dat.gui";
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

let debugHoldPose = false;
const debugPose = {
  lockPose: false,
  showSketchOverlay: false,
  posX: 0,
  posY: 0,
  posZ: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  scale: 1,
  sketchBoost: 1.05,
};

function syncDebugPoseFromPivot() {
  debugPose.posX = dronePivot.position.x;
  debugPose.posY = dronePivot.position.y;
  debugPose.posZ = dronePivot.position.z;
  debugPose.rotX = THREE.MathUtils.radToDeg(dronePivot.rotation.x);
  debugPose.rotY = THREE.MathUtils.radToDeg(dronePivot.rotation.y);
  debugPose.rotZ = THREE.MathUtils.radToDeg(dronePivot.rotation.z);
  debugPose.scale = dronePivot.scale.x;
}

function refreshDebugGui() {
  if (debugHoldPose || !window.__droneGui) return;
  syncDebugPoseFromPivot();
  window.__droneGui.updateDisplay();
}

function applyDebugPose() {
  debugHoldPose = true;
  debugPose.lockPose = true;
  dronePivot.position.set(debugPose.posX, debugPose.posY, debugPose.posZ);
  dronePivot.rotation.set(
    THREE.MathUtils.degToRad(debugPose.rotX),
    THREE.MathUtils.degToRad(debugPose.rotY),
    THREE.MathUtils.degToRad(debugPose.rotZ)
  );
  dronePivot.scale.setScalar(debugPose.scale);
}

function initDroneDebugGui() {
  const gui = new GUI({ name: "Drone tune", width: 280 });
  gui.domElement.style.zIndex = "80";

  const pose = gui.addFolder("Pose (XYZ)");
  pose.add(debugPose, "posX", -2, 2, 0.001).name("pos X").onChange(applyDebugPose);
  pose.add(debugPose, "posY", -2, 2, 0.001).name("pos Y").onChange(applyDebugPose);
  pose.add(debugPose, "posZ", -2, 2, 0.001).name("pos Z").onChange(applyDebugPose);
  pose.add(debugPose, "rotX", -180, 180, 0.1).name("rot X°").onChange(applyDebugPose);
  pose.add(debugPose, "rotY", -180, 180, 0.1).name("rot Y°").onChange(applyDebugPose);
  pose.add(debugPose, "rotZ", -180, 180, 0.1).name("rot Z°").onChange(applyDebugPose);
  pose.add(debugPose, "scale", 0.2, 3, 0.001).name("scale").onChange(applyDebugPose);
  pose.open();

  const fit = gui.addFolder("Fit");
  fit
    .add(debugPose, "sketchBoost", 0.8, 1.4, 0.001)
    .name("sketch boost")
    .onChange(() => {
      if (!debugPose.lockPose) fitDroneToSketch();
      syncDebugPoseFromPivot();
      gui.updateDisplay();
    });
  fit
    .add(debugPose, "lockPose")
    .name("lock pose")
    .onChange((locked) => {
      debugHoldPose = locked;
      if (!locked) {
        fitDroneToSketch();
        syncDebugPoseFromPivot();
        gui.updateDisplay();
      }
    });
  fit
    .add(
      {
        autoFit: () => {
          debugHoldPose = false;
          debugPose.lockPose = false;
          fitDroneToSketch();
          syncDebugPoseFromPivot();
          gui.updateDisplay();
        },
      },
      "autoFit"
    )
    .name("Auto fit to sketch");
  fit
    .add(
      {
        logPose: () => {
          syncDebugPoseFromPivot();
          console.log("[drone pose]", {
            position: dronePivot.position.toArray(),
            rotationDeg: [debugPose.rotX, debugPose.rotY, debugPose.rotZ],
            scale: debugPose.scale,
            sketchBoost: debugPose.sketchBoost,
          });
          gui.updateDisplay();
        },
      },
      "logPose"
    )
    .name("Log pose");
  fit.open();

  gui
    .add(debugPose, "showSketchOverlay")
    .name("sketch overlay")
    .onChange(() => applySectionSequences());

  window.__droneGui = gui;
  window.addEventListener("keydown", (event) => {
    if (
      event.target !== document.body &&
      event.target !== document.documentElement
    ) {
      return;
    }
    if (event.key.toLowerCase() === "f") {
      debugHoldPose = false;
      debugPose.lockPose = false;
      fitDroneToSketch();
      syncDebugPoseFromPivot();
      gui.updateDisplay();
    }
  });
}

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
let flyingLayout = false;
let takeoffTimer = null;

const _flyDesired = new THREE.Vector3();
const _flyQuat = new THREE.Quaternion();
const _flyQuatBank = new THREE.Quaternion();
const _flyPrevHeading = new THREE.Vector3(0, 0, 1);
const _flyCross = new THREE.Vector3();
const _flyScreen = new THREE.Vector3();
const _flyRay = new THREE.Vector3();

const flight = {
  active: false,
  staged: false,
  holdDock: false,
  pos: new THREE.Vector3(),
  heading: new THREE.Vector3(0, 0, 1),
  dockHeading: new THREE.Vector3(0, 0, 1),
  dockQuat: new THREE.Quaternion(),
  dockPos: new THREE.Vector3(),
  dockScale: 1,
  target: new THREE.Vector3(),
  speed: 0,
  yawRate: 0,
  nextTargetAt: 0,
  scale: 1,
  legBoost: 1,
};

function setFlyingLayout(active) {
  if (!visualStage || active === flyingLayout) return;
  flyingLayout = active;
  visualStage.classList.toggle("is-flying", active);
  requestAnimationFrame(() => resizeRenderer());
}

function flightBounds() {
  // Fullscreen canvas — allow a little past the edges, with real depth range.
  const dist = Math.max(camera.position.z, 0.5);
  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist;
  const aspect = Math.max(camera.aspect || 1, 0.7);
  const pad = 0.92;
  return {
    x: halfH * aspect * pad,
    y: halfH * pad * 0.88,
    zNear: -0.95,
    zFar: 1.45,
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

function markStoryComplete() {
  if (themeLocked) return;
  // Theme only — do not touch layout/pose. Flight starts later on its own.
  themeLocked = true;
  applyThemeProgress(1);
  document.body.classList.add("theme-live");
  if (takeoffTimer) clearTimeout(takeoffTimer);
  takeoffTimer = window.setTimeout(() => {
    takeoffTimer = null;
    startFreeFlight();
  }, 3000);
}

function pickFlightTarget(t) {
  const b = flightBounds();
  const x0 = flight.pos.x;
  const y0 = flight.pos.y;
  const z0 = flight.pos.z;
  let x = x0;
  let y = y0;
  let z = z0;

  // Side / diagonal + stronger toward-user / away depth legs.
  const roll = Math.random();
  let mode = "side";
  if (roll < 0.28) mode = "side";
  else if (roll < 0.48) mode = "diagonal";
  else if (roll < 0.7) mode = "approach";
  else if (roll < 0.9) mode = "deep";
  else if (roll < 0.95) mode = "climb";
  else mode = "descend";

  const oppositeX = -Math.sign(Math.abs(x0) > 0.08 ? x0 : Math.random() - 0.5);

  if (mode === "side") {
    x = oppositeX * b.x * (0.75 + Math.random() * 0.28);
    y = THREE.MathUtils.clamp(y0 + (Math.random() - 0.5) * 0.16, -b.y * 0.75, b.y * 0.75);
    z = THREE.MathUtils.clamp(z0 + (Math.random() - 0.5) * 0.35, b.zNear * 0.45, b.zFar * 0.75);
    flight.legBoost = 1.12;
  } else if (mode === "diagonal") {
    const oppositeY = -Math.sign(Math.abs(y0) > 0.08 ? y0 : Math.random() - 0.5);
    x = oppositeX * b.x * (0.7 + Math.random() * 0.28);
    y = oppositeY * b.y * (0.5 + Math.random() * 0.4);
    z = gsap.utils.interpolate(b.zNear * 0.55, b.zFar * 0.85, Math.random());
    flight.legBoost = 1.08;
  } else if (mode === "approach") {
    // Come closer to the user
    x = THREE.MathUtils.clamp(x0 * 0.35 + (Math.random() - 0.5) * 0.25, -b.x * 0.55, b.x * 0.55);
    y = THREE.MathUtils.clamp(y0 * 0.35 + (Math.random() - 0.5) * 0.16, -b.y * 0.4, b.y * 0.4);
    z = gsap.utils.interpolate(0.7, b.zFar, 0.4 + Math.random() * 0.6);
    flight.legBoost = 1.0;
  } else if (mode === "deep") {
    // Push away into the page
    x = (Math.random() - 0.5) * b.x * 0.85;
    y = (Math.random() - 0.5) * b.y * 0.55;
    z = gsap.utils.interpolate(b.zNear, -0.15, Math.random());
    flight.legBoost = 1.0;
  } else if (mode === "climb") {
    x = THREE.MathUtils.clamp(x0 + (Math.random() - 0.5) * 0.2, -b.x * 0.75, b.x * 0.75);
    y = b.y * (0.55 + Math.random() * 0.4);
    z = THREE.MathUtils.clamp(z0 + (Math.random() - 0.5) * 0.35, b.zNear * 0.35, b.zFar * 0.7);
    flight.legBoost = 0.95;
  } else {
    x = THREE.MathUtils.clamp(x0 + (Math.random() - 0.5) * 0.2, -b.x * 0.75, b.x * 0.75);
    y = -b.y * (0.5 + Math.random() * 0.4);
    z = THREE.MathUtils.clamp(z0 + (Math.random() - 0.5) * 0.35, b.zNear * 0.35, b.zFar * 0.7);
    flight.legBoost = 0.95;
  }

  flight.target.set(x, y, z);
  flight.nextTargetAt = t + 4.5 + Math.random() * 3.2;
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
  if (flight.active || flight.staged || !droneModel || debugHoldPose) return;

  // Exact finished scroll pose in the sketch frame (pixel size + screen pos).
  dronePivot.rotation.set(droneState.rotX, droneState.rotY, droneState.rotZ);
  dronePivot.position.set(0, droneState.floatY, 0);
  matchSketchSize();
  const beforeRect = threeContainer.getBoundingClientRect();
  const snap = capturePivotScreen();
  snap.beforeH = beforeRect.height;

  flight.staged = true;
  flyingLayout = true;
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
    flight.holdDock = false;

    readGlassForward(flight.dockHeading);
    flight.heading.copy(flight.dockHeading);
    _flyPrevHeading.copy(flight.heading);
    flight.pos.copy(dronePivot.position);
    flight.speed = 0;
    flight.yawRate = 0;
    flight.legBoost = 1;
    flight.active = true;

    // Hold the exact dock for a beat — no immediate move/zoom.
    flight.target.copy(flight.pos);
    flight.nextTargetAt = clock.getElapsedTime() + 1.25;
  });
}

function updateFreeFlight(dt, t) {
  if (!flight.active) return;
  const b = flightBounds();

  if (t >= flight.nextTargetAt || flight.pos.distanceToSquared(flight.target) < 0.045) {
    pickFlightTarget(t);
  }

  _flyDesired.subVectors(flight.target, flight.pos);
  if (_flyDesired.lengthSq() < 1e-6) _flyDesired.copy(flight.heading);
  else _flyDesired.normalize();

  // Soft edge avoidance — allow a little past the window, then steer back.
  if (Math.abs(flight.pos.x) > b.x * 0.92) {
    _flyDesired.x -= Math.sign(flight.pos.x) * 0.65;
  }
  if (Math.abs(flight.pos.y) > b.y * 0.92) {
    _flyDesired.y -= Math.sign(flight.pos.y) * 0.65;
  }
  if (flight.pos.z < b.zNear + 0.12) _flyDesired.z += 0.85;
  if (flight.pos.z > b.zFar - 0.12) _flyDesired.z -= 0.85;
  _flyDesired.normalize();

  // Smooth glass-led turns — velocity follows the lens.
  const turn = 1 - Math.exp(-dt * 1.25);
  flight.heading.lerp(_flyDesired, turn).normalize();

  // Yaw rate from heading swing (for light banking only).
  const headingDot = THREE.MathUtils.clamp(
    _flyPrevHeading.dot(flight.heading),
    -1,
    1
  );
  const ang = Math.acos(headingDot) / Math.max(dt, 1e-4);
  _flyCross.crossVectors(_flyPrevHeading, flight.heading);
  const side = Math.sign(_flyCross.y || 0.0001);
  const instantYawRate = side * ang;
  flight.yawRate += (instantYawRate - flight.yawRate) * (1 - Math.exp(-dt * 4.5));
  _flyPrevHeading.copy(flight.heading);

  const align = THREE.MathUtils.clamp(flight.heading.dot(_flyDesired), 0, 1);
  const targetSpeed =
    gsap.utils.interpolate(0.4, 0.98, align * align) * (flight.legBoost || 1);
  flight.speed += (targetSpeed - flight.speed) * (1 - Math.exp(-dt * 1.15));

  // Move only where the glass points.
  flight.pos.addScaledVector(flight.heading, flight.speed * dt);
  flight.pos.x = THREE.MathUtils.clamp(flight.pos.x, -b.x, b.x);
  flight.pos.y = THREE.MathUtils.clamp(flight.pos.y, -b.y, b.y);
  flight.pos.z = THREE.MathUtils.clamp(flight.pos.z, b.zNear, b.zFar);

  // Attitude: keep the exact dock quaternion until we actually turn.
  const headingDotDock = THREE.MathUtils.clamp(
    flight.dockHeading.dot(flight.heading),
    -1,
    1
  );
  if (headingDotDock > 0.999) {
    dronePivot.quaternion.copy(flight.dockQuat);
  } else {
    _flyQuat.setFromUnitVectors(flight.dockHeading, flight.heading);
    const bank = THREE.MathUtils.clamp(-flight.yawRate * 0.18, -0.35, 0.35);
    _flyQuatBank.setFromAxisAngle(flight.heading, bank);
    dronePivot.quaternion
      .copy(_flyQuat)
      .multiply(flight.dockQuat)
      .premultiply(_flyQuatBank);
  }
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

  const boost = debugPose.sketchBoost || 1;
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

function spinPropellers(_delta) {
  // noYUp clips already rotate p*Axis around the real motor shaft.
  // Extra rotateOnAxis was tumbling hubs/caps off-axis — leave spin to the GLB only.
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

loader.load(
  "/noYUp.glb",
  (gltf) => {
    try {
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
      syncDebugPoseFromPivot();
      applyColorProgress(0);
      window.__meshRecords = meshRecords;
      window.__droneReady = true;
    } catch (error) {
      console.error("Failed to style drone model", error);
      window.__droneError = String(error?.stack || error);
    }
  },
  undefined,
  (error) => {
    console.error("Failed to load drone model", error);
    window.__droneError = String(error?.stack || error);
  }
);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const t = clock.getElapsedTime();

  if (mixer) mixer.update(delta);
  spinPropellers(delta);

  if (droneModel && !debugHoldPose) {
    if (flight.active) {
      updateFreeFlight(Math.min(delta, 0.05), t);
    } else {
      const live = droneState.colorT;
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
    refreshDebugGui();
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

  if (debugPose.showSketchOverlay) {
    svgEl.style.opacity = "1";
    threeContainer.style.opacity = "1";
    threeContainer.style.pointerEvents = "auto";
  } else if (flight.active) {
    svgEl.style.opacity = "0.35";
    threeContainer.style.opacity = "1";
    threeContainer.style.pointerEvents = "none";
  } else {
    // Scroll creation owns opacity/pose until free-flight begins.
    svgEl.style.opacity = String(1 - morphT);
    threeContainer.style.opacity = String(morphT);
    threeContainer.style.pointerEvents = morphT > 0.05 ? "auto" : "none";
  }

  // Theme can lock for the page chrome; color/pose stay scroll-driven until flight.
  applyColorProgress(themeLocked ? 1 : colorT);

  if (flight.active) {
    // Free-flight owns the pose.
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

function startPageIntro() {
  if (introStarted) return;
  introStarted = true;
  if (window.scrollY > 80) {
    intro.lines = 1;
    intro.frame = 1;
    applySectionSequences();
    return;
  }
  playIntro();
}

requestAnimationFrame(() => {
  ScrollTrigger.refresh();
  startPageIntro();
});

window.addEventListener("load", () => {
  fitDroneToSketch();
  syncDebugPoseFromPivot();
  ScrollTrigger.refresh();
  applySectionSequences();
});

initDroneDebugGui();
