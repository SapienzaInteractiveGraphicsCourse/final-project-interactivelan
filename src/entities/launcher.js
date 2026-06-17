import * as THREE from 'three';
import { Missile } from './missile';
import { materialLauncher } from '../rendering/materials';

export const LauncherState = Object.freeze({
    // Missile is in flight
    FIRED:      'FIRED',
    // We are tossing the used tube before reloading
    TOSSING:    'TOSSING',
    // Our launcher is ready to be reloaded: missile lost or destroyed
    POST_FIRE:  'POST_FIRE',
    // Launcher cannot be used, reload animation is in progress
    RELOADING:  'RELOADING',
    // Launcher ready to fire
    READY:      'READY',
});

export class Launcher {
    constructor(model, worldObstacles = [], gameAudio = null) {
        this.model = model;
        // Launcher starts as ready to fire
        this.state = LauncherState.READY;

        // Our audio handler
        this.gameAudio = gameAudio;

        this.worldObstacles = worldObstacles;

        // Lock pointer on canvas click to enable free-look
        this.onCanvasClick = this.onCanvasClick.bind(this);

        // Transform properties
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.scale    = new THREE.Vector3(1, 1, 1);

        // Cameras references and state
        this.mainCamera       = null;
        this.activeCam        = null;
        this.scene            = null;
        this.operatorCamera   = null;
        this.operatorCamPivot = null;

        // Rotation speeds and pitch limits
        this.YAW_SPEED   = 1.0;
        this.PITCH_SPEED = 0.8;
        this.PITCH_MIN   = -0.5;
        this.PITCH_MAX   = 0.3;

        // Restrict aiming to 180 degrees arc in front
        // Set by faceToward so they're always relative to the launcher's spawn orientation
        this.YAW_MIN = -Math.PI / 2;
        this.YAW_MAX =  Math.PI / 2;
        this.yawOrigin = 0; // set by faceToward

        // Mouse aim sensitivity
        this.MOUSE_SENS_X = 0.0010;
        this.MOUSE_SENS_Y = 0.0008;
        this.isPointerLocked = false;

        // Mouse buttons state
        this.leftMouseDown     = false;
        this.rightMouseDown    = false;
        this.wasRightMouseDown = false;

        // Keyboard edge detection
        this.wasReloadDown = false;

        // Add reference to our current missile and tanks we are allowed to

        // Currently steered missile
        this.missile = null;
        this.tanks   = [];

        // Reload animation duration in seconds
        this.RELOAD_DURATION = 2;
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

        // Store the "ground offset" so the launcher never sinks into the terrain
        // This is the distance from the group origin to the bottom of the tripod
        this.groundOffset = box.min.y;

        // Search for expected bones in loaded model
        // Our model should have:
        // Base
        // \-> Middle
        //   \-> Launcher
        //     \-> Missile
        model.traverse((obj) => {
            if (obj.isBone) {
                if (obj.name === 'Middle')   this.middleBone   = obj;
                if (obj.name === 'Launcher') this.launcherBone = obj;
                if (obj.name === 'Tube')     this.missileBone  = obj;
                if (obj.name === 'Sight')    this.sightBone    = obj;
            }

            // Assign the mesh of our tube if it has the correct name to the variable
            if (obj.isMesh) {
                if (obj.name === 'LauncherMesh') { 
                    obj.material = materialLauncher;
                }
                if (obj.name === 'TubeMesh') {
                    this.tubeMesh = obj;
                    obj.material  = materialLauncher;
                }
            }
        });

        // Store tube rest position before any animation, to use for our reload later
        // Must be after traverse so tubeMesh is assigned
        this.tubeRestPosition = this.missileBone ? this.missileBone.position.clone() : new THREE.Vector3();
        this.reloadStartPos   = new THREE.Vector3();

        this.hud      = null;
        this.isAiming = false;

        // Low-res canvas scaled to viewport, gives digital/CCTV noise when updated each frame
        const NW = 320, NH = 180;
        this.noiseCanvas = document.createElement('canvas');
        this.noiseCanvas.width  = NW;
        this.noiseCanvas.height = NH;
        this.noiseCanvas.style.cssText = [
            'position:fixed', 'inset:0', 'width:100%', 'height:100%',
            'pointer-events:none', 'z-index:100',
            'mix-blend-mode:screen', 'image-rendering:pixelated', 'display:none',
        ].join(';');
        document.body.appendChild(this.noiseCanvas);
        this.noiseCtx       = this.noiseCanvas.getContext('2d');
        this.noiseImageData = this.noiseCtx.createImageData(NW, NH);

        this.scopeOverlay = document.createElement('div');
        this.scopeOverlay.style.cssText = [
            'position:fixed', 'inset:0', 'pointer-events:none', 'z-index:101',
            'background:radial-gradient(circle, transparent 30%, rgba(0,0,0,0.97) 45%)',
            'display:none',
        ].join(';');
        document.body.appendChild(this.scopeOverlay);

        this.keys = {};

        // Mouse events for scoped aiming and firing
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
        this.onPointerLockChange = this.onPointerLockChange.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp   = this.onKeyUp.bind(this);

        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mouseup', this.onMouseUp);
        document.addEventListener('contextmenu', this.onContextMenu);
        document.addEventListener('pointerlockchange', this.onPointerLockChange);
        document.addEventListener('click', this.onCanvasClick);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup',   this.onKeyUp);
    }

