import * as THREE from 'three';

// Let's define some states for our launcher
export const LauncherState = Object.freeze({
    // Missile is in flight
    FIRED:      'FIRED',
    // Missile lost or hit a target, launcher is ready to be reloaded
    POST_FIRE:  'POST_FIRE',
    // Launcher cannot be used, reload animation is in progress
    RELOADING:  'RELOADING',
    // Launcher ready to fire
    READY:      'READY',
});

export class Launcher {
    constructor(model) {

        this.model = model;
        // Launcher starts as ready to fire
        this.state = LauncherState.READY;

        // Transform properties
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.scale    = new THREE.Vector3(1, 1, 1);

        // Rotation speeds and pitch limits
        // Hardcoded for now, we'll se in the future
        this.YAW_SPEED   = 1.0;
        this.PITCH_SPEED = 0.8;
        this.PITCH_MIN   = -0.3;
        this.PITCH_MAX   = 0.3;

        // Reload animation duration in seconds
        this.RELOAD_DURATION = 1;
        this.reloadTimer     = 0;

        // Bone aim state
        this.yaw   = 0;
        this.pitch = 0;

        // Our references to the model's bones
        this.middleBone   = null;
        this.launcherBone = null;
        this.missileBone  = null;

        // Our Tube's mesh
        this.tubeMesh = null;

        // Wrap model in a group so we control its transform via class properties
        this.group = new THREE.Group();
        this.group.add(model);

        // Make sure the model's tripod is touching the ground
        // Use a bounding box and use the lowest part as base for its y
        const box = new THREE.Box3().setFromObject(model);
        model.position.y = -box.min.y;

        // Search for expected bones in loaded model
        // Our model should have:
        // Base
        // \-> Middle
        //   \-> Launcher
        //     \-> Missile
        model.traverse((obj) => {
            if (obj.isMesh) console.log('Mesh found:', obj.name);
            if (obj.isBone) {
                console.log('Bone found:', obj.name);
                if (obj.name === 'Middle')   this.middleBone   = obj;
                if (obj.name === 'Launcher') this.launcherBone = obj;
                if (obj.name === 'Tube')     this.missileBone  = obj;
            }

            // Assign the mesh of our tube if it has the correct name to the variable
            if (obj.isMesh && obj.name === 'TubeMesh') {
                this.tubeMesh = obj;
            }
        });

        // Store tube rest position before any animation, to use for our reload later
        // Must be after traverse so tubeMesh is assigned
        this.tubeRestPosition  = this.missileBone ? this.missileBone.position.clone() : new THREE.Vector3();
        this.reloadStartPos    = new THREE.Vector3();
    }

    // Update our launcher's position.
    update(input, delta, scene) {
        // Sync group transform from class properties
        this.group.position.copy(this.position);
        this.group.rotation.copy(this.rotation);
        this.group.scale.copy(this.scale);

        // Bone aiming
        if (this.middleBone) {
            if (input.isDown('ArrowLeft'))  this.yaw += this.YAW_SPEED * delta;
            if (input.isDown('ArrowRight')) this.yaw -= this.YAW_SPEED * delta;
            this.middleBone.rotation.y = this.yaw;
        }

        if (this.launcherBone) {
            if (input.isDown('ArrowUp'))   this.pitch = Math.max(this.PITCH_MIN, this.pitch - this.PITCH_SPEED * delta);
            if (input.isDown('ArrowDown')) this.pitch = Math.min(this.PITCH_MAX, this.pitch + this.PITCH_SPEED * delta);
            this.launcherBone.rotation.x = this.pitch;
        }

        // Fire when spacebar is pressed
        if (input.isDown('Space')) {
            this.fire(scene);
        }

        // Reload when R is pressed
        if (input.isDown('KeyR')) {
            this.reload();
        }

        // Simulate loose tube physics
        // Stop when it hits the ground
        if (this.looseTube) {
            // Vertical velocity
            this.looseTube.velocity.y -= 12 * delta;
            this.looseTube.mesh.position.addScaledVector(this.looseTube.velocity, delta);

            // Get bottom of mesh, not center
            // Another bounding box, yay
            const box = new THREE.Box3().setFromObject(this.looseTube.mesh);
            // Stop when on the ground
            if (box.min.y <= 0) {
                this.looseTube.mesh.position.y += -box.min.y;
                this.looseTube.velocity.set(0, 0, 0);
                this.looseTube = null;

                // This is temporary: after the tube is tossed we enter POST_FIRE State.
                // It will be changed later
                this.state = LauncherState.POST_FIRE;
            }
        }

        // Reload animation — lerp bone from above down to rest position
        if (this.state === LauncherState.RELOADING) {
            this.reloadTimer += delta;
            const t = Math.min(this.reloadTimer / this.RELOAD_DURATION, 1);

            // Smoothstep for a more natural easing
            const smooth = t * t * (3 - 2 * t);
            this.missileBone.position.lerpVectors(this.reloadStartPos, this.tubeRestPosition, smooth);

            // Reload complete — back to ready
            if (t >= 1) {
                this.reloadTimer = 0;
                this.state       = LauncherState.READY;
            }
        }
    }

    // Add the launcher to a scene
    addToScene(scene) {
        scene.add(this.group);
        // Calculate bounding box, use it's lowest positon as base to place it
        const box    = new THREE.Box3().setFromObject(this.group);
        this.group.position.y = -box.min.y;
    }

    // Trigger the tube toss
    fire(scene) {
        // If the launcher isn't ready to fire, return
        if (this.state != LauncherState.READY) return;
        // TODO: Add code for handling the missile and everything
        this.state = LauncherState.FIRED;
        this.looseTube = this.tossTube(scene);
    }

    reload() {
        if (this.state != LauncherState.POST_FIRE) return;

        // Enter reload state
        this.state       = LauncherState.RELOADING;
        this.reloadTimer = 0;

        // Move the bone above its rest position and make tube visible again
        this.missileBone.position.set(0, 2, 0);
        this.reloadStartPos.copy(this.missileBone.position);
        this.tubeMesh.visible = true;
    }

    // After firing, the tube is tossed to the side (like the real life counterpart)
    tossTube(scene) {
        // Make sure we have the mesh and bone
        console.log('tossTube called, tubeMesh:', this.tubeMesh, 'missileBone:', this.missileBone);

        if (!this.tubeMesh || !this.missileBone) return;

        // Get tube's current world position and rotation
        const worldPos  = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        this.tubeMesh.getWorldPosition(worldPos);
        this.tubeMesh.getWorldQuaternion(worldQuat);

        // Clone the tube mesh as a loose object
        // We throw away a clone, and keep the original hidden
        // Assign the original's world position and rotation to the clone
        const loose = new THREE.Mesh(
            this.tubeMesh.geometry.clone(),
            this.tubeMesh.material
        );
        loose.position.copy(worldPos);
        loose.quaternion.copy(worldQuat);

        // Add loose tube to scene so it's visible
        scene.add(loose);

        // Hide original tube on the model
        this.tubeMesh.visible = false;

        // Return loose tube data so the caller can simulate it
        return {
            mesh:     loose,
            velocity: new THREE.Vector3(
                -2.5,   // slight sideways, negative = to the left
                2,      // upward
                0       // backward
            ),
        };
    }
}