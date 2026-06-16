import * as THREE from 'three';
import { applyCellShading } from '../rendering/shaders.js';
import { spawnExplosion, createFire, createSmoke } from '../rendering/effects.js';
import { materialTank } from '../rendering/materials.js';

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
    constructor(model, gameAudio = null) {
        this.model = model;
        this.state      = TankState.ALIVE;
        this.stateTimer = 0;

        // Reference to scene
        this.scene = null;

        // Reference to audio
        this.gameAudio = gameAudio;
        this.moveSound = null;
        this.explosionSound = null;
        this.deathSoundPlayed = false;

        // Reference to terrain
        this.terrain = null;

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

        // Our tank model faces 90 degrees off, Blender and threejs magic
        this.model.rotation.y = +Math.PI / 2;

        // How far above the terrain our group origin should sit
        const groundedBox = new THREE.Box3().setFromObject(model);
        this.groundOffset = -groundedBox.min.y;

        // Raycaster to check for collisions
        this.raycaster = new THREE.Raycaster();

        // Make sure the tank is touching the ground
        const box        = new THREE.Box3().setFromObject(model);
        model.position.y = -box.min.y;

        // Navigation and movement
        this.navMap     = null;
        this.moveTarget = null;
        this.path       = [];
        this.pathIndex  = 0;

        this.moveSpeed       = 6;
        this.turnSpeed       = 0.5;
        this.arrivalRadius   = 4.0;

        // Stuck detection: if we barely move for long enough, force a repath
        // Catches cases where the tank clips a tree corner and wedges itself
        this.lastKnownPosition = new THREE.Vector3();
        this.stuckTimer        = 0;
        this.stuckThreshold    = 1.5;

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
                if (obj.name === 'HullMesh')   { this.hullMesh   = obj; obj.material = materialTank; }
                if (obj.name === 'TurretMesh') { this.turretMesh = obj; obj.material = materialTank; }
                if (obj.name === 'GunMesh')    { this.gunMesh    = obj; obj.material = materialTank; }
            }
        });
    }

    // Make sure we don't have flying or sinking tanks
    snapToGround(terrain) {
        const x = this.group.position.x;
        const z = this.group.position.z;
        this.group.position.y = terrain.getHeightAt(x, z) + this.groundOffset;
    }

    // Smoothly fade our movement audio instead of hard stopping and replaying it
    setMoveSoundVolume(targetVolume, fadeTime = 0.12) {
        if (!this.moveSound || !this.moveSound.gain) return;
        const context = this.moveSound.context;
        const gain    = this.moveSound.gain.gain;
        const now     = context.currentTime;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(targetVolume, now + fadeTime);
    }

    // Add the tank to a scene at specified position
    addToScene(scene, terrain, position = new THREE.Vector3()) {
        // Store reference to scene
        this.scene   = scene;
        this.terrain = terrain;

        // Add our tank to scene
        scene.add(this.group);

        // If we have audio available, create our positional sounds and attach them to the tank
        if (this.gameAudio) {
            this.moveSound = this.gameAudio.createPositional('tankEngine', {
                loop: true,
                volume: 0.10,
                refDistance: 25,
                rolloffFactor: 2.5,
                maxDistance: 90,
                distanceModel: 'inverse',
            });

            this.explosionSound = this.gameAudio.createPositional('tankExplosion', {
                loop: false,
                volume: 1.0,
                refDistance: 24,
                rolloffFactor: 2.0,
                maxDistance: 120,
                distanceModel: 'inverse',
            });

            if (this.moveSound) {
                this.group.add(this.moveSound);
                this.moveSound.play();
            }

            if (this.explosionSound) {
                this.group.add(this.explosionSound);
            }
        }

        // Set spawn position, keep the ground-corrected Y
        this.group.position.x = position.x;
        this.group.position.z = position.z;

        if (this.terrain) {
            this.snapToGround(this.terrain);
        } else {
            this.group.position.y = position.y + this.groundOffset;
        }

        // Force world matrix update before computing proxy positions
        this.group.updateMatrixWorld(true);
        // Now bones have correct world matrices
        this.addProxyMeshes(scene);

        // Initialise stuck detection from actual spawn position
        this.lastKnownPosition.copy(this.group.position);
    }

    // Setup navigation for our tank
    setNavigation(navMap, moveTarget, targetJitter = 8) {
        this.navMap = navMap;

        // Offset the target slightly so tanks from same spawn dont just go in a conga line to player
        const jitteredTarget = moveTarget.clone();
        jitteredTarget.x    += (Math.random() - 0.5) * targetJitter;
        jitteredTarget.z    += (Math.random() - 0.5) * targetJitter;

        this.moveTarget = jitteredTarget;
        this.refreshPath();
    }

    // Recompute our path
    refreshPath() {
        // Stop immediately if we dont have a navMap or a target to move to
        if (!this.navMap || !this.moveTarget) return;

        // Make sure world matrices are current before reading position
        this.group.updateMatrixWorld(true);

        // Snap start to nearest passable cell — the tank may be clipped into a
        // blocked zone if it spawned near a tree or got wedged in a corner
        const safeStart = this.navMap.findNearestPassable(
            this.group.position.x,
            this.group.position.z
        );

        const rawPath = this.navMap.findPath(safeStart, this.moveTarget) ?? [];

        // No path means nowhere to go
        if (rawPath.length === 0) {
            this.path      = [];
            this.pathIndex = 0;
            return;
        }

        // Copy path points into a clean array
        this.path      = rawPath.map(point => ({ x: point.x, z: point.z }));
        // Skip the first point if it is just our current cell
        this.pathIndex = this.path.length > 1 ? 1 : 0;
    }

    // Update the movement of our tank
    updateMovement(delta) {
        // Stop if we don't have a path yet
        if (!this.path || this.path.length === 0) return;

        // Stop once we've reached the end of the path
        if (this.pathIndex >= this.path.length) return;

        // Guard: waypoint must exist before reading its properties
        // Catches debug scenes where setNavigation is never called
        const waypoint = this.path[this.pathIndex];
        if (!waypoint) return;

        let movedThisFrame = false;

        // Direction from tank to target point
        const toWaypoint = new THREE.Vector3(
            waypoint.x - this.group.position.x,
            0,
            waypoint.z - this.group.position.z
        );

        // Distance to target point on the ground plane
        const distanceToWaypoint = toWaypoint.length();

        // If we're close enough, move to the next point in the path
        if (distanceToWaypoint <= this.arrivalRadius) {
            this.setMoveSoundVolume(0.0);
            this.pathIndex++;
            return;
        }

        // Calculate the yaw angle we need to face the target point
        const desiredYaw = Math.atan2(toWaypoint.x, toWaypoint.z);

        // Get the difference between desired and current yaw
        let yawDifference = desiredYaw - this.group.rotation.y;

        // Normalize to [-PI, PI] so we rotate the shortest way
        while (yawDifference >  Math.PI) yawDifference -= Math.PI * 2;
        while (yawDifference < -Math.PI) yawDifference += Math.PI * 2;

        // Limit how much we can turn this frame
        const maxTurnThisFrame = this.turnSpeed * delta;
        this.group.rotation.y += THREE.MathUtils.clamp(yawDifference, -maxTurnThisFrame, maxTurnThisFrame);

        // Calculate forward direction from current hull rotation
        const facingDirection = new THREE.Vector3(0, 0, 1).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            this.group.rotation.y
        );

        // Slow down harder when we need a big heading correction
        // This makes corners feel smoother without skipping path points
        const turnFactor = THREE.MathUtils.clamp(
            1 - Math.abs(yawDifference) / (Math.PI * 0.75),
            0.15,
            1.0
        );

        // Also slow down a bit when we are very close to the waypoint
        // Helps avoid overshooting and makes the turn-in feel softer
        const approachFactor = THREE.MathUtils.clamp(distanceToWaypoint / 6, 0.35, 1.0);
        const moveStep       = this.moveSpeed * turnFactor * approachFactor * delta;

        // If we are facing way off target, mostly rotate first and crawl forward
        // This feels more tank-like than sliding through the turn
        this.group.position.addScaledVector(facingDirection, moveStep);
        movedThisFrame = moveStep > 0.01;

        // Keep it on the ground after moving
        if (this.terrain) this.snapToGround(this.terrain);

        // After snapToGround, tilt the tank to match the terrain slope
        if (this.terrain) {
            this.snapToGround(this.terrain);

            // Sample terrain a short distance ahead and behind along the facing direction
            const sampleDistance = 2.0;
            const forwardX = this.group.position.x + Math.sin(this.group.rotation.y) * sampleDistance;
            const forwardZ = this.group.position.z + Math.cos(this.group.rotation.y) * sampleDistance;
            const backX    = this.group.position.x - Math.sin(this.group.rotation.y) * sampleDistance;
            const backZ    = this.group.position.z - Math.cos(this.group.rotation.y) * sampleDistance;

            const heightAhead  = this.terrain.getHeightAt(forwardX, forwardZ);
            const heightBehind = this.terrain.getHeightAt(backX, backZ);

            // Angle between the two sample points gives us the pitch
            const slopePitch = Math.atan2(heightAhead - heightBehind, sampleDistance * 2);

            // Smooth the pitch so it doesn't snap instantly
            this.group.rotation.x = THREE.MathUtils.lerp(
                this.group.rotation.x,
                -slopePitch,
                0.1
            );

            // Also sample left and right for side roll
            const rightX = this.group.position.x + Math.cos(this.group.rotation.y) * sampleDistance;
            const rightZ = this.group.position.z - Math.sin(this.group.rotation.y) * sampleDistance;
            const leftX  = this.group.position.x - Math.cos(this.group.rotation.y) * sampleDistance;
            const leftZ  = this.group.position.z + Math.sin(this.group.rotation.y) * sampleDistance;

            const heightRight = this.terrain.getHeightAt(rightX, rightZ);
            const heightLeft  = this.terrain.getHeightAt(leftX, leftZ);

            const slopeRoll = Math.atan2(heightRight - heightLeft, sampleDistance * 2);

            this.group.rotation.z = THREE.MathUtils.lerp(
                this.group.rotation.z,
                slopeRoll,
                0.1
            );
        }

        // Fade movement sound depending on whether the tank is actually moving
        if (this.moveSound) {
            this.setMoveSoundVolume(movedThisFrame ? 0.25 : 0.0);
        }

        // Stuck detection: if we haven't moved meaningfully, increment the timer
        // 0.3 units per second is basically stationary for a tank moving at speed 6
        const distanceMoved = this.group.position.distanceTo(this.lastKnownPosition);

        if (distanceMoved < 0.3 * delta) {
            this.stuckTimer += delta;

            if (this.stuckTimer >= this.stuckThreshold) {
                this.stuckTimer = 0;
                this.lastKnownPosition.copy(this.group.position);
                this.refreshPath();
            }
        } else {
            this.stuckTimer = 0;
            this.lastKnownPosition.copy(this.group.position);
        }
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

            // Our turret bone is rotated 90 degrees off in its rest pose
            // It is what it is
            this.turretBone.rotation.y = worldAngle - parentEuler.y + Math.PI / 2;
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
    hit(hitPosition, camera) {
        if (this.state !== TankState.ALIVE) return;

        this.state      = TankState.HIT;
        this.stateTimer = 0;
        this.setMoveSoundVolume(0.0, 0.08);

        // Main blast
        spawnExplosion(this.scene, hitPosition, 60, 2.4);

        // Add immediate fire and smoke at impact point
        if (!this.fire) {
            this.fire  = createFire(this.scene, hitPosition, camera, 1.6);
            this.smoke = createSmoke(this.scene, hitPosition, camera, 2.2);
        }

        // Small secondary blast for extra punch
        setTimeout(() => {
            if (this.scene && this.state !== TankState.DEAD) {
                const secondaryPos = hitPosition.clone().add(
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 1.5,
                        0.8,
                        (Math.random() - 0.5) * 1.5
                    )
                );
                spawnExplosion(this.scene, secondaryPos, 35, 1.5);
            }
        }, 180);
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
        this.raycaster.set(rayOrigin, rayDirection);

        // Limit the raycaster to only check the distance the missile traveled this exact frame
        this.raycaster.far = maxDistance;

        const hits = this.raycaster.intersectObject(this.group, true);
        return hits.length > 0;
    }

    // When tank is destroyed, pitch the gun down and change color to look charred
    onDeath() {
        this.model.traverse((obj) => {
            if (obj.isMesh && !obj.userData.isOutline && !obj.userData.isProxy) {
                // Tint the existing material to look charred rather than replacing it
                obj.material               = obj.material.clone();
                obj.material.color.set(0x1a1a1a);
                obj.material.roughness         = 0.95;
                obj.material.metalness         = 0.05;
                obj.material.emissive.set(0x110a00);
                obj.material.emissiveIntensity = 0.12;
                // Keep the normal map for surface detail but darken everything else
                // obj.material.metalnessMap  = null;
                // obj.material.roughnessMap  = null;
            }
        });
    }

    // Handles state machine and transform sync
    update(delta, camera) {
        // Sync group transform from class properties
        this.group.updateMatrixWorld(true);

        // Only increment timer when tank is not dead
        if (this.state !== TankState.DEAD) this.stateTimer += delta;

        switch (this.state) {

            // Finally, IT LIVES
            case TankState.ALIVE:
                this.pathRefreshTimer += delta;

                if (this.pathRefreshTimer >= this.pathRefreshInterval) {
                    this.pathRefreshTimer = 0;
                    this.refreshPath();
                }

                this.updateMovement(delta);

                if (this.moveTarget) this.aimAt(this.moveTarget);
                break;

            case TankState.HIT:
                // Short pause before transitioning to death state
                if (this.stateTimer > 0.3) {
                    this.state      = this.rollDeathType();
                    this.stateTimer = 0;
                }
                break;

            // const inside a case needs its own block scope or strict mode complains
            case TankState.COOKOFF: {
                // After being hit, start a timer before explosion
                const firePos = new THREE.Vector3();
                this.turretBone.getWorldPosition(firePos);

                if (!this.fire) {
                    this.fire  = createFire(this.scene, firePos, camera);
                    this.smoke = createSmoke(this.scene, firePos, camera);
                }

                // Update effects each frame
                this.fire?.update(delta, camera);
                this.smoke?.update(delta, camera);

                if (this.stateTimer > 2.0) {
                    this.setMoveSoundVolume(0.0, 0.08);

                    if (this.explosionSound && !this.deathSoundPlayed) {
                        this.explosionSound.play();
                        this.deathSoundPlayed = true;
                    }

                    this.state      = TankState.DEAD;
                    this.stateTimer = 0;
                    this.onDeath();
                }
                break;
            }

            case TankState.DEAD:
                // Update effects each frame
                this.fire?.update(delta, camera);
                this.smoke?.update(delta, camera);

                // Lerp gun down to sag position
                if (this.gunBone) {
                    this.gunBone.rotation.z = THREE.MathUtils.lerp(
                        this.gunBone.rotation.z,
                        -this.PITCH_MIN,
                        0.8 * delta
                    );
                }
                break;
        }
    }

    destroy() {
        // Clean up audio
        this.setMoveSoundVolume(0.0, 0.05);
        if (this.moveSound && this.moveSound.isPlaying) this.moveSound.stop();
        if (this.explosionSound && this.explosionSound.isPlaying) this.explosionSound.stop();

        // Clean up fire and smoke effects
        this.fire?.destroy();
        this.smoke?.destroy();
        this.fire  = null;
        this.smoke = null;

        // Remove group from scene
        this.scene.remove(this.group);

        // Remove proxy meshes
        this.scene.remove(this.hullProxy);
        this.scene.remove(this.turretProxy);
        this.scene.remove(this.gunProxy);
    }
}