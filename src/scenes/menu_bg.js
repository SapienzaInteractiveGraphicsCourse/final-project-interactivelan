import * as THREE from 'three';
import { loadModel } from '../utilities/loader.js';

function makeWireframe(sourceModel, opacity) {
    sourceModel.updateWorldMatrix(true, true);
    const inner   = new THREE.Group();
    const invRoot = sourceModel.matrixWorld.clone().invert();

    sourceModel.traverse(child => {
        if (!child.isMesh || !child.geometry) return;
        const lines = new THREE.LineSegments(
            new THREE.WireframeGeometry(child.geometry),
            new THREE.LineBasicMaterial({ color: 0x7a9450, transparent: true, opacity })
        );
        lines.applyMatrix4(child.matrixWorld.clone().premultiply(invRoot));
        inner.add(lines);
    });

    // Shift so rotation pivots around the bounding-box center, not the geometry origin
    inner.position.sub(new THREE.Box3().setFromObject(inner).getCenter(new THREE.Vector3()));

    const pivot = new THREE.Group();
    pivot.add(inner);
    return pivot;
}

// Synchronous setup — call after models are already loaded
export function setupMenuBg(canvas, launcherModel) {
    const rect = canvas.getBoundingClientRect();
    const W = rect.width  || window.innerWidth / 2;
    const H = rect.height || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false);

    const scene  = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0.8, 11);
    camera.lookAt(0, 0, 0);

    const launcherWF = makeWireframe(launcherModel, 0.20);
    launcherWF.position.set(0, 0, 0);
    launcherWF.scale.setScalar(1.6);

    scene.add(launcherWF);

    renderer.setAnimationLoop(() => {
        launcherWF.rotation.y += 0.004;
        renderer.render(scene, camera);
    });

    return function stop() {
        renderer.setAnimationLoop(null);
        renderer.dispose();
    };
}

// Async entry point for index.html (loads models itself)
export async function startMenuBg(canvas) {
    const launcherModel = await loadModel(`${import.meta.env.BASE_URL}models/launcher.glb`);
    return setupMenuBg(canvas, launcherModel);
}