    setHUD(hud) {
        this.hud = hud;
    }

    onKeyDown(e) {
        this.keys[e.code] = true;
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
    }

    // Move aim with mouse while scoped in
    onMouseMove(event) {
        if (!this.isPointerLocked) return;

        // In both camera modes, mouse X rotates the launcher yaw so the camera and the launcher always stay in sync
        this.yaw -= event.movementX * this.MOUSE_SENS_X;
        this.yaw  = THREE.MathUtils.clamp(
            this.yaw,
            this.yawOrigin + this.YAW_MIN,
            this.yawOrigin + this.YAW_MAX
        );

        // Pitch controls launcher elevation in both modes
        this.pitch -= event.movementY * this.MOUSE_SENS_Y;
        this.pitch  = THREE.MathUtils.clamp(this.pitch, this.PITCH_MIN, this.PITCH_MAX);
    }

    // Left click fires, right click toggles scope
    onMouseDown(event) {
        if (event.button === 0) {
            this.leftMouseDown = true;
        }

        if (event.button === 2) {
            event.preventDefault();
            this.rightMouseDown = true;
        }
    }

    // Reset mouse button state
    onMouseUp(event) {
        if (event.button === 0) this.leftMouseDown = false;
        if (event.button === 2) this.rightMouseDown = false;
    }

    // Stop browser right click menu
    onContextMenu(event) {
        event.preventDefault();
    }

    // Track pointer lock state
    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === document.body;

