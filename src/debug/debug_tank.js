import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadModel }     from '../entities.js';
import { InputHandler }  from '../input.js';
import { applyCellShading, TOON_GRADIENT_MAP } from '../shaders.js';


// Some code borrowed from debug_launcher.js
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);

// Let's add shadows to the renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFShadowMap;

document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Some simple light for the scene
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 5, 5);

// We need a big enough shadow map
light.shadow.camera.near   = 0.5;
light.shadow.camera.far    = 2000;
light.shadow.camera.left   = -600;
light.shadow.camera.right  = 600;
light.shadow.camera.top    = 600;
light.shadow.camera.bottom = -600;

light.castShadow = true;
scene.add(light);

// To prevent fully black shadows we add a weak ambient light
const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);

// A grid helps with spatial reference when inspecting a model
scene.add(new THREE.GridHelper(20, 20));

// We want a blue sky!
scene.background = new THREE.Color('skyblue');

window.scene  = scene;
window.camera = camera;

// We want auto resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Bone references — set after model loads
let hullBone   = null;
let turretBone = null;
let gunBone    = null;

// Turret and gun aim state
let yaw   = 0;
let pitch = 0;

// Harcoded limits for our tank turret's movement
const YAW_SPEED   = 1.0;
const PITCH_SPEED = 0.8;
const PITCH_MIN   = -0.1;
const PITCH_MAX   = 0.4;

// Performance monitor
let lastTime = performance.now();
// Input handler
const input  = new InputHandler();

async function init() {
    // Load the tank model
    const model = await loadModel('/assets/models/tank.glb');
    applyCellShading(model, TOON_GRADIENT_MAP);

    // Make sure the tank is touching the ground
    const box = new THREE.Box3().setFromObject(model);
    model.position.y = -box.min.y;
    scene.add(model);

    // Search for expected bones in loaded model
    // Our model should have:
    // Hull
    //  \-> Turret
    //    \-> Gun
    model.traverse((obj) => {
        if (obj.isBone) {
            console.log('Bone found:', obj.name);
            if (obj.name === 'Hull')   hullBone   = obj;
            if (obj.name === 'Turret') turretBone = obj;
            if (obj.name === 'Gun')    gunBone    = obj;
        }
    });

    // Autoposition camera according to model's bounds, so it's always framed correctly
    const center = new THREE.Vector3();
    const size   = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(center.x, center.y + maxDim, center.z + maxDim * 2);
    camera.lookAt(center);
    // Orbit around model center, not world origin
    controls.target.copy(center);
}

init();

function animate() {
    const now   = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime    = now;

    // Arrow keys rotate turret left/right, up/down elevates the gun
    if (turretBone) {
        if (input.isDown('ArrowLeft'))  yaw += YAW_SPEED * delta;
        if (input.isDown('ArrowRight')) yaw -= YAW_SPEED * delta;
        turretBone.rotation.y = yaw;
    }

    if (gunBone) {
        if (input.isDown('ArrowUp'))   pitch = Math.max(-PITCH_MAX, pitch - PITCH_SPEED * delta);
        if (input.isDown('ArrowDown')) pitch = Math.min(-PITCH_MIN, pitch + PITCH_SPEED * delta);
        gunBone.rotation.z = pitch;
    }

    controls.update();
    renderer.render(scene, camera);
}