import * as THREE from 'three';
import { Missile } from './missile';

// Let's define some states for our launcher
export const LauncherState = Object.freeze({
    // Missile is in flight
    FIRED:      'FIRED',
    // We are tossing the used tube before reloading
    TOSSING:  'TOSSING',
    // Our launcher is ready to be reloaded: missile lost or destroyed
    POST_FIRE: 'POST_FIRE',
    // Launcher cannot be used, reload animation is in progress
    RELOADING:  'RELOADING',
    // Launcher ready to fire
    READY:      'READY',
});


// Our class handling the main part of the game: the Launcher
export class Launcher {
    constructor(model) {

        this.model = model;
        // Launcher starts as ready to fire
        this.state = LauncherState.READY;

        // Which camera are we using

        // Transform properties
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.scale    = new THREE.Vector3(1, 1, 1);

        // Cameras references and state
        this.mainCamera  = null;
        this.activeCam   = null;
        this.wasAimPressed = false;

        // Rotation speeds and pitch limits
        // Hardcoded for now, we'll se in the future
        this.YAW_SPEED   = 1.0;
        this.PITCH_SPEED = 0.8;
        this.PITCH_MIN   = -0.3;
        this.PITCH_MAX   = 0.3;

        // Add reference to our current missile and tanks we are allowed to

        // Currently steered missile
        this.missile = null;
        this.tanks   = [];

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
        this.sightBone    = null; 

        // Our Tube's mesh
        this.tubeMesh = null;

        // Physics data for the flying tube { mesh, velocity }
        this.looseTubePhysics = null;
        // The actual mesh sitting in the scene after landing
        this.looseTubeMesh    = null;

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
                if (obj.name === 'Sight')    this.sightBone    = obj;
            }

