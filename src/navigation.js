import * as THREE from 'three';


// We need a class to handle the Navigation Map for our enemies.
export class NavigationMap{
    // Our constructor's input is the map size and cell size (who could have guessed)
    constructor(mapSize, cellSize){
        this.cellSize = cellSize;
        // We get the closest >= int from the actual size
        this.width = Math.ceil(mapSize / cellSize);
        this.height = Math.ceil(mapSize / cellSize);

        // We want the origin to be the corner of the terrain, otherwise we would have to start at the center of the map and expand in multiple direction
        this.originX = -mapSize / 2;
        this.originZ = -mapSize / 2;

        // Let's initialize our navigation map: every cell starts as navigable

        // Using an inner array here:
        // In short, each element of the outer array (grid) of size width is an array of height elements
        // Thanks js for not having proper 2d arrays I guess
        this.grid = Array.from({ length: this.width }, () =>
            Array.from({ length: this.height }, () => ({
                passable: true,
                height:   0,
            }))
        );
    }

    // Covert world position to grid position
    worldToGrid(x, z) {
        // Subtract origin to shift from world space to grid space
        // Divide by cell size to convert units to cell indices
        // Round down to closest index
        const gx = Math.floor((x - this.originX) / this.cellSize);
        const gz = Math.floor((z - this.originZ) / this.cellSize);
        return [gx, gz];
    }

    // Opposite of worldToGrid
    gridToWorld(gx, gz) {
        const x = gx * this.cellSize + this.originX;
        const z = gz * this.cellSize + this.originZ;
        return [x, z];
    }

    // Set a coordinate, plus the surrounding bufferRadius size ones, as blocked
    setBlocked(x, z, bufferRadius = 1) {
        const [gx, gz] = this.worldToGrid(x, z);

        for (let dx = -bufferRadius; dx <= bufferRadius; dx++) {
            for (let dz = -bufferRadius; dz <= bufferRadius; dz++) {
                const nx = gx + dx;
                const nz = gz + dz;

                // Check bounds before writing
                if (nx >= 0 && nx < this.width && nz >= 0 && nz < this.height) {
                    this.grid[nx][nz].passable = false;
                }
            }
        }
    }

    // Query our map to check if a specific scell is navigable
    isPassable(x, z) {
        const [gx, gz] = this.worldToGrid(x, z);
        // Return true if passable, false if not
        // ?. allows this method to return undefined instead of straight up crashing
        // Fancy thing, had to look it up
        return this.grid[gx]?.[gz]?.passable ?? false;
    }


    // Visualize our current navigation map, debug purpose
    visualize(scene) {
        // Create planes with cellSize size
        const geometry = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
        geometry.rotateX(-Math.PI / 2);

        // Red material if not passable, green if passable
        const passableMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3 });
        const blockedMat  = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });

        // Keep note of the generated meshes, so that we may remove them later
        const meshes = [];

        for (let gx = 0; gx < this.width; gx++) {
            for (let gz = 0; gz < this.height; gz++) {
                const cell = this.grid[gx][gz];
                const mesh = new THREE.Mesh(geometry, cell.passable ? passableMat : blockedMat);
                const [wx, wz] = this.gridToWorld(gx, gz);
                // Position the mesh above our terrain for ease of reading
                mesh.position.set(wx, cell.height + 15, wz);
                meshes.push(mesh);
                scene.add(mesh);
            }
        }
        return meshes;
    }
    
// Visualize a path on the scene, so that I can debug it 
    visualizePath(scene, path) {
        // A path should exist before I can visualize it.
        if (path.length === 0) return;

        // Map our path points to 3D vectors, slightly above terrain so they are visible
        const points = path.map(p => new THREE.Vector3(p.x, 20, p.z));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
    }


    // A generic A* pathfinding algorithm
    // Takes world coordinates and returns an array of world positions {x, z} to follow
    // Returns empty array if no path is found
    findPath(startX, startZ, goalX, goalZ) {
        const [startGX, startGZ] = this.worldToGrid(startX, startZ);
        const [goalGX,  goalGZ]  = this.worldToGrid(goalX,  goalZ);

        // We need to track which cells we still need to explore (open) and which we already visited (closed)
        const openSet   = [];
        const closedSet = new Set();
        const cameFrom  = new Map();

        // gCost = actual distance from start
        // fCost = gCost + estimated distance to goal
        const gCost = new Map();
        const fCost = new Map();

        // Helper inline to convert grid coordinates to a unique string key for our maps
        const key   = (gx, gz) => `${gx},${gz}`;
        // We use euclidean distance as our heuristic (straight line to goal basically)
        const hCost = (gx, gz) => Math.sqrt(Math.pow(gx - goalGX, 2) + Math.pow(gz - goalGZ, 2));

        // Initialize with start node
        gCost.set(key(startGX, startGZ), 0);
        fCost.set(key(startGX, startGZ), hCost(startGX, startGZ));
        openSet.push({ gx: startGX, gz: startGZ });

        while (openSet.length > 0) {
            // Always process the node with the lowest fCost first
            openSet.sort((a, b) => fCost.get(key(a.gx, a.gz)) - fCost.get(key(b.gx, b.gz)));
            const current = openSet.shift();
            const currentKey = key(current.gx, current.gz);

            // We reached the goal!
            // Reconstruct the path by following cameFrom back to start
            if (current.gx === goalGX && current.gz === goalGZ) {
                const path = [];
                let node = currentKey;
                while (node) {
                    const [gx, gz] = node.split(',').map(Number);
                    const [wx, wz] = this.gridToWorld(gx, gz);
                    path.unshift({ x: wx, z: wz });
                    node = cameFrom.get(node);
                }
                return path;
            }

            closedSet.add(currentKey);

            // Check all 8 neighbours (4 sides + diagonal)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (dx === 0 && dz === 0) continue;

                    // Neighbour's grid X and Z
                    const nx = current.gx + dx;
                    const nz = current.gz + dz;
                    // Convert coordinates to a astring, so that we can use it as key in the Map and Set
                    const nKey = key(nx, nz);

                    // Skip out of bounds, blocked cells, and already visited ones
                    if (nx < 0 || nx >= this.width)  continue;
                    if (nz < 0 || nz >= this.height) continue;
                    if (!this.grid[nx][nz].passable)  continue;
                    if (closedSet.has(nKey))           continue;

                    // Diagonal movement costs more than straight (Pythagoras theorem!)
                    const moveCost = (dx !== 0 && dz !== 0) ? 1.414 : 1;
                    // Candidate cost for reaching the neighbor
                    const tentativeG = gCost.get(currentKey) + moveCost;

                    // Check if tentative route is cheaper than others we have found previously
                    if (tentativeG < (gCost.get(nKey) ?? Infinity)) {
                        cameFrom.set(nKey, currentKey);
                        gCost.set(nKey, tentativeG);
                        fCost.set(nKey, tentativeG + hCost(nx, nz));

                        // Check if already in openset before adding it
                        if (!openSet.find(n => n.gx === nx && n.gz === nz)) {
                            openSet.push({ gx: nx, gz: nz });
                        }
                    }
                }
            }
        }

        // No path found, likely there isn't a path from start to goal
        return [];
    }
}

