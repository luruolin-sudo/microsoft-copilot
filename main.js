import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// ✅ 取得容器
const container = document.getElementById("lamp-3d");

// ✅ 建立場景
const scene = new THREE.Scene();

// ✅ 建立相機
const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 5);

// ✅ Renderer（背景透明）
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// ✅ 燈光（產品展示用）
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);

// ✅ 測試用立方體（之後會換成燈具）
const geometry = new THREE.BoxGeometry(1.5, 0.4, 1.5);
const material = new THREE.MeshStandardMaterial({
  color: 0x22c55e,
  roughness: 0.4,
  metalness: 0.2
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// ✅ 自動旋轉動畫（360° 核心）
function animate() {
  cube.rotation.y += 0.005;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
