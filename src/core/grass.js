import * as THREE from 'three';

// Grass patch size around the launcher
const PATCH_SIZE    = 500;
// Number of grass blades
const BLADE_COUNT   = 1000000;
// Blade dimensions
const BLADE_WIDTH   = 0.36;
const BLADE_HEIGHT  = 0.30;

// Generate a smooth noise texture on a canvas
// Used for wind animation and height variation
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
    const texture    = new THREE.CanvasTexture(canvas);
    texture.wrapS    = THREE.RepeatWrapping;
    texture.wrapT    = THREE.RepeatWrapping;
    return texture;
}

// Render the terrain from above into a height map texture
// Black = lowest point, white = highest
function generateHeightMap(terrain, renderer) {
    const bbox = new THREE.Box3().setFromObject(terrain);

    const size   = 512;
    const target = new THREE.WebGLRenderTarget(size, size);

    const halfX  = (bbox.max.x - bbox.min.x) / 2;
    const halfZ  = (bbox.max.z - bbox.min.z) / 2;
    const ortho  = new THREE.OrthographicCamera(-halfX, halfX, halfZ, -halfZ, 0, 1000);
    ortho.position.set(
        (bbox.min.x + bbox.max.x) / 2,
        bbox.max.y + 100,
        (bbox.min.z + bbox.max.z) / 2
    );
    ortho.lookAt(
        (bbox.min.x + bbox.max.x) / 2,
        0,
        (bbox.min.z + bbox.max.z) / 2
    );

    // Encode height as greyscale
    const heightMat = new THREE.ShaderMaterial({
        vertexShader: `
            varying float vHeight;
            uniform float uMinY;
            uniform float uMaxY;
            void main() {
                vHeight    = (position.y - uMinY) / (uMaxY - uMinY);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying float vHeight;
            void main() {
                gl_FragColor = vec4(vHeight, vHeight, vHeight, 1.0);
            }
        `,
        uniforms: {
            uMinY: { value: bbox.min.y },
            uMaxY: { value: bbox.max.y },
        }
    });

    const originalMat  = terrain.material;
    terrain.material   = heightMat;

    const tempScene    = new THREE.Scene();
    tempScene.add(terrain);

    renderer.setRenderTarget(target);
    renderer.render(tempScene, ortho);
    renderer.setRenderTarget(null);

    // Restore
    terrain.material = originalMat;

    return { texture: target.texture, bbox };
}

