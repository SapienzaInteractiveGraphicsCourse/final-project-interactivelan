import * as THREE from 'three';

// Let's generate our gradient map once, much more efficient.
export const TOON_GRADIENT_MAP = createToonGradientMap();

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

// Apply cell shading to an object, boosting saturation to keep colors vivid
export function applyCellShading(object, gradientMap) {
    object.traverse((child) => {
        if (!child.isMesh || child.userData.isOutline) return;

        const oldMat = child.material;

        // We want our trees to have a slightly different light and hue
        const hueVariation = (Math.random() - 0.5) * 0.05;     
        const lightVariation = (Math.random() - 0.5) * 0.2;     


        // Boost saturation of original color
        const color = oldMat.color ? oldMat.color.clone() : new THREE.Color(1, 1, 1);
        const hsl = {};
        color.getHSL(hsl);
        color.setHSL(0.33 + hueVariation, 0.8, hsl.l * 0.8 + lightVariation);

        // Set material and properties we defined previously
        child.material = new THREE.MeshLambertMaterial({
            color: color,
            map: oldMat.map,
        });


        child.castShadow = true;
        child.receiveShadow = true;

    });
}