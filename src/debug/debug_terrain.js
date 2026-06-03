// Debug scene to test single parts of the project.

// Boilerplate code from threejs docs
import * as THREE from 'three';
// Orbital controls for debugging map
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// From world.js, import functions that need testing
import { createTerrain, placeTrees } from '../world.js';
import { loadTreeModels } from '../entities.js';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );

// Let's add shadows to the renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Some simple light for the scene
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(100, 50, 50);

// We need a big enough shadow map
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 2000;
light.shadow.camera.left = -600;
light.shadow.camera.right = 600;
light.shadow.camera.top = 600;
light.shadow.camera.bottom = -600;

light.castShadow = true;
scene.add(light);

// To prevent fully black shadows we add a weak ambient light
const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);

// Very magic numbers
camera.position.set(0, 200, 300);
camera.lookAt(0, 0, 0);

window.scene = scene;
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

// If N is pressed, show the generated navMap
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyN') {
        navMapVisible = !navMapVisible;

        if (navMapVisible) {
            navMapMeshes = navMap.visualize(scene);
        } else {
            navMapMeshes.forEach(m => scene.remove(m));
            navMapMeshes = [];
        }
    }
});

// We want a blue sky!
scene.background = new THREE.Color("skyblue"); 

// Async setup so we can await tree loading
async function init() {
    // We create our basic terrain
    const resultTerrain = createTerrain(500, 120, 0.005, 15);
    const terrain = resultTerrain.terrain;
    navMap = resultTerrain.navMap;  // assigns to outer let navMap, not a new local variable

    // Add it to scene
    scene.add(terrain);

    // We load the trees'models
    const treeModels = await loadTreeModels();
    // Place models on our terrain!
    placeTrees(scene, terrain, treeModels, 2, 0.6, navMap);
    // Visualize our navMap
    // navMap.visualize(scene);


    // Very placeholder, ugly code.
    // We look for the first navigable cell in top left and bottom right, compute a path and visualize it
    // May take a few refreshes
    let start, goal;

    // Find first passable cell near top-left
    for (let gx = 0; gx < navMap.width; gx++) {
        for (let gz = 0; gz < navMap.height; gz++) {
            if (navMap.grid[gx][gz].passable) {
                start = navMap.gridToWorld(gx, gz);
                break;
            }
        }
        if (start) break;
    }

    // Find first passable cell near bottom-right
    for (let gx = navMap.width - 1; gx >= 0; gx--) {
        for (let gz = navMap.height - 1; gz >= 0; gz--) {
            if (navMap.grid[gx][gz].passable) {
                goal = navMap.gridToWorld(gx, gz);
                break;
            }
        }
        if (goal) break;
    }

    const path = navMap.findPath(start[0], start[1], goal[0], goal[1]);
    navMap.visualizePath(scene, path);
}

init();

function animate( time ) {
    controls.update();
    renderer.render( scene, camera );
}