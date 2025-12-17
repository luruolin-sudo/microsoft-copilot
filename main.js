import * as THREE from "./libs/three.module.js";
import { GLTFLoader } from "./libs/GLTFLoader.js";
import { OrbitControls } from "./libs/OrbitControls.js";
import { EXRLoader } from "./libs/EXRLoader.js";

// ==========================
// ✅ 基本設定
// ==========================
const settings = {
  rotateSpeed: 0,
  ambientIntensity: 1
};

const scene = new THREE.Scene();

// ==========================
// ✅ Renderer
// ==========================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ==========================
// ✅ 相機與控制器
// ==========================
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
const isMobile = window.innerWidth <= 768;
camera.position.set(-0.3, -0.15, isMobile ? 3.0 : 0.9);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1;
controls.maxDistance = 10;

// ==========================
// ✅ 環境光與 HDRI
// ==========================
const ambientLight = new THREE.AmbientLight(0xffffff, settings.ambientIntensity);
scene.add(ambientLight);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new EXRLoader()
  .setPath("./hdr/")
  .load("lebombo.exr", function (texture) {
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    scene.background = envMap;
    texture.dispose();
    pmremGenerator.dispose();
  });

// ==========================
// ✅ 模型與動畫控制
// ==========================
let currentModel = null;
let isFirstLoad = true;
let mixer, clock;
const animationStates = {}; // 記錄每段動畫的方向狀態

function rotateOut(model, onComplete) {
  let progress = 0;
  function animate() {
    progress += 0.05;
    model.rotation.y += 0.08;
    model.position.y -= 0.01;
    if (progress >= 1) {
      scene.remove(model);
      onComplete();
      return;
    }
    requestAnimationFrame(animate);
  }
  animate();
}

function rotateIn(model) {
  model.rotation.y = Math.PI;
  model.position.y = -0.2;
  let progress = 0;
  function animate() {
    progress += 0.05;
    model.rotation.y -= 0.08;
    model.position.y += 0.01;
    if (progress >= 1) return;
    requestAnimationFrame(animate);
  }
  animate();
}

function loadModel(modelPath) {
  if (!modelPath || typeof modelPath !== 'string') {
    console.warn("⚠️ 模型路徑無效，請確認 data-model 是否正確設定");
    return;
  }

  const loader = new GLTFLoader();
  loader.load(modelPath, (gltf) => {
    console.log("載入的動畫名稱：", gltf.animations.map(a => a.name));

    const newModel = gltf.scene;
    newModel.position.set(0, 0, 0);
    newModel.rotation.set(0, 0, 0);
    newModel.animations = gltf.animations;

    mixer = new THREE.AnimationMixer(newModel);
    clock = new THREE.Clock();

    if (currentModel && !isFirstLoad) {
      rotateOut(currentModel, () => {
        scene.remove(currentModel);
        currentModel = newModel;
        scene.add(currentModel);
        rotateIn(currentModel);
      });
    } else {
      currentModel = newModel;
      scene.add(currentModel);
      isFirstLoad = false;
    }
  });
}

function playAnimation(name, buttonElement) {
  if (!mixer || !currentModel || !currentModel.animations) return;

  const clip = currentModel.animations.find(c => c.name === name);
  if (!clip) {
    console.warn(`❌ 找不到動畫 "${name}"`);
    return;
  }

  mixer.stopAllAction();

  const act = mixer.clipAction(clip);
  act.reset();
  act.setLoop(THREE.LoopOnce);
  act.clampWhenFinished = true;

  if (!(name in animationStates)) {
    animationStates[name] = true;
  }

  const isForward = animationStates[name];
   if (buttonElement && !buttonElement.hasAttribute("data-label")) { buttonElement.setAttribute("data-label", buttonElement.textContent); }

  if (isForward) {
    act.timeScale = 1;
    act.play();
    if (buttonElement) buttonElement.textContent = "恢復";
  } else {
    act.time = clip.duration;
    act.timeScale = -1;
    act.play();
    if (buttonElement) {
      const originalText = buttonElement.getAttribute("data-label") || "播放";
      buttonElement.textContent = originalText;
    }
  }

  animationStates[name] = !isForward;
}

// ==========================
// ✅ UI 控制
// ==========================
document.getElementById("rotateSpeed")?.addEventListener("input", e => {
  settings.rotateSpeed = parseFloat(e.target.value);
});

document.getElementById("ambientIntensity")?.addEventListener("input", e => {
  const val = parseFloat(e.target.value);
  ambientLight.intensity = val;
  renderer.toneMappingExposure = val;
});

document.getElementById("cameraFov")?.addEventListener("input", e => {
  camera.fov = parseFloat(e.target.value);
  camera.updateProjectionMatrix();
});

const modelButtons = document.querySelectorAll(".model-btn");
modelButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modelButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const modelPath = btn.getAttribute("data-model");
    if (modelPath) loadModel(modelPath);
  });
});

// ==========================
// ✅ 左下動畫按鈕功能
// ==========================
document.getElementById('btn-part1')?.addEventListener('click', (e) => {
  playAnimation('part1', e.currentTarget);
});

document.getElementById('btn-part2')?.addEventListener('click', (e) => {
  playAnimation('part2', e.currentTarget);
});

// ==========================
// ✅ 主動畫迴圈
// ==========================
function animate() {
  requestAnimationFrame(animate);
  if (mixer && clock) mixer.update(clock.getDelta());
  if (currentModel) currentModel.rotation.y += settings.rotateSpeed;
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ✅ 預設載入模型
loadModel('https://dl.dropboxusercontent.com/scl/fi/467g0hc9l8wqhek068v56/glb.glb?rlkey=7nxfnzamiz2dfffzhhr8s0c7n&dl=1');
