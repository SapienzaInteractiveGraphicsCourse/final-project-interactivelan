import * as THREE from 'three';

const GRASS_COLOR = new THREE.Color(0x00A728);

export function createGrass(scene, terrain, grassModels, scale = 1.0, density = 1.0) {
    const dummy       = new THREE.Object3D();
    const terrainSize = terrain.size;
    const half        = terrainSize / 2;
    const transforms  = grassModels.map(() => []);

    const numClusters         = Math.round(60 * density);
    const instancesPerCluster = 20;
    const clusterRadius       = terrainSize * 0.04;

    for (let c = 0; c < numClusters; c++) {
        const cx = (Math.random() - 0.5) * terrainSize;
        const cz = (Math.random() - 0.5) * terrainSize;

        for (let i = 0; i < instancesPerCluster; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r     = Math.sqrt(Math.random()) * clusterRadius;

            const px = THREE.MathUtils.clamp(cx + Math.cos(angle) * r, -half, half);
            const pz = THREE.MathUtils.clamp(cz + Math.sin(angle) * r, -half, half);

            const step  = terrainSize / 120;
            const dhdx  = terrain.getHeightAt(px + step, pz) - terrain.getHeightAt(px - step, pz);
            const dhdz  = terrain.getHeightAt(px, pz + step) - terrain.getHeightAt(px, pz - step);
            const slope = Math.sqrt(dhdx * dhdx + dhdz * dhdz) / (2 * step);
            if (slope > 0.45) continue;

            const py = terrain.getHeightAt(px, pz);

            // Skip bare dirt at low elevations, slope check above handles steep faces
            const h = THREE.MathUtils.clamp((py + terrain.amplitude) / (2 * terrain.amplitude), 0, 1);
            if (h < 0.35) continue;

            dummy.position.set(px, py, pz);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.scale.setScalar(scale * THREE.MathUtils.randFloat(0.75, 1.4));
            dummy.updateMatrix();

            transforms[Math.floor(Math.random() * grassModels.length)].push(dummy.matrix.clone());
        }
    }

    const instances = [];

    for (let vi = 0; vi < grassModels.length; vi++) {
        if (transforms[vi].length === 0) continue;

        grassModels[vi].traverse(obj => {
            if (!obj.isMesh) return;

            const mat = obj.material.clone();
            mat.color.copy(GRASS_COLOR);
            if ('emissive' in mat) {
                mat.emissive.setHex(0x0d4a18);
                mat.emissiveIntensity = 0.2;
            }

            const inst = new THREE.InstancedMesh(obj.geometry, mat, transforms[vi].length);
            transforms[vi].forEach((matrix, i) => inst.setMatrixAt(i, matrix));

            inst.castShadow    = true;
            inst.receiveShadow = true;
            inst.instanceMatrix.needsUpdate = true;

            scene.add(inst);
            instances.push(inst);
        });
    }

    return {
        dispose() {
            for (const inst of instances) {
                scene.remove(inst);
                inst.geometry.dispose();
                inst.material.dispose();
            }
        }
    };
}
