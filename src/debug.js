// Debug scene to test single parts of the project.

// Boilerplate code from threejs docs
import * as THREE from 'three';
// From world.js, import functions that need testing
import { createTerrain } from './world.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

// const cube = new THREE.Mesh( geometry, material );
const terrain = createTerrain(500,120,0.005,15);
scene.add( terrain );


// Some simple light for the scene
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 1, 0);
scene.add(light);

camera.position.set(0, 200, 300);
camera.lookAt(0, 0, 0);



window.scene = scene;
window.camera = camera;
function animate( time ) {

  renderer.render( scene, camera );

}