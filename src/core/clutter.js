import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createToonGradientMap, applyCellShading, applyTreeCellShading } from '../rendering/shaders.js';
import { NavigationMap } from './navigation.js';
import { materialTreeA, materialTreeB, materialTreeC, materialTerrain } from '../rendering/materials.js';

const treeMaterials = [materialTreeA, materialTreeB, materialTreeC];


// Let's place some trees on the map, otherwise it will be too empty!
export async function placeTrees(
    scene,
    terrainData,
    treeModels,
    treeScale,
    threshold
) {
    const clusterNoise = createNoise2D();
    const detailNoise = createNoise2D();

    const terrain = terrainData.terrain;
    const terrainSize = terrainData.size;
    const navigationMap = terrainData.navMap;
    const protectedCells = terrainData.protectedCells;
    const launcherSpawn = terrainData.launcherSpawn;

    // We want to keep track on trees to have them collide with missiles
    const placedTrees = [];

    // We will place the trees' models on the vertices of the terrain
    const positions = terrain.geometry.attributes.position;

    // Keep a safe radius around the launcher where we won't place trees
    const launcherSafeRadius = 24;

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        // Use two noise layers to avoid a too uniform distribution
        const cluster = clusterNoise(x * 0.005, z * 0.005);
        const detail = detailNoise(x * 0.05, z * 0.05);
        let combined = (cluster * detail + 1) / 2;

        // Bias tree placement toward edges to hide map boundaries
        const edgeDistX = Math.abs(x) / (terrainSize / 2);
        const edgeDistZ = Math.abs(z) / (terrainSize / 2);
        const edgeBias = Math.pow(Math.max(edgeDistX, edgeDistZ), 8);
        combined += edgeBias * 0.35;

        if (combined < threshold) continue;

        const distToLauncher = Math.hypot(
            x - launcherSpawn.x,
            z - launcherSpawn.z
        );

        // Don't let trees spawn too close to the launcher
        if (distToLauncher < launcherSafeRadius) continue;

        // Add a bit of random offset so trees don't sit exactly on the grid
        const jitterX = (Math.random() - 0.1) * 10;
        const jitterZ = (Math.random() - 0.1) * 10;

        // Clamp so trees don't get pushed outside the map
        const treeX = Math.max(-terrainSize / 2, Math.min(terrainSize / 2, x + jitterX));
        const treeZ = Math.max(-terrainSize / 2, Math.min(terrainSize / 2, z + jitterZ));

        // After jitter, make sure the actual placed tree is still outside the safe zone
        const jitteredDistToLauncher = Math.hypot(
            treeX - launcherSpawn.x,
            treeZ - launcherSpawn.z
        );

        if (jitteredDistToLauncher < launcherSafeRadius) continue;

        // Skip protected corridor cells
        const treeCellKey = navigationMap.cellKey(treeX, treeZ);
        if (protectedCells && protectedCells.has(treeCellKey)) continue;

        // Skip non-passable cells
        // if (!navigationMap.isPassable(treeX, treeZ)) continue;

        // Use actual terrain height at final tree position
        const treeY = terrainData.getHeightAt(treeX, treeZ) - 0.1;

        // Pick one of our tree variants
        const modelIndex = Math.floor(Math.random() * treeModels.length);
        const treeMaterial = treeMaterials[modelIndex];
        const model = treeModels[modelIndex];
        const tree = model.clone();

        tree.castShadow = true;

        // Apply the correct material to the cloned tree
        tree.traverse((obj) => {
            if (obj.isMesh) {
                obj.material = treeMaterial;

                if (obj.geometry.attributes.uv && !obj.geometry.attributes.uv2) {
                    obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv);
                }

                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        tree.position.set(treeX, treeY, treeZ);
        tree.rotation.y = Math.random() * Math.PI * 2;

        // Let's have some variation in size of trees
        const randomScale = treeScale * (0.7 + Math.random() * 0.8);
        tree.scale.setScalar(randomScale);

        scene.add(tree);
        placedTrees.push(tree);

        // Mark the actual placed tree position as blocked for navigation
        navigationMap.setBlocked(treeX, treeZ);
    }
    return placedTrees;
}