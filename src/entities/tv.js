import * as THREE from 'three';
import { loadModel } from '../utilities/loader.js';
import { Transition } from '../ui/transition.js';

// The Television we will use for our intro cutscene.
export class TV {
    constructor() {
        this.model        = null;
        this.videoElement = null;
        this.videoTexture = null;
        this.screenMesh   = null;
        this.onEnded      = null;
        this.onPlaybackStarted = null;

        this.started = false;
    }

    // Load the TV model and wire up the video texture
    async load(scene, position = new THREE.Vector3(), modelPath = `${import.meta.env.BASE_URL}models/tv.glb`) {
        this.model = await loadModel(modelPath);
        this.model.position.copy(position);
        scene.add(this.model);

        // Create the video element but don't play yet
        this.videoElement          = document.createElement('video');
        this.videoElement.src      = `${import.meta.env.BASE_URL}video/intro.mp4`;
        this.videoElement.loop     = false;
        this.videoElement.muted    = false;
        this.videoElement.playsInline = true;

        // VideoTexture reads from the video element every frame automatically
        this.videoTexture           = new THREE.VideoTexture(this.videoElement);
        this.videoTexture.colorSpace = THREE.SRGBColorSpace;

        // Video comes through horizontally flipped, so we will flip it back. It seems to be a common occurence at this point
        this.videoTexture.repeat.set(-1, 1);
        this.videoTexture.offset.set(1, 0);

        // Assign materials: override the screen material and keep the builting PBR material for the rest
        this.model.traverse(obj => {
            if (!obj.isMesh) return;

            const materials = [obj.material];

            materials.forEach((mat, index) => {
                if (mat.name === 'Screen') {
                    // Emissive with shininess
                    const screenMat = new THREE.MeshPhongMaterial({
                        map:               this.videoTexture,
                        emissiveMap:       this.videoTexture,
                        emissive:          new THREE.Color(1, 1, 1),
                        emissiveIntensity: 0.88,
                        shininess:         20,
                        specular:          new THREE.Color(0.28, 0.32, 0.38),
                    });

                    obj.material    = screenMat;
                    this.screenMesh = obj;
                }
            });
        });

        // We setup an event listener for the video end
        this.videoElement.addEventListener('ended', () => {
            if (this.onEnded) this.onEnded();
        });
    }

    async play() {
        if (!this.videoElement) return;

        try {
            await this.videoElement.play();
            this.started = true;
            if (this.onPlaybackStarted) this.onPlaybackStarted();
        } catch (error) {
            // Log possible errors
            console.warn(error);
        }
    }

    // Stop playback and clean up
    stop() {
        if (!this.videoElement) return;
        this.videoElement.pause();
        this.videoElement.currentTime = 0;
    }

    // Show a blinking prompt so the player knows to press a key
    showStartPrompt() {
        const prompt = document.createElement('div');
        prompt.id    = 'tv-start-prompt';
        prompt.style.cssText = `
            position: fixed;
            bottom: 10%;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-family: monospace;
            font-size: 1rem;
            text-shadow: 0 0 6px black;
            z-index: 300;
            pointer-events: none;
        `;
        prompt.textContent = 'PRESS ANY KEY';
        document.body.appendChild(prompt);

        // Blink the text
        const blinkInterval = setInterval(() => {
            prompt.style.visibility =
                prompt.style.visibility === 'hidden' ? 'visible' : 'hidden';
        }, 600);

        // Store interval id so we can clear it on dismiss
        prompt._blinkInterval = blinkInterval;

        return prompt;
    }

    // Remove the start prompt
    hideStartPrompt() {
        const prompt = document.getElementById('tv-start-prompt');
        if (!prompt) return;
        clearInterval(prompt._blinkInterval);
        prompt.remove();
    }

    // Full intro: show prompt, wait for input, play video, call onEnded when done
    // Returns a promise that resolves when the video is done
    playIntro(scene, position) {
        return new Promise(async (resolve) => {
            await this.load(scene, position);

            this.onEnded = () => {
                this.hideStartPrompt();
                resolve();
            };

            const prompt = this.showStartPrompt();

            // Start on any key or click — browser requires a gesture for audio
            const startOnGesture = async () => {
                document.removeEventListener('keydown', startOnGesture);
                document.removeEventListener('click',   startOnGesture);
                this.hideStartPrompt();
                await this.play();
            };

            document.addEventListener('keydown', startOnGesture);
            document.addEventListener('click',   startOnGesture);
        });
    }

    skip() {
        if (!this.videoElement || !this.started) return;
        this.videoElement.pause();
        if (this.onEnded) this.onEnded();
    }

    dispose(scene) {
        this.stop();

        if (this.model) {
            scene.remove(this.model);
        }

        if (this.videoTexture) {
            this.videoTexture.dispose();
        }

        this.videoElement = null;
        this.videoTexture = null;
        this.model        = null;
        this.screenMesh   = null;
    }
}

