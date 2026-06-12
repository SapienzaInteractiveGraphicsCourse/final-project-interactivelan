import * as THREE from 'three';


export class GameAudio {
    constructor(camera) {
        // Add listener to our camera, instantiate an AudioLoader for it
        this.listener = new THREE.AudioListener();
        // better sound localization
        camera.add(this.listener);

        this.loader = new THREE.AudioLoader();
        this.buffers = {};
    }

    // Move listener to whichever camera is currently active
    setCamera(camera) {
        if (!camera || this.listener.parent === camera) return;
        camera.add(this.listener);
    }

    // Load an audio file and store it in buffer
    async load(name, url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const textPreview = new TextDecoder().decode(arrayBuffer.slice(0, 120));
        const buffer = await this.listener.context.decodeAudioData(arrayBuffer);
        this.buffers[name] = buffer;
        return buffer;
    }

    // Create a new positional audio resource that we will use for our entities
    createPositional(
        name,
        {
            loop = false,
            volume = 1,
            refDistance = 20,
            rolloffFactor = 1,
            distanceModel = 'inverse',
            maxDistance = 200,
        } = {}
    ) {
        const buffer = this.buffers[name];

        if (!buffer) {
            console.warn(`Audio buffer "${name}" was not loaded`);
            return null;
        }

        const sound = new THREE.PositionalAudio(this.listener);
        sound.setBuffer(buffer);
        sound.setLoop(loop);
        sound.setVolume(volume);
        sound.setRefDistance(refDistance);
        sound.setRolloffFactor(rolloffFactor);
        sound.setDistanceModel(distanceModel);
        sound.setMaxDistance(maxDistance);

        return sound;
    }
}


// We want to preload our audio before we start the game
export async function preloadAudio(gameAudio) {
    const sounds = [
        ['launcherFire', `${import.meta.env.BASE_URL}sounds/missile_firing.ogg`],
        ['launcherReload', `${import.meta.env.BASE_URL}sounds/reload.ogg`],
        ['tubeToss', `${import.meta.env.BASE_URL}sounds/reload.ogg`],
        ['missileExplosion', `${import.meta.env.BASE_URL}sounds/explosion_a.ogg`],
        ['tankExplosion', `${import.meta.env.BASE_URL}sounds/explosion_b.ogg`],
        ['tankEngine', `${import.meta.env.BASE_URL}sounds/tank_moving.ogg`],
        ['tankTrack', `${import.meta.env.BASE_URL}sounds/tracks.ogg`],
        ['tankTurretRotate', `${import.meta.env.BASE_URL}sounds/turret_rotate.ogg`],
    ];

    for (const [name, url] of sounds) {
        try {
            await gameAudio.load(name, url);
            console.log(`Loaded sound: ${name}`, url);
        } catch (error) {
            console.error(`Failed loading sound: ${name}`, url, error);
            throw error;
        }
    }
}