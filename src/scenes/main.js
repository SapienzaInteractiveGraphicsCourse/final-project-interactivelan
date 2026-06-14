import * as THREE from 'three';

import { loadModel, loadTreeModels } from '../utilities/loader.js';

import { Launcher } from '../entities/launcher.js';
import { Tank } from '../entities/tank.js';

import { InputHandler } from '../core/input.js';
import { Terrain } from '../core/terrain.js';
import { placeTrees } from '../core/clutter.js';
import { createGrass } from '../core/grass.js';

import { updateExplosions } from '../rendering/effects.js';

import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { GameAudio, preloadAudio } from '../core/audio.js';

import { runIntro } from '../scenes/intro.js';


// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8cbfff);

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
// A little bit of light improvemente to make things look better
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
if ('outputColorSpace' in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
} else {
    renderer.outputEncoding = THREE.sRGBEncoding;
}
document.body.appendChild(renderer.domElement);

window.scene = scene;
window.camera = camera;


// Timing
let lastTime = performance.now();


// Lighting
const sun = new THREE.DirectionalLight(0xfff1e8, 1.2);
sun.position.set(20, 30, 10);
sun.castShadow = true;
sun.shadow.bias = -0.0005;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 2000;
sun.shadow.camera.left = -120;
sun.shadow.camera.right = 120;
sun.shadow.camera.top = 120;
sun.shadow.camera.bottom = -120;

const hemisphere = new THREE.HemisphereLight(0xddeeff, 0x443322, 0.6);
const ambient = new THREE.AmbientLight(0xffffff, 0.15);

scene.add(sun);
scene.add(hemisphere);
scene.add(ambient);


// Input
const input = new InputHandler();

// Audio
const gameAudio = new GameAudio(camera);
await preloadAudio(gameAudio);


// Assets
const launcherModel = await loadModel(`${import.meta.env.BASE_URL}models/launcher.glb`);

const tankModel = await loadModel(`${import.meta.env.BASE_URL}models/tank.glb`);
const treeModels = await loadTreeModels();





// Terrain
const terrain = new Terrain(
    500,
    120,
    0.005,
    4,
    new THREE.Vector3(200, 0, 200),
    [
        new THREE.Vector3(-200, 0, -200),
        new THREE.Vector3(0, 0, -200),
        new THREE.Vector3(-200, 0, 0),
    ]
);


// World setup
const worldObstacles = await placeTrees(scene, terrain, treeModels, 3, 0.7);
const grass = createGrass(scene, terrain);


worldObstacles.push(terrain.terrain);

// Game objects
const launcher = new Launcher(launcherModel, worldObstacles, gameAudio);
const tanks = [];


// Resize
window.addEventListener('resize', onResize);

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    launcher.onResize();
}


// Helper functions to make this code more legible

// Create a new tank and add it to scene!
function addTank(position) {
    // Make sure the spawn lands on a passable cell before doing anything else
    // If the position is inside a tree's blocked zone the first refreshPath would return []
    const safeSpawn = terrain.navMap.findNearestPassable(position.x, position.z);

    const groundedPosition = new THREE.Vector3(
        safeSpawn.x,
        terrain.getHeightAt(safeSpawn.x, safeSpawn.z),
        safeSpawn.z
    );

    // SkeletonUtils.clone is required for skinned meshes since model.clone() doesn't copy the skeleton correctly and breaks bone animations on the second tank
    // The more you know
    const clonedModel = SkeletonUtils.clone(tankModel);
    const tank        = new Tank(clonedModel, gameAudio);

    tanks.push(tank);
    tank.addToScene(scene, terrain, groundedPosition);
    launcher.registerTank(tank);
    tank.setNavigation(terrain.navMap, terrain.launcherSpawn);

    return tank;
}


// Add a little sphere to help me debug
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

// Show our paths from spawnpoints to player
function visualizeDebugPaths() {
    for (const spawn of terrain.enemySpawnPositions) {
        const path = terrain.navMap.findPath(spawn, terrain.launcherSpawn);

        if (path.length > 0) {
            terrain.navMap.visualizePath(scene, path, terrain);
        }
    }
}

// Place the little sphere where enemies will spawn
function visualizeDebugSpawns() {
    for (const spawn of terrain.enemySpawnPositions) {
        addSpawnMarker(spawn, 0xff00ff, 2.5);
    }
}

// Init
async function init() {
    terrain.addToScene(scene);
    terrain.terrain.updateMatrixWorld(true);

    launcher.addToScene(scene, terrain.launcherSpawn);
    // Make rotation limits relative to the map center (0,0,0)
    launcher.setMapCenter(new THREE.Vector3(0, 0, 0));
    launcher.faceToward(new THREE.Vector3(0, 0, 0));
    launcher.setMainCamera();

    // Add a tank for each spawnpoint
    for (const spawn of terrain.enemySpawnPositions) {
        console.log(spawn);
        addTank(spawn);
    }

    // visualizeDebugSpawns();
    // visualizeDebugPaths();
}

await runIntro(renderer, camera, init);

// Main loop
function animate() {
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    launcher.update(input, delta, scene, terrain.terrain);

    for (const tank of tanks) {
        tank.update(delta, launcher.activeCamera ?? camera);
    }

    updateExplosions(delta);

    const activeCamera = launcher.activeCamera ?? camera;
    gameAudio.setCamera(activeCamera);

    renderer.render(scene, activeCamera);
}

renderer.setAnimationLoop(animate);