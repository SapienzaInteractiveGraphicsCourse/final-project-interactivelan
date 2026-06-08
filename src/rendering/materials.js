import * as THREE from 'three';

const loader = new THREE.TextureLoader();

// Load a texture with flipY disabled, required for Substance Painter exports apparently
function loadTex(path) {
    const t = loader.load(path);
    t.flipY = false;
    return t;
}

export const materialLauncher = new THREE.MeshStandardMaterial({
    map:          loadTex(`${import.meta.env.BASE_URL}textures/launcher/Base.png`),
    normalMap:    loadTex(`${import.meta.env.BASE_URL}textures/launcher/Normal_OpenGL.png`),
    roughnessMap: loadTex(`${import.meta.env.BASE_URL}textures/launcher/Roughness.png`),
    metalnessMap: loadTex(`${import.meta.env.BASE_URL}textures/launcher/Metallic.png`),
    aoMap:        loadTex(`${import.meta.env.BASE_URL}textures/launcher/AO.png`),
});

export const materialTank = new THREE.MeshStandardMaterial({
    map:          loadTex(`${import.meta.env.BASE_URL}textures/tank/Base.png`),
    normalMap:    loadTex(`${import.meta.env.BASE_URL}textures/tank/Normal_OpenGL.png`),
    roughnessMap: loadTex(`${import.meta.env.BASE_URL}textures/tank/Roughness.png`),
    metalnessMap: loadTex(`${import.meta.env.BASE_URL}textures/tank/Metallic.png`),
    aoMap:        loadTex(`${import.meta.env.BASE_URL}textures/tank/AO.png`),
});

export const materialTerrain = new THREE.MeshStandardMaterial({
    map:          loadTex(`${import.meta.env.BASE_URL}textures/terrain/Base.png`),
    normalMap:    loadTex(`${import.meta.env.BASE_URL}textures/terrain/Normal_OpenGL.png`),
    roughnessMap: loadTex(`${import.meta.env.BASE_URL}textures/terrain/Roughness.png`),
    aoMap:        loadTex(`${import.meta.env.BASE_URL}textures/terrain/AO.png`),
});
materialTerrain.map.repeat.set(200, 200);
materialTerrain.map.wrapS = THREE.RepeatWrapping;
materialTerrain.map.wrapT = THREE.RepeatWrapping;
// Same for other maps
materialTerrain.normalMap.repeat.set(200, 200);
materialTerrain.normalMap.wrapS = THREE.RepeatWrapping;
materialTerrain.normalMap.wrapT = THREE.RepeatWrapping;


export const materialTreeA = new THREE.MeshStandardMaterial({
    map:          loadTex(`${import.meta.env.BASE_URL}textures/tree_a/Base.png`),
    normalMap:    loadTex(`${import.meta.env.BASE_URL}textures/tree_a/Normal_OpenGL.png`),
    aoMap:        loadTex(`${import.meta.env.BASE_URL}textures/tree_a/AO.png`),
    metalness:    0.0,  
    roughness:    0.9  
});

export const materialTreeB = new THREE.MeshStandardMaterial({
    map:          loadTex(`${import.meta.env.BASE_URL}textures/tree_b/Base.png`),
    normalMap:    loadTex(`${import.meta.env.BASE_URL}textures/tree_b/Normal_OpenGL.png`),
    aoMap:        loadTex(`${import.meta.env.BASE_URL}textures/tree_b/AO.png`),
    metalness:    0.0,
    roughness:    0.9
});

export const materialTreeC = new THREE.MeshStandardMaterial({
    map:          loadTex(`${import.meta.env.BASE_URL}textures/tree_c/Base.png`),
    normalMap:    loadTex(`${import.meta.env.BASE_URL}textures/tree_c/Normal_OpenGL.png`),
    aoMap:        loadTex(`${import.meta.env.BASE_URL}textures/tree_c/AO.png`),
    metalness:    0.0,  
    roughness:    0.9
});