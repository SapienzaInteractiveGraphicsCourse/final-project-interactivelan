import * as THREE from 'three';

// Let's generate our gradient map once, much more efficient.
// export const TOON_GRADIENT_MAP = createToonGradientMap();

// Create gradient map to use for cellshading
export function createToonGradientMap() {
    const colors = new Uint8Array([
        0,   // dark
        80,  // mid
        180, // light
        255  // brightest
    ]);

    const gradientMap = new THREE.DataTexture(
        colors,
        colors.length,
        1,
        THREE.RedFormat
    );

    gradientMap.needsUpdate = true;
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;

    return gradientMap;
}

// Apply cell shading to any object — keeps original colors
export function applyCellShading(object) {
    object.traverse((child) => {
        if (!child.isMesh || child.userData.isOutline) return;

        const oldMat = child.material;
        const color  = oldMat.color ? oldMat.color.clone() : new THREE.Color(1, 1, 1);

        child.material = new THREE.MeshLambertMaterial({
            color: color,
            map:   oldMat.map,
        });

        child.castShadow    = true;
        child.receiveShadow = true;
    });
}

// Apply cell shading to trees — adds random hue and light variation per tree
// for a more natural forest look
export function applyTreeCellShading(object) {
    // Randomize once per tree, not per mesh — so trunk and canopy stay consistent
    const hueVariation   = (Math.random() - 0.5) * 0.05;
    const lightVariation = (Math.random() - 0.5) * 0.2;

    object.traverse((child) => {
        if (!child.isMesh || child.userData.isOutline) return;

        const oldMat = child.material;

        // We want our trees to have a slightly different light and hue
        const color = oldMat.color ? oldMat.color.clone() : new THREE.Color(1, 1, 1);
        const hsl   = {};
        color.getHSL(hsl);
        color.setHSL(0.33 + hueVariation, 0.8, hsl.l * 0.8 + lightVariation);

        child.material = new THREE.MeshLambertMaterial({
            color: color,
            map:   oldMat.map,
        });

        child.castShadow    = true;
        child.receiveShadow = true;
    });
}
