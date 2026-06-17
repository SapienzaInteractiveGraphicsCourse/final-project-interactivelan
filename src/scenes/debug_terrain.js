// Debug scene to test single parts of the project.

// Boilerplate code from threejs docs
import * as THREE from 'three';
// Orbital controls for debugging map
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// Use the new Terrain class
import { Terrain } from '../core/terrain.js';
import { placeTrees } from '../entities/clutter.js';
import { loadTreeModels, loadGrassModels } from '../utilities/loader.js';
import { createGrass } from '../entities/grass.js';
import { createDebugKeys } from '../ui/hud.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// Let's add shadows to the renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFShadowMap;

document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Some simple light for the scene
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(100, 50, 50);

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

// Very magic numbers
camera.position.set(0, 200, 300);
camera.lookAt(0, 0, 0);

window.scene  = scene;
window.camera = camera;

// We want auto resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Set some variables for our navMap
let navMapVisible = false;
let navMapMeshes  = [];
let navMap;
let terrain;
const grassModels = await loadGrassModels();

const debugKeys = createDebugKeys([
    ['[N]',   'Nav map  —  OFF'],
    ['[LMB]', 'Orbit'],
    ['[RMB]', 'Pan'],
    ['[Scroll]', 'Zoom'],
]);

// If N is pressed, show the generated navMap
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyN' && navMap) {
        navMapVisible = !navMapVisible;
        debugKeys.setLabel('[N]', `Nav map  —  ${navMapVisible ? 'ON' : 'OFF'}`);

        if (navMapVisible) {
            navMapMeshes = navMap.visualize(scene);
            navMapMeshes.forEach(m => { m.position.y = 25; });
        } else {
            navMapMeshes.forEach(m => scene.remove(m));
            navMapMeshes = [];
        }
    }
});

// We want a blue sky!
scene.background = new THREE.Color('skyblue');

// Async setup so we can await tree loading
async function init() {
    const terrainSize     = 500;
    const terrainSegments = 120;
    const frequency       = 0.005;
    const amplitude       = 25;

    // Create terrain class instance
    terrain = new Terrain(
        terrainSize,
        terrainSegments,
        frequency,
        amplitude
    );

    // Visualize paths from enemy spawns to launcher
    for (const spawn of terrain.enemySpawnPositions) {
        const path = terrain.navMap.findPath(spawn, terrain.launcherSpawn);

        console.log(path);
        if (path.length > 0) {
            terrain.navMap.visualizePath(scene, path, terrain);
        }
    }

    // Grab useful references from the class
    navMap = terrain.navMap;

    // Add terrain mesh to scene
    terrain.addToScene(scene);

    // Force matrix update after adding to scene so raycasts work immediately
    terrain.terrain.updateMatrixWorld(true);

    // Visualize launcher spawn
    // We want to check if it will be placed properly on the terrain
    if (terrain.launcherSpawn) {
        const launcherMarker = new THREE.Mesh(
            new THREE.SphereGeometry(3, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        launcherMarker.position.copy(terrain.launcherSpawn);
        scene.add(launcherMarker);
    }

    // Visualize enemy spawn points
    for (const spawn of terrain.enemySpawnPositions) {
        const spawnY = terrain.getHeightAt(spawn.x, spawn.z);

        const spawnMarker = new THREE.Mesh(
            new THREE.SphereGeometry(3, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff00ff })
        );

        spawnMarker.position.set(spawn.x, spawnY + 1.5, spawn.z);
        scene.add(spawnMarker);
    }

    // Load tree models
    const treeModels = await loadTreeModels();

    // Place trees on terrain
    await placeTrees(scene, terrain, treeModels, 3, 0.55);

    // Create grass 
    createGrass(scene, terrain, grassModels, 0.75, 0.7);
}

init();

function animate() {
    controls.update();
    renderer.render(scene, camera);
}

// All done, start the scene
renderer.setAnimationLoop(animate);