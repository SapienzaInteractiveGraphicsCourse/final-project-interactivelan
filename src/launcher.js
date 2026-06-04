import * as THREE from 'three';

export class Launcher {
    constructor(model) {

        this.model = model;

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

        // Bone aim state
        this.yaw   = 0;
        this.pitch = 0;

        // Our references to the model's bones
        this.middleBone   = null;
        this.launcherBone = null;

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
            if (obj.isBone) {
                console.log('Bone found:', obj.name);
                if (obj.name === 'Middle')   this.middleBone   = obj;
                if (obj.name === 'Launcher') this.launcherBone = obj;
            }
        });
    }

    // Update our launcher's position.
    update(input, delta) {
        // Sync group transform from class properties
        // We don't want to have a mismatch in model and class state
        this.group.position.copy(this.position);
        this.group.rotation.copy(this.rotation);
        this.group.scale.copy(this.scale);

        // Move middle part
        if (this.middleBone) {
            if (input.isDown('ArrowLeft'))  this.yaw += this.YAW_SPEED * delta;
            if (input.isDown('ArrowRight')) this.yaw -= this.YAW_SPEED * delta;
            this.middleBone.rotation.y = this.yaw;
        }

        // Move launcher part
        if (this.launcherBone) {
            if (input.isDown('ArrowUp'))   this.pitch = Math.max(this.PITCH_MIN, this.pitch - this.PITCH_SPEED * delta);
            if (input.isDown('ArrowDown')) this.pitch = Math.min(this.PITCH_MAX, this.pitch + this.PITCH_SPEED * delta);
            this.launcherBone.rotation.x = this.pitch;
        }
    }

    // Add the launcher to a scene
    addToScene(scene) {
        scene.add(this.group);
        // Calculate bounding box, use it's lowest positon as base to place it
        const box    = new THREE.Box3().setFromObject(this.group);
        this.group.position.y = -box.min.y;
    }
}