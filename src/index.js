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

  // Plain fixed overlay — native <dialog> swallows / blocks touch-scroll on iOS.
  const modal = document.createElement("div");
  modal.className = "skills-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Full technologies list");
  modal.hidden = true;
  modal.innerHTML = `
    <div class="skills-modal__backdrop" data-skills-close></div>
    <div class="skills-modal__sheet" tabindex="-1">
      <div class="skills-modal__toolbar">
        <button type="button" class="skills-modal__close" aria-label="Close skills">
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <ul class="skills-modal__grid">
        ${skills
          .map(
            (s, i) =>
              `<li style="--i:${i}"><img src="${s.src}" alt="" /><span>${s.label}</span></li>`
          )
          .join("")}
      </ul>
    </div>
  `;
  document.body.appendChild(modal);

  const sheet = modal.querySelector(".skills-modal__sheet");
  const closeBtn = modal.querySelector(".skills-modal__close");
  let lastFocus = null;
  let lockScrollY = 0;

  const setScrollLock = (locked) => {
    document.documentElement.classList.toggle("skills-modal-open", locked);
    document.body.classList.toggle("skills-modal-open", locked);
    if (locked) {
      lockScrollY = window.scrollY || window.pageYOffset || 0;
      document.body.style.top = `-${lockScrollY}px`;
      lenis?.stop();
    } else {
      document.body.style.top = "";
      lenis?.start();
      window.scrollTo(0, lockScrollY);
    }
  };

  const close = () => {
    modal.classList.remove("is-open");
    modal.hidden = true;
    setScrollLock(false);
    lastFocus?.focus?.();
    lastFocus = null;
  };

  const open = () => {
    lastFocus = document.activeElement;
    if (typeof releaseDroneFromPointer === "function") {
      releaseDroneFromPointer();
    }
    setScrollLock(true);
    modal.hidden = false;
    sheet.scrollTop = 0;
    // force reflow then animate in
    void modal.offsetHeight;
    modal.classList.add("is-open");
    closeBtn.focus();
  };

  trigger.addEventListener("click", open);
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    close();
  });
  modal.addEventListener("click", (e) => {
    if (e.target?.hasAttribute?.("data-skills-close")) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });

  // Keep touch scrolling on the sheet — never let it bubble to the page/drone
  sheet.addEventListener(
    "touchmove",
    (e) => {
      e.stopPropagation();
    },
    { passive: true }
  );
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

/** WebGL can fail under iOS Lockdown Mode — keep the page usable without 3D. */
let webglOk = false;
let renderer = null;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 3.2);
camera.lookAt(0, 0, 0);
const dronePivot = new THREE.Group();
scene.add(dronePivot);

try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  threeContainer.appendChild(renderer.domElement);

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
  webglOk = true;
} catch (err) {
  console.warn("WebGL unavailable — continuing without the 3D drone", err);
  webglOk = false;
}

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
const HOME_WARMED_KEY = "fc-home-warmed";

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

function markHomeWarmed() {
  try {
    sessionStorage.setItem(HOME_WARMED_KEY, "1");
  } catch (_) {
    /* ignore */
  }
}

function isHomeWarmed() {
  try {
    return sessionStorage.getItem(HOME_WARMED_KEY) === "1";
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
const _flyBaseQ = new THREE.Quaternion();
const _flyEuler = new THREE.Euler();
const _flyTmp = new THREE.Vector3();
const _flyHome = new THREE.Vector3();
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
  flatQuat: new THREE.Quaternion(),
  dockPos: new THREE.Vector3(),
  dockScale: 1,
  target: new THREE.Vector3(),
  mouseWorld: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  roll: 0,
  yawRate: 0,
  // 0 = tipped dock pose · 1 = flat/level hover
  flatness: 0,
  nextTargetAt: 0,
  scale: 1,
  legBoost: 1,
  laneDir: 1,
  // cruise | outbound (away from camera) | inbound (face user + return)
  phase: "cruise",
  // level = flat attitude · tilt = pitch/roll into travel · bank = stronger rolls
  attitude: "tilt",
  // Props-up cruise heading (rad). Not always facing the user.
  holdYaw: 0,
  route: null,
  lastRouteKind: "",
  pauseUntil: 0,
  offscreenT: 0,
  // After pointer steer — don't clamp/yank until free-flight resumes.
  steerGraceUntil: 0,
  // 0 = still in finished-scroll pose · 1 = free-flight attitude
  takeoffBlend: 1,
};

/** Props-up headings — favor 45° / 90° so the glass isn't always at the user. */
const CRUISE_YAW_CHOICES = [
  { yaw: 0, w: 0.7 },
  { yaw: Math.PI / 4, w: 1.5 },
  { yaw: -Math.PI / 4, w: 1.5 },
  { yaw: Math.PI / 2, w: 1.8 },
  { yaw: -Math.PI / 2, w: 1.8 },
  { yaw: (Math.PI * 3) / 4, w: 0.9 },
  { yaw: (-Math.PI * 3) / 4, w: 0.9 },
  { yaw: Math.PI, w: 0.75 },
];

function pickCruiseYaw(kind = "") {
  // Orbits / axes look best crabbing on a fixed 45° / 90° heading.
  const preferSide =
    kind.startsWith("orbit") ||
    kind === "figure8" ||
    kind === "pedestal" ||
    kind === "slider" ||
    kind === "edgeSweep" ||
    kind === "diagonal" ||
    kind === "racetrack";
  const pool = preferSide
    ? CRUISE_YAW_CHOICES.filter((e) => Math.abs(e.yaw) > 0.2)
    : CRUISE_YAW_CHOICES;
  const total = pool.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of pool) {
    r -= e.w;
    if (r <= 0) return e.yaw;
  }
  return Math.PI / 2;
}

/**
 * Full mix: circles, axes, diagonals, depth, turn→dash, 360s, edge sweeps.
 */
const FLIGHT_ROUTE_WEIGHTS = [
  { kind: "orbitWide", w: 2.8 },
  { kind: "orbitTall", w: 2.1 },
  { kind: "orbitHelix", w: 1.8 },
  { kind: "orbitSpiral", w: 2.4 }, // up / down corkscrew
  { kind: "pedestal", w: 2.4 }, // up / down straights
  { kind: "slider", w: 2.4 }, // left / right straights
  { kind: "edgeSweep", w: 2.3 }, // full left → back → full right
  { kind: "diagonal", w: 2.6 },
  { kind: "farAway", w: 2.4 },
  { kind: "flyThrough", w: 2.0 },
  { kind: "turnDash", w: 3.0 }, // 40° / 90° yaw then fly that way
  { kind: "spin360", w: 1.8 }, // full 360 on yaw
  { kind: "figure8", w: 1.0 },
  { kind: "home", w: 0.9 },
  { kind: "racetrack", w: 0.6 },
  { kind: "slalom", w: 0.45 },
  { kind: "dronie", w: 0.45 },
  { kind: "hover", w: 0.4 },
];

/** Routes that intentionally graze the frame — don't yank them home early. */
const FLIGHT_EDGE_KINDS = new Set([
  "diagonal",
  "orbitWide",
  "orbitTall",
  "orbitHelix",
  "orbitSpiral",
  "figure8",
  "racetrack",
  "pedestal",
  "slider",
  "edgeSweep",
  "farAway",
  "flyThrough",
  "dronie",
  "scanDash",
]);

const FLIGHT_ORBIT_KINDS = new Set([
  "orbitWide",
  "orbitTall",
  "orbitHelix",
  "orbitSpiral",
  "figure8",
]);

/** In-place yaw kinds (hold station while rotating). */
const FLIGHT_YAW_KINDS = new Set(["turnDash", "spin360", "scan", "spin"]);