            // Assign the mesh of our tube if it has the correct name to the variable
            if (obj.isMesh && obj.name === 'TubeMesh') {
                this.tubeMesh = obj;
            }
        });

        // Store tube rest position before any animation, to use for our reload later
        // Must be after traverse so tubeMesh is assigned
        this.tubeRestPosition = this.missileBone ? this.missileBone.position.clone() : new THREE.Vector3();
        this.reloadStartPos   = new THREE.Vector3();

        // UI References: we want to load our Overlay from the ATGM camera crosshair
        this.crosshairElement = null;
        this.isAiming         = false;

        // Initialize the UI immediately
        this.initUI();
    }

    // Initialize our UI overlay
    async initUI() {
        try {
            // Load out SVG overlay (sight), in aync modality
            const response = await fetch('/assets/ui/crosshair.svg');
            const svgData  = await response.text();

            // Overlay the loaded SVG to our page
            this.crosshairElement = document.createElement('div');
            this.crosshairElement.id = 'crosshair-ui';
            this.crosshairElement.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100vw; height: 100vh;
                pointer-events: none;
                display: flex;
                justify-content: center;
                align-items: center;
                visibility: hidden;
                z-index: 100;
            `;
            this.crosshairElement.innerHTML = svgData;
            document.body.appendChild(this.crosshairElement);

            if (this.isAiming) this.crosshairElement.style.visibility = 'visible';
            // Let it be visible if we are in scoped mode
        } catch (error) {
            console.error('Failed to load crosshair:', error);
        }
    }

    // We set the aiming state and add overlay
    enterAimMode() {
        this.isAiming = true;
        if (this.crosshairElement) {
            this.crosshairElement.style.visibility = 'visible';
        }
    }

    // We set the aiming state and remove overlay
    exitAimMode() {
        this.isAiming = false;
        if (this.crosshairElement) {
            this.crosshairElement.style.visibility = 'hidden';
        }
    }

    // Switch camera between main and launcher
    toggleCamera(mainCamera) {
        if (!this.sightCamera) return mainCamera;

        const switchingToSight = this.activeCam === mainCamera;

        if (switchingToSight) {
            this.sightCamera.aspect = window.innerWidth / window.innerHeight;
            this.sightCamera.updateProjectionMatrix();
            this.enterAimMode();
            return this.sightCamera;
        } else {
            this.exitAimMode();
            return mainCamera;
        }
    }

    // Self explainatory
    setMainCamera(camera) {
        this.mainCamera = camera;
        this.activeCam  = camera;
    }

    // Return active camera
    get activeCamera() {
        return this.activeCam;
    }

    // If we resize window while scoped in, make sure the camera isn't stretched or squished
    onResize() {
        if (this.sightCamera) {
            this.sightCamera.aspect = window.innerWidth / window.innerHeight;
            this.sightCamera.updateProjectionMatrix();
        }
    }

    // Update our launcher's position.
    update(input, delta, scene) {
        // Sync group transform from class properties
        this.group.position.copy(this.position);
        this.group.rotation.copy(this.rotation);
        this.group.scale.copy(this.scale);

        // If V is pressed we go into aiming mode
        const vPressed = input.isDown('KeyV');
        if (vPressed && !this.wasAimPressed && this.mainCamera) {
            this.activeCam = this.toggleCamera(this.mainCamera);
        }
        this.wasAimPressed = vPressed;

        // Bone aiming
        if (this.middleBone) {
            if (input.isDown('ArrowLeft'))  this.yaw += this.YAW_SPEED * delta;
            if (input.isDown('ArrowRight')) this.yaw -= this.YAW_SPEED * delta;
            this.middleBone.rotation.y = this.yaw;
        }


        if (this.launcherBone) {
            if (input.isDown('ArrowUp'))   this.pitch = Math.min(this.PITCH_MAX, this.pitch + this.PITCH_SPEED * delta);
            if (input.isDown('ArrowDown')) this.pitch = Math.max(this.PITCH_MIN, this.pitch - this.PITCH_SPEED * delta);
            this.launcherBone.rotation.x = this.pitch;
        }

        // Fire when spacebar is pressed
        if (input.isDown('Space')) {
            this.fire(scene);
        }

        // Reload when R is pressed
        if (input.isDown('KeyR')) {
            this.reload(scene);
        }


        // Simulate loose tube physics
        // Stop when it hits the ground
        if (this.looseTubePhysics) {
            // Vertical velocity
            this.looseTubePhysics.velocity.y -= 12 * delta;
            this.looseTubePhysics.mesh.position.addScaledVector(this.looseTubePhysics.velocity, delta);


            // Get bottom of mesh, not center
            const box = new THREE.Box3().setFromObject(this.looseTubePhysics.mesh);
            
            // Stop when on the ground
            if (box.min.y <= 0) {
                this.looseTubePhysics.mesh.position.y += -box.min.y;
                this.looseTubePhysics.velocity.set(0, 0, 0);
                
                // Physics done: clear physics data
                this.looseTubePhysics = null;

                // If we were tossing, start the actual reload animation now
                if (this.state === LauncherState.TOSSING) {
                    this.state       = LauncherState.RELOADING;
                    this.reloadTimer = 0;

                    // Move the bone above its rest position and make new tube visible
                    this.missileBone.position.set(0, 2, 0);
                    this.reloadStartPos.copy(this.missileBone.position);
                    this.tubeMesh.visible = true;
                }
            }
        }

        // Reload animation we lerp the bone position from above down to rest position
        if (this.state === LauncherState.RELOADING) {
            this.reloadTimer += delta;
            const t = Math.min(this.reloadTimer / this.RELOAD_DURATION, 1);

            // Smoothstep for a more natural easing
            const smooth = t * t * (3 - 2 * t);
            this.missileBone.position.lerpVectors(this.reloadStartPos, this.tubeRestPosition, smooth);

            // Reload complete, we are back to ready state
            if (t >= 1) {
                this.reloadTimer = 0;
                this.state       = LauncherState.READY;
            }
            
        }
        // Update missile if in flight
        if (this.missile && this.missile.alive) {
            const target = this.getSightTarget(scene);
            const hit    = this.missile.update(delta, target, this.tanks, scene);
            if (hit || !this.missile.alive) {
                this.missile  = null;
                this.state    = LauncherState.POST_FIRE;
            }
        }
    }

    // Add tank to list of our available targets
    registerTank(tank) {
        this.tanks.push(tank);
    }

    // Remove tank from list of available targets
    removeTank(tank) {
        this.tanks = this.tanks.filter(t => t !== tank);
    }

    // Add the launcher to a scene
    addToScene(scene) {
        scene.add(this.group);
        // Calculate bounding box, use it's lowest positon as base to place it
        const box = new THREE.Box3().setFromObject(this.group);
        this.group.position.y = -box.min.y;

        // Sight camera is parented to Launcher bone, moves with it
        // It has a small FOV since it's supposed to be a telescopic sight
        if (this.sightBone) {
            this.sightCamera = new THREE.PerspectiveCamera(
                15,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );
            // Position at the tip of the Sight bone, pointing forward
            this.sightCamera.position.set(0, 0, 0);
            // Let's make sure the camera is pointing the correct way
            // Trial and error
            this.sightCamera.rotation.set(Math.PI / 2, 0, 0);
            // Add to scene first, then add it to bone hierarchy
            scene.add(this.sightCamera);
            this.sightBone.add(this.sightCamera);
        }

        // Permanent marker to read tube world transform reliably
        // Hopefully will fix our tube toss
        this.tubeMarker = new THREE.Object3D();
        scene.add(this.tubeMarker);
        this.missileBone.attach(this.tubeMarker);
    }

    // We want to know where the player is aiming:
    // A ray will be 'shot' from the center of the launcher's camera at exactly 1000 units distance
    // This is to prevent weird UTurns or manouvers impossible to real 
    getSightTarget() {
            if (!this.sightCamera) return null;

            // Force matrix update so we shoot from the exact current rotation
            this.sightCamera.updateMatrixWorld(true);

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(0, 0), this.sightCamera);

            const targetPoint = new THREE.Vector3();
            
            // Instead of calculating ray collisions against the whole scene, 
            // we just place the target 1000 meters straight down the camera's line of sight.
            // Because your missile's max range is 500m, this point is ALWAYS in front of it.
            raycaster.ray.at(1000, targetPoint);

            return targetPoint;
        }

    // Missile is fired
    fire(scene) {
            if (this.state !== LauncherState.READY) return;

            // Get spawn position and direction from launcher bone
            const spawnPos = new THREE.Vector3();
            const spawnDir = new THREE.Vector3();

            // Get position and direction of our missile
            this.launcherBone.getWorldPosition(spawnPos);
            this.launcherBone.getWorldDirection(spawnDir);
            spawnDir.negate();

            // Spawn new missile
            this.missile = new Missile(spawnPos, spawnDir);
            this.missile.addToScene(scene);

            // Transition to FIRED state (locks out reloading until impact)
            this.state = LauncherState.FIRED;
        }

    reload(scene) {
            // Only allow reload AFTER the missile is destroyed/lost
            if (this.state !== LauncherState.POST_FIRE) return;

            // Remove the old tube mesh from a PREVIOUS reload before tossing a new one
            if (this.looseTubeMesh) {
                scene.remove(this.looseTubeMesh);
                this.looseTubeMesh = null;
            }

            // Enter tossing state and trigger the toss
            this.state = LauncherState.TOSSING;
            this.looseTubePhysics = this.tossTube(scene);
        }

    // After firing, the tube is tossed to the side (like the real life counterpart)
    tossTube(scene) {
        if (!this.tubeMesh || !this.tubeMarker) return;

        // Read world transform from marker — guaranteed accurate
        const worldPos  = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        this.tubeMarker.getWorldPosition(worldPos);
        this.tubeMarker.getWorldQuaternion(worldQuat);

        // Clone the tube mesh as a loose object
        // We throw away a clone, and keep the original hidden
        // Assign the original's world position and rotation to the clone
        this.looseTubeMesh = new THREE.Mesh(
            this.tubeMesh.geometry.clone(),
            this.tubeMesh.material
        );
        this.looseTubeMesh.position.copy(worldPos);
        this.looseTubeMesh.quaternion.copy(worldQuat);

        scene.add(this.looseTubeMesh);
        this.tubeMesh.visible = false;

        // Toss direction relative to launcher's current rotation
        const localVelocity = new THREE.Vector3(-2.5, 2, 0);
        const worldVelocity = localVelocity.applyQuaternion(
            this.middleBone.getWorldQuaternion(new THREE.Quaternion())
        );

        return {
            mesh:     this.looseTubeMesh,
            velocity: worldVelocity,
        };
    }
}