import * as THREE from 'three';
import { Transition } from '../ui/transition.js';
import { TV } from '../entities/tv.js';

// Execute our intro cutscene and transition to main game
export async function runIntro(renderer, camera, init) {
    const transition = new Transition(1.0);
    const tv         = new TV();

    // We create a small, new scene to show our intro in
    const introScene      = new THREE.Scene();
    introScene.background = new THREE.Color(0x0a0a0a);

    await tv.load(introScene, new THREE.Vector3(0, 0, 0), `${import.meta.env.BASE_URL}models/tv.glb`);

    // Autoposition camera to face the tv
    const box    = new THREE.Box3().setFromObject(tv.model);
    const center = new THREE.Vector3();
    const size   = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(center.x -0.2, center.y + 0.2, center.z + maxDim * 1.2);
    camera.lookAt(center);

    const hemiLight = new THREE.HemisphereLight(0xbfd8ff, 0x1a1a1a, 0.55);
    introScene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.3);
    keyLight.position.set(1, 2, 3);
    introScene.add(keyLight);

    // Run the intro render loop while the TV plays
    renderer.setAnimationLoop(() => {
        renderer.render(introScene, camera);
    });

    // Magic css scrolls
    const skipHint = document.createElement('div');
    skipHint.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 24px;
        color: rgba(255, 255, 255, 0.5);
        font-family: monospace;
        font-size: 0.85rem;
        z-index: 300;
        pointer-events: none;
    `;
    skipHint.textContent = 'ENTER to skip';

    // Show the skip hint
    tv.onPlaybackStarted = () => {
        document.body.appendChild(skipHint);
        document.addEventListener('keydown', onSkip);
    };

    // Enter skips the video
    const onSkip = (e) => {
        if (e.code !== 'Enter') return;
        document.removeEventListener('keydown', onSkip);
        skipHint.remove();
        tv.skip();
    };

    // Wait for the user to press a key and the video to finish
    await tv.playIntro(introScene, new THREE.Vector3());

    // Clean up skip hint if video ended naturally before Enter was pressed
    document.removeEventListener('keydown', onSkip);
    skipHint.remove();

    // Stop rendering the intro scene 
    renderer.setAnimationLoop(null);

    // Make sure we won't see the last frame of this scene after we are done
    renderer.setClearColor(0x000000, 1);
    renderer.clear();

    // Fade to black before swapping scenes
    await transition.fadeOut();

    tv.dispose(introScene);

    // Init the game 
    await init();

    // Show the game removing the black screen
    await transition.fadeIn();

    // Transition div no longer needed
    transition.dispose();
}