/** Relative yaw turns (deg) — every screen direction, then dash that way. */
const TURN_DASH_DEGS = [
  40, -40, 90, -90, 40, -40, 90, -90, 180, -180, 130, -130, 50, -50,
];

function pickSpeedProfile(kind) {
  if (kind === "hover") {
    return { name: "crawl", boost: 0.42, durScale: 1.25 };
  }
  // Wide speed palette — crawl → cruise → dash.
  const r = Math.random();
  if (FLIGHT_ORBIT_KINDS.has(kind) || kind === "orbitSpiral") {
    if (r < 0.3) return { name: "crawl", boost: 0.48, durScale: 1.55 };
    if (r < 0.65) return { name: "slow", boost: 0.72, durScale: 1.25 };
    if (r < 0.9) return { name: "cruise", boost: 1.0, durScale: 1.05 };
    return { name: "brisk", boost: 1.35, durScale: 0.82 };
  }
  if (r < 0.18) return { name: "crawl", boost: 0.4, durScale: 1.7 };
  if (r < 0.4) return { name: "slow", boost: 0.62, durScale: 1.4 };
  if (r < 0.68) return { name: "cruise", boost: 1.05, durScale: 1.05 };
  if (r < 0.88) return { name: "brisk", boost: 1.55, durScale: 0.75 };
  return { name: "dash", boost: 2.15, durScale: 0.48 };
}

function pickPauseDuration() {
  const r = Math.random();
  if (r < 0.45) return 0.25 + Math.random() * 0.4; // short
  if (r < 0.8) return 0.7 + Math.random() * 0.7; // medium
  return 1.4 + Math.random() * 1.1; // occasional longer hold
}

function flightBounds() {
  // Route planning uses the home-depth frustum.
  return flightBoundsAtDepth(0);
}

/** Visible half-extents at a world Z (grows as the drone goes farther away). */
function flightBoundsAtDepth(z) {
  const dist = Math.max(camera.position.z - z, 0.35);
  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist;
  const aspect = Math.max(camera.aspect || 1, 0.7);
  const pad = 1.08;
  return {
    x: halfH * aspect * pad,
    y: halfH * pad * 0.92,
    zNear: -14.5,
    zFar: Math.min(camera.position.z * 0.78, 2.45),
  };
}

/** Center-right base — mid height, right side of frame. */
function flightHome(out = _flyHome) {
  const b = flightBounds();
  return out.set(
    b.x * 0.4,
    b.y * 0.02,
    THREE.MathUtils.lerp(0.4, b.zFar * 0.58, 0.55)
  );
}

function clampToPatrol(x, y, z) {
  const b = flightBoundsAtDepth(z);
  return new THREE.Vector3(
    THREE.MathUtils.clamp(x, -b.x * 0.98, b.x * 0.98),
    THREE.MathUtils.clamp(y, -b.y * 0.95, b.y * 0.95),
    THREE.MathUtils.clamp(z, b.zNear, b.zFar)
  );
}

/** Near-edge corners so diagonals read across the whole screen. */
function screenCorner(xSign, ySign, z) {
  const b = flightBounds();
  return new THREE.Vector3(
    xSign * b.x * (0.9 + Math.random() * 0.08),
    ySign * b.y * (0.84 + Math.random() * 0.1),
    z
  );
}

function isDroneOffscreen() {
  _flyScreen.copy(flight.pos).project(camera);
  return Math.abs(_flyScreen.x) > 1.12 || Math.abs(_flyScreen.y) > 1.05;
}

/** Pull back to the center-right base when lingering offscreen. */
function startReturnOnscreen(t) {
  const home = flightHome(new THREE.Vector3());
  const route = {
    kind: "returnOn",
    t0: t,
    duration: 1.2 + Math.random() * 0.7,
    points: [home],
    speedName: "fast",
    speedBoost: 1.9,
  };
  flight.route = route;
  flight.lastRouteKind = "returnOn";
  flight.attitude = "level";
  flight.legBoost = 1.9;
  flight.phase = "cruise";
  flight.pauseUntil = 0;
  flight.offscreenT = 0;
  flight.nextTargetAt = t + route.duration;
  flight.target.copy(home);
}

/** After a yaw turn, dash in the direction the glass/nose now faces. */
function startDashFromScan(t) {
  const b = flightBounds();
  const home = flightHome(_flyHome);
  // Snap to the intended end yaw so the dash matches the turn.
  if (typeof flight.route?.scanTo === "number") {
    flight.yaw = flight.route.scanTo;
  }
  getFlightFacing(_flyFacing);
  const reach = b.x * (0.62 + Math.random() * 0.42);
  const dest = flight.pos.clone().addScaledVector(_flyFacing, reach);
  // Keep some height drift so dashes don't feel glued to one lane.
  dest.y += (Math.random() - 0.5) * b.y * 0.28;
  dest.x = THREE.MathUtils.clamp(dest.x, -b.x * 0.94, b.x * 0.94);
  dest.y = THREE.MathUtils.clamp(dest.y, -b.y * 0.85, b.y * 0.85);
  dest.z = THREE.MathUtils.clamp(
    flight.pos.z + _flyFacing.z * (0.7 + Math.random() * 0.9),
    b.zNear * 0.45,
    b.zFar * 0.95
  );
  // Prefer staying near mid height after a long lateral push.
  if (Math.abs(dest.x) > b.x * 0.7) {
    dest.y = THREE.MathUtils.lerp(dest.y, home.y, 0.35);
  }
  const speed = pickSpeedProfile("turnDash");
  const route = {
    kind: "scanDash",
    t0: t,
    duration: pickRouteDuration(1.6, 3.8) * speed.durScale,
    points: [dest],
    speedName: speed.name,
    speedBoost: Math.max(1.05, 1.45 * speed.boost),
  };
  flight.route = route;
  flight.lastRouteKind = "turnDash";
  flight.attitude = Math.random() < 0.55 ? "level" : "tilt";
  flight.holdYaw = flight.yaw;
  flight.legBoost = route.speedBoost;
  flight.phase = "cruise";
  flight.pauseUntil = 0;
  flight.nextTargetAt = t + route.duration;
  flight.target.copy(dest);
}

/** Hold station, yaw by a clear angle, then dash that way. */
function setupTurnDashRoute(route, home) {
  const hold = clampToPatrol(
    THREE.MathUtils.lerp(flight.pos.x, home.x, 0.35),
    THREE.MathUtils.lerp(flight.pos.y, home.y, 0.55),
    THREE.MathUtils.lerp(flight.pos.z, home.z, 0.25)
  );
  route.points = [hold];
  route.scanFrom = flight.yaw;
  route.scanMid = null;
  // Bias hard toward the requested 40° and 90° turns.
  const pick = Math.random();
  let deg;
  if (pick < 0.42) deg = Math.random() < 0.5 ? 90 : -90;
  else if (pick < 0.78) deg = Math.random() < 0.5 ? 40 : -40;
  else deg = TURN_DASH_DEGS[(Math.random() * TURN_DASH_DEGS.length) | 0];
  route.turnDeg = deg;
  route.scanTo = flight.yaw + THREE.MathUtils.degToRad(deg);
  const absDeg = Math.abs(deg);
  route.duration = 0.55 + absDeg / 95 + Math.random() * 0.35;
  route.dashAfter = true;
  flight.attitude = "scan";
  flight.legBoost = 0.35;
}

