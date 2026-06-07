import * as THREE from 'three';
import { applyCellShading } from './shaders.js';

// Constants, will be changed or moved
const SPEED          = 50;
const GUIDANCE_FACTOR = 2.5;
const MAX_TRAIL_POINTS = 400;

// Class to handle missiles fired by our ATGM
export class Missile {
    // Input: where it's shot from and where it's heading
    constructor(spawnPosition, spawnDirection) {
        // Maximumrange before self detonation
        this.maxRange = 450;
        this.distanceTravelled = 0;
        this.alive = true;
        this.active = false;
        
        // Is it controlled by launcher, or is it left to fly unguided?
        this.controlled = true; 

        // Position and direction
        this.position  = spawnPosition.clone();
        this.direction = spawnDirection.clone().normalize();
        this.velocity  = this.direction.clone().multiplyScalar(SPEED);

        // Primitive placeholder, will be replace with a suitable model (made by me or not) later on
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 0.8),
            new THREE.MeshLambertMaterial({ color: 0x4a3a2a })
        );
        this.mesh.position.copy(this.position);

        // Wire trail, grows with missile flight distance
        // Pre-allocate buffer for maximum trail length
        // Wizardry

        // 3 values (x,y,z) per point
        this.trailPositions = new Float32Array(MAX_TRAIL_POINTS * 3); 
        // Tracks Y-velocity per point ( we want the rope to sag like a real one )
        this.trailVelocities = new Float32Array(MAX_TRAIL_POINTS); 
        this.trailCount      = 0;

        // Add initial position
        this.addTrailPoint(this.position);

        this.trailGeometry = new THREE.BufferGeometry();
        this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
        this.trailGeometry.setDrawRange(0, this.trailCount);

        this.trailLine = new THREE.Line(
            this.trailGeometry,
            new THREE.LineBasicMaterial({ color: 0x888888 })
        );

        // To be able to see the trail from both cameras
        // We will see it even if start point is off screen
        this.trailLine.frustumCulled = false;
    }

    // Add our missile to input scene
    addToScene(scene) {
        scene.add(this.mesh);
        scene.add(this.trailLine);
    }

    // Handle array shifting for our trail
    addTrailPoint(pos) {
        if (this.trailCount < MAX_TRAIL_POINTS) {
            // Append point
            this.trailPositions[this.trailCount * 3]     = pos.x;
            this.trailPositions[this.trailCount * 3 + 1] = pos.y;
            this.trailPositions[this.trailCount * 3 + 2] = pos.z;
            this.trailVelocities[this.trailCount]        = 0; // Start with 0 downward speed
            this.trailCount++;
        } else {
            // Shift all positions left
            for (let i = 0; i < (MAX_TRAIL_POINTS - 1) * 3; i++) {
                this.trailPositions[i] = this.trailPositions[i + 3];
            }
            // Shift all velocities left
            for (let i = 0; i < MAX_TRAIL_POINTS - 1; i++) {
                this.trailVelocities[i] = this.trailVelocities[i + 1];
            }
            
            // Insert new point at the end
            const lastIdx = (MAX_TRAIL_POINTS - 1) * 3;
            this.trailPositions[lastIdx]     = pos.x;
            this.trailPositions[lastIdx + 1] = pos.y;
            this.trailPositions[lastIdx + 2] = pos.z;
            this.trailVelocities[MAX_TRAIL_POINTS - 1] = 0;
        }
    }

    // Returns true if missile hit something or is destroyed, false otherwise
    //
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

        // Grow wire trail
        this.addTrailPoint(this.position);

        // Simulate gravity on the wire
        // Skip i=0 (launcher tip) and i=trailCount-1 (missile tail)
        for (let i = 1; i < this.trailCount - 1; i++) {
            const yIdx = i * 3 + 1;
            
            // Accelerate downward ( magic number may tweak it later)
            this.trailVelocities[i] -= 4 * delta; 
            
            // Move the point's Y coordinate
            this.trailPositions[yIdx] += this.trailVelocities[i] * delta;
            
            // Floor collision stop
            // May tweak later, looks weird i ndebug scene but should be reasonable on terrain
            if (this.trailPositions[yIdx] <= 0) {
                this.trailPositions[yIdx] = 0.05; // Rest slightly above 0 to prevent Z-fighting with terrain
                this.trailVelocities[i]   = 0;
            }
        }

        // Update the GPU
        this.trailGeometry.setDrawRange(0, this.trailCount);
        this.trailGeometry.attributes.position.needsUpdate = true;

        // Self detonation after max range
        this.distanceTravelled += SPEED * delta;
        if (this.distanceTravelled > this.maxRange) {
            this.destroy(scene);
            return true;
        }

        // How far did we move this specific frame?
        const stepDistance = SPEED * delta;

        // Hit detection against all tanks
        for (const tank of tanks) {
            // Pass the stepDistance as the third argument!
            if (tank.isHitBy(this.position, this.direction, stepDistance)) {
                tank.hit();
                this.destroy(scene);
                return true;
            }
        }

        return false;
    }

    // Destroy all meshes we added, set state to not alive
    destroy(scene) {
        scene.remove(this.mesh);
        scene.remove(this.trailLine);
        this.alive = false;
    }
}