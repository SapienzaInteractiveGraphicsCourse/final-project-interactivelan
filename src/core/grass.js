import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';


export function createGrass(scene, terrain, grassModels, scale = 1.0, density = 0.7) {
    const densityNoise = createNoise2D();
    const dummy        = new THREE.Object3D();

    // Walk every terrain vertex 
    const positions    = terrain.terrain.geometry.attributes.position;
    const terrainSize  = terrain.size;
    const densityFactor = THREE.MathUtils.lerp(1.0, 2.0, density);

    const transforms = grassModels.map(() => []);

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        const noiseSample = (densityNoise(x * 0.02, z * 0.02) + 1) / 2;
        //if (Math.random() > noiseSample * densityFactor) continue;
        if (Math.random() > density) continue;

        // Small jitter so clumps don't sit exactly on grid points
        const jitterX = (Math.random() - 0.5) * 4;
        const jitterZ = (Math.random() - 0.5) * 4;
        const px      = THREE.MathUtils.clamp(x + jitterX, -terrainSize / 2, terrainSize / 2);
        const pz      = THREE.MathUtils.clamp(z + jitterZ, -terrainSize / 2, terrainSize / 2);
        const py      = terrain.getHeightAt(px, pz);

        dummy.scale.setScalar(scale * THREE.MathUtils.randFloat(0.8, 1.3));
        dummy.position.set(px, py, pz);
        // Correct model rotation
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.updateMatrix();

        transforms[Math.floor(Math.random() * grassModels.length)].push(dummy.matrix.clone());
    }

    // One InstancedMesh per mesh inside each GLB — same approach as trees
    const instances = [];

    for (let variantIndex = 0; variantIndex < grassModels.length; variantIndex++) {
        if (transforms[variantIndex].length === 0) continue;

        grassModels[variantIndex].traverse(obj => {
            if (!obj.isMesh) return;

            const inst = new THREE.InstancedMesh(
                obj.geometry,
                obj.material,
                transforms[variantIndex].length
            );

            transforms[variantIndex].forEach((matrix, i) => inst.setMatrixAt(i, matrix));

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
            }
        }
    };
}