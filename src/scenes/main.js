import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { loadModel, loadTreeModels } from '../utilities/loader.js';

import { Launcher } from '../entities/launcher.js';
import { Tank } from '../entities/tank.js';

import { InputHandler } from '../core/input.js';
import { Terrain } from '../core/terrain.js';
import { placeTrees } from '../core/clutter.js';
import { createGrass } from '../core/grass.js';

import { applyCellShading } from '../rendering/shaders.js';
import { updateExplosions } from '../rendering/effects.js';


// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('skyblue');

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

window.scene = scene;
window.camera = camera;


// Timing
let lastTime = performance.now();


// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;


// Lighting
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 5, 5);
sun.castShadow = true;
sun.shadow.bias = -0.005;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 2000;
sun.shadow.camera.left = -600;
sun.shadow.camera.right = 600;
sun.shadow.camera.top = 600;
sun.shadow.camera.bottom = -600;

const ambient = new THREE.AmbientLight(0xffffff, 0.3);

scene.add(sun);
scene.add(ambient);


// Input
const input = new InputHandler();


// Assets
const launcherModel = await loadModel(`${import.meta.env.BASE_URL}models/launcher.glb`);
applyCellShading(launcherModel);

const tankModel = await loadModel(`${import.meta.env.BASE_URL}models/tank.glb`);
const treeModels = await loadTreeModels();





// Terrain
const terrain = new Terrain(
    300,
    120,
    0.005,
    4,
    new THREE.Vector3(100, 0, 100),
    [
        new THREE.Vector3(-80, 0, -110),
        new THREE.Vector3(0, 0, -115),
        new THREE.Vector3(-115, 0, 0),
    ]
);


// World setup
const worldObstacles = await placeTrees(scene, terrain, treeModels, 3, 0.7);
createGrass(scene, terrain.terrain, renderer);

worldObstacles.push(terrain.terrain);

// Game objects
const launcher = new Launcher(launcherModel, worldObstacles);
const tanks = [];


// Resize
window.addEventListener('resize', onResize);

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    launcher.onResize();
}


// Helpers
function addTank(position) {
    const groundedPosition = new THREE.Vector3(
        position.x,
        terrain.getHeightAt(position.x, position.z),
        position.z
    );

    const tank = new Tank(tankModel);
    tanks.push(tank);
    tank.addToScene(scene, groundedPosition);
    launcher.registerTank(tank);

    return tank;
}

function addSpawnMarker(position, color, radius = 2.5) {
    const marker = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 12, 12),
        new THREE.MeshBasicMaterial({
            color,
            depthTest: false,
        })
    );

    marker.position.copy(position);
    marker.position.y += radius;
    marker.renderOrder = 999;

    scene.add(marker);
    return marker;
}

function visualizeDebugPaths() {
    for (const spawn of terrain.enemySpawnPositions) {
        const path = terrain.navMap.findPath(spawn, terrain.launcherSpawn);

        if (path.length > 0) {
            terrain.navMap.visualizePath(scene, path, terrain);
        }
    }
}

function visualizeDebugSpawns() {
    for (const spawn of terrain.enemySpawnPositions) {
        addSpawnMarker(spawn, 0xff00ff, 2.5);
    }
}

function setupCamera() {
    const launcherPos = new THREE.Vector3();
    launcher.group.getWorldPosition(launcherPos);

    const bounds = new THREE.Box3().setFromObject(launcherModel);
    const size = new THREE.Vector3();
    bounds.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);

    camera.position.set(
        launcherPos.x,
        launcherPos.y + maxDim,
        launcherPos.z + maxDim * 2
    );

    camera.lookAt(launcherPos);
    controls.target.copy(launcherPos);
}


// Init
async function init() {
    terrain.addToScene(scene);
    terrain.terrain.updateMatrixWorld(true);

    launcher.addToScene(scene, terrain.launcherSpawn);
    launcher.setMainCamera(camera);

    setupCamera();

    addTank(new THREE.Vector3(100, 0, 5));

    visualizeDebugSpawns();
    visualizeDebugPaths();
}

await init();


// Main loop
function animate() {
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    launcher.update(input, delta, scene, terrain.terrain);

    for (const tank of tanks) {
        tank.update(delta, launcher.activeCamera ?? camera);
    }

    controls.update();
    updateExplosions(delta);

    renderer.render(scene, launcher.activeCamera ?? camera);
}

renderer.setAnimationLoop(animate);