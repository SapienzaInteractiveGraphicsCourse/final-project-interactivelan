// Debug scene to test single parts of the project.

// Boilerplate code from threejs docs
import * as THREE from 'three';
// Orbital controls for debugging map
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// Use the new Terrain class
import { Terrain } from '../core/terrain.js';
import { placeTrees, placeRocks } from '../entities/clutter.js';
import { loadTreeModels, loadGrassModels, loadRockModels } from '../utilities/loader.js';
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

// Terrain generation parameters, read by init() on every regenerate
let terrainSize      = 500;
let terrainSegments  = 120;
let terrainFrequency = 0.005;
let terrainAmplitude = 25;

// Clutter parameters, read by init() on every regenerate
let treeThreshold = 0.55;
let grassDensity  = 50;
let rockCount     = 500;
let pebbleCount   = 700;

// Set some variables for our navMap
let navMapVisible = false;
let navMapMeshes  = [];
let navMap;
let terrain;
const grassModels = await loadGrassModels();

const debugKeys = createDebugKeys([
    ['[N]',      'Nav map  —  OFF'],
    ['[G]',      'Regenerate terrain'],
    ['[LMB]',    'Orbit'],
    ['[RMB]',    'Pan'],
    ['[Scroll]', 'Zoom'],
]);

// Clear everything init() added and run it again
async function regenerate() {
    // Hide nav map before wiping the meshes
    if (navMapVisible) {
        navMapMeshes.forEach(m => scene.remove(m));
        navMapMeshes  = [];
        navMapVisible = false;
        debugKeys.setLabel('[N]', 'Nav map  —  OFF');
    }

    // Remove all scene children except the two persistent lights
    const keep = new Set([light, ambient]);
    for (let i = scene.children.length - 1; i >= 0; i--) {
        if (!keep.has(scene.children[i])) scene.remove(scene.children[i]);
    }

    await init();
}

window.addEventListener('keydown', async (e) => {
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

    if (e.code === 'KeyG') regenerate();
});

// We want a blue sky!
scene.background = new THREE.Color('skyblue');

// Async setup so we can await tree loading
async function init() {
    // Create terrain class instance
    terrain = new Terrain(
        terrainSize,
        terrainSegments,
        terrainFrequency,
        terrainAmplitude,
        new THREE.Vector3(terrainSize * 0.35, 0, terrainSize * 0.35),
        [
            new THREE.Vector3(-terrainSize * 0.35, 0,  terrainSize * 0.35),
            new THREE.Vector3( terrainSize * 0.35, 0, -terrainSize * 0.35),
            new THREE.Vector3(-terrainSize * 0.35, 0, -terrainSize * 0.35),
        ]
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
    await placeTrees(scene, terrain, treeModels, 3, treeThreshold);

    // Create grass
    createGrass(scene, terrain, grassModels, 3, grassDensity);

    const rockModels = await loadRockModels();
    placeRocks(scene, terrain, rockModels, rockCount, 0.15);
    placeRocks(scene, terrain, rockModels, pebbleCount, 0.05, { blockNav: false, collision: false, safeRadius: 0, ignoreProtected: true });
    
}

// Build the debug UI: two slider boxes stacked in the top-right corner
(function buildUI() {
    const container = document.createElement('div');
    container.style.cssText = [
        'position:fixed', 'top:16px', 'right:16px',
        'display:flex', 'flex-direction:column', 'gap:12px',
        'z-index:9999',
    ].join(';');

    function makePanel(defs) {
        const panel = document.createElement('div');
        panel.style.cssText = [
            'font-family:monospace', 'font-size:12px', 'color:#ccc',
            'background:rgba(0,0,0,0.5)', 'padding:10px 14px',
            'border-radius:4px', 'display:flex', 'flex-direction:column',
            'gap:8px', 'user-select:none',
        ].join(';');

        for (const s of defs) {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px';

            const lbl = document.createElement('span');
            lbl.style.minWidth = '80px';
            lbl.textContent = s.label;

            const input = document.createElement('input');
            input.type  = 'range';
            input.min   = s.min;
            input.max   = s.max;
            input.step  = s.step;
            input.value = s.get();
            input.style.width = '110px';

            const val = document.createElement('span');
            val.style.minWidth = '40px';
            val.textContent = s.fmt(s.get());

            input.addEventListener('input', () => {
                s.set(parseFloat(input.value));
                val.textContent = s.fmt(parseFloat(input.value));
            });

            row.append(lbl, input, val);
            panel.appendChild(row);
        }

        return panel;
    }

    const terrainPanel = makePanel([
        { label: 'SIZE',      min: 100, max: 800, step: 50, fmt: v => v,        get: () => terrainSize,             set: v => { terrainSize      = v; } },
        { label: 'SEGMENTS',  min: 40,  max: 200, step: 10, fmt: v => v,        get: () => terrainSegments,         set: v => { terrainSegments  = v; } },
        { label: 'FREQUENCY', min: 1,   max: 20,  step: 1,  fmt: v => v / 1000, get: () => terrainFrequency * 1000, set: v => { terrainFrequency = v / 1000; } },
        { label: 'AMPLITUDE', min: 2,   max: 60,  step: 1,  fmt: v => v,        get: () => terrainAmplitude,        set: v => { terrainAmplitude = v; } },
    ]);

    const clutterPanel = makePanel([
        { label: 'TREE DENS',  min: 0.3, max: 0.9,  step: 0.05, fmt: v => v.toFixed(2), get: () => treeThreshold, set: v => { treeThreshold = v; } },
        { label: 'GRASS DENS', min: 10,  max: 200,  step: 10,   fmt: v => v,             get: () => grassDensity,  set: v => { grassDensity  = v; } },
        { label: 'ROCK COUNT', min: 50,  max: 1000, step: 50,   fmt: v => v,             get: () => rockCount,     set: v => { rockCount     = v; } },
        { label: 'PEB COUNT',  min: 50,  max: 1500, step: 50,   fmt: v => v,             get: () => pebbleCount,   set: v => { pebbleCount   = v; } },
    ]);

    const btn = document.createElement('button');
    btn.textContent = 'REGENERATE';
    btn.style.cssText = [
        'padding:6px 0', 'width:100%',
        'font-family:monospace', 'font-size:12px', 'cursor:pointer',
        'background:#333', 'color:#ccc', 'border:1px solid #666', 'border-radius:4px',
    ].join(';');
    btn.addEventListener('click', () => regenerate());

    container.append(terrainPanel, clutterPanel, btn);
    document.body.appendChild(container);
}());

init();

function animate() {
    controls.update();
    renderer.render(scene, camera);
}

// All done, start the scene
renderer.setAnimationLoop(animate);