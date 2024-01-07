const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor("red", 1); // Set background color to white
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Optional, but this gives a smoother control feeling
controls.dampingFactor = 0.05;

function animate() {
  requestAnimationFrame(animate);
  controls.update(); // Only required if controls.enableDamping or controls.autoRotate are set to true
  renderer.render(scene, camera);
}

animate();

var loader = new THREE.GLTFLoader();

const ambientLight = new THREE.AmbientLight(0xffffff, 1); // color, intensity
scene.add(ambientLight);

// Set DracoLoader instance to GLTFLoader
let mixer;
let animations;

loader.load("./drone.glb", (gltf) => {
  console.log("gltf: ", gltf);
  scene.add(gltf.scene);

  // Animation setup
  mixer = new THREE.AnimationMixer(gltf.scene);
  animations = gltf.animations;

  // Start the first animation as an example
  mixer.clipAction(animations[0]).play();

  // Position the camera
  camera.position.z = 5;
});
