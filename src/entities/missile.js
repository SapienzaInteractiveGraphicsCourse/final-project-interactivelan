import * as THREE from 'three';
import { spawnExplosion } from '../rendering/effects.js';

// Constants, will be changed or moved
const SPEED           = 50;
const GUIDANCE_FACTOR = 2.5;
const MAX_RANGE       = 450;

// How often to spawn a trail puff, in seconds
const TRAIL_INTERVAL = 0.03;

// Trail puff colors, smoke and fire mix
const TRAIL_COLORS = [0x888888, 0x666666, 0x444444, 0x999999];

// Class to handle missiles fired by our ATGM
export class Missile {
    // Input: where it's shot from and where it's heading
    constructor(spawnPosition, spawnDirection) {
        // Maximum range before self detonation
        this.distanceTravelled = 0;
        this.alive             = true;
        this.active            = false;

        // Is it controlled by launcher, or is it left to fly unguided?
        this.controlled = true;

        // Position and direction
        this.position  = spawnPosition.clone();
        this.direction = spawnDirection.clone().normalize();
        this.velocity  = this.direction.clone().multiplyScalar(SPEED);

        // Primitive placeholder, will be replaced with a suitable model later on
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 0.8),
            new THREE.MeshLambertMaterial({ color: 0x4a3a2a })
        );
        this.mesh.position.copy(this.position);

        // Timer to control how often we spawn trail puffs
        this.trailTimer = 0;
    }

    // Add our missile to input scene
    addToScene(scene) {
        scene.add(this.mesh);
    }

    // Returns true if missile hit something or is destroyed, false otherwise
    update(delta, targetPoint, tanks, scene) {
        if (!this.alive) return false;

        if (this.controlled && targetPoint) {
            // Steer toward target point
            const toTarget = new THREE.Vector3().subVectors(targetPoint, this.position).normalize();
            this.direction.lerp(toTarget, GUIDANCE_FACTOR * delta).normalize();
        }
        // If not controlled, keep flying in last known direction

        this.velocity = this.direction.clone().multiplyScalar(SPEED);

        // Move forward
        this.position.addScaledVector(this.velocity, delta);
        this.mesh.position.copy(this.position);

        // Orientate toward direction of travel
        this.mesh.lookAt(this.position.clone().add(this.velocity));

        // Spawn smoke and fire puffs behind the missile at regular intervals
        this.trailTimer += delta;
        if (this.trailTimer >= TRAIL_INTERVAL) {
            this.trailTimer = 0;
            spawnExplosion(scene, this.position.clone(), 3, 0.2, TRAIL_COLORS);
        }

        // Self detonation after max range
        this.distanceTravelled += SPEED * delta;
        if (this.distanceTravelled > MAX_RANGE) {
            this.destroy(scene);
            return true;
        }

        // How far did we move this specific frame?
        const stepDistance = SPEED * delta;

        // Hit detection against all tanks
        for (const tank of tanks) {
            // Pass the stepDistance as the max detection distance
            if (tank.isHitBy(this.position, this.direction, stepDistance)) {
                tank.hit(this.position);
                this.destroy(scene);
                return true;
            }
        }

        return false;
    }

    // Destroy all meshes we added, set state to not alive
    destroy(scene) {
        scene.remove(this.mesh);
        this.alive = false;
    }
}