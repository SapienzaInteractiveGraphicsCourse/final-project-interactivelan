import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Loads all our tree models and returns them as an array.
export async function loadTreeModels() {
    const loader = new GLTFLoader();

    const load = (path) => new Promise((resolve, reject) => {
        loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
    });

    // Promise.all should load all models in parallel, for what it's worth (they are less than 400kb total lowpoly model )
    const [treeA, treeB, treeC] = await Promise.all([
        load('/assets/models/tree_a.glb'),
        load('/assets/models/tree_b.glb'),
        load('/assets/models/tree_c.glb'),
    ]);

    return [treeA, treeB, treeC];
}