        // If pointer lock is lost while scoped in, go back to main camera
        if (!this.isPointerLocked && this.isAiming) {
            this.isAiming = false;
            this.hud?.setCrosshairVisible(false);
            if (this.mainCamera) {
                this.activeCam = this.mainCamera;
            }
        }
    }

    // Lock pointer on canvas click when not scoped
    // This lets the player rotate the camera without holding a button
    onCanvasClick() {
        if (!this.isAiming && !this.isPointerLocked) {
            document.body.requestPointerLock();
        }
    }

    // We set the aiming state and add overlay
    enterAimMode() {
        this.isAiming = true;
        this.hud?.setCrosshairVisible(true);
        this.scopeOverlay.style.display  = 'block';
        this.noiseCanvas.style.display   = 'block';

        // Lock pointer so mouse movement is relative
        document.body.requestPointerLock();
    }

    // We set the aiming state and remove overlay
    exitAimMode() {
        this.isAiming = false;
        this.hud?.setCrosshairVisible(false);
        this.scopeOverlay.style.display = 'none';
        this.noiseCanvas.style.display  = 'none';

        // Keep pointer lock active when leaving scoped view so the player can continue rotating the launcher in third-person
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

    setMainCamera(camera) {
        if (camera) {
            this.mainCamera = camera;
        } else if (this.operatorCamera) {
            this.mainCamera = this.operatorCamera;
        }
        this.activeCam = this.mainCamera;
    }

    // Return active camera
    get activeCamera() {
        return this.activeCam;
    }

    // If we resize window while scoped in, make sure the camera isn't stretched or squished
    onResize() {
        if (this.mainCamera) {
            this.mainCamera.aspect = window.innerWidth / window.innerHeight;
            this.mainCamera.updateProjectionMatrix();
        }
        if (this.sightCamera) {
            this.sightCamera.aspect = window.innerWidth / window.innerHeight;
            this.sightCamera.updateProjectionMatrix();
        }
    }

    updateLooseTubePhysics(delta) {
        // Simulate loose tube physics
        // Stop when it hits the ground
        if (this.looseTubePhysics) {
            this.looseTubePhysics.velocity.y -= 12 * delta;
            this.looseTubePhysics.mesh.position.addScaledVector(this.looseTubePhysics.velocity, delta);

            // Raycast down from tube position to find actual terrain height
            const tubePos = this.looseTubePhysics.mesh.position;
            const raycaster = new THREE.Raycaster(
                new THREE.Vector3(tubePos.x, tubePos.y + 10, tubePos.z),
                new THREE.Vector3(0, -1, 0)
            );
            const hits     = this.terrain ? raycaster.intersectObject(this.terrain, false) : [];
            const groundY  = hits.length > 0 ? hits[0].point.y : 0;

            const box = new THREE.Box3().setFromObject(this.looseTubePhysics.mesh);

            // Start the drop sound a little before impact so it peaks on landing
            if (!this.tubeDropTriggered && this.tubeDropSound && box.min.y <= groundY + 1.5) {
                this.tubeDropTriggered = true;
                this.tubeDropSound.position.copy(tubePos);
                if (this.tubeDropSound.isPlaying) this.tubeDropSound.stop();
                this.tubeDropSound.play();
            }

            if (box.min.y <= groundY) {
                this.looseTubePhysics.mesh.position.y += groundY - box.min.y;
                this.looseTubePhysics.velocity.set(0, 0, 0);
                this.looseTubePhysics = null;

                if (this.state === LauncherState.TOSSING) {
                    this.state       = LauncherState.RELOADING;
                    this.reloadTimer = 0;
                    this.missileBone.position.set(0, 2, 0);
                    this.reloadStartPos.copy(this.missileBone.position);
                    this.tubeMesh.visible = true;
                }
            }
        }
    }
    
    updateReloadAnimation(delta) {
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
                if (this.reloadClickSound) {
                    if (this.reloadClickSound.isPlaying) this.reloadClickSound.stop();
                    this.reloadClickSound.play();
                }
            }
        }
    }

    updateMissileState(delta, scene) {
        // Update missile if in flight
        if (this.missile && this.missile.alive) {
            const target = this.getSightTarget(scene);
            const hit    = this.missile.update(delta, target, this.tanks, this.worldObstacles, scene);
            if (hit || !this.missile.alive) {
                this.missile = null;
                this.state   = LauncherState.POST_FIRE;
            }
        }
    }

    update(delta, scene, terrain) {
        this.scene = scene;

        // Sync group transform from class properties
        this.group.position.copy(this.position);
        this.group.rotation.copy(this.rotation);
        this.group.scale.copy(this.scale);

        // Keep the launcher on the ground: raycast down from the group and set Y
        // This ensures the tripod sits on the terrain and doesn't sink
        if (terrain) {
            this.terrain = terrain;
            this.snapToGround(terrain);
        }

        // Toggle scope with right click once
        if (this.rightMouseDown && !this.wasRightMouseDown) {
            if (this.mainCamera) {
                this.activeCam = this.toggleCamera(this.mainCamera);
            }
        }
        this.wasRightMouseDown = this.rightMouseDown;

        // Bone aiming
        if (this.middleBone) {
            if (this.keys['ArrowLeft'])  this.yaw += this.YAW_SPEED * delta;
            if (this.keys['ArrowRight']) this.yaw -= this.YAW_SPEED * delta;

            this.yaw = THREE.MathUtils.clamp(
                this.yaw,
                this.yawOrigin + this.YAW_MIN,
                this.yawOrigin + this.YAW_MAX
            );

            this.middleBone.rotation.y = this.yaw;
        }

        if (this.launcherBone) {
            if (!this.isAiming || !this.isPointerLocked) {
                if (this.keys['ArrowUp'])   this.pitch = Math.min(this.PITCH_MAX, this.pitch + this.PITCH_SPEED * delta);
                if (this.keys['ArrowDown']) this.pitch = Math.max(this.PITCH_MIN, this.pitch - this.PITCH_SPEED * delta);
            }
            this.launcherBone.rotation.x = this.pitch;
        }

        // Fire only while scoped in
        if (this.leftMouseDown && this.isAiming) {
            this.fire(scene);
            // Prevent repeated fire while holding LMB
            this.leftMouseDown = false;
        }

        // Reload when R is pressed
        const reloadDown = !!this.keys['KeyR'];
        if (reloadDown && !this.wasReloadDown) {
            this.reload(scene);
        }
        this.wasReloadDown = reloadDown;

        this.updateLooseTubePhysics(delta, terrain);
        this.updateReloadAnimation(delta);
        this.updateMissileState(delta, scene);

        if (this.isAiming) this._updateNoise();
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
    addToScene(scene, position) {
        this.scene = scene;
        scene.add(this.group);

        // Calculate bounding box, use it's lowest positon as base to place it
        const box = new THREE.Box3().setFromObject(this.group);

        // Store launcher transform in class state (so `update` doesn't overwrite it)
        this.position.set(
            position.x,
            position.y - box.min.y,
            position.z
        );

        // Sync group to that transform
        this.group.position.copy(this.position);

        // Capture the tube's rest pose world transform once after placement
        // Used by tossTube to compute the delta between rest and current aim
        this.group.updateMatrixWorld(true);

        this.boneRestWorldPos  = new THREE.Vector3();
        this.boneRestWorldQuat = new THREE.Quaternion();
        this.missileBone.getWorldPosition(this.boneRestWorldPos);
        this.missileBone.getWorldQuaternion(this.boneRestWorldQuat);

        this.tubeRestWorldPos   = new THREE.Vector3();
        this.tubeRestWorldQuat  = new THREE.Quaternion();
        this.tubeRestWorldScale = new THREE.Vector3();
        this.tubeMesh.getWorldPosition(this.tubeRestWorldPos);
        this.tubeMesh.getWorldQuaternion(this.tubeRestWorldQuat);
        this.tubeMesh.getWorldScale(this.tubeRestWorldScale);

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

            // Distance and height the free-look camera sits behind the launcher
            this.freeLookDistance = 20;
            this.freeLookHeight   = 8;

            // If we have provided an audio source, let's create some positional sounds attached to the launcher
            if (this.gameAudio) {
                this.tubeTossSound = this.gameAudio.createPositional('tubeToss', {
                    volume: 0.7,
                    refDistance: 12,
                    rolloffFactor: 1.3,
                    maxDistance: 80,
                });
                this.group.add(this.tubeTossSound);

                // Drop sound plays when the tube hits the ground, positioned at the landing spot
                this.tubeDropSound = this.gameAudio.createPositional('tubeDrop', {
                    volume: 0.9,
                    refDistance: 10,
                    rolloffFactor: 1.5,
                    maxDistance: 60,
                });
                scene.add(this.tubeDropSound);

                this.reloadClickSound = this.gameAudio.createPositional('reloadClick', {
                    volume: 1.0,
                    refDistance: 8,
                    rolloffFactor: 1.2,
                    maxDistance: 40,
                });
                this.group.add(this.reloadClickSound);
            }
        }

        // Create the default operator camera in first-person, parented to the launcher bone
        const cameraParent = this.launcherBone || this.group;
        this.operatorCamPivot = new THREE.Object3D();
        this.operatorCamPivot.position.set(0, 1.2, 3);
        this.operatorCamera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        // Very trial and error numbers
        this.operatorCamera.position.set(0.5, -0.7, -1.75);
        cameraParent.add(this.operatorCamPivot);
        this.operatorCamPivot.add(this.operatorCamera);
        this.mainCamera = this.operatorCamera;
        this.activeCam  = this.operatorCamera;

        // Permanent marker to read tube world transform reliably
        // Hopefully will fix our tube toss
        this.tubeMarker = new THREE.Object3D();
        scene.add(this.tubeMarker);
        this.missileBone.attach(this.tubeMarker);
    }

    // Snap the launcher group to the terrain so it doesn't sink
    snapToGround(terrain) {
        const down = new THREE.Vector3(0, -1, 0);
        const rayOrigin = this.group.position.clone();

        // Start ray well above the launcher
        rayOrigin.y += 50;

        const raycaster = new THREE.Raycaster();
        raycaster.set(rayOrigin, down);

        const hits = raycaster.intersectObject(terrain, false);
        if (hits.length === 0) return;

        const hit = hits[0];

        // Place the group so its bottom touches the terrain
        this.group.position.y = hit.point.y + this.groundOffset;
        // Also update class state so nothing breaks
        this.position.y = this.group.position.y;
    }

    // We want to know where the player is aiming:
    // A ray will be 'shot' from the center of the launcher's camera at exactly 300 units distance
    // This is to prevent weird UTurns or manouvers impossible to real
    getSightTarget() {
        if (!this.sightCamera) return null;

        // Force matrix update so we shoot from the exact current rotation
        this.sightCamera.updateMatrixWorld(true);

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.sightCamera);

        const targetPoint = new THREE.Vector3();

        // Instead of calculating ray collisions against the whole scene,
        // we just place the target 550 meters straight down the camera's line of sight.
        raycaster.ray.at(550, targetPoint);

        return targetPoint;
    }

    // Point the launcher toward a world position on spawn
    // Sets the base yaw so the operator faces the right way from the start
    faceToward(targetPosition) {
        // If a map center was provided, compute yaw origin relative to it
        const refPos = this.mapCenter ? this.mapCenter : targetPosition;
        const direction = new THREE.Vector3(
            refPos.x - this.position.x,
            0,
            refPos.z - this.position.z
        ).normalize();

        // + PI because the launcher model's forward is flipped in Blender vs Three.js
        this.yaw       = Math.atan2(direction.x, direction.z) + Math.PI;
        this.yawOrigin = this.yaw;
    }

    // Allow externally setting the map center so rotation limits are calculated relative to the center of the map
    // We want to limit fov relative to map center for gameplay reasons
    setMapCenter(centerPosition) {
        if (!centerPosition) return;
        this.mapCenter = centerPosition.clone ? centerPosition.clone() : new THREE.Vector3(centerPosition.x, centerPosition.y, centerPosition.z);

        // If we already have a position for the launcher, update yaw origin now
        if (this.position) {
            const direction = new THREE.Vector3(
                this.mapCenter.x - this.position.x,
                0,
                this.mapCenter.z - this.position.z
            ).normalize();
            this.yaw = Math.atan2(direction.x, direction.z) + Math.PI;
            this.yawOrigin = this.yaw;
        }
    }

    // Missile is fired
    fire(scene) {
        if (this.state !== LauncherState.READY) return;
        if (!this.launcherBone) return;

        // Get spawn position and direction from launcher bone
        const spawnPos = new THREE.Vector3();
        const spawnDir = new THREE.Vector3();

        // Get position and direction of our missile
        this.launcherBone.getWorldPosition(spawnPos);
        this.launcherBone.getWorldDirection(spawnDir);
        spawnDir.negate();

        // Spawn new missile
        this.missile = new Missile(spawnPos, spawnDir, this.gameAudio);
        this.missile.addToScene(scene);

        // Transition to FIRED state (locks out reloading until impact)
        this.state = LauncherState.FIRED;
    }

    _updateNoise() {
        const d = this.noiseImageData.data;
        for (let i = 0; i < d.length; i += 4) {
            // Subtle base grain with rare hot pixels
            const v = Math.random() < 0.015
                ? (Math.random() * 120 + 60) | 0
                : (Math.random() * 14)        | 0;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = 255;
        }
        this.noiseCtx.putImageData(this.noiseImageData, 0, 0);
    }

    reload(scene) {
        // Only allow reload AFTER the missile is destroyed/lost
        if (this.state !== LauncherState.POST_FIRE) return;
        if (!this.tubeMesh) return;

        // Remove the old tube mesh from a PREVIOUS reload before tossing a new one
        if (this.looseTubeMesh) {
            scene.remove(this.looseTubeMesh);
            this.looseTubeMesh = null;
        }

        // Enter tossing state and trigger the toss
        this.tubeDropTriggered = false;
        this.state = LauncherState.TOSSING;
        this.looseTubePhysics = this.tossTube(scene);
    }

    // After firing, the tube is tossed to the side (like the real life counterpart)
    tossTube(scene) {
        if (!this.tubeMesh || !this.missileBone) return null;

        // Make sure bone matrices reflect the current aim before reading them
        this.group.updateMatrixWorld(true);

        const boneCurrentPos  = new THREE.Vector3();
        const boneCurrentQuat = new THREE.Quaternion();
        this.missileBone.getWorldPosition(boneCurrentPos);
        this.missileBone.getWorldQuaternion(boneCurrentQuat);

        // Delta rotation between rest pose and current aim
        // Applying this to anything captured at rest moves it to the current aim
        const deltaRotation = boneCurrentQuat.clone().multiply(
            this.boneRestWorldQuat.clone().invert()
        );

        // Rotate the rest offset (tube origin relative to bone) by the delta,
        // then add to where the bone sits now
        const restOffset = this.tubeRestWorldPos.clone().sub(this.boneRestWorldPos);
        const spawnPos   = boneCurrentPos.clone().add(restOffset.applyQuaternion(deltaRotation));

        // Rest orientation rotated by the same delta
        const spawnQuat = deltaRotation.clone().multiply(this.tubeRestWorldQuat);

        this.looseTubeMesh = new THREE.Mesh(
            this.tubeMesh.geometry.clone(),
            this.tubeMesh.material
        );
        this.looseTubeMesh.position.copy(spawnPos);
        this.looseTubeMesh.quaternion.copy(spawnQuat);
        this.looseTubeMesh.scale.copy(this.tubeRestWorldScale);

        scene.add(this.looseTubeMesh);
        this.tubeMesh.visible = false;

        // Toss direction expressed in rest frame, rotated into current aim by the same delta
        // So the tube always flies to the launcher's left regardless of yaw
        const worldVelocity = new THREE.Vector3(-2.5, 2, 0).applyQuaternion(deltaRotation);

        return {
            mesh:     this.looseTubeMesh,
            velocity: worldVelocity,
        };
    }
}