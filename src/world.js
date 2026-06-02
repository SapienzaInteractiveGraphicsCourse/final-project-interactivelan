import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createToonGradientMap, applyCellShading,TOON_GRADIENT_MAP } from './shaders.js';



// In this method we generate a size*size terrain that we will use in our scene.
// We will use noise maps to generate displacement on our plane;

// It is divided in segments*segments segments, and we will adjust the Y position of each of them according to
// noise map.

export function createTerrain(size, segments, frequency, amplitude) {
    // Our base geometry: a flat plane of size size*size 
    // and split in segments*segments segments (forgive my choice of variables).
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);

    // A temporary dark green color for our material.
    // I may switch to toon Materials down the line, very provisional code right now.
    // Using wireframe for debugging
    const material = new THREE.MeshLambertMaterial({ color: "green", wireframe: false, flatShading: true});
    const terrain  = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;  
    terrain.castShadow = false;

    // By default it is created upright, we need to rotate it to have a terrain and not a wall.
    geometry.rotateX(-Math.PI / 2);

    // Let's generate our noise to use for terrain generation.
    // We will take the value at x,z coordinates to determine elevation of corresponding vertex.
    const noise = createNoise2D();

    // Total number of vertices on our plane; hopefully it should be equal to segments*segments..
    const count = geometry.attributes.position.count;

    // Assign Y values corresponding to plane's vertices from our noise map
    for (let i=0; i<count; i++){
        // We are reading a vector of points: let's get the position of each one
        // And get new corresponding y value from noise
        let x = geometry.attributes.position.getX(i);
        let z = geometry.attributes.position.getZ(i);
        let y = noise(x*frequency, z*frequency)*amplitude;

        // Quantization of the terrain's heights:
        // There will just be 8 possible heights of terrain, it will make npc movement easier later on
        const levels = 8;
        y = Math.round(y * levels) / levels;
        
        // Assign new y value we got from our noise map.
        geometry.attributes.position.setY(i, y);
    }

    // We need to compute new normals or lighting will be messed up
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    return terrain;
}


// Let's place some trees on the map, otherwise it will be too empty!
export async function placeTrees(scene, terrain, treeModels, treeScale, threshold) {

    const gradientMap = createToonGradientMap();

    const clusterNoise = createNoise2D();
    const detailNoise  = createNoise2D();

    // We will place the trees' models on the vertices of the terrain.
    const positions = terrain.geometry.attributes.position;
    const colors    = terrain.geometry.attributes.color;

    for (let i = 0; i < positions.count; i++) {
        let x = positions.getX(i);
        let y = positions.getY(i);
        let z = positions.getZ(i);

        let cluster  = clusterNoise(x * 0.005, z * 0.005);
        let detail   = detailNoise(x * 0.05,   z * 0.05);
        // let combined = cluster * detail;
        let combined = (cluster * detail + 1) / 2;  // So we get values from 0 to 1

        if (combined < threshold){
            continue;
        }

        // We want even more green around trees, so that the remaining ground will look like paths
        // Color the ground green where trees are placed
        // colors.setXYZ(i, 0.08, 0.2, 0.04);

        // Small random jitter so trees don't sit exactly on grid points
        // Do we need really need it?
        let jitterX = (Math.random() - 0.5) * 10;
        let jitterZ = (Math.random() - 0.5) * 10;

        // Select a random tree model from the three available
        let model = treeModels[Math.floor(Math.random() * treeModels.length)];
        let tree  = model.clone();
        // We want trees to cast shadows
        tree.castShadow = true;

        // We already computed TOON_GRADIENT_MAP
        applyCellShading(tree, TOON_GRADIENT_MAP);

        tree.position.set(x + jitterX, y, z + jitterZ);
        tree.rotation.y = Math.random() * Math.PI * 2;
        tree.scale.setScalar(treeScale);

        scene.add(tree);
    }

}