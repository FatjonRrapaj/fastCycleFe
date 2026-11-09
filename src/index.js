import "./styles.css";
import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { initNav, initReveals } from "./nav";

gsap.registerPlugin(ScrollTrigger);

initNav();
initReveals();

const lenis = new Lenis({
  duration: 1.1,
  smoothWheel: true,
  touchMultiplier: 1.4,
});

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

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
threeContainer.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 3.2);
camera.lookAt(0, 0, 0);

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
const key = new THREE.DirectionalLight(0xffffff, 1.35);
key.position.set(2.2, 3.4, 4.2);
const fill = new THREE.DirectionalLight(0xfff1e8, 0.45);
fill.position.set(-2.5, 1.2, 2);
scene.add(ambient, key, fill);

const dronePivot = new THREE.Group();
scene.add(dronePivot);

let droneModel = null;
let mixer = null;
let propellerActions = [];
let propellerAxes = [];
let cameraAxis = null;
let propellersPlaying = false;
const meshRecords = [];

const droneState = {
  // Matched to the SVG top-down sketch during morph
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  floatY: 0,
  colorT: 0,
  camTilt: 0,
};

const _fitBox = new THREE.Box3();
const _fitCorner = new THREE.Vector3();
const _fitProj = new THREE.Vector3();

function resizeRenderer() {
  const width = threeContainer.clientWidth || 1;
  const height = threeContainer.clientHeight || 1;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  if (droneModel) fitDroneToSketch();
}

function getSketchScreenRect() {
  const svgRect = svgEl.getBoundingClientRect();
  const frame = threeContainer.getBoundingClientRect();
  const vb = svgEl.viewBox.baseVal;
  if (!svgRect.width || !frame.width || !vb.width) return null;

  // SVG meet-fits the viewBox inside the frame. Match those pixels, not the canvas edges.
  const fit = Math.min(svgRect.width / vb.width, svgRect.height / vb.height);
  const padX = (svgRect.width - vb.width * fit) / 2;
  const padY = (svgRect.height - vb.height * fit) / 2;
  const box = svgEl.querySelector(".droneSketch").getBBox();

  const left = svgRect.left + padX + box.x * fit;
  const top = svgRect.top + padY + box.y * fit;
  const right = left + box.width * fit;
  const bottom = top + box.height * fit;

  const nx = (px) => ((px - frame.left) / frame.width) * 2 - 1;
  const ny = (py) => 1 - ((py - frame.top) / frame.height) * 2;

  return {
    minX: nx(left),
    maxX: nx(right),
    minY: ny(bottom),
    maxY: ny(top),
  };
}

function projectedNdcBox(object) {
  _fitBox.setFromObject(object);
  const { min, max } = _fitBox;
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

  // Model is authored Y-up. Rotate to top-down like the SVG sketch.
  droneModel.rotation.x = Math.PI / 2;
  droneModel.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(droneModel);
  const center = box.getCenter(new THREE.Vector3());
  droneModel.position.set(-center.x, -center.y, -center.z);
}

