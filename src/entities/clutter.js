import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export async function placeTrees(scene, terrainData, treeModels, treeScale, threshold) {
    const clusterNoise = createNoise2D();
    const detailNoise  = createNoise2D();

    const terrain        = terrainData.terrain;
    const terrainSize    = terrainData.size;
    const navigationMap  = terrainData.navMap;
    const protectedCells = terrainData.protectedCells;
    const launcherSpawn  = terrainData.launcherSpawn;
    const positions      = terrain.geometry.attributes.position;
    const dummy          = new THREE.Object3D();

    const launcherSafeRadius = 24;

    const transforms      = treeModels.map(() => []);
    const placedPositions = [];

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        // Use two noise layers to avoid a too uniform distribution
        const cluster = clusterNoise(x * 0.005, z * 0.005);
        const detail  = detailNoise(x * 0.05,   z * 0.05);
        let combined  = (cluster * detail + 1) / 2;

        // Bias tree placement toward edges to hide map boundaries
        const edgeDistX        = Math.abs(x) / (terrainSize / 2);
        const edgeDistZ        = Math.abs(z) / (terrainSize / 2);
        const edgeBias         = Math.pow(Math.max(edgeDistX, edgeDistZ), 8);
        const nearCorridorEdge = protectedCells?.has(navigationMap.cellKey(x, z)) ? 0 : 1;
        combined += nearCorridorEdge * 0.03;
        combined += edgeBias * 0.35;

        if (combined < threshold) continue;

        // Don't let trees spawn too close to the launcher
        const distToLauncher = Math.hypot(x - launcherSpawn.x, z - launcherSpawn.z);
        if (distToLauncher < launcherSafeRadius) continue;

        // Add a bit of random offset so trees don't sit exactly on the grid
        const jitterX = (Math.random() - 0.1) * 10;
        const jitterZ = (Math.random() - 0.1) * 10;

        // Clamp so trees don't get pushed outside the map
        const treeX = Math.max(-terrainSize / 2, Math.min(terrainSize / 2, x + jitterX));
        const treeZ = Math.max(-terrainSize / 2, Math.min(terrainSize / 2, z + jitterZ));

        // After jitter, make sure the actual placed tree is still outside the safe zone
        if (Math.hypot(treeX - launcherSpawn.x, treeZ - launcherSpawn.z) < launcherSafeRadius) continue;

        // Skip protected corridor cells
        const treeCellKey = navigationMap.cellKey(treeX, treeZ);
        if (protectedCells && protectedCells.has(treeCellKey)) continue;

        // Use actual terrain height at final tree position
        const treeY       = terrainData.getHeightAt(treeX, treeZ) - 0.3;
        const modelIndex  = Math.floor(Math.random() * treeModels.length);
        const randomScale = treeScale * (0.5 + Math.random() * 0.8);

        dummy.position.set(treeX, treeY, treeZ);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.scale.setScalar(randomScale);
        dummy.updateMatrix();

        transforms[modelIndex].push(dummy.matrix.clone());
        placedPositions.push({ x: treeX, y: treeY, z: treeZ, scale: randomScale });

        // Mark the actual placed tree position as blocked for navigation
        navigationMap.setBlocked(treeX, treeZ);
    }

    // One InstancedMesh per mesh per model type — same draw call approach as grass
    for (let t = 0; t < treeModels.length; t++) {
        if (transforms[t].length === 0) continue;

        treeModels[t].traverse(obj => {
            if (!obj.isMesh) return;

            // Prevent z-fighting with terrain surface
            obj.material.polygonOffset       = true;
            obj.material.polygonOffsetFactor  = -1;
            obj.material.polygonOffsetUnits   = -1;

            const inst = new THREE.InstancedMesh(obj.geometry, obj.material, transforms[t].length);
            transforms[t].forEach((m, i) => inst.setMatrixAt(i, m));
            inst.castShadow    = true;
            inst.receiveShadow = true;
            inst.instanceMatrix.needsUpdate = true;
            scene.add(inst);
        });
    }

    // Invisible proxy cylinders used for missile collision raycasting
    const proxyGeo = new THREE.CylinderGeometry(1, 1, 5, 6);
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });

    const treeProxies = placedPositions.map(pos => {
        const proxy = new THREE.Mesh(proxyGeo, proxyMat);
        proxy.position.set(pos.x, pos.y + 2.5, pos.z);
        scene.add(proxy);
        return proxy;
    });

    return treeProxies;
}