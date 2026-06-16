import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();


// Generic model loader: return a scene with loaded glb
export function loadModel(path) {
    return new Promise((resolve, reject) => {
        loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
    });
}

// Loads all our tree models and returns them as an array.
export async function loadTreeModels() {
    // Promise.all should load all models in parallel, for what it's worth (they are less than 400kb total lowpoly models)
    return Promise.all([
        loadModel(`${import.meta.env.BASE_URL}models/tree_a.glb`),
        loadModel(`${import.meta.env.BASE_URL}models/tree_b.glb`),
        loadModel(`${import.meta.env.BASE_URL}models/tree_c.glb`)
    ]);
}

// Loads all our grass models and returns them as an array.
export async function loadGrassModels() {
    return Promise.all([
        loadModel(`${import.meta.env.BASE_URL}models/grass_a.glb`),
        loadModel(`${import.meta.env.BASE_URL}models/grass_b.glb`),
        loadModel(`${import.meta.env.BASE_URL}models/grass_c.glb`),
        loadModel(`${import.meta.env.BASE_URL}models/grass_d.glb`)
        //loadModel(`${import.meta.env.BASE_URL}models/grass_e.glb`)
    ]);
}