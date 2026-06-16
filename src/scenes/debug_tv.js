import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TV } from '../entities/tv.js';

// Debug scene to test the pocket TV model and video playback

// Usual boilerplate
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Some simple light for the scene
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);

const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);

// Dark background for contrast
scene.background = new THREE.Color(0x111111);

window.scene  = scene;
window.camera = camera;

// We want auto resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Declare tv so it's accessible outside init
let tv;

async function init() {
    tv = new TV();

    // Load the TV at the origin 
    await tv.load(scene, new THREE.Vector3(0, 0, 0), `${import.meta.env.BASE_URL}models/tv.glb`);

    // Autoposition camera according to model bounds
    const box    = new THREE.Box3().setFromObject(tv.model);
    const center = new THREE.Vector3();
    const size   = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(center.x, center.y, center.z + maxDim * 2.5);
    camera.lookAt(center);
    // Orbit around the TV, not world origin
    controls.target.copy(center);
    controls.update();

    // Connect the ended callback so we know when the video finishes
    tv.onEnded = () => {
        console.log('TV: video ended');
    };

    tv.showStartPrompt();

    const startOnGesture = async () => {
        document.removeEventListener('keydown', startOnGesture);
        document.removeEventListener('click',   startOnGesture);
        tv.hideStartPrompt();
        await tv.play();
    };

    document.addEventListener('keydown', startOnGesture);
    document.addEventListener('click',   startOnGesture);
}

init();

function animate() {
    controls.update();
    renderer.render(scene, camera);
}

// Start the scene
renderer.setAnimationLoop(animate);