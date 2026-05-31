import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';


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
    const material = new THREE.MeshBasicMaterial({ color: "darkgreen", wireframe: true });
    const terrain  = new THREE.Mesh(geometry, material);

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

        // Assign new y value we got from our noise map.
        geometry.attributes.position.setY(i, y)
        // console.log(y);
        
    }
    // We need to compute new normals or lighting will be messed up
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    return terrain;
}


createTerrain(20,5);