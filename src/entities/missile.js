import * as THREE from 'three';
import { spawnExplosion } from '../rendering/effects.js';

const SPEED = 100;
const GUIDANCE_FACTOR = 2.5;
const MAX_RANGE = 550;
const TRAIL_INTERVAL = 0.03;
const TRAIL_COLORS = [0x888888, 0x666666, 0x444444, 0x999999];

export class Missile {
    constructor(spawnPosition, spawnDirection) {
        this.distanceTravelled = 0;
        this.alive = true;
        this.active = false;
        this.controlled = true;

        this.position = spawnPosition.clone();
        this.direction = spawnDirection.clone().normalize();
        this.velocity = this.direction.clone().multiplyScalar(SPEED);

        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 0.8),
            new THREE.MeshLambertMaterial({ color: 0x4a3a2a })
        );
        this.mesh.position.copy(this.position);

        this.trailTimer = 0;

        this.raycaster = new THREE.Raycaster();
    }

    addToScene(scene) {
        scene.add(this.mesh);
    }

    update(delta, targetPoint, tanks, collidables, scene) {
        if (!this.alive) return false;

        if (this.controlled && targetPoint) {
            const toTarget = new THREE.Vector3()
                .subVectors(targetPoint, this.position)
                .normalize();

            this.direction.lerp(toTarget, GUIDANCE_FACTOR * delta).normalize();
        }

        this.velocity = this.direction.clone().multiplyScalar(SPEED);

        const previousPosition = this.position.clone();
        const stepDistance = SPEED * delta;
        const moveVector = this.velocity.clone().multiplyScalar(delta);
        const moveDirection = moveVector.clone().normalize();

        // Raycast against terrain / trees / world obstacles before moving
        if (collidables && collidables.length > 0 && stepDistance > 0) {
            this.raycaster.set(previousPosition, moveDirection);
            this.raycaster.far = stepDistance;

            const intersections = this.raycaster.intersectObjects(collidables, true);

            if (intersections.length > 0) {
                const hit = intersections[0];

                this.position.copy(hit.point);
                this.mesh.position.copy(this.position);

                spawnExplosion(scene, hit.point.clone(), 12, 0.8);
                this.destroy(scene);
                return true;
            }
        }

        // Move forward
        this.position.add(moveVector);
        this.mesh.position.copy(this.position);

        // Orient toward direction of travel
        this.mesh.lookAt(this.position.clone().add(this.velocity));

        // Spawn smoke and fire puffs behind the missile at regular intervals
        this.trailTimer += delta;
        if (this.trailTimer >= TRAIL_INTERVAL) {
            this.trailTimer = 0;
            spawnExplosion(scene, this.position.clone(), 3, 0.2, TRAIL_COLORS);
        }

        // Self detonation after max range
        this.distanceTravelled += stepDistance;
        if (this.distanceTravelled > MAX_RANGE) {
            this.destroy(scene);
            return true;
        }

        // Hit detection against all tanks
        for (const tank of tanks) {
            if (tank.isHitBy(this.position, this.direction, stepDistance)) {
                tank.hit(this.position);
                this.destroy(scene);
                return true;
            }
        }

        return false;
    }

    destroy(scene) {
        scene.remove(this.mesh);
        this.alive = false;
    }
}