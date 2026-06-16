import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { NavigationMap } from './navigation.js';
import { materialTerrain } from '../rendering/materials';

// Terrain is now a class for better handling of data
export class Terrain {
    constructor(
        size,
        segments,
        frequency,
        amplitude,
        launcherPosition = new THREE.Vector3(size * 0.35, 0, size * 0.35),
        enemySpawnPositions = [
            new THREE.Vector3(-150, 0, -150),
            new THREE.Vector3(-150, 0, 150),
            new THREE.Vector3(150, 0, -150)
        ]
    ) {
        // Store some parameters for later
        this.size = size;
        this.segments = segments;
        this.cellSize = size / segments;

        // Keep originals if useful for debugging
        this.launcherPosition = launcherPosition.clone();
        this.enemySpawnPositions = enemySpawnPositions.map((spawn) => spawn.clone());

        // Our adjusted ground-aligned positions
        this.launcherSpawn = null;
        this.enemySpawns = [];

        // Our mesh
        this.terrain = null;

        // Noise maps used for our terrain generation
        this.baseNoise = createNoise2D();
        this.detailNoise = createNoise2D();
        this.shapeNoise = createNoise2D();

        // Cells tanks cannot walk over
        this.protectedCells = null;

        // Some gameplay values for our launcher placement
        this.MIN_LAUNCHER_ENEMY_DISTANCE = 150;
        this.LAUNCHER_SEARCH_RADIUS = 70;
        this.LAUNCHER_CANDIDATE_COUNT = 120;
        this.LAUNCHER_EDGE_MARGIN = 20;

        // Create the plane itself, rotate it so it's flat on the ground
        this.geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        this.geometry.rotateX(-Math.PI / 2);

        this.navMap = new NavigationMap(this.size, this.cellSize);

        // Create a new mesh from our geometry
        this.terrain = new THREE.Mesh(this.geometry, materialTerrain);
        this.terrain.receiveShadow = true;
        this.terrain.castShadow = false;

        // Amount of vertices on ground and their heights
        this.vertCount = this.geometry.attributes.position.count;
        this.heights = new Float32Array(this.vertCount);

        // Start computing terrain heights
        for (let i = 0; i < this.vertCount; i++) {
            const x = this.geometry.attributes.position.getX(i);
            const z = this.geometry.attributes.position.getZ(i);

            // Main terrain shape
            let y = this.baseNoise(x * frequency, z * frequency) * amplitude;
            y += this.detailNoise(x * frequency * 2.5, z * frequency * 2.5) * amplitude * 0.35;

            // Quantize terrain heights
            const levels = 8;
            y = Math.round(y * levels) / levels;

            // Assign terrain height to both mesh and heights storage
            this.geometry.attributes.position.setY(i, y);
            this.heights[i] = y;
        }

        // Vertex color variation, to make our world look more alive
        const colorBuffer = new Float32Array(this.vertCount * 3);
        const colorNoise = createNoise2D();

        for (let i = 0; i < this.vertCount; i++) {
            const x = this.geometry.attributes.position.getX(i);
            const y = this.geometry.attributes.position.getY(i);
            const z = this.geometry.attributes.position.getZ(i);

            const n = (colorNoise(x * 0.02, z * 0.02) + 1) * 0.5;

            // Normalize height into 0..1 range
            const h = THREE.MathUtils.clamp((y + amplitude) / (2 * amplitude), 0, 1);

            let r, g, b;

            if (h < 0.35) {
                // low ground: dirt
                r = 0.45 + n * 0.08;
                g = 0.36 + n * 0.06;
                b = 0.24 + n * 0.05;
            } else if (h < 0.7) {
                // mid ground: grass
                r = 0.32 + n * 0.06;
                g = 0.50 + n * 0.10;
                b = 0.22 + n * 0.05;
            } else {
                // high ground: dry rock
                r = 0.5 + n * 0.06;
                g = 0.48 + n * 0.06;
                b = 0.42 + n * 0.05;
            }

            colorBuffer[i * 3] = r;
            colorBuffer[i * 3 + 1] = g;
            colorBuffer[i * 3 + 2] = b;
        }

        this.geometry.setAttribute('color', new THREE.BufferAttribute(colorBuffer, 3));

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.computeVertexNormals();

        this.blockSteepCells();

        // Adjust enemy spawn positions to terrain height first
        this.enemySpawns = this.enemySpawnPositions.map((spawn) => new THREE.Vector3(
            spawn.x,
            this.getHeightAt(spawn.x, spawn.z),
            spawn.z
        ));

        this.enemySpawnPositions = this.enemySpawns.map((spawn) => spawn.clone());

        // Find a better launcher spawn than the raw input
        this.launcherSpawn = this.findSuitableLauncherSpawn(this.launcherPosition);

        // After findSuitableLauncherSpawn, punch the hill up a bit more so it reads clearly
        const hillBoostRadius = 40;
        const hillBoostAmount = 3;

        for (let i = 0; i < this.vertCount; i++) {
            const x = this.geometry.attributes.position.getX(i);
            const z = this.geometry.attributes.position.getZ(i);

            const distToSpawn     = Math.hypot(x - this.launcherSpawn.x, z - this.launcherSpawn.z);
            const normalizedDist  = 1.0 - THREE.MathUtils.clamp(distToSpawn / hillBoostRadius, 0, 1);
            const boost           = normalizedDist * normalizedDist * hillBoostAmount;

            const newY = this.heights[i] + boost;
            this.heights[i] = newY;
            this.geometry.attributes.position.setY(i, newY);
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.computeVertexNormals();

        // Update launcher spawn Y to the boosted height
        this.launcherSpawn.y = this.getHeightAt(this.launcherSpawn.x, this.launcherSpawn.z);

        // Compute our protected cells after terrain generation
        this.protectedCells = this.computeProtectedCells();
    }

    // Block off terrain cells that are steeper than a certain amount for navigation
    blockSteepCells(maxClimb = 4) {
        const verticesPerRow = this.segments + 1;
        const half = this.size / 2;

        for (let row = 0; row < this.segments; row++) {
            for (let col = 0; col < this.segments; col++) {
                const i = row * verticesPerRow + col;
                const y = this.heights[i];

                const dRight = Math.abs(this.heights[i + 1] - y);
                const dDown = Math.abs(this.heights[i + verticesPerRow] - y);

                if (dRight > maxClimb || dDown > maxClimb) {
                    const x = -half + col * this.cellSize;
                    const z = -half + row * this.cellSize;
                    this.navMap.setBlocked(x, z);
                }
            }
        }
    }

    // We want to make sure we leave corridors from spawners to launcher open and without trees and clutter
    computeProtectedCells(corridorRadius = 8) {
        const protectedCells = new Set();

        for (const spawn of this.enemySpawnPositions) {
            const path = this.navMap.findPath(spawn, this.launcherSpawn);

            if (path.length === 0) {
                return null;
            }

            for (const point of path) {
                for (let dx = -corridorRadius; dx <= corridorRadius; dx += this.cellSize) {
                    for (let dz = -corridorRadius; dz <= corridorRadius; dz += this.cellSize) {
                        const x = point.x + dx;
                        const z = point.z + dz;
                        const key = this.navMap.cellKey(x, z);
                        protectedCells.add(key);
                    }
                }
            }
        }

        return protectedCells;
    }

    // Return our terrain's height at given x,z position
    getHeightAt(x, z) {
        const halfSize = this.size / 2;
        const verticesPerRow = this.segments + 1;

        const gridX = THREE.MathUtils.clamp(
            (x + halfSize) / this.cellSize,
            0,
            this.segments - 0.001
        );
        const gridZ = THREE.MathUtils.clamp(
            (z + halfSize) / this.cellSize,
            0,
            this.segments - 0.001
        );

        const baseX = Math.floor(gridX);
        const baseZ = Math.floor(gridZ);

        const localX = gridX - baseX;
        const localZ = gridZ - baseZ;

        const topLeft = this.heights[baseZ * verticesPerRow + baseX];
        const topRight = this.heights[baseZ * verticesPerRow + baseX + 1];
        const bottomLeft = this.heights[(baseZ + 1) * verticesPerRow + baseX];
        const bottomRight = this.heights[(baseZ + 1) * verticesPerRow + baseX + 1];

        const topEdgeHeight = THREE.MathUtils.lerp(topLeft, topRight, localX);
        const bottomEdgeHeight = THREE.MathUtils.lerp(bottomLeft, bottomRight, localX);

        return THREE.MathUtils.lerp(topEdgeHeight, bottomEdgeHeight, localZ);
    }

    // Check if a position is in bounds
    isInsideBounds(x, z, margin = 0) {
        const half = this.size / 2;
        return (
            x >= -half + margin &&
            x <= half - margin &&
            z >= -half + margin &&
            z <= half - margin
        );
    }

    // Self explainatory
    isFarEnoughFromEnemySpawns(point) {
        for (const spawn of this.enemySpawnPositions) {
            if (point.distanceTo(spawn) < this.MIN_LAUNCHER_ENEMY_DISTANCE) {
                return false;
            }
        }

        return true;
    }

    scoreSightlines(candidateX, candidateZ, candidateY) {
        if (!this.protectedCells || !this.enemySpawnPositions) return 0;

        let visiblePoints = 0;
        let totalPoints   = 0;

        for (const spawn of this.enemySpawnPositions) {
            const path = this.navMap.findPath(
                { x: candidateX, z: candidateZ },
                spawn
            );
            if (path.length === 0) continue;

            // Sample every few points along the path
            for (let i = 0; i < path.length; i += 3) {
                const point = path[i];
                totalPoints++;

                // Walk from candidate to path point, check nothing blocks LOS
                const steps   = 12;
                let blocked   = false;
                for (let s = 1; s < steps; s++) {
                    const t  = s / steps;
                    const sx = candidateX + (point.x - candidateX) * t;
                    const sz = candidateZ + (point.z - candidateZ) * t;

                    // Height of the line of sight at this point
                    // Launcher eye is 2 units above ground, tank is 1 unit above ground
                    const losHeight  = (candidateY + 2) + ((this.getHeightAt(point.x, point.z) + 1) - (candidateY + 2)) * t;
                    const groundHere = this.getHeightAt(sx, sz);

                    if (groundHere > losHeight) { blocked = true; break; }
                }

                if (!blocked) visiblePoints++;
            }
        }

        return totalPoints > 0 ? visiblePoints / totalPoints : 0;
    }

    // Score how good a launcher position is
    evaluateLauncherCandidate(x, z) {
        // Don't place it too close to the edges
        if (!this.isInsideBounds(x, z, this.LAUNCHER_EDGE_MARGIN)) {
            return -Infinity;
        }

        // Must be on passable terrain
        if (!this.navMap.isPassable(x, z)) {
            return -Infinity;
        }

        // Get the height at the candidate position
        const centerY = this.getHeightAt(x, z);
        const center = new THREE.Vector3(x, centerY, z);

        // Keep it far enough from enemy spawns
        if (!this.isFarEnoughFromEnemySpawns(center)) {
            return -Infinity;
        }

        // Sample the ground around the point
        const offsets = [
            [8, 0], [-8, 0],
            [0, 8], [0, -8],
            [6, 6], [-6, 6],
            [6, -6], [-6, -6],
        ];

        let minY = centerY;
        let maxY = centerY;
        let sumY = 0;
        let validSamples = 0;

        for (const [dx, dz] of offsets) {
            const sx = x + dx;
            const sz = z + dz;

            // Skip samples outside the map
            if (!this.isInsideBounds(sx, sz, this.LAUNCHER_EDGE_MARGIN)) continue;

            const y = this.getHeightAt(sx, sz);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            sumY += y;
            validSamples++;
        }

        // No valid samples means no score
        if (validSamples === 0) {
            return -Infinity;
        }

        // Measure how flat the area is
        const avgY = sumY / validSamples;
        const localRelief = maxY - minY;

        // Penalize bowl-like spots
        const valleyPenalty = Math.max(0, avgY - centerY);

        // Prefer staying near the intended launcher area
        const distanceFromHint = new THREE.Vector2(x, z).distanceTo(
            new THREE.Vector2(this.launcherPosition.x, this.launcherPosition.z)
        );

        // High ground is good, rough ground is bad
        let score = 0;
        score += centerY * 2.0;
        score -= localRelief * 3.0;
        score -= valleyPenalty * 8.0;
        score -= distanceFromHint * 0.05;

        // Sightline coverage
        const sightlineCoverage = this.scoreSightlines(x, z, centerY);
        score += sightlineCoverage * 15.0;

        return score;
    }

    // Search around the original launcher position and choose a better gameplay position
    // We want to make sure our launcher can actually see the enemies during gameplay
    findSuitableLauncherSpawn(preferredPosition) {
        let bestPoint = null;
        let bestScore = -Infinity;

        const preferredY = this.getHeightAt(preferredPosition.x, preferredPosition.z);
        const preferredCandidate = new THREE.Vector3(
            preferredPosition.x,
            preferredY,
            preferredPosition.z
        );

        const preferredScore = this.evaluateLauncherCandidate(
            preferredCandidate.x,
            preferredCandidate.z
        );

        if (preferredScore > bestScore) {
            bestScore = preferredScore;
            bestPoint = preferredCandidate;
        }

        for (let i = 0; i < this.LAUNCHER_CANDIDATE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * this.LAUNCHER_SEARCH_RADIUS;

            const x = preferredPosition.x + Math.cos(angle) * radius;
            const z = preferredPosition.z + Math.sin(angle) * radius;
            const score = this.evaluateLauncherCandidate(x, z);

            if (score > bestScore) {
                bestScore = score;
                bestPoint = new THREE.Vector3(x, this.getHeightAt(x, z), z);
            }
        }

        if (!bestPoint) {
            return preferredCandidate;
        }

        return bestPoint;
    }

    addToScene(scene) {
        scene.add(this.terrain);
    }

    getSpawnData() {
        return {
            launcherSpawn: this.launcherSpawn.clone(),
            enemySpawns: this.enemySpawnPositions.map((spawn) => spawn.clone())
        };
    }
}