// Vertex shader adapted from Peter Adams / Antaeus AR
// I would have had no idea how to implement it without his cool blogpost
// Source: https://medium.com/antaeus-ar/making-grass-with-triangles-in-glsl-using-three-js-e106771a71ff
const vertexShader = `
    uniform float uTime;
    uniform sampler2D uNoiseTexture;
    uniform vec3  uPlayerPosition;
    uniform sampler2D uHeightMap;
    uniform vec3  uBoundingBoxMin;
    uniform vec3  uBoundingBoxMax;
    uniform float uPatchSize;
    uniform float uBladeWidth;
    uniform float uWindDirection;
    uniform float uWindSpeed;
    uniform float uWindNoiseScale;
    uniform float uBaldPatchModifier;
    uniform float uFalloffSharpness;
    uniform float uHeightNoiseFrequency;
    uniform float uHeightNoiseAmplitude;
    uniform float uMaxBendAngle;
    uniform float uMaxBladeHeight;
    uniform float uRandomHeightAmount;

    attribute vec3 aYaw;
    attribute vec3 aBladeOrigin;

    varying vec3 vColor;

    float map(float value, float min1, float max1, float min2, float max2) {
        return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
    }

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
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
        vec3 transformed = position;
        vec3 origin      = aBladeOrigin;

        // Sliding window: wrap blades around launcher position
        float halfPatchSize = uPatchSize * 0.5;
        origin.x = mod(origin.x - uPlayerPosition.x + halfPatchSize, uPatchSize) - halfPatchSize;
        origin.z = mod(origin.z - uPlayerPosition.z + halfPatchSize, uPatchSize) - halfPatchSize;

        vec3 worldPos   = uPlayerPosition + origin;
        transformed.x   = origin.x;
        transformed.z   = origin.z;

        // Map to height map UVs based on world position
        vec2 uv = vec2(
            map(uPlayerPosition.x + origin.x, uBoundingBoxMin.x, uBoundingBoxMax.x, 0.0, 1.0),
            1.0 - map(uPlayerPosition.z + origin.z, uBoundingBoxMin.z, uBoundingBoxMax.z, 0.0, 1.0)
        );

        // Bilinear height map sampling for smooth terrain conformance
        vec2 texSize  = vec2(textureSize(uHeightMap, 0));
        vec2 uvTexel  = uv * texSize - 0.5;
        vec2 uvFloor  = floor(uvTexel) / texSize;
        vec2 uvCeil   = ceil(uvTexel)  / texSize;
        vec2 uvFrac   = fract(uvTexel);

        vec3 h00 = texture2D(uHeightMap, uvFloor).rgb;
        vec3 h10 = texture2D(uHeightMap, vec2(uvCeil.x,  uvFloor.y)).rgb;
        vec3 h01 = texture2D(uHeightMap, vec2(uvFloor.x, uvCeil.y)).rgb;
        vec3 h11 = texture2D(uHeightMap, uvCeil).rgb;

        vec3  heightMapColor = mix(mix(h00, h10, uvFrac.x), mix(h01, h11, uvFrac.x), uvFrac.y);
        float terrainHeight  = heightMapColor.x;
        float displacement   = map(terrainHeight, 0.0, 1.0, uBoundingBoxMin.y, uBoundingBoxMax.y);
        transformed.y += displacement - uPlayerPosition.y;

        // Height variation using noise
        vec3  heightNoise    = texture2D(uNoiseTexture, uv.yx * vec2(uHeightNoiseFrequency)).rgb;
        float heightModifier = ((heightNoise.r + heightNoise.g + heightNoise.b) * uMaxBladeHeight) * uHeightNoiseAmplitude;
        heightModifier      += random(uv) * (uRandomHeightAmount * 0.1);

        // Edge falloff so patch doesn't look like a square
        float edgeDistanceX = abs(origin.x) / halfPatchSize;
        float edgeDistanceZ = abs(origin.z) / halfPatchSize;
        float edgeFactor    = 1.0 - max(edgeDistanceX, edgeDistanceZ);
        edgeFactor          = pow(edgeFactor, uFalloffSharpness);

        // Bald patches for natural variation
        float baldPatchOffset = heightNoise.r * (uBaldPatchModifier * (1.0 - edgeFactor));
        heightModifier       -= baldPatchOffset;

        // Fade grass at terrain bounding box edges
        float edgeFade =
            smoothstep(uBoundingBoxMin.x, uBoundingBoxMin.x + 2.0, worldPos.x) *
            smoothstep(uBoundingBoxMax.x, uBoundingBoxMax.x - 2.0, worldPos.x) *
            smoothstep(uBoundingBoxMin.z, uBoundingBoxMin.z + 2.0, worldPos.z) *
            smoothstep(uBoundingBoxMax.z, uBoundingBoxMax.z - 2.0, worldPos.z);
        heightModifier *= edgeFade;

        // Blade shape: use color attribute to identify bottom-left, bottom-right, top
        float factor = (color.r > 0.05) ? 1.0 : (color.b > 0.05) ? -1.0 : 0.0;
        float width  = smoothstep(0.5, 1.0, heightModifier * 2.0) * uBladeWidth;
        transformed += aYaw * (width / 2.0) * factor;

        // Grass color: dark at base, lighter at tip
        vec3 baseColor = mix(vec3(0.18, 0.30, 0.05), vec3(0.42, 0.62, 0.12), color.g);
        vec3 colorNoise = texture2D(uNoiseTexture, uv.yx * vec2(uHeightNoiseFrequency) + (uTime * 0.1)).rgb;
        vColor = baseColor * (0.7 + 0.3 * colorNoise.r);

        // Reduce blade height near launcher center so it doesn't obstruct view (we use 0.2 because it should be enough for launcher)
        float distanceFromCenter = length(origin.xz) / halfPatchSize;
        float innerCircleFactor  = clamp(smoothstep(0.0, 0.02, distanceFromCenter), 0.0, 1.0);
        heightModifier          *= mix(0.1, 1.0, innerCircleFactor);

        // Wind effect using scrolling noise texture
        float noiseScale    = uWindNoiseScale * 0.1;
        vec2  noiseUV       = vec2(origin.x * noiseScale, origin.z * noiseScale);
        mat2  windRot       = mat2(cos(uWindDirection), -sin(uWindDirection),
                                   sin(uWindDirection),  cos(uWindDirection));
        vec2  rotatedNoiseUV = windRot * noiseUV + uTime * vec2(uWindSpeed);
        vec3  windNoise      = texture2D(uNoiseTexture, rotatedNoiseUV).rgb;

        vec3  axis   = vec3(windNoise.g, 0.0, windNoise.b);
        float angle  = radians(map(windNoise.g + windNoise.b, 0.0, 2.0, -uMaxBendAngle, uMaxBendAngle)) * color.g;
        mat3  rotMat = rotate3d(axis, angle);

        // Rotate blade tip around its base
        vec3 basePos     = vec3(transformed.x, transformed.y - heightModifier, transformed.z);
        vec3 relativePos = transformed - basePos;
        relativePos      = rotMat * relativePos;
        transformed      = basePos + relativePos;
        transformed.y   += heightModifier * color.g;

        vec4 modelPosition    = modelMatrix * vec4(transformed, 1.0);
        vec4 viewPosition     = viewMatrix * modelPosition;
        vec4 projectedPosition = projectionMatrix * viewPosition;
        gl_Position           = projectedPosition;
    }
`;

