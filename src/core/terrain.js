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

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.computeVertexNormals();

        // Adjust launcher to terrain height
        this.launcherSpawn = new THREE.Vector3(
            this.launcherPosition.x,
            this.getHeightAt(this.launcherPosition.x, this.launcherPosition.z),
            this.launcherPosition.z
        );

        // Adjust enemy spawn positions to terrain height
        this.enemySpawns = this.enemySpawnPositions.map((spawn) => new THREE.Vector3(
            spawn.x,
            this.getHeightAt(spawn.x, spawn.z),
            spawn.z
        ));

        // If you want enemySpawnPositions itself to now mean "adjusted positions",
        // overwrite it with the corrected values
        this.enemySpawnPositions = this.enemySpawns.map((spawn) => spawn.clone());

        // Compute our protected cells after terrain generation
        this.blockSteepCells();
        this.protectedCells = this.computeProtectedCells();
    }

    // Block off terrain cells that are steeper than a certain amount for navigation
    // This should avoid mountain goat tanks
    blockSteepCells(maxClimb = 4) {
        const verticesPerRow = this.segments + 1;
        const half = this.size / 2;

        // Iterate over every cell
        for (let row = 0; row < this.segments; row++) {
            for (let col = 0; col < this.segments; col++) {
                // Index of top-left vertex of cell in the heights array
                const i = row * verticesPerRow + col;

                // Height at that vertex
                const y = this.heights[i];

                // Height difference between this vertex and its right/down neighbors
                const dRight = Math.abs(this.heights[i + 1] - y);
                const dDown = Math.abs(this.heights[i + verticesPerRow] - y);

                // Height difference between this vertex and the vertex directly below it in the next row
                if (dRight > maxClimb || dDown > maxClimb) {
                    const x = -half + col * this.cellSize;
                    const z = -half + row * this.cellSize;
                    this.navMap.setBlocked(x, z);
                }
            }
        }
    }

    computeProtectedCells(corridorRadius = 8) {
        // A Set is reasonable since we will put at most a cell one time in it
        const protectedCells = new Set();

        // For each enemy spawn, find a path to the launcher
        for (const spawn of this.enemySpawnPositions) {
            const path = this.navMap.findPath(spawn, this.launcherSpawn);

            if (path.length === 0) {
                return null;
            }

            // Protect a corridor around the entire path,
            // so that we won't have trees or other props blocking the way
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

        // First thing, let's map world coordinates to grid coordinates
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

        // Let's find the bottom left corner of the grid cell that contains x,z
        const baseX = Math.floor(gridX);
        const baseZ = Math.floor(gridZ);

        // Find local position inside said cell
        const localX = gridX - baseX;
        const localZ = gridZ - baseZ;

        // Read the cell's four corners' heights
        const topLeft = this.heights[baseZ * verticesPerRow + baseX];
        const topRight = this.heights[baseZ * verticesPerRow + baseX + 1];
        const bottomLeft = this.heights[(baseZ + 1) * verticesPerRow + baseX];
        const bottomRight = this.heights[(baseZ + 1) * verticesPerRow + baseX + 1];

        // Interpolate along x for each edge
        const topEdgeHeight = THREE.MathUtils.lerp(topLeft, topRight, localX);
        const bottomEdgeHeight = THREE.MathUtils.lerp(bottomLeft, bottomRight, localX);

        // Interpolate along z between the two edges
        return THREE.MathUtils.lerp(topEdgeHeight, bottomEdgeHeight, localZ);
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