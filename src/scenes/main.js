import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadModel } from '../utilities/loader.js';
import { Launcher } from '../entities/launcher.js';
import { InputHandler } from '../core/input.js';
import { applyCellShading } from '../rendering/shaders.js';
import { updateExplosions } from '../rendering/effects.js';
import { Tank }          from '../entities/tank.js';
import { createTerrain, placeTrees } from '../core/world.js';
import { loadTreeModels } from '../utilities/loader.js';
import { createGrass } from '../core/grass.js';



// Scene Setup
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Initialize our lastTime variable used to handle delta
let lastTime = performance.now();

// Renderer
renderer.setSize(window.innerWidth, window.innerHeight);
// Let's add shadows to the renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Lights
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

light.shadow.bias = -0.005;


// To prevent fully black shadows we add a weak ambient light
const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(light);
scene.add(ambient);

// We want a blue sky!
scene.background = new THREE.Color("skyblue");

window.scene  = scene;
window.camera = camera;

// Input handler
const input  = new InputHandler();

// We want auto resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (launcher) launcher.onResize();
});


// Load the ATGM launcher model and add it to Scene
const modelLauncher = await loadModel(`${import.meta.env.BASE_URL}models/launcher.glb`);
applyCellShading(modelLauncher);
const launcher = new Launcher(modelLauncher);

// List of tanks in the scene
const modelTank = await loadModel(`${import.meta.env.BASE_URL}models/tank.glb`);
const tanks = [];

// We create our basic terrain
const terrainSize = 250;
const terrainSegments = 120;
const { terrain, navMap, launcherSpawn } = createTerrain(terrainSize, terrainSegments, 0.005, 15, new THREE.Vector3(100, 0,  100 ));
// const terrain = resultTerrain.terrain;

// Our Navmap
// const navMap = resultTerrain.navMap;  // assigns to outer let navMap, not a new local variable

// We load the trees'models 
const treeModels = await loadTreeModels();
// Place models on our terrain!
placeTrees(scene, terrain, terrainSize, treeModels, 3, 0.68, navMap);
createGrass(scene, terrain, renderer);

// Target our tanks move toward to
let target; 



// Take care of all steps to add a new tank to the scene
function addTank(position){
    let tank = new Tank(modelTank)
    tanks.push(tank);
    tank.addToScene(scene, position);
    // Add tank to list of hittable tanks of our launcher
    launcher.registerTank(tank);
}

async function init() {
    // Add our terrain to the scene
    scene.add(terrain);

    // Force update matrix
    terrain.updateMatrixWorld(true); 

    // We are placing the launcehr at 0,0,0 but it's temporary
    //launcher.addToScene(scene, new THREE.Vector3(0,0,0));
    launcher.addToScene(scene, launcherSpawn);

    launcher.setMainCamera(camera);

    // Get launcher's world position after it's been placed
    const launcherPos = new THREE.Vector3();
    launcher.group.getWorldPosition(launcherPos);

    // Setup our camera
    const size   = new THREE.Vector3();
    const box    = new THREE.Box3().setFromObject(modelLauncher);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(
        launcherPos.x,
        launcherPos.y + maxDim,
        launcherPos.z + maxDim * 2
    );
    // Orbit around launcher, not world origin
    camera.lookAt(launcherPos);
    controls.target.copy(launcherPos);

    // Add tank to scene
    addTank(new THREE.Vector3(100, 0, 5));

    
    
}

init();

function animate() {
    const now   = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime    = now;

    if (launcher) {
        launcher.update(input, delta, scene, terrain);
    }

    controls.update();
    
    // Iterate tanks for update
    for (const tank of tanks)
    {
        if (tank){
            tank.update(delta, launcher?.activeCamera ?? camera);
        }
    }

    updateExplosions(delta);

    // Make sure launcher is defined when animate runs (it gets assigned after init() is ran)
    renderer.render(scene, launcher?.activeCamera ?? camera);
}

// All done, start the scene
renderer.setAnimationLoop(animate);
