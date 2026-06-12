import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

// Number of grass blades over the whole map
const BLADE_COUNT = 250000;
// Blade dimensions
const BLADE_WIDTH      = 0.36;
const BLADE_MIN_HEIGHT = 0.35;
const BLADE_MAX_HEIGHT = 1.1;
// No grass inside this radius around the launcher, keeps the tripod area clean
const LAUNCHER_CLEAR_RADIUS = 4;

// The vertex shader only handles blade shape
// Everything static (position, terrain height, blade height, color tint) is baked on the CPU
// Blade technique still from Peter Adams / Antaeus AR blogpost
const vertexShader = `
    uniform float uBladeWidth;

    attribute vec3  aYaw;
    attribute float aBladeHeight;
    attribute float aTint;

    varying vec3 vColor;

    void main() {
        // position already holds the blade base in world space, baked at build time
        vec3 transformed = position;

        // Blade shape: color attribute identifies bottom left, bottom right, top
        float factor = (color.r > 0.05) ? 1.0 : (color.b > 0.05) ? -1.0 : 0.0;
        float width  = uBladeWidth * clamp(aBladeHeight, 0.4, 1.2);
        transformed += aYaw * (width / 2.0) * factor;

        // The tip is just raised vertically
        transformed.y += aBladeHeight * color.g;

        // Grass color: dark at base, lighter at tip, per blade tint baked on the CPU
        vec3 baseColor = mix(vec3(0.18, 0.30, 0.05), vec3(0.42, 0.62, 0.12), color.g);
        vColor = baseColor * aTint;

        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(transformed, 1.0);
    }
`;

// Fragment shader: outputs per vertex grass color
const fragmentShader = `
    varying vec3 vColor;
    void main() {
        gl_FragColor = vec4(vColor, 1.0);
    }
`;

// Build the grass geometry with everything static baked in:
// blade base position sits on the terrain via getHeightAt, height and tint precomputed
function buildGrassGeometry(count, terrain) {
    const positions    = [];
    const colors       = [];
    const yaws         = [];
    const bladeHeights = [];
    const tints        = [];

    const halfMap    = terrain.size / 2;
    const yawUnitVec = new THREE.Vector3();

    // CPU noise for density clustering and bald patches, same library as the terrain
    const densityNoise = createNoise2D();

    const launcherX = terrain.launcherSpawn.x;
    const launcherZ = terrain.launcherSpawn.z;

    let placed = 0;
    while (placed < count) {
        const x = THREE.MathUtils.randFloat(-halfMap, halfMap);
        const z = THREE.MathUtils.randFloat(-halfMap, halfMap);

        // Density is the probability a blade grows here, so patches thin out gradually instead of cutting off at a hard noise contour
        // Skips don't increment placed, rejected samples get retried elsewhere
        const density = (densityNoise(x * 0.02, z * 0.02) + 1) / 2;
        if (Math.random() > density * 1.4) continue;

        // Keep the launcher plateau clean
        const distanceToLauncher = Math.hypot(x - launcherX, z - launcherZ);
        if (distanceToLauncher < LAUNCHER_CLEAR_RADIUS) continue;

        // Blade height varies with the same noise so tall and short grass cluster together
        const bladeHeight = THREE.MathUtils.lerp(BLADE_MIN_HEIGHT, BLADE_MAX_HEIGHT, density)
                          * THREE.MathUtils.randFloat(0.8, 1.2);

        // Sit slightly into the ground so slopes don't show floating blade bases
        const y = terrain.getHeightAt(x, z) - 0.05;

        const yawAngle = Math.random() * Math.PI * 2;
        yawUnitVec.set(Math.sin(yawAngle), 0, -Math.cos(yawAngle));

        const tint = THREE.MathUtils.randFloat(0.7, 1.0);

        // Three vertices: bottom left (r=0.1), bottom right (b=0.1), top (g=1)
        // All start at the same point, the vertex shader spreads them into a triangle
        const verts = [
            { color: [0.1, 0, 0] },
            { color: [0, 0, 0.1] },
            { color: [1, 1, 1]   },
        ];

        verts.forEach(vert => {
            positions.push(x, y, z);
            colors.push(...vert.color);
            yaws.push(yawUnitVec.x, yawUnitVec.y, yawUnitVec.z);
            bladeHeights.push(bladeHeight);
            tints.push(tint);
        });

        placed++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',     new THREE.BufferAttribute(new Float32Array(positions),    3));
    geometry.setAttribute('color',        new THREE.BufferAttribute(new Float32Array(colors),       3));
    geometry.setAttribute('aYaw',         new THREE.BufferAttribute(new Float32Array(yaws),         3));
    geometry.setAttribute('aBladeHeight', new THREE.BufferAttribute(new Float32Array(bladeHeights), 1));
    geometry.setAttribute('aTint',        new THREE.BufferAttribute(new Float32Array(tints),        1));

    return geometry;
}

// Create the grass system, fully static
// Takes the Terrain class instance so heights come from getHeightAt instead of a GPU render
export function createGrass(scene, terrain) {
    const geometry = buildGrassGeometry(BLADE_COUNT, terrain);

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        vertexColors: true,
        side:         THREE.DoubleSide,
        uniforms: {
            uBladeWidth: { value: BLADE_WIDTH },
        }
    });

    const mesh         = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    return {
        dispose() {
            scene.remove(mesh);
            geometry.dispose();
            material.dispose();
        }
    };
}