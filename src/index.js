import "./index.css";
import { gsap } from "gsap";
import SplitType from "split-type";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Observer } from "gsap/Observer";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import * as dat from "dat.gui";

//GUI
const gui = new dat.GUI();
const cameraSettings = {
  x: 0,
  y: 0,
  z: 5,
};

// Camera position folder
const cameraFolder = gui.addFolder("Camera Position");
cameraFolder.add(cameraSettings, "x", -10, 10).onChange(updateCameraPosition);
cameraFolder.add(cameraSettings, "y", -10, 10).onChange(updateCameraPosition);
cameraFolder.add(cameraSettings, "z", -10, 10).onChange(updateCameraPosition);
cameraFolder.open();

function updateCameraPosition() {
  camera.position.set(cameraSettings.x, cameraSettings.y, cameraSettings.z);
  controls.update();
}

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
let wrap = gsap.utils.wrap(0, sections.length);
let currentIndex = -1;
let animating = false;
function gotoSection(index, direction) {
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

//THREE.JS SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color("Red"); // White background
//CAMERA
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5; // Adjust as needed

//LOADER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(500, 500);
document.querySelector(".threejs-container").appendChild(renderer.domElement);
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("./draco/"); // use a full url path

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

loader.load(
  "./drone.glb",
  (gltf) => {
    const model = gltf.scene;
    model.traverse((object) => {
      if (object.isMesh) {
        object.material.wireframe = true;
        object.material.color.set(0x000000); // Black color
      }
    });
    scene.add(model);
  },
  undefined,
  (error) => {
    console.error(error);
  }
);

//LIGHTING
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 0, 0); // Adjust as needed
scene.add(directionalLight);

//CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

//CAMERA ADJUST Z
camera.position.set(0, 0, 0.2); // Position above the object
camera.lookAt(scene.position); // Look at the center of the scene

function animate() {
  requestAnimationFrame(animate);
  controls.update(); // Only needed if controls.enableDamping is true
  renderer.render(scene, camera);
}

animate();

//LENIS
// const lenis = new Lenis();
// function raf(time) {
//   lenis.raf(time);
//   requestAnimationFrame(raf);
// }
// requestAnimationFrame(raf);
