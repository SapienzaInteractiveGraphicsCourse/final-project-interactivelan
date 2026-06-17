import * as THREE from 'three';
import { loadModel } from '../utilities/loader.js';

// Simple static prop that loads a GLB model and places it in the scene
export class Prop {
    constructor(model) {
        this.model = model;
        this.group = new THREE.Group();
        this.group.add(model);
    }

    // Place the prop in the scene at a given position, rotation, and scale
    addToScene(scene, position, rotation = new THREE.Euler(), scale = 1.0) {
        this.group.position.copy(position);
        this.group.rotation.copy(rotation);
        this.group.scale.setScalar(scale);
        scene.add(this.group);
    }

    dispose(scene) {
        scene.remove(this.group);
    }
}


export async function loadSandbags() {
    return loadModel(`${import.meta.env.BASE_URL}models/sandbags.glb`);
}
