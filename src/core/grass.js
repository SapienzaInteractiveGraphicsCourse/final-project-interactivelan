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

// Generate a smooth noise texture on a canvas
// Only used for wind animation now, height variation moved to the CPU
function generateNoiseTexture() {
    const size   = 256;
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx       = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);

    // Fill with smooth-ish noise by averaging random values
    const raw = new Float32Array(size * size * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = Math.random();

    // Simple box blur pass for smoothness
    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
            for (let c = 0; c < 3; c++) {
                const idx = (y * size + x) * 3 + c;
                raw[idx] = (
                    raw[((y-1)*size + x)   * 3 + c] +
                    raw[((y+1)*size + x)   * 3 + c] +
                    raw[(y*size + (x-1))   * 3 + c] +
                    raw[(y*size + (x+1))   * 3 + c] +
                    raw[idx]
                ) / 5;
            }
        }
    }

    for (let i = 0; i < size * size; i++) {
        imageData.data[i * 4]     = raw[i * 3]     * 255;
        imageData.data[i * 4 + 1] = raw[i * 3 + 1] * 255;
        imageData.data[i * 4 + 2] = raw[i * 3 + 2] * 255;
        imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// The vertex shader only handles what actually changes at runtime: blade shape and wind
// Everything static (position, terrain height, blade height, color tint) is baked on the CPU
// Wind technique still from Peter Adams / Antaeus AR blogpost
const vertexShader = `
    uniform float uTime;
    uniform sampler2D uNoiseTexture;
    uniform float uBladeWidth;
    uniform float uWindDirection;
    uniform float uWindSpeed;
    uniform float uWindNoiseScale;
    uniform float uMaxBendAngle;

    attribute vec3  aYaw;
    attribute float aBladeHeight;
    attribute float aTint;

    varying vec3 vColor;

    float map(float value, float min1, float max1, float min2, float max2) {
        return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
    }

    mat3 rotate3d(vec3 axis, float angle) {
        axis     = normalize(axis);
        float s  = sin(angle);
        float c  = cos(angle);
        float oc = 1.0 - c;
        return mat3(
            oc*axis.x*axis.x + c,          oc*axis.x*axis.y - axis.z*s,  oc*axis.z*axis.x + axis.y*s,
            oc*axis.x*axis.y + axis.z*s,  oc*axis.y*axis.y + c,          oc*axis.y*axis.z - axis.x*s,
            oc*axis.z*axis.x - axis.y*s,  oc*axis.y*axis.z + axis.x*s,  oc*axis.z*axis.z + c
        );
    }

    void main() {
        // position already holds the blade base in world space, baked at build time
        vec3 transformed = position;

        // Blade shape: color attribute identifies bottom left, bottom right, top
        float factor = (color.r > 0.05) ? 1.0 : (color.b > 0.05) ? -1.0 : 0.0;
        float width  = uBladeWidth * clamp(aBladeHeight, 0.4, 1.2);
        transformed += aYaw * (width / 2.0) * factor;

        // Wind effect using scrolling noise texture
        float noiseScale     = uWindNoiseScale * 0.1;
        vec2  noiseUV        = vec2(position.x * noiseScale, position.z * noiseScale);
        mat2  windRot        = mat2(cos(uWindDirection), -sin(uWindDirection),
                                    sin(uWindDirection),  cos(uWindDirection));
        vec2  rotatedNoiseUV = windRot * noiseUV + uTime * vec2(uWindSpeed);
        vec3  windNoise      = texture2D(uNoiseTexture, rotatedNoiseUV).rgb;

        vec3  axis   = vec3(windNoise.g, 0.0, windNoise.b);
        float angle  = radians(map(windNoise.g + windNoise.b, 0.0, 2.0, -uMaxBendAngle, uMaxBendAngle)) * color.g;
        mat3  rotMat = rotate3d(axis, angle);

        // The tip offset is purely vertical before wind, so we just rotate it and add
        vec3 tipOffset = rotMat * vec3(0.0, aBladeHeight * color.g, 0.0);
        transformed   += tipOffset;

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

        // Bald patches: low noise areas grow no grass
        const density = (densityNoise(x * 0.02, z * 0.02) + 1) / 2;
        if (density < 0.25) { placed++; continue; }

        // Keep the launcher plateau clean
        const distanceToLauncher = Math.hypot(x - launcherX, z - launcherZ);
        if (distanceToLauncher < LAUNCHER_CLEAR_RADIUS) { placed++; }

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

// Create the grass system, fully static apart from wind
// Takes the Terrain class instance so heights come from getHeightAt instead of a GPU render
export function createGrass(scene, terrain) {
    const noiseTexture = generateNoiseTexture();
    const geometry     = buildGrassGeometry(BLADE_COUNT, terrain);

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        vertexColors: true,
        side:         THREE.DoubleSide,
        uniforms: {
            uTime:           { value: 0 },
            uNoiseTexture:   { value: noiseTexture },
            uBladeWidth:     { value: BLADE_WIDTH },
            uWindDirection:  { value: Math.PI * 0.25 },
            uWindSpeed:      { value: 0.3 },
            uWindNoiseScale: { value: 0.9 },
            uMaxBendAngle:   { value: 22 },
        }
    });

    const mesh         = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    return {
        // Call each frame, only time changes now
        update(elapsed) {
            // Wrap so float precision doesn't degrade the wind after long sessions
            material.uniforms.uTime.value = elapsed % 1000;
        },

        dispose() {
            scene.remove(mesh);
            geometry.dispose();
            material.dispose();
            noiseTexture.dispose();
        }
    };
}