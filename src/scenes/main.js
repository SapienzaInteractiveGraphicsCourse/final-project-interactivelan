import * as THREE from 'three';

import { loadModel, loadTreeModels, loadGrassModels, loadRockModels } from '../utilities/loader.js';

import { Launcher } from '../entities/launcher.js';
import { Tank, TankState } from '../entities/tank.js';

import { Terrain } from '../core/terrain.js';
import { placeTrees, placeRocks } from '../entities/clutter.js';
import { createGrass } from '../entities/grass.js';

import { updateExplosions } from '../rendering/effects.js';

import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { GameAudio, preloadAudio } from '../core/audio.js';

import { runIntro } from '../scenes/intro.js';

import { GameManager } from '../core/game.js';
import { HUD } from '../ui/hud.js';


const scene = new THREE.Scene();

const skyTexture      = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/sky.jpeg`);
skyTexture.mapping    = THREE.EquirectangularReflectionMapping;
skyTexture.colorSpace = THREE.SRGBColorSpace;
scene.background         = skyTexture;
scene.backgroundRotation = new THREE.Euler(-0.15, 0, 0);

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

let lastTime = performance.now();

scene.fog = new THREE.Fog(0x7a8694, 140, 420);

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

const gameAudio = new GameAudio(camera);
await preloadAudio(gameAudio);

const launcherModel = await loadModel(`${import.meta.env.BASE_URL}models/launcher.glb`);
const tankModel     = await loadModel(`${import.meta.env.BASE_URL}models/tank.glb`);
const treeModels    = await loadTreeModels();

const terrain = new Terrain(
    320,
    100,
    0.005,
    8,
    new THREE.Vector3(100, 0, 100),
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


const worldObstacles = await placeTrees(scene, terrain, treeModels, 3, 0.55);
const grassModels    = await loadGrassModels();
createGrass(scene, terrain, grassModels, 3, 10);

const rockModels = await loadRockModels();
const rockProxies = placeRocks(scene, terrain, rockModels, 300, 0.15);
worldObstacles.push(...rockProxies);

worldObstacles.push(terrain.terrain);

const hud         = new HUD();
const launcher    = new Launcher(launcherModel, worldObstacles, gameAudio);
launcher.setHUD(hud);
const tanks       = [];
const gameManager = new GameManager(terrain, launcher, tanks, addTank, hud);

window.addEventListener('resize', onResize);

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    launcher.onResize();
}


function addTank(position) {
    // findNearestPassable ensures the spawn isn't inside a tree's blocked zone
    const safeSpawn = terrain.navMap.findNearestPassable(position.x, position.z);

    const groundedPosition = new THREE.Vector3(
        safeSpawn.x,
        terrain.getHeightAt(safeSpawn.x, safeSpawn.z),
        safeSpawn.z
    );

    // SkeletonUtils.clone is required because model.clone() doesn't copy the skeleton correctly
    const clonedModel = SkeletonUtils.clone(tankModel);
    const tank        = new Tank(clonedModel, gameAudio);

    tanks.push(tank);
    tank.addToScene(scene, terrain, groundedPosition);
    launcher.registerTank(tank);
    tank.setNavigation(terrain.navMap, terrain.launcherSpawn);

    return tank;
}

async function init() {
    terrain.addToScene(scene);
    launcher.addToScene(scene, terrain.launcherSpawn);
    launcher.setMapCenter(new THREE.Vector3(0, 0, 0));
    launcher.faceToward(new THREE.Vector3(0, 0, 0));
    launcher.setMainCamera();
    terrain.terrain.updateMatrixWorld(true);
}

await runIntro(renderer, camera, init);

function animate() {
    const now   = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime    = now;

    launcher.update(delta, scene, terrain.terrain);

    for (const tank of tanks) {
        const wasDead = tank.state === TankState.DEAD;
        tank.update(delta, launcher.activeCamera ?? camera);
        if (!wasDead && tank.state === TankState.DEAD) {
            gameManager.onTankDestroyed(tank);
        }
    }

    gameManager.update(delta);
    hud.updateLauncherState(launcher.state);
    updateExplosions(delta);

    const activeCamera = launcher.activeCamera ?? camera;
    gameAudio.setCamera(activeCamera);
    renderer.render(scene, activeCamera);
}

renderer.setAnimationLoop(animate);