import * as THREE from 'three';

const loader = new THREE.TextureLoader();

// Load a texture with flipY disabled, required for Substance Painter exports apparently
function loadTex(path) {
    const texture = loader.load(path);
    texture.flipY = false;
    return texture;
}

// Let's create a single factory to creature our materials, what we weere doing here was kind of futile

// Generate a PBR Material from our Texture folders
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

// Our Material Terrain is slightly more complicated
export const materialTerrain = makePBR('terrain');

// Set our tiling for terrain
materialTerrain.map.repeat.set(100, 100);
materialTerrain.map.wrapS = THREE.RepeatWrapping;
materialTerrain.map.wrapT = THREE.RepeatWrapping;

// Same for other maps
materialTerrain.normalMap.repeat.set(100, 100);
materialTerrain.normalMap.wrapS = THREE.RepeatWrapping;
materialTerrain.normalMap.wrapT = THREE.RepeatWrapping;

materialTerrain.roughnessMap.repeat.set(100, 100);
materialTerrain.roughnessMap.wrapS = THREE.RepeatWrapping;
materialTerrain.roughnessMap.wrapT = THREE.RepeatWrapping;

materialTerrain.aoMap.repeat.set(100, 100);
materialTerrain.aoMap.wrapS = THREE.RepeatWrapping;
materialTerrain.aoMap.wrapT = THREE.RepeatWrapping;

// Make the terrain normals stronger so light shows more surface detail
materialTerrain.normalScale = new THREE.Vector2(2.0, 2.0);
materialTerrain.vertexColors = true; 
