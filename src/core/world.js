import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createToonGradientMap, applyCellShading, applyTreeCellShading } from '../rendering/shaders.js';
import { NavigationMap } from './navigation.js';
import { materialTreeA, materialTreeB, materialTreeC, materialTerrain } from '../rendering/materials.js';

const treeMaterials = [materialTreeA, materialTreeB, materialTreeC];


// In this method we generate a size*size terrain that we will use in our scene.
// We will use noise maps to generate displacement on our plane.
// It is divided in segments*segments segments, and we will adjust the Y position of each of them according to noise map.


// Radius of the flat disc carved at the launcher peak for clean tripod placement
const PLATEAU_RADIUS = 3;
// Soft blend ring outside the plateau so the transition looks natural
const PLATEAU_BLEND_RADIUS = 5;
// Search radius where we look for the actual highest point of the hill
const PEAK_SEARCH_RADIUS = 14;


export function createTerrain(
    size,
    segments,
    frequency,
    amplitude,
    launcherPosition = new THREE.Vector3(size * 0.35, 0, size * 0.35)
) {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const cellSize = size / segments;
    const navMap   = new NavigationMap(size, cellSize);

    const terrain = new THREE.Mesh(geometry, materialTerrain);
    terrain.receiveShadow = true;
    terrain.castShadow    = false;




    const baseNoise   = createNoise2D();
    const detailNoise = createNoise2D();
    const shapeNoise  = createNoise2D();

    const count   = geometry.attributes.position.count;
    const heights = new Float32Array(count);




    // We store the best peak candidate near the desired launcher region
    let peakIndex = 0;
    let peakY     = -Infinity;




    for (let i = 0; i < count; i++) {
        const x = geometry.attributes.position.getX(i);
        const z = geometry.attributes.position.getZ(i);

        // Main terrain shape
        let y  = baseNoise(x * frequency, z * frequency) * amplitude;
        y     += detailNoise(x * frequency * 2.5, z * frequency * 2.5) * amplitude * 0.35;

        // Normalize terrain coordinates to 0..1
        const nx = (x / (size * 0.5) + 1) * 0.5;
        const nz = (z / (size * 0.5) + 1) * 0.5;

        // We still bias the far corner a bit so the launcher area feels more dominant
        const cornerBias = Math.pow(nx, 2.4) * Math.pow(nz, 2.4);
        y += cornerBias * amplitude * 0.7;

        // Broad high-ground area around the launcher
        const dx = x - launcherPosition.x;
        const dz = z - launcherPosition.z;
        const dist = Math.hypot(dx, dz);

        const hillRadius = size * 0.22;
        let hillMask = 1.0 - Math.min(dist / hillRadius, 1.0);
        hillMask = hillMask * hillMask * (3.0 - 2.0 * hillMask);

        // Break the circular shape a bit so it feels part of the terrain
        const hillWarp = shapeNoise(x * 0.018, z * 0.018) * 0.5 + 0.5;
        const hillStrength = THREE.MathUtils.lerp(0.75, 1.15, hillWarp);

        y += hillMask * amplitude * 2.2 * hillStrength;

        // Add some extra shaping on the hill itself so it doesn't look like a dome
        const upperHillNoise = detailNoise(
            (x + 100.0) * frequency * 1.5,
            (z - 60.0)  * frequency * 1.5
        ) * amplitude * 0.4;
        y += upperHillNoise * hillMask;

        // Quantize terrain heights
        const levels = 8;
        y = Math.round(y * levels) / levels;

        heights[i] = y;

        // Instead of picking the closest point to launcherPosition,
        // search for the highest point in a local area around it.
        if (dist <= PEAK_SEARCH_RADIUS && y > peakY) {
            peakY = y;
            peakIndex = i;
        }
    }

    // Fallback, in case search radius somehow finds nothing
    if (peakY === -Infinity) {
        peakIndex = 0;
        peakY = heights[0];
        for (let i = 1; i < count; i++) {
            if (heights[i] > peakY) {
                peakY = heights[i];
                peakIndex = i;
            }
        }
    }


    // This becomes the true top of the launcher hill
    const peakX = geometry.attributes.position.getX(peakIndex);
    const peakZ = geometry.attributes.position.getZ(peakIndex);
    const plateauCenter = new THREE.Vector3(peakX, peakY, peakZ);

    for (let i = 0; i < count; i++) {
        const x = geometry.attributes.position.getX(i);
        const z = geometry.attributes.position.getZ(i);
        const dist = Math.hypot(x - plateauCenter.x, z - plateauCenter.z);

        let y = heights[i];

        // Flat pad exactly on the actual top part of the hill
        if (dist < PLATEAU_RADIUS) {
            y = peakY;
        }
        // Soft blend ring around the pad
        else if (dist < PLATEAU_RADIUS + PLATEAU_BLEND_RADIUS) {
            const t = (dist - PLATEAU_RADIUS) / PLATEAU_BLEND_RADIUS;
            const smooth = t * t * (3 - 2 * t);
            y = THREE.MathUtils.lerp(peakY, heights[i], smooth);
        }

        geometry.attributes.position.setY(i, y);
        heights[i] = y;
    }


    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    // Final launcher spawn is now exactly on the seamless plateau center
    const launcherSpawn = new THREE.Vector3(
        plateauCenter.x,
        peakY,
        plateauCenter.z
    );

    return { terrain, navMap, launcherSpawn };
}


