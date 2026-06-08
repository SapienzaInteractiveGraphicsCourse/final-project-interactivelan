import * as THREE from 'three';

// Constants for our particles, shades of orange and red
const COLORS = [0xff4500, 0xff8c00, 0xffd700, 0xff2200];

// All active explosions: each element of activeExplosions is an array of particles
const activeExplosions = [];

// Spawn a new explosion at a given world position
export function spawnExplosion(scene, position, count, lifetime) {
    const particles = [];

    for (let i = 0; i < count; i++) {
        const size = 0.05 + Math.random() * 0.15;
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(size),
            new THREE.MeshBasicMaterial({
                color: COLORS[Math.floor(Math.random() * COLORS.length)]
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
    activeExplosions.push({ particles, scene, lifetime });
}

// Call this every frame in our animate loop to update effects
export function updateExplosions(delta) {
    for (let e = activeExplosions.length - 1; e >= 0; e--) {
        const { particles, scene, lifetime } = activeExplosions[e];

        for (let p = particles.length - 1; p >= 0; p--) {
            const particle = particles[p];
            particle.age += delta;

            const t = particle.age / lifetime;

            // Gravity, may tweak this number, for now arbitrary
            particle.velocity.y -= 4.0 * delta;
            particle.mesh.position.addScaledVector(particle.velocity, delta);

            // Shrink to zero over lifetime
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
            activeExplosions.splice(e, 1);
        }
    }
}