import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadModel } from '../utilities/loader.js';
import { Launcher } from '../entities/launcher.js';
import { HUD, createDebugKeys } from '../ui/hud.js';
import { applyCellShading } from '../rendering/shaders.js';
import { updateExplosions } from '../rendering/effects.js';

// temporary to test the new camera
import { Tank } from '../entities/tank.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// Some code borrowed from debug_terrain.js
const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x8cbfff);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Let's add shadows to the renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFShadowMap;
// A little bit of light improvemente to make things look better
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
if ('outputColorSpace' in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
} else {
    renderer.outputEncoding = THREE.sRGBEncoding;
}

document.body.appendChild(renderer.domElement);

// Controls for the free camera
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Some simple light for the scene
const sun = new THREE.DirectionalLight(0xfff1e8, 1.2);
sun.position.set(20, 30, 10);

// We need a big enough shadow map
sun.shadow.bias = -0.0005;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near   = 0.5;
sun.shadow.camera.far    = 2000;
sun.shadow.camera.left   = -120;
sun.shadow.camera.right  = 120;
sun.shadow.camera.top    = 120;
sun.shadow.camera.bottom = -120;

sun.castShadow = true;
scene.add(sun);

const hemisphere = new THREE.HemisphereLight(0xddeeff, 0x443322, 0.6);
const ambient    = new THREE.AmbientLight(0xffffff, 0.15);

scene.add(hemisphere);
scene.add(ambient);

// A grid helps with spatial reference when inspecting a model
scene.add(new THREE.GridHelper(100, 100));

window.scene  = scene;
window.camera = camera;

// We want auto resize
window.addEventListener('resize', onResize);


function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (launcher) launcher.onResize();
}

// Declare launcher so that it's accessible in animate()
let launcher;
// Declare tank so that it's accessible in animate()
let tank;
// Performance monitor
let lastTime = performance.now();

async function init() {
    // Load the ATGM launcher model
    const launcherModel = await loadModel(`${import.meta.env.BASE_URL}models/launcher.glb`);
    applyCellShading(launcherModel);
    const hud = new HUD();
    launcher = new Launcher(launcherModel);
    launcher.setHUD(hud);
    launcher.addToScene(scene, new THREE.Vector3(0, 0, 0));


    // Make rotation limits relative to the debug scene center too,
    // so camera / aiming behavior matches main.js
    launcher.setMapCenter(new THREE.Vector3(0, 0, 0));
    launcher.faceToward(new THREE.Vector3(0, 0, -10));
    launcher.setMainCamera();


    // We want a tank in front of the launcher, not moving,
    // just far enough to be a nice clean target for debug
    const launcherPos = new THREE.Vector3();
    const launcherDir = new THREE.Vector3();

    launcher.group.getWorldPosition(launcherPos);
    launcher.group.getWorldDirection(launcherDir);

    // Our launcher model faces the opposite way, same as elsewhere in the project
    launcherDir.negate();

    const tankPos = new THREE.Vector3(0, 0, 100);

    // SkeletonUtils.clone required for skinned meshes, regular clone breaks the skeleton
    const tankModel = await loadModel(`${import.meta.env.BASE_URL}models/tank.glb`);
    tank = new Tank(SkeletonUtils.clone(tankModel));

    // No terrain in this debug scene, tank sits at y=0 and doesn't navigate
    tank.addToScene(scene, null, tankPos);
    tank.group.rotation.y = Math.PI;

    // Add tank to list of hittable tanks of our launcher
    launcher.registerTank(tank);
}


await init();


function animate() {
    const now   = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime    = now;

    if (launcher) {
        // No terrain in this debug scene
        launcher.update(delta, scene, null);
    }

    // Only update orbit controls while the free camera is active
    if ((launcher?.activeCamera ?? camera) === camera) {
        controls.update();
    }

    if (tank) {
        tank.update(delta, launcher?.activeCamera ?? camera);
    }

    updateExplosions(delta);

    // Make sure launcher is defined when animate runs (it gets assigned after init() is ran)
    renderer.render(scene, launcher?.activeCamera ?? camera);
}


createDebugKeys([
    ['[← →]',    'Rotate launcher'],
    ['[↑ ↓]',    'Elevate gun'],
    ['[RMB]',    'Toggle scope'],
    ['[LMB]',    'Fire  (scoped)'],
    ['[R]',      'Reload'],
    ['[Click]',  'Lock pointer'],
]);

// All done, start the scene
renderer.setAnimationLoop(animate);