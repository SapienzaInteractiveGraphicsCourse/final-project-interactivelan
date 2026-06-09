import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createToonGradientMap, applyCellShading, applyTreeCellShading } from '../rendering/shaders.js';
import { NavigationMap } from './navigation.js';
import { materialTreeA, materialTreeB, materialTreeC, materialTerrain } from '../rendering/materials.js';

const treeMaterials = [materialTreeA, materialTreeB, materialTreeC];

// Radius of the flat disc carved at the launcher peak for clean tripod placement
const PLATEAU_RADIUS = 3;

// In this method we generate a size*size terrain that we will use in our scene.
// We will use noise maps to generate displacement on our plane.
// It is divided in segments*segments segments, and we will adjust the Y position of each of them according to noise map.
// launcherPosition is a THREE.Vector3 — the terrain will naturally peak there for high ground advantage
export function createTerrain(size, segments, frequency, amplitude, launcherPosition = new THREE.Vector3(0, 0, size / 2 - 20)) {
    // Our base geometry: a flat plane of size size*size 
    // and split in segments*segments segments (forgive my choice of variables).
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);

    const cellSize = size / segments;
    // Create our navigation map
    let navMap = new NavigationMap(size, cellSize);

    const terrain = new THREE.Mesh(geometry, materialTerrain);
    terrain.receiveShadow = true;
    terrain.castShadow    = false;

    // By default it is created upright, we need to rotate it to have a terrain and not a wall.
    geometry.rotateX(-Math.PI / 2);

    // Let's generate our noise to use for terrain generation.
    // We will take the value at x,z coordinates to determine elevation of corresponding vertex.
    const noise = createNoise2D();

    // Max possible distance from launcher to a corner of the terrain
    // Used to normalize the hill boost falloff
    const maxDist = Math.sqrt(2) * size / 2;

    // Total number of vertices on our plane
    const count = geometry.attributes.position.count;

    // First pass: compute all heights including hill boost and quantization
    // We need these before carving the plateau so we know the exact peak height
    const heights = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        let x = geometry.attributes.position.getX(i);
        let z = geometry.attributes.position.getZ(i);
        let y = noise(x * frequency, z * frequency) * amplitude;

        // Distance from this vertex to the launcher position
        const distToLauncher = Math.sqrt(
            (x - launcherPosition.x) ** 2 +
            (z - launcherPosition.z) ** 2
        );

        // Normalized distance from 0 (at launcher) to 1 (at farthest corner)
        // Squared for a steeper falloff so the hill is pronounced but not too wide
        const normalized = 1.0 - Math.min(distToLauncher / maxDist, 1.0);
        y += normalized * normalized * amplitude * 1.5;

        // Quantization of the terrain's heights:
        // There will just be 8 possible heights of terrain, it will make npc movement easier later on
        const levels = 8;
        y = Math.round(y * levels) / levels;

        heights[i] = y;
    }

    // Find the peak height at the launcher position from the first pass
    let closestDist = Infinity;
    let peakY       = 0;
    for (let i = 0; i < count; i++) {
        const vx   = geometry.attributes.position.getX(i);
        const vz   = geometry.attributes.position.getZ(i);
        const dist = Math.sqrt((vx - launcherPosition.x) ** 2 + (vz - launcherPosition.z) ** 2);
        if (dist < closestDist) {
            closestDist = dist;
            peakY       = heights[i];
        }
    }

    // Second pass: apply heights and carve a flat disc at the launcher peak
    // The disc is at the natural hill peak so it blends seamlessly with the terrain
    for (let i = 0; i < count; i++) {
        const vx   = geometry.attributes.position.getX(i);
        const vz   = geometry.attributes.position.getZ(i);
        const dist = Math.sqrt((vx - launcherPosition.x) ** 2 + (vz - launcherPosition.z) ** 2);

        // Inside plateau radius: snap to peak height for a perfectly flat surface
        const y = dist < PLATEAU_RADIUS ? peakY : heights[i];
        geometry.attributes.position.setY(i, y);
    }

    // We need to compute new normals or lighting will be messed up
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    // Return launcher spawn at the actual terrain peak so placement is accurate
    const launcherSpawn = new THREE.Vector3(launcherPosition.x, peakY, launcherPosition.z);

    return { terrain, navMap, launcherSpawn };
}


// Let's place some trees on the map, otherwise it will be too empty!
export async function placeTrees(scene, terrain, terrainSize, treeModels, treeScale, threshold, navigationMap) {

    const gradientMap = createToonGradientMap();

    const clusterNoise = createNoise2D();
    const detailNoise  = createNoise2D();

    // We will place the trees' models on the vertices of the terrain.
    const positions = terrain.geometry.attributes.position;
    const colors    = terrain.geometry.attributes.color;

    for (let i = 0; i < positions.count; i++) {
        let x = positions.getX(i);
        let y = positions.getY(i) - 0.1;
        let z = positions.getZ(i);

        let cluster  = clusterNoise(x * 0.005, z * 0.005);
        let detail   = detailNoise(x * 0.05,   z * 0.05);
        let combined = (cluster * detail + 1) / 2;  // So we get values from 0 to 1

        // Bias tree placement toward edges to hide map boundaries
        // Power of 2 keeps the center natural, edges dense
        const edgeDistX = Math.abs(x) / (terrainSize / 2);
        const edgeDistZ = Math.abs(z) / (terrainSize / 2);
        const edgeBias  = Math.pow(Math.max(edgeDistX, edgeDistZ), 80);
        combined       += edgeBias * 0.5;

        if (combined < threshold) continue;

        // We set this part of the navmap as not navigable
        // The tree won't exactly be there (because of the jitter offset we will add later), but will be close enough
        navigationMap.setBlocked(x, z);

        // Small random jitter so trees don't sit exactly on grid points
        let jitterX = (Math.random() - 0.5) * 10;
        let jitterZ = (Math.random() - 0.5) * 10;

        const modelIndex = Math.floor(Math.random() * treeModels.length);
        let model        = treeModels[modelIndex];
        let tree         = model.clone();
        tree.castShadow  = true;

        // Apply the matching material for this tree type
        const treeMaterial = treeMaterials[modelIndex];
        tree.traverse((obj) => {
            if (obj.isMesh) {
                obj.material = treeMaterial;
                obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv);
            }
        });

        // Make sure we aren't placing trees into the void after applying jitter: let's clamp
        let treeX = Math.max(-terrainSize/2, Math.min(terrainSize/2, x + jitterX));
        let treeZ = Math.max(-terrainSize/2, Math.min(terrainSize/2, z + jitterZ));

        tree.position.set(treeX, y, treeZ);
        tree.rotation.y = Math.random() * Math.PI * 2;

        // Let's have some variation in size of trees
        // Minimum size is 0.7, maximum size is 0.7 + 1.0 * 0.8 = 1.5
        const randomScale = treeScale * (0.7 + Math.random() * 0.8);
        tree.scale.setScalar(randomScale);

        scene.add(tree);
    }
}