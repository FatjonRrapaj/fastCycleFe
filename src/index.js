import "./styles.css";
import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
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

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.setSize(0.85);
transformControls.attach(dronePivot);
scene.add(transformControls);

let debugHoldPose = false;
transformControls.addEventListener("dragging-changed", (event) => {
  if (event.value) {
    debugHoldPose = true;
    lenis.stop();
  } else {
    lenis.start();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.target !== document.body && event.target !== document.documentElement) {
    return;
  }
  const key = event.key.toLowerCase();
  if (key === "g") transformControls.setMode("translate");
  if (key === "r") transformControls.setMode("rotate");
  if (key === "s") transformControls.setMode("scale");
  if (key === "f") {
    debugHoldPose = false;
    fitDroneToSketch();
  }
});

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
  threeContainer.style.pointerEvents = morphT > 0.05 ? "auto" : "none";
  transformControls.visible = morphT > 0.05;
  applyColorProgress(colorT);

  // Top-down match first. Then pitch and yaw so the nose and lens
  // turn toward the viewer, still uncolored.
  droneState.rotX = gsap.utils.interpolate(0, -1.35, tiltT);
  droneState.rotY = gsap.utils.interpolate(0, 0.55, tiltT);
  // Keep the gimbal locked to the body mount — extra axis tilt unseats the lens.
  droneState.camTilt = 0;
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

window.__forceDroneReady = forceDroneReady;

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
