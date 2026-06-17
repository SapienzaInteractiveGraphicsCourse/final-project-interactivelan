import * as THREE from 'three';

const loader = new THREE.TextureLoader();

// Load a texture with flipY disabled, required for Substance Painter exports apparently
function loadTex(path) {
    const texture = loader.load(path);
    texture.flipY = false;
    return texture;
}

// Generate a PBR material from a texture folder
function makePBR(dir, metalnessOverride = -1, roughnessOverride = -1) {
    // Build our texture's dir path
    const dirPath = `${import.meta.env.BASE_URL}textures/${dir}`;

    // Return a new material with our textures
    const material =  new THREE.MeshStandardMaterial({
        map:          loadTex(`${dirPath}/Base.png`),
        normalMap:    loadTex(`${dirPath}/Normal_OpenGL.png`),
        aoMap:        loadTex(`${dirPath}/AO.png`)
    });

    if (metalnessOverride !== -1) {
        material.metalness = metalnessOverride;
    }
    else {
        material.metalnessMap = loadTex(`${dirPath}/Metallic.png`)
    }

    if (roughnessOverride !== -1) {
        material.roughness = roughnessOverride;
    }
    else {
        material.roughnessMap = loadTex(`${dirPath}/Roughness.png`)
    }

    return material;
}

// Create our materials
export const materialLauncher = makePBR('launcher');
export const materialTank = makePBR('tank');

// Terrain: force matte roughness so it doesn't look plastic, zero metalness
export const materialTerrain = makePBR('terrain', 0, 0.92);

// Set our tiling for terrain
materialTerrain.map.repeat.set(50, 50);
materialTerrain.map.wrapS = THREE.RepeatWrapping;
materialTerrain.map.wrapT = THREE.RepeatWrapping;

// Same for other maps
materialTerrain.normalMap.repeat.set(50, 50);
materialTerrain.normalMap.wrapS = THREE.RepeatWrapping;
materialTerrain.normalMap.wrapT = THREE.RepeatWrapping;

materialTerrain.aoMap.repeat.set(50, 50);
materialTerrain.aoMap.wrapS = THREE.RepeatWrapping;
materialTerrain.aoMap.wrapT = THREE.RepeatWrapping;

materialTerrain.normalScale = new THREE.Vector2(1.4, 1.4);
materialTerrain.vertexColors = true;
