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
const gui = new dat.GUI({ autoPlace: false });

const guiContainer = document.querySelector(".gui_container");
guiContainer.appendChild(gui.domElement);

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
const rendererContainer = document.querySelector(".three-js-container");
var rendererWidth = rendererContainer.offsetWidth;
var rendererHeight = rendererContainer.offsetHeight;
const scene = new THREE.Scene();
scene.background = new THREE.Color("white"); // White background
//CAMERA
const camera = new THREE.PerspectiveCamera(
  75,
  rendererWidth / rendererHeight,
  0.1,
  1000
);

//LOADER

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(rendererWidth, rendererHeight);
rendererContainer.appendChild(renderer.domElement);
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("./draco/"); // use a full url path

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
let droneModel = undefined;

loader.load(
  "./drone.glb",
  (gltf) => {
    droneModel = gltf.scene;
    droneModel.rotation.x = Math.PI / 2;
    droneModel.rotation.y = Math.PI / 2;
    droneModel.rotation.z = Math.PI / 0;
    droneModel.rotation.y = 0;
    droneModel.rotation.z = 0;
    droneModel.position.y = 0.15;
    droneModel.position.x = 0.01;
    droneModel.traverse((object) => {
      if (object.isMesh) {
        object.material.wireframe = true;
        object.material.color.set(0x000000); // Black color
      }
    });
    scene.add(gltf.scene);
    scene.animations.map((animation) => animation.play());
  },
  undefined,
  (error) => {
    console.error(error);
  }
);

// //LIGHTING
// const PointLight = new THREE.PointLight(0xffffff, 60);
// PointLight.position.set(0, 2, 0); // Adjust as needed
// scene.add(PointLight);

//CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// camera.lookAt(scene.position); // Look at the center of the scene

// Camera position folder
const cameraPositionSettings = {
  x: 0,
  y: 0,
  z: 3.84,
};
const cameraPositionFolder = gui.addFolder("Camera Position");
cameraPositionFolder
  .add(cameraPositionSettings, "x", -10, 10)
  .onChange(updateCameraPosition);
cameraPositionFolder
  .add(cameraPositionSettings, "y", -10, 10)
  .onChange(updateCameraPosition);
cameraPositionFolder
  .add(cameraPositionSettings, "z", -10, 10)
  .onChange(updateCameraPosition);
cameraPositionFolder.open();

function updateCameraPosition() {
  camera.position.set(
    cameraPositionSettings.x,
    cameraPositionSettings.y,
    cameraPositionSettings.z
  );
  controls.update();
}
updateCameraPosition();
// Camera rotation folder
const cubeRotationSettings = {
  x: 0,
  y: 0,
  z: 3.6,
};
const cameraRotationFolder = gui.addFolder("Cube Rotation");
cameraRotationFolder
  .add(cubeRotationSettings, "x", -Math.PI, Math.PI)
  .onChange(updateCameraRotation);
cameraRotationFolder
  .add(cubeRotationSettings, "y", -Math.PI, Math.PI)
  .onChange(updateCameraRotation);
cameraRotationFolder
  .add(cubeRotationSettings, "z", -Math.PI, Math.PI)
  .onChange(updateCameraRotation);
cameraRotationFolder.open();

function updateCameraRotation() {
  camera.rotateX(cubeRotationSettings.x);
  camera.rotateY(cubeRotationSettings.y);
  camera.rotateZ(cubeRotationSettings.z);

  controls.update();
}

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