// Let's place some trees on the map, otherwise it will be too empty!
export async function placeTrees(
    scene,
    terrain,
    terrainSize,
    treeModels,
    treeScale,
    threshold,
    navigationMap,
    launcherSpawn = new THREE.Vector3(terrainSize * 0.35, 0, terrainSize * 0.35)
) {
    const clusterNoise = createNoise2D();
    const detailNoise  = createNoise2D();

    // We will place the trees' models on the vertices of the terrain.
    const positions = terrain.geometry.attributes.position;

    // Keep a safe radius around the launcher where we won't place trees so gameplay stays possible
    const launcherSafeRadius = 24;

    for (let i = 0; i < positions.count; i++) {
        let x = positions.getX(i);
        let y = positions.getY(i) - 0.1;
        let z = positions.getZ(i);

        // Use two noise layers to avoid a too uniform distribution
        let cluster  = clusterNoise(x * 0.005, z * 0.005);
        let detail   = detailNoise(x * 0.05,  z * 0.05);
        let combined = (cluster * detail + 1) / 2;

        // Bias tree placement toward edges to hide map boundaries
        const edgeDistX = Math.abs(x) / (terrainSize / 2);
        const edgeDistZ = Math.abs(z) / (terrainSize / 2);
        const edgeBias  = Math.pow(Math.max(edgeDistX, edgeDistZ), 8);
        combined       += edgeBias * 0.35;

        if (combined < threshold) continue;

        const distToLauncher = Math.hypot(
            x - launcherSpawn.x,
            z - launcherSpawn.z
        );

        // Don't let trees spawn too close to the launcher
        if (distToLauncher < launcherSafeRadius) continue;

        // Add a bit of random offset so trees don't sit exactly on the grid
        let jitterX = (Math.random() - 0.5) * 10;
        let jitterZ = (Math.random() - 0.5) * 10;

        // Clamp so trees don't get pushed outside the map
        let treeX = Math.max(-terrainSize / 2, Math.min(terrainSize / 2, x + jitterX));
        let treeZ = Math.max(-terrainSize / 2, Math.min(terrainSize / 2, z + jitterZ));

        // After jitter, make sure the actual placed tree is still outside the safe zone
        const jitteredDistToLauncher = Math.hypot(
            treeX - launcherSpawn.x,
            treeZ - launcherSpawn.z
        );

        if (jitteredDistToLauncher < launcherSafeRadius) continue;

        // Pick one of our tree variants
        const modelIndex   = Math.floor(Math.random() * treeModels.length);
        const treeMaterial = treeMaterials[modelIndex];
        let model          = treeModels[modelIndex];
        let tree           = model.clone();

        tree.castShadow = true;
        // Apply the correct material to the cloned tree
        tree.traverse((obj) => {
            if (obj.isMesh) {
                obj.material = treeMaterial;
                if (obj.geometry.attributes.uv && !obj.geometry.attributes.uv2) {
                    obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv);
                }
            }
        });


        tree.position.set(treeX, y, treeZ);
        tree.rotation.y = Math.random() * Math.PI * 2;


        // Let's have some variation in size of trees
        const randomScale = treeScale * (0.7 + Math.random() * 0.8);
        tree.scale.setScalar(randomScale);


        scene.add(tree);
        // Mark the actual placed tree position as blocked for navigation
        navigationMap.setBlocked(treeX, treeZ);
    }
}