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
renderer.toneMappingExposure = 1.2;
threeContainer.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 3.2);
camera.lookAt(0, 0, 0);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const ambient = new THREE.AmbientLight(0xffffff, 1.15);
const key = new THREE.DirectionalLight(0xffffff, 1.75);
key.position.set(2.2, 3.4, 4.2);
const fill = new THREE.DirectionalLight(0xb8fff4, 0.85);
fill.position.set(-2.5, 1.2, 2);
const rim = new THREE.DirectionalLight(0xffffff, 0.55);
rim.position.set(0, -2.2, -3);
scene.add(ambient, key, fill, rim);

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
  if (droneModel) fitDroneToSketch();
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

  droneModel.rotation.x = Math.PI / 2;
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
        const isGlass = !!mat.userData?.isGlass || mat.transmission > 0;
        if (isGlass) {
          // Transmission only reads correctly while transparent stays on.
          mat.transparent = true;
          mat.opacity = 0.35 + solidT * 0.65;
          mat.depthWrite = false;
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

function makeGlassMaterial(source) {
  const glass = new THREE.MeshPhysicalMaterial();
  glass.name = source?.name || "glass";
  glass.wireframe = false;
  glass.map = null;
  glass.normalMap = null;
  glass.roughnessMap = null;
  glass.metalnessMap = null;
  glass.color.set(0xdffaf4);
  glass.metalness = 0;
  glass.roughness = 0.02;
  glass.transmission = 1;
  glass.thickness = 1.1;
  glass.ior = 1.5;
  glass.transparent = true;
  glass.opacity = 1;
  glass.depthWrite = false;
  glass.side = THREE.FrontSide;
  glass.envMapIntensity = 2.2;
  if ("attenuationColor" in glass) {
    glass.attenuationColor.set(0x9fe8df);
    glass.attenuationDistance = 0.6;
  }
  glass.emissive.setHex(0x000000);
  glass.emissiveIntensity = 0;
  glass.userData.isGlass = true;
  glass.needsUpdate = true;
  return glass;
}

function paintSolid(solid, hex, { metalness = 0.25, roughness = 0.42 } = {}) {
  solid.wireframe = false;
  solid.map = null;
  solid.normalMap = null;
  solid.roughnessMap = null;
  solid.metalnessMap = null;
  solid.side = THREE.FrontSide;
  solid.transparent = false;
  solid.opacity = 1;
  solid.color.setHex(hex);
  solid.metalness = metalness;
  solid.roughness = roughness;
  solid.emissive.setHex(0x000000);
  solid.emissiveIntensity = 0;
  solid.userData.isGlass = false;
  solid.needsUpdate = true;
  return solid;
}

function styleSolidMaterial(mesh, solid, index = 0) {
  const matName = (solid.name || "").toLowerCase();
  // GLTFLoader splits multi-materials into Mesh002 / Mesh002_1 children under the node.
  const partName = `${mesh.name || ""} ${mesh.parent?.name || ""}`.toLowerCase();

  // Explicit glass slots from the authored materials
  if (matName === "material" || matName === "material.005") {
    return makeGlassMaterial(solid);
  }

  // Propellers: Material.001 blades + hub
  if (/(?:^|\s)p[1-4](?:\s|$)/.test(partName) || matName === "material.001") {
    if (matName === "color") {
      return paintSolid(solid, 0x3d6a70, { metalness: 0.45, roughness: 0.36 });
    }
    return paintSolid(solid, 0x8af0e4, { metalness: 0.08, roughness: 0.32 });
  }

  // Camera: the large sphere is authored as "color" — that should read as glass.
  if (partName.includes("camera")) {
    if (matName === "color" || matName === "material.005") {
      return makeGlassMaterial(solid);
    }
    if (matName === "material.004") {
      return paintSolid(solid, 0xb8ebe3, { metalness: 0.22, roughness: 0.3 });
    }
    return makeGlassMaterial(solid);
  }

  // Body: "color" is the large shell (majority of tris); Material.003 is a small trim.
  if (matName === "color") {
    return paintSolid(solid, 0xf5fffb, { metalness: 0.08, roughness: 0.36 });
  }

  if (matName === "material.003") {
    return paintSolid(solid, 0x8aebd9, { metalness: 0.2, roughness: 0.34 });
  }

  if (matName === "material.004") {
    return paintSolid(solid, 0x8ec9c0, { metalness: 0.3, roughness: 0.36 });
  }

  return paintSolid(solid, 0xd2efe8, { metalness: 0.22, roughness: 0.44 });
}

loader.load(
  "/drone.glb",
  (gltf) => {
    try {
      droneModel = gltf.scene;
      dronePivot.add(droneModel);

      droneModel.traverse((object) => {
        if (!object.isMesh) return;

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        const solids = materials.map((mat, index) => {
          const solid = mat.isMeshPhysicalMaterial
            ? mat.clone()
            : new THREE.MeshStandardMaterial().copy(mat);
          solid.name = mat.name;
          return styleSolidMaterial(object, solid, index);
        });
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

      // Dock the camera sphere into the body connector (mesh space offset).
      const cameraMesh = droneModel.getObjectByName("droneCamera");
      if (cameraMesh) {
        cameraMesh.traverse((object) => {
          if (!object.isMesh || !object.geometry) return;
          object.geometry = object.geometry.clone();
          object.geometry.translate(0, -2.6, 0);
          object.geometry.computeBoundingBox();
          object.geometry.computeBoundingSphere();
        });
      }

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

  if (debugPose.showSketchOverlay) {
    svgEl.style.opacity = "1";
    threeContainer.style.opacity = "1";
    threeContainer.style.pointerEvents = "auto";
  } else {
    svgEl.style.opacity = String(1 - morphT);
    threeContainer.style.opacity = String(morphT);
    threeContainer.style.pointerEvents = morphT > 0.05 ? "auto" : "none";
  }
  applyColorProgress(colorT);

  droneState.rotX = gsap.utils.interpolate(0, -1.35, tiltT);
  droneState.rotY = gsap.utils.interpolate(0, 0.55, tiltT);
  droneState.camTilt = 0;
  droneState.floatY = gsap.utils.interpolate(0, 0.035, colorT);

  // Captions follow the same section ownership as the draws.
  let stage = DRONE_STAGES.blank;
  if (colorT > 0.2) stage = DRONE_STAGES.ship;
  else if (morphT > 0.15) stage = DRONE_STAGES.lift;
  else if (workT > 0.08) stage = DRONE_STAGES.build;
  else if (skillsT > 0.08) stage = DRONE_STAGES.shape;
  else if (aboutT > 0.05 || intro.frame >= 1) stage = DRONE_STAGES.napkin;
  else if (intro.frame > 0.15) stage = DRONE_STAGES.frame;
  setDroneStory(stage);

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
