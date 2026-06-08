import * as THREE from 'three';

// Constants for our particles

// Explosion color constants
const EXPLOSION_COLORS = [0xff4500, 0xff8c00, 0xffd700, 0xff2200];

// Fire constants
const FIRE_COLORS       = [0xff4500, 0xff6a00, 0xff8c00];

// Smoke constants
const SMOKE_COLORS       = [0x333333, 0x555555, 0x222222];

// All active explosions: each element of activeExplosions is an array of particles
const activeEffects = [];

// Spawn a new explosion at a given world position
export function spawnExplosion(scene, position, count, lifetime, colors = EXPLOSION_COLORS) {
    const particles = [];

    for (let i = 0; i < count; i++) {
        const size = 0.05 + Math.random() * 0.15;
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(size),
            new THREE.MeshBasicMaterial({
                color: EXPLOSION_COLORS[Math.floor(Math.random() * EXPLOSION_COLORS.length)]
            })
        );

        // Spawn explosion at position with small random offset (will I keep it? we'll see)
        mesh.position.set(
            position.x + (Math.random() - 0.5) * 0.5,
            position.y + (Math.random() - 0.5) * 0.5,
            position.z + (Math.random() - 0.5) * 0.5
        );

        // Random outward velocity with upward bias
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            3 + Math.random() * 9,
            (Math.random() - 0.5) * 12
        );

        scene.add(mesh);
        particles.push({ mesh, velocity, age: 0 });
    }

    // Store lifetime alongside particles and scene so updateExplosions can read it
    activeEffects.push({ particles, scene, lifetime });
}


// Helper class for handling Smoke and Fire effects.
// A looping sprite system seems to be the correct approach from what I can find online
class SpriteSystem {
    constructor(scene, position, camera, colors, count, riseSpeed, maxHeight, minSize, maxSize, spread = 0.6) {
        this.scene     = scene;
        this.position  = position;
        this.camera    = camera;
        this.riseSpeed = riseSpeed;
        this.maxHeight = maxHeight;
        this.spread    = spread;
        this.sprites   = [];

        // Stagger start heights so sprites don't all reset at the same time
        // Basically we just randomize a bit the starting position
        for (let i = 0; i < count; i++) {
            const mesh = this.createSpriteMesh(colors, minSize, maxSize);
            this.spawnSprite(mesh);
            scene.add(mesh);
            this.sprites.push(mesh);
        }
    }

    // Create a basic plane to use as our sprite
    createSpriteMesh(colors, minSize, maxSize) {
        const size = minSize + Math.random() * (maxSize - minSize);
        return new THREE.Mesh(
            new THREE.PlaneGeometry(size, size),
            new THREE.MeshBasicMaterial({
                color:       colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                depthWrite:  false,
                side:        THREE.DoubleSide,
            })
        );
    }

    // Spawn a single sprite at a random position within the effect radius
    spawnSprite(mesh) {
        mesh.position.set(
            this.position.x + (Math.random() - 0.5) * this.spread,
            this.position.y + Math.random() * this.maxHeight,
            this.position.z + (Math.random() - 0.5) * this.spread
        );
    }

    // Reset a sprite back to the bottom after it reaches the top
    resetSprite(mesh) {
        mesh.position.set(
            this.position.x + (Math.random() - 0.5) * this.spread,
            this.position.y,
            this.position.z + (Math.random() - 0.5) * this.spread
        );
        mesh.material.opacity = 1;
    }

    update(delta, camera) {
        this.camera = camera;
        for (const sprite of this.sprites) {
            sprite.position.y += this.riseSpeed * delta;

            // Progress from 0 to 1 as sprite rises toward max height
            const t = (sprite.position.y - this.position.y) / this.maxHeight;

            // Fade out and shrink as the sprite rises
            sprite.material.opacity = Math.max(0, 1 - t);
            sprite.scale.setScalar(Math.max(0.1, 1 - t * 0.6));

            // Billboard toward main camera so the flat plane always faces the player
            // Billboarding: think of DOOM sprites always facing the camera
            const worldQuat = new THREE.Quaternion();
            this.camera.getWorldQuaternion(worldQuat);
            sprite.quaternion.copy(worldQuat);

            if (sprite.position.y >= this.position.y + this.maxHeight) this.resetSprite(sprite);
        }
    }

    destroy() {
        // Remove all sprites from scene and free their GPU resources
        for (const sprite of this.sprites) {
            this.scene.remove(sprite);
            sprite.geometry.dispose();
            sprite.material.dispose();
        }
        this.sprites.length = 0;
    }
}

// Create a looping fire effect at a given world position
export function createFire(scene, position, camera, spriteCount = 8, riseSpeed = 2.5, maxHeight = 2.0, minSize = 0.3, maxSize = 0.7) {
    return new SpriteSystem(
        scene, position, camera,
        FIRE_COLORS, spriteCount,
        riseSpeed, maxHeight,
        minSize, maxSize
    );
}

// Create a looping smoke effect at a given world position
export function createSmoke(scene, position, camera, spriteCount = 10, riseSpeed = 1.2, maxHeight = 6.0, minSize = 0.5, maxSize = 1.0, spread = 1.8) {
    return new SpriteSystem(
        scene, position, camera,
        SMOKE_COLORS, spriteCount,
        riseSpeed, maxHeight,
        minSize, maxSize,
        spread
    );
}



// Call this every frame in our animate loop to update effects
export function updateExplosions(delta) {
    for (let e = activeEffects.length - 1; e >= 0; e--) {
        const { particles, scene, lifetime } = activeEffects[e];

        for (let p = particles.length - 1; p >= 0; p--) {
            const particle = particles[p];
            particle.age += delta;

            const t = particle.age / lifetime;

            // Gravity, may tweak this number, for now arbitrary
            particle.velocity.y -= 4.0 * delta;
            particle.mesh.position.addScaledVector(particle.velocity, delta);

            // Shrink to zero over lifetime (they disappear seamlessly)
            const scale = Math.max(0, 1 - t);
            particle.mesh.scale.setScalar(scale);

            // Remove when lifetime expires
            if (particle.age >= lifetime) {
                scene.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
                particles.splice(p, 1);
            }
        }

        // Remove explosion from active list when all particles are gone
        if (particles.length === 0) {
            activeEffects.splice(e, 1);
        }
    }
}