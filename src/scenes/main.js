import * as THREE from 'three';

import { loadModel, loadTreeModels, loadGrassModels } from '../utilities/loader.js';

import { Launcher } from '../entities/launcher.js';
import { Tank, TankState } from '../entities/tank.js';

import { Prop, loadSandbags } from '../entities/prop.js'

import { InputHandler } from '../core/input.js';
import { Terrain } from '../core/terrain.js';
import { placeTrees } from '../core/clutter.js';
import { createGrass } from '../core/grass.js';

import { updateExplosions } from '../rendering/effects.js';

import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { GameAudio, preloadAudio } from '../core/audio.js';

import { runIntro } from '../scenes/intro.js';

import { GameManager } from '../core/game.js';
import { HUD }                    from '../ui/hud.js';


// Scene setup
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x8cbfff);

// Equirectangular sky texture
const skyTexture          = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/sky.jpeg`);
skyTexture.mapping        = THREE.EquirectangularReflectionMapping;
skyTexture.colorSpace     = THREE.SRGBColorSpace;
scene.background          = skyTexture;

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


// Scene atmosphere
scene.fog = new THREE.Fog(0x7a8694, 140, 420);

// Lighting
const sun = new THREE.DirectionalLight(0xffd6a3, 2.4);
sun.position.set(55, 38, -25);
sun.castShadow = true;
sun.shadow.bias = -0.0005;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 260;
sun.shadow.camera.left = -140;
sun.shadow.camera.right = 140;
sun.shadow.camera.top = 140;
sun.shadow.camera.bottom = -140;

const hemisphere = new THREE.HemisphereLight(0x9bbcff, 0x2a221c, 0.38);
const ambient = new THREE.AmbientLight(0xffffff, 0.05);

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

const sandbagModel = await loadSandbags();
const sandbags = new Prop(sandbagModel);

// Terrain
const terrain = new Terrain(
    320,
    100,
    0.005,
    8,
    new THREE.Vector3(140, 0, 140),
    [
        new THREE.Vector3(-140, 0, -90),
        new THREE.Vector3(-135, 0, -70),
        new THREE.Vector3(-130, 0, -140),
        new THREE.Vector3(0, 0, -140),
        new THREE.Vector3(10, 0, -140),
        new THREE.Vector3(30, 0, -140),
        new THREE.Vector3(-140, 0, 0),
        new THREE.Vector3(-140, 0, 10),
        new THREE.Vector3(-140, 0, 30),
    ]
);


// World setup
const worldObstacles = await placeTrees(scene, terrain, treeModels, 3, 0.55);
const grassModels = await loadGrassModels();
const grass = createGrass(scene, terrain, grassModels, 0.5, 2.5);


worldObstacles.push(terrain.terrain);

// Game objects
const launcher = new Launcher(launcherModel, worldObstacles, gameAudio);
const tanks = [];

// HUD and game manager 
const hud         = new HUD();
const gameManager = new GameManager(terrain, launcher, tanks, addTank, hud);


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

    launcher.addToScene(scene, terrain.launcherSpawn);
    //sandbags.addToScene(
    //    scene,
    //    new THREE.Vector3(
    //        terrain.launcherSpawn.x - 2,
    //        terrain.launcherSpawn.y - 0.35,
    //        terrain.launcherSpawn.z - 2
    //    ),
    //    new THREE.Euler(0, Math.PI * 0.25, 0),
    //    0.75
    //);

    // Make rotation limits relative to the map center (0,0,0)
    launcher.setMapCenter(new THREE.Vector3(0, 0, 0));
    launcher.faceToward(new THREE.Vector3(0, 0, 0));
    launcher.setMainCamera();

    terrain.terrain.updateMatrixWorld(true);


    // Add a tank for each spawnpoint
    //for (const spawn of terrain.enemySpawnPositions) {
    //    console.log(spawn);
    //    addTank(spawn);
    //}

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
        // Did our tank die? If so set 
        const wasDead = tank.state === TankState.DEAD;
        tank.update(delta, launcher.activeCamera ?? camera);
        if (!wasDead && tank.state === TankState.DEAD) {
            // Pass reference to dead tank so that we can add it's position to the navmap as blocked
            gameManager.onTankDestroyed(tank);
        }
    }

    // Gameplay loop: waves, win/lose, HUD
    gameManager.update(delta);

    // Keep the launcher state indicator current
    hud.updateLauncherState(launcher.state);

    updateExplosions(delta);

    const activeCamera = launcher.activeCamera ?? camera;
    gameAudio.setCamera(activeCamera);

    renderer.render(scene, activeCamera);
}

renderer.setAnimationLoop(animate);