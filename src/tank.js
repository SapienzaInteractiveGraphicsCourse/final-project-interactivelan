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

        // Our references to the model's meshes
        this.hullMesh   = null;
        this.turretMesh = null;
        this.gunMesh    = null;

        // Wrap model in a group so we control its transform via class properties
        this.group = new THREE.Group();
        this.group.add(model);

        // Raycaster to check for collisions
        this._raycaster = new THREE.Raycaster();

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
                // console.log('Bone found:', obj.name);
                if (obj.name === 'Hull')   this.hullBone   = obj;
                if (obj.name === 'Turret') this.turretBone = obj;
                if (obj.name === 'Gun')    this.gunBone    = obj;
            }
            // In traverse, store mesh references
            if (obj.isMesh) {
                if (obj.name === 'HullMesh')   this.hullMesh   = obj;
                if (obj.name === 'TurretMesh') this.turretMesh = obj;
                if (obj.name === 'GunMesh')    this.gunMesh    = obj;
            }
        });
    }

    // Add the tank to a scene at specified position
    addToScene(scene, position = new THREE.Vector3()) {
        scene.add(this.group);

        // Sit on the ground after adding to scene
        const box = new THREE.Box3().setFromObject(this.group);
        this.group.position.y = -box.min.y;

        // Set spawn position, keep the ground-corrected Y
        this.group.position.x = position.x;
        this.group.position.z = position.z;

        // Force world matrix update before computing proxy positions
        this.group.updateMatrixWorld(true);
        // Now bones have correct world matrices
        this.addProxyMeshes(scene);
    }

    // Aim turret and gun toward a world position, IK
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
    rollDeathType() {
        return TankState.COOKOFF;
    }

    // Generate proxyMeshes for our model's hit detection, since this seems to be the correct approach from what I read online
    // This part was a headache
    addProxyMeshes(scene) {
        const invisible = new THREE.MeshBasicMaterial({ visible: false });

        const setupProxy = (mesh, bone) => {
            const box    = new THREE.Box3().setFromObject(mesh);
            const size   = new THREE.Vector3();
            const center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);

            // Create proxy at correct world position first
            const proxy = new THREE.Mesh(
                new THREE.BoxGeometry(size.x, size.y, size.z),
                invisible
            );
            // Make sure we won't make it visible later onDestroy
            proxy.userData.isProxy = true;
            proxy.position.copy(center);
            scene.add(proxy);

            // Built-in attach() preserves world position when reparenting to bone
            bone.attach(proxy);
            return proxy;
        };

        this.hullProxy   = setupProxy(this.hullMesh,   this.hullBone);
        this.turretProxy = setupProxy(this.turretMesh, this.turretBone);
        this.gunProxy    = setupProxy(this.gunMesh,    this.gunBone);
    }

    // Using raycast to check collision
    isHitBy(rayOrigin, rayDirection, maxDistance) {
            this._raycaster.set(rayOrigin, rayDirection);
            
            // Limit the raycaster to only check the distance the missile traveled this exact frame
            this._raycaster.far = maxDistance; 
            
            const hits = this._raycaster.intersectObject(this.group, true);
            if (hits.length > 0){
                this.hit();
                return true;
            }
            return false;
        }

    // When tank is destroyed, pitch the gun down and change color to look charred
    onDeath() {
        // Char the hull
        this.model.traverse((obj) => {
            if (obj.isMesh && !obj.userData.isOutline && !obj.userData.isProxy) {
                obj.material = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
            }
        });

        // Droop the gun down
        if (this.gunBone) {
            this.gunBone.rotation.z = -this.PITCH_MIN;
        }

        // Slump the turret slightly
        if (this.turretBone) {
            this.turretBone.rotation.y = (Math.random() - 0.5) * 0.5;
        }
    }

    // Handles state machine and transform sync
    update(delta, scene) {
        // Sync group transform from class properties
        this.group.updateMatrixWorld(true);

        // Only increment timer when tank is not dead
        if (this.state !== TankState.DEAD) this.stateTimer += delta;

        switch (this.state) {

            case TankState.ALIVE:
                // TODO: Add AI movement here later
                break;

            case TankState.HIT:
                // Short pause before transitioning to death state
                if (this.stateTimer > 0.3) {
                    this.state      = this.rollDeathType();
                    this.stateTimer = 0;
                }
                break;

            case TankState.COOKOFF:
                if (this.stateTimer > 3.0) {
                    this.state      = TankState.DEAD;
                    this.stateTimer = 0;
                    this.onDeath();  // call once on transition
                }
                break;

            case TankState.DEAD:
                // Tank is destroyed, nothing to do aside changing colors to something that makes it look charred
                break;
        }
    }
}