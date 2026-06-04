import * as THREE from 'three';
import { applyCellShading } from './shaders.js';

// Let's define some states for our tank
export const TankState = Object.freeze({
    // Tank is moving and operational
    ALIVE:   'ALIVE',
    // Tank was hit 
    HIT:     'HIT',
    // Ammunition cookoff: tank blows up
    COOKOFF: 'COOKOFF',
    // Tank is a static wreck
    DEAD:    'DEAD',
});

export class Tank {
    constructor(model) {
        this.model = model;
        // Tank starts alive
        // Who could have guessed
        this.state      = TankState.ALIVE;
        this.stateTimer = 0;

        // Transform properties
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.scale    = new THREE.Vector3(1, 1, 1);

        // Aim state
        this.yaw   = 0;
        this.pitch = 0;

        // Rotation limits
        this.PITCH_MIN   = -0.1;
        this.PITCH_MAX   =  0.4;
        this.YAW_SPEED   =  1.5;
        this.PITCH_SPEED =  1.0;

        // Our references to the model's bones
        this.hullBone   = null;
        this.turretBone = null;
        this.gunBone    = null;

        // Wrap model in a group so we control its transform via class properties
        this.group = new THREE.Group();
        this.group.add(model);

        // Make sure the tank is touching the ground
        const box = new THREE.Box3().setFromObject(model);
        model.position.y = -box.min.y;

        // Apply cell shading to the model
        applyCellShading(model);

        // Search for expected bones in loaded model
        // Our model should have:
        // Hull
        //  \-> Turret
        //    \-> Gun
        model.traverse((obj) => {
            if (obj.isBone) {
                console.log('Bone found:', obj.name);
                if (obj.name === 'Hull')   this.hullBone   = obj;
                if (obj.name === 'Turret') this.turretBone = obj;
                if (obj.name === 'Gun')    this.gunBone    = obj;
            }
        });
    }

    // Add the tank to a scene
    addToScene(scene) {
        scene.add(this.group);
        // Sit on the ground after adding to scene
        const box = new THREE.Box3().setFromObject(this.group);
        this.group.position.y = -box.min.y;
    }

    // Aim turret and gun toward a world position
    // Called by AI or debug code
    aimAt(worldTarget) {
        if (this.state !== TankState.ALIVE) return;

        // Turret yaw 
        if (this.turretBone) {
            const boneWorldPos = new THREE.Vector3();
            this.turretBone.getWorldPosition(boneWorldPos);

            const toTarget = new THREE.Vector3().subVectors(worldTarget, boneWorldPos);
            toTarget.y = 0;

            const worldAngle  = Math.atan2(toTarget.x, toTarget.z);
            const parentQuat  = new THREE.Quaternion();
            const parentEuler = new THREE.Euler();
            this.turretBone.parent.getWorldQuaternion(parentQuat);
            parentEuler.setFromQuaternion(parentQuat, 'YXZ');

            this.turretBone.rotation.y = worldAngle - parentEuler.y;
        }

        // Gun pitch
        if (this.gunBone) {
            const boneWorldPos = new THREE.Vector3();
            this.gunBone.getWorldPosition(boneWorldPos);

            const toTarget       = new THREE.Vector3().subVectors(worldTarget, boneWorldPos);
            const horizontalDist = Math.sqrt(toTarget.x * toTarget.x + toTarget.z * toTarget.z);
            const pitch          = Math.atan2(toTarget.y, horizontalDist);

            this.gunBone.rotation.z = Math.max(this.PITCH_MIN, Math.min(this.PITCH_MAX, -pitch));
        }
    }

    // Tank is hit
    hit() {
        if (this.state !== TankState.ALIVE) return;
        this.state      = TankState.HIT;
        this.stateTimer = 0;
    }

    // Choose a random death type
    // Simplified for now, may expand it later
    _rollDeathType() {
        return TankState.COOKOFF;
    }

    // Handles state machine and transform sync
    update(delta, scene) {
        // Sync group transform from class properties
        this.group.position.copy(this.position);
        this.group.rotation.copy(this.rotation);
        this.group.scale.copy(this.scale);

        this.stateTimer += delta;

        switch (this.state) {

            case TankState.ALIVE:
                // TODO: Add AI movement here later
                break;

            case TankState.HIT:
                // Short pause before transitioning to death state
                if (this.stateTimer > 0.3) {
                    this.state      = this._rollDeathType();
                    this.stateTimer = 0;
                }
                break;

            case TankState.COOKOFF:
                // Tank will stop and explode after a few seconds
                // Particle system will be added here later if there is time left
                if (this.stateTimer > 3.0) {
                    this.state      = TankState.DEAD;
                    this.stateTimer = 0;
                }
                break;

            case TankState.DEAD:
                // Static wreck — nothing to update
                break;
        }
    }
}