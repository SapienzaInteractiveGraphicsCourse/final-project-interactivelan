import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadModel }     from '../entities.js';
import { InputHandler }  from '../input.js';
import { Tank }          from '../tank.js';

// Class to help debug tank hitboxes and such
class TankDebugger {
    constructor(tank, scene, camera, renderer, input) {
        this.tank     = tank;
        this.scene    = scene;
        this.camera   = camera;
        this.renderer = renderer;
        this.input    = input;

        this._setupHitTest();
    }

    // Click on tank to test hit detection
    _setupHitTest() {
        const raycaster = new THREE.Raycaster();
        const mouse     = new THREE.Vector2();

        this.renderer.domElement.addEventListener('click', (e) => {
            mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            // Shoot ray from camera to click position
            raycaster.setFromCamera(mouse, this.camera);

            // First check if we clicked on the tank at all
            const hits = raycaster.intersectObject(this.tank.group, true);
            if (hits.length === 0) return;

            // Use the original camera ray against proxy meshes
            const hit = this.tank.isHitBy(raycaster.ray.origin, raycaster.ray.direction);
            console.log(`Click: ${hit ? 'HIT' : 'MISS'}`);

            // Visualize hit point with a small sphere
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.1),
                new THREE.MeshBasicMaterial({ color: hit ? 0xff0000 : 0x00ff00 })
            );
            sphere.position.copy(hits[0].point);
            this.scene.add(sphere);
            setTimeout(() => this.scene.remove(sphere), 2000);
        });
    }

}

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

// Declare tank so it's accessible outside init
let tank;

// Performance monitor
let lastTime = performance.now();
// Input handler
const input  = new InputHandler();

async function init() {
    // Load the tank model and hand it to the Tank class
    const model = await loadModel(`${import.meta.env.BASE_URL}models/tank.glb`);
    tank = new Tank(model);
    tank.addToScene(scene, new THREE.Vector3(0,0,0));

    // Start debugger
    const tankDebugger = new TankDebugger(tank, scene, camera, renderer, input);

    // Autoposition camera according to model's bounds, so it's always framed correctly
    const box    = new THREE.Box3().setFromObject(tank.group);
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

    if (tank) {
        // Arrow keys rotate turret left/right, up/down elevates the gun
        if (tank.turretBone) {
            if (input.isDown('ArrowLeft'))  tank.turretBone.rotation.y += 1.0 * delta;
            if (input.isDown('ArrowRight')) tank.turretBone.rotation.y -= 1.0 * delta;
        }

        if (tank.gunBone) {
            if (input.isDown('ArrowUp'))   tank.gunBone.rotation.z = Math.max(-0.1, tank.gunBone.rotation.z - 0.8 * delta);
            if (input.isDown('ArrowDown')) tank.gunBone.rotation.z = Math.min(0.4,  tank.gunBone.rotation.z + 0.8 * delta);
        }

        // Simulate tank being hit
        if (input.isDown('KeyH')) tank.hit();

        tank.update(delta, scene);
    }

    controls.update();
    renderer.render(scene, camera);
}