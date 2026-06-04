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
        loadModel('/assets/models/tree_a.glb'),
        loadModel('/assets/models/tree_b.glb'),
        loadModel('/assets/models/tree_c.glb'),
    ]);
}