// Fragment shader: outputs per-vertex grass color
const fragmentShader = `
    varying vec3 vColor;
    void main() {
        gl_FragColor = vec4(vColor, 1.0);
    }
`;

// Build the grass geometry
// All three vertices of each blade start at the same position
// The vertex shader uses color attributes to spread them into a triangle
function buildGrassGeometry(count, patchSize) {
    const positions    = [];
    const colors       = [];
    const uvs          = [];
    const bladeOrigins = [];
    const yaws         = [];
    const indices      = [];

    const halfPatch    = patchSize * 0.5;
    const yawUnitVec   = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
        const x   = THREE.MathUtils.randFloat(-halfPatch, halfPatch);
        const z   = THREE.MathUtils.randFloat(-halfPatch, halfPatch);
        const uv  = [x / patchSize + 0.5, z / patchSize + 0.5];
        const yaw = Math.random() * Math.PI * 2;

        yawUnitVec.set(Math.sin(yaw), 0, -Math.cos(yaw));

        // Three vertices: bottom-left (r=0.1), bottom-right (b=0.1), top (g=1)
        const verts = [
            { color: [0.1, 0, 0] },
            { color: [0, 0, 0.1] },
            { color: [1, 1, 1]   },
        ];

        const vArrOffset = i * 3;

        verts.forEach(vert => {
            positions.push(x, 0, z);
            colors.push(...vert.color);
            uvs.push(...uv);
            yaws.push(yawUnitVec.x, yawUnitVec.y, yawUnitVec.z);
            bladeOrigins.push(x, 0, z);
        });

        indices.push(vArrOffset, vArrOffset + 1, vArrOffset + 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',    new THREE.BufferAttribute(new Float32Array(positions),    3));
    geometry.setAttribute('color',       new THREE.BufferAttribute(new Float32Array(colors),       3));
    geometry.setAttribute('uv',          new THREE.BufferAttribute(new Float32Array(uvs),          2));
    geometry.setAttribute('aYaw',        new THREE.BufferAttribute(new Float32Array(yaws),         3));
    geometry.setAttribute('aBladeOrigin',new THREE.BufferAttribute(new Float32Array(bladeOrigins), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

// Create a grass system that follows the launcher as a sliding window
// Source technique: https://medium.com/antaeus-ar/making-grass-with-triangles-in-glsl-using-three-js-e106771a71ff
// Adapted for StaticDefense by removing Game singleton and using launcher as center
export function createGrass(scene, terrain, renderer) {
    const noiseTexture             = generateNoiseTexture();
    const { texture: heightMap, bbox } = generateHeightMap(terrain, renderer);

    const geometry = buildGrassGeometry(BLADE_COUNT, PATCH_SIZE);

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        vertexColors: true,
        side:         THREE.DoubleSide,
        uniforms: {
            uTime:                { value: 0 },
            uNoiseTexture:        { value: noiseTexture },
            uPlayerPosition:      { value: new THREE.Vector3() },
            uHeightMap:           { value: heightMap },
            uBoundingBoxMin:      { value: bbox.min },
            uBoundingBoxMax:      { value: bbox.max },
            uPatchSize:           { value: PATCH_SIZE },
            uBladeWidth:          { value: BLADE_WIDTH },
            uWindDirection:       { value: Math.PI * 0.25 },
            uWindSpeed:           { value: 0.3 },
            uWindNoiseScale:      { value: 0.9 },
            uBaldPatchModifier:   { value: 2.5 },
            uFalloffSharpness:    { value: 0.35 },
            uHeightNoiseFrequency:{ value: 12 },
            uHeightNoiseAmplitude:{ value: 3 },
            uMaxBendAngle:        { value: 22 },
            uMaxBladeHeight:      { value: BLADE_HEIGHT },
            uRandomHeightAmount:  { value: 0.25 },
        }
    });

    const mesh             = new THREE.Mesh(geometry, material);
    mesh.frustumCulled     = false;
    scene.add(mesh);

    return {
        // Call each frame with elapsed time and launcher world position
        update(delta, elapsed, launcherPosition) {
            material.uniforms.uTime.value = elapsed;
            material.uniforms.uPlayerPosition.value.copy(launcherPosition);
        }
    };
}