/** Full 360° (sometimes 720°) pirouette on the yaw axis. */
function setupSpin360Route(route, home) {
  const hold = clampToPatrol(
    THREE.MathUtils.lerp(flight.pos.x, home.x, 0.45),
    THREE.MathUtils.lerp(flight.pos.y, home.y, 0.6),
    THREE.MathUtils.lerp(flight.pos.z, home.z, 0.3)
  );
  route.points = [hold];
  route.scanFrom = flight.yaw;
  route.scanMid = null;
  const spinDir = Math.random() > 0.5 ? 1 : -1;
  const turns = Math.random() < 0.72 ? 1 : 2;
  route.turnDeg = spinDir * 360 * turns;
  route.scanTo = flight.yaw + spinDir * Math.PI * 2 * turns;
  route.duration = 1.7 + turns * 1.15 + Math.random() * 0.4;
  route.dashAfter = Math.random() < 0.55;
  flight.attitude = "scan";
  flight.legBoost = 0.35;
}

/** Props-up hover (world +Y). Identity pivot is top-down; -90° X stands it up. */
function buildPropsUpQuat(out, yaw = 0) {
  _flyEuler.set(-Math.PI / 2, yaw, 0, "YXZ");
  return out.setFromEuler(_flyEuler);
}

function pickRouteDuration(short, long) {
  // Varied leg lengths — short dashes and longer cruises.
  const u = Math.random();
  if (u < 0.3) return short * (0.75 + Math.random() * 0.35);
  if (u < 0.7) return (short + long) * 0.5 * (0.85 + Math.random() * 0.35);
  return long * (0.9 + Math.random() * 0.45);
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

  // Color BEFORE takeoff — otherwise one frame of wireframe flashes on screen.
  applyFinishedDockPose();
  if (droneModel) applyColorProgress(1);
  markStoryComplete({ immediate: true });
  applySectionSequences();
  return true;
}

function pickRouteKind() {
  const pool = FLIGHT_ROUTE_WEIGHTS.filter((e) => e.kind !== flight.lastRouteKind);
  const total = pool.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of pool) {
    r -= e.w;
    if (r <= 0) return e.kind;
  }
  return pool[0]?.kind || "pedestal";
}