function matchSketchSize() {
  const target = getSketchScreenRect();
  if (!target || !droneModel) return;

  const targetW = Math.max(target.maxX - target.minX, 0.0001);
  const targetH = Math.max(target.maxY - target.minY, 0.0001);
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
    projected = projectedNdcBox(droneModel);
    const factor = Math.min(
      targetW / Math.max(projected.w, 0.0001),
      targetH / Math.max(projected.h, 0.0001)
    );
    scale *= factor;
    if (Math.abs(factor - 1) < 0.0015) break;
  }
  dronePivot.scale.setScalar(scale);

  for (let i = 0; i < 4; i += 1) {
    dronePivot.updateMatrixWorld(true);
    projected = projectedNdcBox(droneModel);
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

function setWireframeMode(enabled) {
  meshRecords.forEach(({ mesh, wire, solid }) => {
    if (enabled) {
      mesh.material = wire;
      wire.wireframe = true;
    } else {
      mesh.material = solid;
      solid.wireframe = false;
    }
  });
}

function applyColorProgress(t) {
  const colorT = gsap.utils.clamp(0, 1, t);
  droneState.colorT = colorT;

  if (colorT <= 0) {
    setWireframeMode(true);
    stopPropellers();
    return;
  }

  // Mid-crossfade: drop wireframe and bring solid color in
  if (colorT < 0.55) {
    setWireframeMode(true);
    meshRecords.forEach(({ wire }) => {
      wire.opacity = 1 - colorT * 0.35;
    });
  } else {
    setWireframeMode(false);
    const solidT = (colorT - 0.55) / 0.45;
    meshRecords.forEach(({ solid }) => {
      solid.transparent = solidT < 1;
      solid.opacity = 0.55 + solidT * 0.45;
      if (solidT >= 1) {
        solid.transparent = false;
        solid.opacity = 1;
      }
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
    action.setEffectiveTimeScale(2.2);
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
  propellersPlaying = false;
}

const PROP_AXIS = new THREE.Vector3(0, 1, 0);

function spinPropellers(delta) {
  if (!propellersPlaying || !propellerAxes.length) return;
  // Local spin on top of clip-driven motion — clips alone are easy to miss at this scale.
  propellerAxes.forEach((axis, i) => {
    axis.rotateOnAxis(PROP_AXIS, delta * (i % 2 === 0 ? 22 : -22));
  });
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

loader.load(
  "/drone.glb",
  (gltf) => {
    droneModel = gltf.scene;
    dronePivot.add(droneModel);

    droneModel.traverse((object) => {
      if (!object.isMesh) return;

      const solid = object.material.clone();
      solid.wireframe = false;
      solid.transparent = false;
      solid.opacity = 1;
      if (solid.map) solid.map.colorSpace = THREE.SRGBColorSpace;
      solid.side = THREE.FrontSide;

      const wire = object.material.clone();
      wire.wireframe = true;
      wire.color.set(0x0a1219);
      wire.emissive?.setHex?.(0x000000);
      wire.map = null;
      wire.transparent = true;
      wire.opacity = 0.95;
      wire.side = THREE.DoubleSide;

      object.material = wire;
      meshRecords.push({ mesh: object, wire, solid });
    });

    mixer = new THREE.AnimationMixer(droneModel);
    propellerActions = gltf.animations
      .filter((clip) => /propeller/i.test(clip.name))
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
      }
    });

    fitDroneToSketch();
    applyColorProgress(0);
  },
  undefined,
  (error) => {
    console.error("Failed to load drone model", error);
  }
);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const t = clock.getElapsedTime();

  if (mixer) mixer.update(delta);
  spinPropellers(delta);

  if (droneModel) {
    const live = droneState.colorT;
    dronePivot.rotation.x = droneState.rotX;
    dronePivot.rotation.y =
      droneState.rotY + Math.sin(t * 0.35) * 0.03 * live;
    dronePivot.rotation.z = droneState.rotZ;
    if (cameraAxis) {
      cameraAxis.rotation.x =
        (cameraAxis.userData.baseRotX || 0) + droneState.camTilt;
    }
    dronePivot.position.set(
      0,
      droneState.floatY + Math.sin(t * 0.9) * 0.025 * live,
      0
    );
    // Keep the projected drone exactly on the sketch, including after the tilt.
    matchSketchSize();
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

/**
 * Free-scroll mapping: while a paragraph is on screen, fire 2 fast sequences.
 * Each beat finishes early in its window so both complete before you leave.
 */
function sequencePair(local) {
  return {
    a: gsap.utils.clamp(0, 1, mapRange(local, 0.0, 0.28) * 1.15),
    b: gsap.utils.clamp(0, 1, mapRange(local, 0.32, 0.6) * 1.15),
  };
}

const scrollSections = gsap.utils
  .toArray(".page-shell .section")
  .filter((section) => section.id !== "cta" && section.id !== "hero");

const sectionLocal = scrollSections.map(() => 0);

// Owns the two entrance beats. Scroll must not snap these on load,
// because the hero is already on screen and would skip the draw.
const intro = { lines: 0, frame: 0 };
let introTl = null;
let introStarted = false;

function applySectionSequences() {
  const promise = sequencePair(sectionLocal[0] || 0);
  const process = sequencePair(sectionLocal[1] || 0);
  const services = sequencePair(sectionLocal[2] || 0);
  const speed = sectionLocal[3] || 0;

  // Beat 1: all eight rays grow outward from the center together.
  drawUniform(lineParts, intro.lines);
  // Beat 2: the frame draws only after the rays have played.
  drawUniform(squareParts, intro.frame);

  drawUniform(markerParts, promise.a);
  drawUniform(bodyParts, promise.b);

  sketchParts.forEach(({ el, length }) => {
    const drawn = length * (0.55 * process.a + 0.45 * process.b);
    el.style.strokeDashoffset = String(Math.max(0, length - drawn));
  });

  detailParts.forEach(({ el, length }) => {
    const drawn = length * (0.5 * services.a + 0.5 * services.b);
    el.style.strokeDashoffset = String(Math.max(0, length - drawn));
  });

  // Show the wireframe, tilt it to face the viewer, then color it.
  const morphT = gsap.utils.clamp(0, 1, mapRange(speed, 0.0, 0.28));
  const tiltT = gsap.utils.clamp(0, 1, mapRange(speed, 0.36, 0.64));
  const colorT = gsap.utils.clamp(0, 1, mapRange(speed, 0.72, 1));

  svgEl.style.opacity = String(1 - morphT);
  threeContainer.style.opacity = String(morphT);
  applyColorProgress(colorT);

  // Top-down match first. Then pitch and yaw so the nose and lens
  // turn toward the viewer, still uncolored.
  droneState.rotX = gsap.utils.interpolate(0, -1.35, tiltT);
  droneState.rotY = gsap.utils.interpolate(0, 0.55, tiltT);
  droneState.camTilt = gsap.utils.interpolate(0, 0.9, tiltT);
  droneState.floatY = gsap.utils.interpolate(0, 0.035, colorT);

  const built =
    (intro.lines +
      intro.frame +
      (sectionLocal[0] || 0) +
      (sectionLocal[1] || 0) +
      (sectionLocal[2] || 0) +
      (sectionLocal[3] || 0)) /
    6;
  visualStage.style.opacity = window.matchMedia("(max-width: 980px)").matches
    ? String(0.5 + built * 0.28)
    : String(0.8 + built * 0.2);
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
  applySectionSequences();
}

applySectionSequences();

// Normal page scroll only — no pin, no snap, no extra height.
// Hero entrance is timed, not scrubbed. Each later section still hosts 2 beats.
scrollSections.forEach((section, i) => {
  ScrollTrigger.create({
    trigger: section,
    start: "top 80%",
    end: "bottom 35%",
    scrub: 0.25,
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

  introTl = gsap.timeline();
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
        duration: 1.05,
        ease: "power1.inOut",
        onUpdate: applySectionSequences,
      },
      "+=0.2"
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
  ScrollTrigger.refresh();
  applySectionSequences();
});
