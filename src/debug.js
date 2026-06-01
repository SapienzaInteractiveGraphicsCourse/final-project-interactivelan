// Debug scene to test single parts of the project.

// Boilerplate code from threejs docs
import * as THREE from 'three';
// Orbital controls for debugging map
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// From world.js, import functions that need testing
import { createTerrain, placeTrees } from './world.js';
import { loadTreeModels } from './entities';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Some simple light for the scene
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 1, 0);
scene.add(light);

camera.position.set(0, 200, 300);
camera.lookAt(0, 0, 0);

window.scene = scene;
window.camera = camera;

// Async setup so we can await tree loading
async function init() {
    // We create our basic terrain
    const terrain = createTerrain(500, 120, 0.005, 15);
    // Add it to scene
    scene.add(terrain);

    // We load the trees'models
    const treeModels = await loadTreeModels();
    // Place models on our terrain!
    placeTrees(scene, terrain, treeModels, 2, 0.6);
}

init();

function animate( time ) {
    controls.update();
    renderer.render( scene, camera );
}