function startFlightRoute(t) {
  const b = flightBounds();
  const home = flightHome(_flyHome);
  // First move after scroll / pointer steer: continue from the exact spot.
  let kind = pickRouteKind();
  if (!flight.lastRouteKind || flight.lastRouteKind === "steer") {
    kind = Math.random() < 0.55 ? "hover" : "pedestal";
  } else if (flight.pos.x < -b.x * 0.55 && Math.random() < 0.5) {
    // If parked far left, bias back toward the center-right base.
    kind = "home";
  }
  const dir = Math.random() > 0.5 ? 1 : -1;
  const speed = pickSpeedProfile(kind);
  const zMid = THREE.MathUtils.clamp(
    gsap.utils.interpolate(home.z * 0.75, b.zFar * 0.65, Math.random()),
    -2.2,
    b.zFar * 0.85
  );
  const route = {
    kind,
    t0: t,
    duration: 5.5,
    dir,
    cx: home.x * 0.35,
    cy: home.y,
    cz: zMid,
    rx: b.x * 0.7,
    ry: b.y * 0.55,
    zAmp: 1.1,
    zDeep: b.zNear * (0.75 + Math.random() * 0.25),
    zClose: gsap.utils.interpolate(b.zFar * 0.5, b.zFar * 0.98, Math.random()),
    points: null,
    speedName: speed.name,
  };

  flight.phase = "cruise";
  flight.laneDir = dir;
  flight.pauseUntil = 0;

  if (kind === "turnDash") {
    setupTurnDashRoute(route, home);
  } else if (kind === "spin360") {
    setupSpin360Route(route, home);
  } else if (kind === "home") {
    route.points = [
      clampToPatrol(
        home.x + (Math.random() - 0.5) * b.x * 0.08,
        home.y + (Math.random() - 0.5) * b.y * 0.06,
        home.z + (Math.random() - 0.5) * 0.18
      ),
    ];
    route.duration = pickRouteDuration(1.2, 2.6);
    flight.attitude = "level";
    flight.legBoost = 1.25;
  } else if (kind === "hover") {
    // Stay put after dock takeoff or pointer release; otherwise drift near home.
    const fromHere =
      !flight.lastRouteKind || flight.lastRouteKind === "steer";
    const hold = fromHere
      ? new THREE.Vector3(flight.pos.x, flight.pos.y, flight.pos.z)
      : clampToPatrol(
          home.x + (Math.random() - 0.5) * b.x * 0.1,
          home.y + (Math.random() - 0.5) * b.y * 0.08,
          home.z + (Math.random() - 0.5) * 0.12
        );
    route.points = [hold];
    route.duration = fromHere
      ? 1.1 + Math.random() * 0.6
      : 0.55 + Math.random() * 0.7;
    flight.attitude = "level";
    flight.legBoost = 1.05;
  } else if (kind === "pedestal") {
    // Full-frame vertical: bottom ↔ top on a nearly fixed X/Z.
    const goingUp = Math.random() > 0.5;
    const fromHere =
      !flight.lastRouteKind || flight.lastRouteKind === "steer";
    const x = fromHere
      ? flight.pos.x
      : THREE.MathUtils.lerp(flight.pos.x, home.x, 0.35);
    const z = fromHere
      ? flight.pos.z
      : THREE.MathUtils.lerp(flight.pos.z, home.z, 0.4);
    const yTop = b.y * (0.82 + Math.random() * 0.12);
    const yBot = -b.y * (0.82 + Math.random() * 0.12);
    const y1 = goingUp ? yBot : yTop;
    const y2 = goingUp ? yTop : yBot;
    // Always do a clear up+down (or down+up) so the axis reads.
    route.points = [
      clampToPatrol(x, y1, z),
      clampToPatrol(x, y2, z),
      clampToPatrol(x, y1 * 0.15 + home.y * 0.85, z),
    ];
    route.duration = pickRouteDuration(3.6, 6.8);
    flight.attitude = "level";
    flight.legBoost = 1.45;
  } else if (kind === "slider") {
    // Full-frame horizontal: left edge ↔ right edge.
    const y = home.y + (Math.random() - 0.5) * b.y * 0.18;
    const z = home.z + (Math.random() - 0.5) * 0.3;
    const xL = -b.x * (0.82 + Math.random() * 0.14);
    const xR = b.x * (0.82 + Math.random() * 0.14);
    const x1 = dir > 0 ? xL : xR;
    const x2 = dir > 0 ? xR : xL;
    route.points = [
      clampToPatrol(x1, y, z),
      clampToPatrol(x2, y, z),
      clampToPatrol(home.x, y, z),
    ];
    route.duration = pickRouteDuration(3.4, 6.5);
    flight.attitude = Math.random() < 0.45 ? "bank" : "level";
    flight.legBoost = 1.5;
  } else if (kind === "edgeSweep") {
    // Totally left, return through center, totally right (or reverse).
    const y = home.y + (Math.random() - 0.5) * b.y * 0.16;
    const z = home.z + (Math.random() - 0.5) * 0.28;
    const xL = -b.x * (0.9 + Math.random() * 0.08);
    const xR = b.x * (0.9 + Math.random() * 0.08);
    const first = dir > 0 ? xL : xR;
    const last = dir > 0 ? xR : xL;
    route.points = [
      clampToPatrol(first, y, z),
      clampToPatrol(home.x * 0.15, y, z),
      clampToPatrol(last, y, z),
      clampToPatrol(home.x, y, z),
    ];
    route.duration = pickRouteDuration(5.0, 9.0);
    flight.attitude = Math.random() < 0.4 ? "bank" : "level";
    flight.legBoost = 1.4;
  } else if (kind === "farAway") {
    // Retreat far from the camera (tiny), hold, then return to base.
    const deepZ = b.zNear * (0.88 + Math.random() * 0.12);
    const midZ = deepZ * 0.45;
    route.points = [
      clampToPatrol(
        home.x * 0.55 + (Math.random() - 0.5) * b.x * 0.2,
        home.y + (Math.random() - 0.5) * b.y * 0.18,
        midZ
      ),
      clampToPatrol(
        home.x * 0.25 + (Math.random() - 0.5) * b.x * 0.15,
        home.y + (Math.random() - 0.5) * b.y * 0.14,
        deepZ
      ),
      clampToPatrol(
        (Math.random() - 0.5) * b.x * 0.12,
        home.y + (Math.random() - 0.5) * b.y * 0.1,
        deepZ * 0.92
      ),
      clampToPatrol(home.x, home.y, home.z),
    ];
    route.duration = pickRouteDuration(6.5, 11.0);
    flight.phase = "outbound";
    flight.attitude = "tilt";
    flight.legBoost = 1.15;
  } else if (kind === "flyThrough") {
    // Dive at the user → pass the camera → 180° turn → fly back, glass opposite.
    const side = (Math.random() - 0.5) * b.x * 0.22;
    const y = home.y + (Math.random() - 0.5) * b.y * 0.18;
    const pastZ = camera.position.z + 1.25 + Math.random() * 0.95;
    const turnSide = (Math.random() > 0.5 ? 1 : -1) * b.x * (0.12 + Math.random() * 0.12);
    route.points = [
      new THREE.Vector3(side, y, route.zDeep),
      new THREE.Vector3(side * 0.55, y * 0.85, -2.2),
      new THREE.Vector3(side * 0.2, y * 0.45, zMid),
      new THREE.Vector3(0, home.y * 0.25, b.zFar * 0.92),
      new THREE.Vector3(turnSide * 0.35, 0.02, pastZ), // past the lens
      new THREE.Vector3(turnSide, 0.04, pastZ + 0.35), // bank/turn pocket
      new THREE.Vector3(turnSide * 0.4, home.y * 0.2, b.zFar * 0.75), // re-enter
      new THREE.Vector3(
        home.x * 0.55 + (Math.random() - 0.5) * b.x * 0.12,
        home.y,
        THREE.MathUtils.lerp(home.z, -1.8, 0.45)
      ),
    ];
    route.duration = pickRouteDuration(6.5, 11.0);
    flight.phase = "inbound";
    flight.attitude = "tilt";
    flight.legBoost = 1.55;
  } else if (kind === "diagonal") {
    // True corner → opposite corner across the frame.
    const xSign = Math.random() > 0.5 ? 1 : -1;
    const ySign = Math.random() > 0.5 ? 1 : -1;
    const zA = gsap.utils.interpolate(-1.8, zMid, Math.random() * 0.6);
    const zB = gsap.utils.interpolate(zMid, route.zClose, 0.4 + Math.random() * 0.55);
    const a = screenCorner(-xSign, -ySign, zA);
    const c = screenCorner(xSign, ySign, zB);
    const mid = new THREE.Vector3().lerpVectors(a, c, 0.5);
    mid.z = gsap.utils.interpolate(zA, zB, 0.5);
    route.points = [a, mid, c];
    route.duration = pickRouteDuration(3.8, 7.2);
    flight.attitude = Math.random() < 0.3 ? "level" : "tilt";
    flight.legBoost = 1.55;
  } else if (kind === "orbitWide") {
    // Large screen-filling circle — keep attitude mostly level.
    route.cx = (Math.random() - 0.5) * b.x * 0.06;
    route.cy = home.y + (Math.random() - 0.5) * b.y * 0.05;
    route.rx = b.x * (0.92 + Math.random() * 0.14);
    route.ry = b.y * (0.78 + Math.random() * 0.16);
    route.zAmp = 0.45 + Math.random() * 0.7;
    route.cz = gsap.utils.interpolate(-0.4, home.z, Math.random());
    route.duration = pickRouteDuration(8.5, 15.5);
    route.laps = 2 + (Math.random() < 0.55 ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0);
    flight.attitude = Math.random() < 0.78 ? "level" : "bank";
    flight.legBoost = 1.15;
  } else if (kind === "orbitTall") {
    route.cx = (Math.random() - 0.5) * b.x * 0.08;
    route.cy = home.y;
    route.rx = b.x * (0.58 + Math.random() * 0.22);
    route.ry = b.y * (0.9 + Math.random() * 0.12);
    route.zAmp = 0.4 + Math.random() * 0.65;
    route.cz = gsap.utils.interpolate(-0.35, home.z, Math.random());
    route.duration = pickRouteDuration(7.5, 13.5);
    route.laps = 2 + (Math.random() < 0.45 ? 1 : 0);
    flight.attitude = Math.random() < 0.78 ? "level" : "bank";
    flight.legBoost = 1.15;
  } else if (kind === "orbitHelix") {
    route.cx = (Math.random() - 0.5) * b.x * 0.08;
    route.cy = home.y;
    route.rx = b.x * (0.82 + Math.random() * 0.16);
    route.ry = b.y * (0.72 + Math.random() * 0.18);
    route.z0 = route.zDeep * (0.45 + Math.random() * 0.35);
    route.z1 = route.zClose;
    route.zAmp = 0;
    route.duration = pickRouteDuration(8.5, 15.0);
    route.laps = 2 + (Math.random() < 0.5 ? 1 : 0);
    flight.attitude = Math.random() < 0.75 ? "level" : "bank";
    flight.legBoost = 1.15;
  } else if (kind === "orbitSpiral") {
    // Corkscrew: circle in X/Z while climbing / descending in Y.
    const goingUp = Math.random() > 0.5;
    route.cx = (Math.random() - 0.5) * b.x * 0.08;
    route.cz = gsap.utils.interpolate(-1.2, home.z * 0.7, Math.random());
    route.rx = b.x * (0.78 + Math.random() * 0.2);
    route.rz = Math.max(0.85, Math.abs(route.zDeep) * (0.12 + Math.random() * 0.12));
    route.y0 = goingUp ? -b.y * (0.78 + Math.random() * 0.14) : b.y * (0.78 + Math.random() * 0.14);
    route.y1 = goingUp ? b.y * (0.78 + Math.random() * 0.14) : -b.y * (0.78 + Math.random() * 0.14);
    // Sometimes up then back down (or reverse) in one spiral.
    route.yRoundTrip = Math.random() < 0.55;
    route.duration = pickRouteDuration(8.0, 15.0);
    route.laps = 2 + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.25 ? 1 : 0);
    flight.attitude = Math.random() < 0.8 ? "level" : "bank";
    flight.legBoost = 1.1;
  } else if (kind === "figure8") {
    route.cx = (Math.random() - 0.5) * b.x * 0.06;
    route.cy = home.y;
    route.rx = b.x * (0.88 + Math.random() * 0.12);
    route.ry = b.y * (0.72 + Math.random() * 0.18);
    route.zAmp = 0.55 + Math.random() * 0.7;
    route.cz = gsap.utils.interpolate(-0.5, zMid, Math.random());
    route.duration = pickRouteDuration(6.5, 12.0);
    route.laps = 1 + (Math.random() < 0.4 ? 1 : 0);
    flight.attitude = Math.random() < 0.7 ? "level" : "tilt";
    flight.legBoost = 1.25;
  } else if (kind === "racetrack") {
    const outX = b.x * 0.88;
    const outY = b.y * 0.78;
    const zFarish = route.zDeep * (0.55 + Math.random() * 0.35);
    const zNearish = route.zClose * (0.55 + Math.random() * 0.4);
    const corners = [
      new THREE.Vector3(-outX, outY, zFarish),
      new THREE.Vector3(outX, outY, zNearish),
      new THREE.Vector3(outX, -outY, zFarish),
      new THREE.Vector3(-outX, -outY, zNearish),
    ];
    let best = 0;
    let bestD = Infinity;
    corners.forEach((p, i) => {
      const d = p.distanceToSquared(flight.pos);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    route.points = [];
    for (let i = 0; i <= 4; i++) {
      const idx = (best + i * dir + corners.length * 4) % corners.length;
      route.points.push(corners[idx].clone());
    }
    route.duration = pickRouteDuration(3.6, 8.2);
    flight.attitude = Math.random() < 0.35 ? "level" : "bank";
    flight.legBoost = 1.5;
  } else if (kind === "dronie") {
    const side = (Math.random() - 0.5) * b.x * 0.85;
    route.points = [
      new THREE.Vector3(side, b.y * (0.15 + Math.random() * 0.55), route.zDeep),
      new THREE.Vector3(
        -side * 0.55,
        b.y * (0.35 + Math.random() * 0.4),
        route.zDeep * 0.75
      ),
      new THREE.Vector3(
        (Math.random() - 0.5) * b.x * 0.45,
        (Math.random() - 0.5) * b.y * 0.35,
        route.zClose
      ),
    ];
    route.duration = pickRouteDuration(3.2, 7.0);
    flight.phase = "outbound";
    flight.attitude = Math.random() < 0.35 ? "level" : "tilt";
    flight.legBoost = 1.5;
  } else {
    const bends = 6;
    route.points = [];
    for (let i = 0; i < bends; i++) {
      const u = i / (bends - 1);
      const x = dir * (i % 2 === 0 ? -1 : 1) * b.x * (0.55 + Math.random() * 0.3);
      const y =
        THREE.MathUtils.lerp(-b.y * 0.7, b.y * 0.7, u) +
        (Math.random() - 0.5) * b.y * 0.15;
      const z = gsap.utils.interpolate(
        route.zDeep,
        route.zClose,
        (Math.sin(u * Math.PI) + 1) * 0.5
      );
      route.points.push(new THREE.Vector3(x, y, z));
    }
    route.duration = pickRouteDuration(3.2, 7.5);
    flight.attitude =
      Math.random() < 0.4 ? "level" : Math.random() < 0.5 ? "bank" : "tilt";
    flight.legBoost = 1.5;
  }

  route.duration = Math.max(0.85, route.duration * speed.durScale);
  flight.legBoost = Math.max(0.45, (flight.legBoost || 1) * speed.boost);
  route.speedBoost = flight.legBoost;

  // Props-up cruise heading: prefer 45° / 90° so glass isn't glued to the user.
  if (kind === "flyThrough") {
    flight.holdYaw = 0;
  } else if (!FLIGHT_YAW_KINDS.has(kind)) {
    flight.holdYaw = pickCruiseYaw(kind);
    if (flight.attitude === "tilt" && Math.random() < 0.55) {
      flight.attitude = "level";
    }
  }

  flight.route = route;
  flight.lastRouteKind = kind;
  flight.nextTargetAt = t + route.duration;
  sampleFlightRoute(route, 0, flight.target);
}

function sampleFlightRoute(route, u, out) {
  const uu = THREE.MathUtils.clamp(u, 0, 1);
  const b = flightBounds();

  if (route.points && route.points.length) {
    if (route.points.length === 1) {
      out.copy(route.points[0]);
      return out;
    }
    const segF = uu * (route.points.length - 1);
    const i = Math.min(route.points.length - 2, segF | 0);
    const local = segF - i;
    out.lerpVectors(route.points[i], route.points[i + 1], local);
    if (route.kind === "dronie" || route.kind === "farAway") {
      flight.phase = uu < 0.72 ? "outbound" : "inbound";
    } else if (route.kind === "flyThrough") {
      // Approach → past camera → rotate → return with glass opposite.
      if (uu < 0.48) flight.phase = "inbound";
      else if (uu < 0.62) flight.phase = "turnaround";
      else flight.phase = "outbound";
    }
    return out;
  }

  const laps = route.laps || 1;
  const angle = route.dir * uu * Math.PI * 2 * laps;
  const cx = route.cx;
  const cy = route.cy;
  const rx = route.rx;
  const ry = route.ry;
  const zAmp = route.zAmp || 0.35;

  if (route.kind === "orbitSpiral") {
    const y0 = route.y0 ?? -b.y * 0.75;
    const y1 = route.y1 ?? b.y * 0.75;
    let yU = uu;
    if (route.yRoundTrip) {
      yU = uu < 0.5 ? uu * 2 : (1 - uu) * 2;
    }
    const y = gsap.utils.interpolate(y0, y1, yU);
    const rz = route.rz || 1.1;
    out.set(
      cx + rx * Math.cos(angle),
      y,
      (route.cz || 0) + rz * Math.sin(angle)
    );
    flight.phase = yU < 0.55 ? (y1 > y0 ? "inbound" : "outbound") : "cruise";
  } else {
    let z;
    if (route.kind === "orbitHelix") {
      const z0 = route.z0 ?? route.zDeep ?? b.zNear;
      const z1 = route.z1 ?? route.zClose ?? b.zFar;
      z = gsap.utils.interpolate(z0, z1, uu);
      flight.phase = uu < 0.5 ? "outbound" : "inbound";
    } else {
      z = route.cz + zAmp * Math.sin(angle * 0.85);
    }

    if (route.kind === "figure8") {
      out.set(
        cx + rx * Math.sin(angle),
        cy + ry * Math.sin(angle) * Math.cos(angle),
        z
      );
    } else {
      out.set(cx + rx * Math.cos(angle), cy + ry * Math.sin(angle), z);
    }
  }

  // Soft clamp — allow near-full-frame circles.
  out.x = THREE.MathUtils.clamp(out.x, -b.x * 1.02, b.x * 1.02);
  out.y = THREE.MathUtils.clamp(out.y, -b.y * 1.0, b.y * 1.0);
  out.z = THREE.MathUtils.clamp(
    out.z,
    b.zNear,
    Math.max(b.zFar, camera.position.z + 0.2)
  );
  return out;
}

function beginFlightPause(t) {
  const wait = pickPauseDuration();
  flight.route = {
    kind: "pause",
    t0: t,
    duration: wait,
    points: [flight.pos.clone()],
    speedBoost: 0.4,
  };
  flight.pauseUntil = t + wait;
  flight.nextTargetAt = flight.pauseUntil;
  flight.target.copy(flight.pos);
  flight.attitude = "level";
  // Keep the current cruise heading while hovering (don't snap glass to user).
  if (Math.random() < 0.35) flight.holdYaw = pickCruiseYaw("hover");
  flight.legBoost = 0.4;
  flight.phase = "cruise";
  flight.vel.multiplyScalar(0.35);
}

function updateFlightRoute(t) {
  if (t < flight.pauseUntil) {
    flight.target.copy(flight.pos);
    flight.attitude = "level";
    flight.legBoost = 0.4;
    flight.vel.multiplyScalar(0.86);
    return;
  }

  if (!flight.route || t >= flight.nextTargetAt) {
    // Turn / 360 finished → dash into the direction the glass now faces.
    if (FLIGHT_YAW_KINDS.has(flight.route?.kind) && flight.route.dashAfter) {
      startDashFromScan(t);
      return;
    }
    // Light pauses between moves — keep the flight lively.
    if (
      flight.route &&
      flight.route.kind !== "pause" &&
      flight.route.kind !== "returnOn" &&
      Math.random() < 0.42
    ) {
      beginFlightPause(t);
      return;
    }
    startFlightRoute(t);
    return;
  }

  const route = flight.route;
  if (route.kind === "pause" || FLIGHT_YAW_KINDS.has(route.kind)) {
    // Hold station (yaw handled in updateFreeFlight).
    if (route.points?.[0]) flight.target.copy(route.points[0]);
    else flight.target.copy(flight.pos);
    return;
  }
  const u = (t - route.t0) / Math.max(route.duration, 0.01);
  sampleFlightRoute(route, u, flight.target);
}

function readGlassForward(out) {
  dronePivot.getWorldPosition(_flyCross);
  out.copy(camera.position).sub(_flyCross);
  if (out.lengthSq() < 1e-8) out.set(0, 0, 1);
  return out.normalize();
}

function startFreeFlight() {
  if (flight.active || flight.staged || !droneModel) return;

  // Capture the finished-scroll pose before fullscreen — start flying from here.
  matchSketchSize();
  const beforeRect = threeContainer.getBoundingClientRect();
  const snap = capturePivotScreen();
  snap.beforeH = beforeRect.height;
  snap.quat = dronePivot.quaternion.clone();
  snap.pos = dronePivot.position.clone();

  flight.staged = true;
  visualStage.classList.add("is-flying");

  // Wait a frame so fullscreen CSS applies, then pin to the same screen pixels + size.
  requestAnimationFrame(() => {
    const width = threeContainer.clientWidth || 1;
    const height = threeContainer.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (renderer) renderer.setSize(width, height, false);

    placePivotAtScreen(snap);
    const afterRect = threeContainer.getBoundingClientRect();
    // Match fullscreen scale only — no extra zoom jump off the scroll pose.
    const scaleFix = snap.beforeH / Math.max(afterRect.height, 1);
    flight.scale = snap.scale * scaleFix;
    dronePivot.scale.setScalar(flight.scale);
    // Restore the exact finished-scroll orientation after the layout change.
    dronePivot.quaternion.copy(snap.quat);

    flight.dockPos.copy(dronePivot.position);
    flight.dockQuat.copy(snap.quat);
    flight.dockScale = flight.scale;
    dockedScale = flight.scale;

    readGlassForward(flight.dockHeading);
    flight.dockFlat.set(flight.dockHeading.x, 0, flight.dockHeading.z);
    if (flight.dockFlat.lengthSq() < 1e-6) flight.dockFlat.set(0, 0, 1);
    else flight.dockFlat.normalize();
    // Free-flight "level" = props toward the sky (blended in after takeoff).
    buildPropsUpQuat(flight.flatQuat, 0);
    flight.pos.copy(dronePivot.position);
    flight.vel.set(0, 0, 0);
    flight.yaw = 0;
    flight.holdYaw = 0;
    flight.pitch = 0;
    flight.roll = 0;
    flight.yawRate = 0;
    flight.flatness = 0;
    flight.takeoffBlend = 0;
    flight.legBoost = 1;
    flight.laneDir = Math.random() > 0.5 ? 1 : -1;
    flight.phase = "cruise";
    flight.attitude = "level";
    flight.route = null;
    flight.lastRouteKind = "";
    flight.pauseUntil = 0;
    flight.offscreenT = 0;
    flight.mouseBound = false;
    tagFrontPropellers();
    flight.holdDock = false;
    flight.active = true;
    setFlightHint(false);

    // Stay glued to the final scroll pose, then ease into free flight from here.
    flight.target.copy(flight.pos);
    flight.route = null;
    flight.nextTargetAt = clock.getElapsedTime() + 1.65;
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

/** Props-up base + yaw, with forward pitch and side bank. */
function applyQuadAttitude() {
  getFlightFacing(_flyFacing);
  // Free-flight level = props-up. Blend from the finished-scroll dock pose on takeoff.
  buildPropsUpQuat(_flyBaseQ, 0);
  if (Math.abs(flight.yaw) < 1e-4) {
    _flyQuat.copy(_flyBaseQ);
  } else {
    _flyQuat
      .setFromUnitVectors(flight.dockFlat, _flyFacing)
      .multiply(_flyBaseQ);
  }

  _flyRight.crossVectors(_flyWorldUp, _flyFacing);
  if (_flyRight.lengthSq() < 1e-6) _flyRight.set(1, 0, 0);
  else _flyRight.normalize();

  _flyPitchQ.setFromAxisAngle(_flyRight, flight.pitch);
  _flyRollQ.setFromAxisAngle(_flyFacing, flight.roll);
  _flyQuat.premultiply(_flyPitchQ).premultiply(_flyRollQ);

  if (flight.takeoffBlend < 0.999) {
    dronePivot.quaternion
      .copy(flight.dockQuat)
      .slerp(_flyQuat, flight.takeoffBlend);
  } else {
    dronePivot.quaternion.copy(_flyQuat);
  }
}

function uiBlocksFlight(target) {
  if (
    document.body.classList.contains("skills-modal-open") ||
    document.body.classList.contains("nav-open")
  ) {
    return true;
  }
  return !!target?.closest?.(
    "a, button, input, textarea, select, dialog, .skills-modal, .skills-modal__sheet, .site-nav, .demo-modal, .dg"
  );
}

function bindDroneToPointer(clientX, clientY) {
  if (!flight.active) return;
  if (document.body.classList.contains("skills-modal-open")) return;
  flight.mouseBound = true;
  flight.bindDepth = flight.pos.z;
  flight.pointerX = clientX;
  flight.pointerY = clientY;
  flight.vel.set(0, 0, 0);
  flight.route = null;
  flight.pauseUntil = 0;
  flight.offscreenT = 0;
  setFlightHint(true);
}

function releaseDroneFromPointer() {
  if (!flight.mouseBound) return;
  const t = clock.getElapsedTime();
  flight.mouseBound = false;
  // Resume free-flight from the exact steered pose — no mid-point snap.
  flight.target.copy(flight.pos);
  flight.vel.set(0, 0, 0);
  flight.route = null;
  flight.lastRouteKind = "steer";
  flight.phase = "cruise";
  flight.attitude = "level";
  flight.holdYaw = flight.yaw;
  flight.pauseUntil = 0;
  flight.offscreenT = 0;
  flight.steerGraceUntil = t + 1.4;
  flight.nextTargetAt = t + 0.55;
  setFlightHint(false);
}

function onFlightPointerDown(e) {
  if (!flight.active || e.button !== 0) return;
  // Don't steal touches from skills modal / nav / links.
  if (uiBlocksFlight(e.target)) return;
  bindDroneToPointer(e.clientX, e.clientY);
}

function onFlightPointerMove(e) {
  if (!flight.active || !flight.mouseBound) return;
  if (document.body.classList.contains("skills-modal-open")) {
    releaseDroneFromPointer();
    return;
  }
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

  // Ease from finished-scroll pose into free-flight attitude (no hard snap).
  if (flight.takeoffBlend < 1) {
    flight.takeoffBlend = Math.min(1, flight.takeoffBlend + dt / 1.55);
    flight.flatness = flight.takeoffBlend;
  }

  if (flight.mouseBound) {
    clientToWorldOnDepth(
      flight.pointerX,
      flight.pointerY,
      flight.bindDepth,
      flight.mouseWorld
    );
    flight.target.copy(flight.mouseWorld);
  } else {
    // Follow a continuous route (circle / diagonal / zigzag / …).
    updateFlightRoute(t);
  }

  _flyDesired.subVectors(flight.target, flight.pos);
  const dist = _flyDesired.length();

  // Speed follows the leg profile — track large paths tightly enough to read.
  const boost = flight.mouseBound
    ? 1
    : flight.route?.speedBoost || flight.legBoost || 1;
  const tracking =
    flight.route && FLIGHT_EDGE_KINDS.has(flight.route.kind) ? 2.35 : 1.7;
  const maxSpd = flight.mouseBound ? 5.2 : 3.35 * boost;
  const desiredSpd = Math.min(
    maxSpd,
    dist * (flight.mouseBound ? 3.4 : tracking)
  );
  if (dist > 1e-5) {
    _flyVel.copy(_flyDesired).multiplyScalar(desiredSpd / dist);
  } else {
    _flyVel.set(0, 0, 0);
  }

  const accel = flight.mouseBound
    ? 5.2
    : THREE.MathUtils.clamp(1.55 + boost * 0.7, 1.4, 4.0);
  const horizLerp = 1 - Math.exp(-dt * accel);
  const vertLerp = 1 - Math.exp(-dt * (flight.mouseBound ? 5.8 : accel + 0.75));
  flight.vel.x += (_flyVel.x - flight.vel.x) * horizLerp;
  flight.vel.z += (_flyVel.z - flight.vel.z) * horizLerp;
  flight.vel.y += (_flyVel.y - flight.vel.y) * vertLerp;

  flight.pos.addScaledVector(flight.vel, dt);

  if (flight.mouseBound) {
    // Cursor lock: no XY clamp — reach the exact pointer, even past the window edge.
    flight.pos.z = flight.bindDepth;
    flight.vel.z = 0;
  } else {
    const pastCam =
      flight.route?.kind === "flyThrough" ||
      flight.phase === "inbound" ||
      flight.phase === "turnaround";
    flight.pos.z = THREE.MathUtils.clamp(
      flight.pos.z,
      b.zNear,
      pastCam ? camera.position.z + 2.8 : b.zFar + 0.15
    );

    const inSteerGrace = t < flight.steerGraceUntil;
    if (!inSteerGrace) {
      // Clamp with the frustum at the drone's depth — never snap a far drone
      // back into the home-depth box (that looked like a mid-point teleport).
      const live = flightBoundsAtDepth(flight.pos.z);
      flight.pos.x = THREE.MathUtils.clamp(
        flight.pos.x,
        -live.x * 0.99,
        live.x * 0.99
      );
      flight.pos.y = THREE.MathUtils.clamp(
        flight.pos.y,
        -live.y * 0.98,
        live.y * 0.98
      );
    }

    // Edge routes may graze off-frame — only recover if stuck there.
    const edgeRoute =
      flight.route && FLIGHT_EDGE_KINDS.has(flight.route.kind);
    if (!inSteerGrace && isDroneOffscreen()) {
      flight.offscreenT += dt;
      const limit = edgeRoute ? 1.35 : 0.65;
      if (flight.offscreenT > limit) {
        startReturnOnscreen(t);
      }
    } else if (!inSteerGrace) {
      flight.offscreenT = 0;
    }
  }

  // Yaw: scan-in-place, or face travel / user.
  _flyCross.set(flight.vel.x, 0, flight.vel.z);
  const horizSpeed = _flyCross.length();
  const style = flight.mouseBound
    ? flight.vel.lengthSq() < 0.04
      ? "level"
      : "tilt"
    : flight.attitude || "tilt";
  let desiredYaw = flight.yaw;
  const yawing = FLIGHT_YAW_KINDS.has(flight.route?.kind);
  if (yawing) {
    const route = flight.route;
    const u = THREE.MathUtils.clamp(
      (t - route.t0) / Math.max(route.duration, 0.01),
      0,
      1
    );
    const ease = gsap.parseEase("power2.inOut")(u);
    if (route.scanMid != null && u < 0.55) {
      const local = ease / 0.55;
      desiredYaw =
        route.scanFrom +
        shortestAngleDelta(route.scanFrom, route.scanMid) * local;
    } else if (route.scanMid != null) {
      const local = (ease - 0.55) / 0.45;
      desiredYaw =
        route.scanMid + shortestAngleDelta(route.scanMid, route.scanTo) * local;
    } else {
      // 90° / 180° / 360° — use raw delta so full turns aren't shortest-pathed.
      desiredYaw = route.scanFrom + (route.scanTo - route.scanFrom) * ease;
    }
  } else if (flight.phase === "turnaround") {
    // Past the lens: spin so the glass faces the opposite side, then leave.
    desiredYaw = Math.PI;
  } else if (flight.phase === "inbound") {
    desiredYaw = 0;
  } else if (flight.phase === "outbound") {
    desiredYaw = Math.PI;
  } else if (style === "level" || style === "bank") {
    // Props up, glass on a cruise heading (often 45° / 90°).
    desiredYaw = flight.holdYaw;
  } else if (horizSpeed > 0.12) {
    _flyCross.multiplyScalar(1 / horizSpeed);
    const travelYaw = Math.atan2(
      flight.dockFlat.x * _flyCross.z - flight.dockFlat.z * _flyCross.x,
      flight.dockFlat.dot(_flyCross)
    );
    // Mix travel direction with the leg's cruise heading so it isn't always nose-in.
    desiredYaw =
      travelYaw + shortestAngleDelta(travelYaw, flight.holdYaw) * 0.55;
  } else {
    desiredYaw = flight.holdYaw;
  }
  if (style !== "level" && !yawing) {
    if (flight.phase === "inbound") {
      desiredYaw += shortestAngleDelta(desiredYaw, 0) * 0.78;
    } else if (flight.phase === "outbound" || flight.phase === "turnaround") {
      desiredYaw += shortestAngleDelta(desiredYaw, Math.PI) * 0.82;
    }
  }
  if (
    yawing ||
    horizSpeed > 0.12 ||
    flight.phase !== "cruise" ||
    style === "level" ||
    style === "bank"
  ) {
    const dyaw = yawing
      ? desiredYaw - flight.yaw
      : shortestAngleDelta(flight.yaw, desiredYaw);
    const maxTurn =
      (flight.mouseBound
        ? 2.8
        : yawing
          ? 3.2
          : flight.phase === "turnaround"
            ? 3.6
            : style === "level"
              ? 2.2
              : 1.9) * dt;
    const stepYaw = THREE.MathUtils.clamp(dyaw, -maxTurn, maxTurn);
    flight.yaw += stepYaw;
    flight.yawRate = stepYaw / Math.max(dt, 1e-4);
  } else {
    flight.yawRate *= 1 - Math.exp(-dt * 5);
  }

  getFlightFacing(_flyFacing);
  _flyRight.crossVectors(_flyWorldUp, _flyFacing);
  if (_flyRight.lengthSq() < 1e-6) _flyRight.set(1, 0, 0);
  else _flyRight.normalize();

  const fwdSpd = flight.vel.dot(_flyFacing);
  const latSpd = flight.vel.dot(_flyRight);
  const absY = Math.abs(flight.vel.y);
  const verticalFlight = absY > 0.22 && absY > horizSpeed * 0.95;
  const nearlyStill = flight.vel.lengthSq() < 0.04;

  let targetPitch = 0;
  let targetRoll = 0;
  const wantFlat =
    verticalFlight ||
    style === "level" ||
    style === "scan" ||
    nearlyStill ||
    yawing;

  const orbiting = FLIGHT_ORBIT_KINDS.has(flight.route?.kind);
  // Circles should stay mostly level — only a hint of bank.
  const tiltScale = orbiting ? 0.28 : 1;

  if (wantFlat || flight.takeoffBlend < 0.85) {
    targetPitch = 0;
    targetRoll = 0;
  } else if (style === "bank") {
    targetPitch = THREE.MathUtils.clamp(
      -fwdSpd * 0.26 * tiltScale,
      -0.38 * tiltScale,
      0.38 * tiltScale
    );
    targetRoll = THREE.MathUtils.clamp(
      (-latSpd * 0.52 - flight.yawRate * 0.34) * tiltScale,
      -0.62 * Math.max(tiltScale, 0.35),
      0.62 * Math.max(tiltScale, 0.35)
    );
  } else {
    targetPitch = THREE.MathUtils.clamp(
      -fwdSpd * 0.4 * tiltScale,
      -0.52 * tiltScale,
      0.52 * tiltScale
    );
    targetRoll = THREE.MathUtils.clamp(
      (-latSpd * 0.38 - flight.yawRate * 0.2) * tiltScale,
      -0.5 * Math.max(tiltScale, 0.35),
      0.5 * Math.max(tiltScale, 0.35)
    );
  }

  const settle = wantFlat ? 6.5 : 3.2;
  flight.pitch += (targetPitch - flight.pitch) * (1 - Math.exp(-dt * settle));
  flight.roll += (targetRoll - flight.roll) * (1 - Math.exp(-dt * settle));
  flight.flatness = 1;

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
  if (!webglOk || !renderer) return;
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
// Normal devices: WASM (fast). Lockdown Mode blocks WASM — fall back to JS.
const wasmOk =
  typeof WebAssembly === "object" &&
  typeof WebAssembly.instantiate === "function";
dracoLoader.setDecoderConfig({ type: wasmOk ? "wasm" : "js" });

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
  propellersPlaying = false;
  // Returning to a finished story: mount already solid (never flash wireframe).
  const liveReturn = themeLocked || wasStoryCompleted();
  if (liveReturn) {
    applyFinishedDockPose();
    applyColorProgress(1);
  } else {
    applyColorProgress(0);
  }
  window.__meshRecords = meshRecords;
  window.__droneReady = true;
  if (liveReturn && (takeoffPending || (!flight.active && !flight.staged))) {
    takeoffPending = false;
    scheduleTakeoff(0);
  }
}

function loadDroneModel() {
  if (!webglOk || !renderer) {
    return Promise.reject(new Error("WebGL unavailable"));
  }
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

/** Block boot until these are in the HTTP cache — keeps later navigation/scroll smooth. */
const BOOT_PAGES = [
  "/experience.html",
  "/projects.html",
  "/contact.html",
  "/blog.html",
  "/notes/js-arrays-objects-for-loops.html",
  "/notes/js-event-listeners.html",
  "/notes/js-interactions-html-forms.html",
  "/notes/css-box-model.html",
  "/notes/css-flexbox.html",
  "/notes/css-element-positioning.html",
  "/notes/hyrje-ne-html.html",
  "/notes/html-tables.html",
  "/notes/html-forms-and-form-elements.html",
  "/notes/hyrje-ne-react.html",
  "/notes/jsx.html",
  "/notes/react-useeffect-hook.html",
  "/site.bundle.js",
];

const BOOT_DECODERS = [
  "/draco/draco_decoder.wasm",
  "/draco/draco_wasm_wrapper.js",
  "/draco/draco_decoder.js",
];

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]);
}

function preloadFetch(url) {
  return withTimeout(
    fetch(url, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null),
    5000
  );
}

/** Load + decode so the bitmap is ready before first scroll. */
function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "sync";
    img.onload = () => {
      if (img.decode) {
        img.decode().then(resolve).catch(resolve);
      } else {
        resolve();
      }
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

function collectHomeImageSrcs() {
  return [
    ...new Set(
      [
        ...document.querySelectorAll('img[src$=".svg"]'),
        ...document.querySelectorAll('img[src*="/projects/"]'),
      ].map((img) => img.getAttribute("src")).filter(Boolean)
    ),
  ].map((src) => new URL(src, window.location.href).href);
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
  if (!webglOk || !renderer) return;
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
}

function warmThreeScene() {
  if (!webglOk || !renderer) return;
  const width = threeContainer.clientWidth || window.innerWidth || 1;
  const height = threeContainer.clientHeight || window.innerHeight || 1;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.render(scene, camera);
}

function hideBootScreenImmediate() {
  const boot = document.getElementById("boot-screen");
  if (boot) {
    boot.hidden = true;
    boot.style.display = "none";
    boot.setAttribute("aria-busy", "false");
  }
}

async function runHomeBoot() {
  if (typeof window.__clearBootWatchdog === "function") {
    window.__clearBootWatchdog();
  }

  const returningLive = wasStoryCompleted();
  const warmed = isHomeWarmed();

  // Any return to home in this tab: no loader UI (assets already cached).
  if (warmed || returningLive) {
    hideBootScreenImmediate();
    document.documentElement.classList.add("is-warm-return");
    if (returningLive) {
      document.documentElement.classList.add("is-live-return", "story-complete");
      document.body.classList.add("theme-live", "story-complete");
      applyThemeProgress(1);
    }
    // Still re-decode from cache so icons/photos aren't blank after back/forth.
    await Promise.all([
      ...collectHomeImageSrcs().map(preloadImage),
      ...[...document.images].map((img) =>
        img.decode ? img.decode().catch(() => {}) : Promise.resolve()
      ),
    ]);
    warmThreeScene();
    if (webglOk) {
      try {
        await withTimeout(loadDroneModel(), 12000);
        if (returningLive) {
          applyFinishedDockPose();
          applyColorProgress(1);
        } else {
          seatHiddenDroneUnderSketch();
        }
      } catch (_) {
        /* page still usable */
      }
    }
    markHomeWarmed();
    dismissBootScreen();
    requestAnimationFrame(() => {
      resizeRenderer();
      if (!returningLive) seatHiddenDroneUnderSketch();
      ScrollTrigger.refresh();
      startPageIntro();
    });
    return;
  }

  // First visit — keep moving even on Lockdown Mode / slow devices.
  setBootProgress(0.08, "TYPE");
  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((r) => setTimeout(r, 1200)),
    ]);
  }

  setBootProgress(0.22, "SVG");
  const imageSrcs = collectHomeImageSrcs();
  await withTimeout(Promise.all(imageSrcs.map(preloadImage)), 6000);
  await withTimeout(
    Promise.all(
      [...document.images].map((img) =>
        img.decode ? img.decode().catch(() => {}) : Promise.resolve()
      )
    ),
    4000
  );

  setBootProgress(0.4, "PAGES");
  await withTimeout(Promise.all(BOOT_PAGES.map(preloadFetch)), 8000);

  setBootProgress(0.52, "DECODER");
  await withTimeout(
    Promise.all(
      (wasmOk
        ? BOOT_DECODERS
        : ["/draco/draco_decoder.js", "/draco/draco_wasm_wrapper.js"]
      ).map(preloadFetch)
    ),
    5000
  );

  setBootProgress(0.64, "SCENE");
  warmThreeScene();

  setBootProgress(0.78, "MODEL");
  if (webglOk) {
    try {
      await withTimeout(loadDroneModel(), 14000);
      seatHiddenDroneUnderSketch();
    } catch (_) {
      /* sketch still works without the GLB */
    }
  }

  setBootProgress(1, "READY");
  markHomeWarmed();
  await new Promise((r) => setTimeout(r, 80));
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
  if (!webglOk || !renderer) return;
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

  // Beat 1: rays. Short beat. Beat 2: frame.
  introTl = gsap.timeline({ delay: 0.28 });
  introTl
    .to(intro, {
      lines: 1,
      duration: 1.35,
      ease: "power1.inOut",
      onUpdate: applySectionSequences,
    })
    .to(
      intro,
      {
        frame: 1,
        duration: 1.1,
        ease: "power1.inOut",
        onUpdate: applySectionSequences,
      },
      "+=0.1"
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
