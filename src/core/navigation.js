import * as THREE from 'three';


export class NavigationMap {
    constructor(mapSize, cellSize) {
        this.cellSize = cellSize;
        this.width    = Math.ceil(mapSize / cellSize);
        this.height   = Math.ceil(mapSize / cellSize);

        // We want the origin to be the corner of the terrain
        // Otherwise we would have to start at the center of the map and expand in multiple directions
        this.originX = -mapSize / 2;
        this.originZ = -mapSize / 2;

        // Initialize our navigation map: every cell starts as navigable
        // Using a nested array since JavaScript doesn't have proper 2D arrays
        this.grid = Array.from({ length: this.width }, () =>
            Array.from({ length: this.height }, () => ({
                passable: true,
                height:   0,
            }))
        );
    }

    // Convert a world position to a unique string key for its grid cell
    // Used by protected corridors and scatter placement to identify cells in Sets
    cellKey(worldX, worldZ) {
        const [gridColumn, gridRow] = this.worldToGrid(worldX, worldZ);
        return `${gridColumn},${gridRow}`;
    }

    // Convert world position to grid position
    worldToGrid(worldX, worldZ) {
        const gridColumn = Math.floor((worldX - this.originX) / this.cellSize);
        const gridRow    = Math.floor((worldZ - this.originZ) / this.cellSize);
        return [gridColumn, gridRow];
    }

    // Opposite of worldToGrid
    gridToWorld(gridColumn, gridRow) {
        const worldX = (gridColumn + 0.5) * this.cellSize + this.originX;
        const worldZ = (gridRow    + 0.5) * this.cellSize + this.originZ;
        return [worldX, worldZ];
    }

    // Set a coordinate as blocked, optionally also blocking surrounding cells
    // bufferRadius = 0 blocks only the cell itself
    // bufferRadius = 1 (default) blocks a 3x3 area around it
    setBlocked(worldX, worldZ, bufferRadius = 1) {
        const [centerColumn, centerRow] = this.worldToGrid(worldX, worldZ);

        for (let columnOffset = -bufferRadius; columnOffset <= bufferRadius; columnOffset++) {
            for (let rowOffset = -bufferRadius; rowOffset <= bufferRadius; rowOffset++) {
                const targetColumn = centerColumn + columnOffset;
                const targetRow    = centerRow    + rowOffset;

                // Check bounds before writing
                if (
                    targetColumn >= 0 && targetColumn < this.width &&
                    targetRow    >= 0 && targetRow    < this.height
                ) {
                    this.grid[targetColumn][targetRow].passable = false;
                }
            }
        }
    }

    // Query our map to check if a specific cell is navigable
    isPassable(worldX, worldZ) {
        const [gridColumn, gridRow] = this.worldToGrid(worldX, worldZ);
        // ?. allows this to return undefined instead of crashing if out of bounds
        return this.grid[gridColumn]?.[gridRow]?.passable ?? false;
    }

    // Find the nearest passable cell to a world position
    // Used before pathfinding so we never start from inside a blocked cell
    // (e.g. a tank that clipped into a tree's blocked zone)
    findNearestPassable(worldX, worldZ, searchRadius = 10) {
        const [startColumn, startRow] = this.worldToGrid(worldX, worldZ);

        // Already passable — return the original position as-is
        if (this.grid[startColumn]?.[startRow]?.passable) return { x: worldX, z: worldZ };

        // Spiral outward ring by ring until we find a passable cell
        for (let ringRadius = 1; ringRadius <= searchRadius; ringRadius++) {
            for (let columnOffset = -ringRadius; columnOffset <= ringRadius; columnOffset++) {
                for (let rowOffset = -ringRadius; rowOffset <= ringRadius; rowOffset++) {
                    // Only check cells on the outer edge of this ring
                    const onRingEdge =
                        Math.abs(columnOffset) === ringRadius ||
                        Math.abs(rowOffset)    === ringRadius;
                    if (!onRingEdge) continue;

                    const candidateColumn = startColumn + columnOffset;
                    const candidateRow    = startRow    + rowOffset;

                    if (candidateColumn < 0 || candidateColumn >= this.width)  continue;
                    if (candidateRow    < 0 || candidateRow    >= this.height) continue;

                    if (this.grid[candidateColumn][candidateRow].passable) {
                        const [nearestX, nearestZ] = this.gridToWorld(candidateColumn, candidateRow);
                        return { x: nearestX, z: nearestZ };
                    }
                }
            }
        }

        // Nothing found within the search radius
        return { x: worldX, z: worldZ };
    }

    // Visualize our current navigation map
    visualize(scene) {
        const geometry = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
        geometry.rotateX(-Math.PI / 2);

        const passableMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3 });
        const blockedMaterial  = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });

        const meshes = [];

        for (let gridColumn = 0; gridColumn < this.width; gridColumn++) {
            for (let gridRow = 0; gridRow < this.height; gridRow++) {
                const cell     = this.grid[gridColumn][gridRow];
                const mesh     = new THREE.Mesh(geometry, cell.passable ? passableMaterial : blockedMaterial);
                const [wx, wz] = this.gridToWorld(gridColumn, gridRow);

                // Position slightly above terrain so the overlay is readable
                mesh.position.set(wx, cell.height + 20, wz);
                meshes.push(mesh);
                scene.add(mesh);
            }
        }

        return meshes;
    }

    // Visualize a path on the scene — debug only
    visualizePath(scene, path, terrain = null) {
        if (!path || path.length === 0) return;

        const pathPoints = path.map(point => {
            const height = terrain ? terrain.getHeightAt(point.x, point.z) + 2 : 2;
            return new THREE.Vector3(point.x, height, point.z);
        });

        const lineGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
        scene.add(new THREE.Line(lineGeometry, lineMaterial));
    }

    // A* pathfinding algorithm
    // Takes two world-space Vector3-like objects { x, z } as start and goal
    // Returns an array of world positions { x, z } to follow, or [] if no path exists
    findPath(start, goal) {
        // Validate inputs before doing anything
        if (
            !start || !goal ||
            typeof start.x !== 'number' || typeof start.z !== 'number' ||
            typeof goal.x  !== 'number' || typeof goal.z  !== 'number' ||
            Number.isNaN(start.x) || Number.isNaN(start.z) ||
            Number.isNaN(goal.x)  || Number.isNaN(goal.z)
        ) {
            console.error('NavigationMap.findPath: invalid start or goal', { start, goal });
            return [];
        }

        const [startColumn, startRow] = this.worldToGrid(start.x, start.z);
        const [goalColumn,  goalRow]  = this.worldToGrid(goal.x,  goal.z);

        // Reject out-of-bounds positions immediately
        if (
            startColumn < 0 || startColumn >= this.width  ||
            startRow    < 0 || startRow    >= this.height ||
            goalColumn  < 0 || goalColumn  >= this.width  ||
            goalRow     < 0 || goalRow     >= this.height
        ) {
            return [];
        }

        // Reject if start or goal are blocked
        if (
            !this.grid[startColumn][startRow].passable ||
            !this.grid[goalColumn][goalRow].passable
        ) {
            return [];
        }

        // A* state
        const openSet   = [];
        const closedSet = new Set();
        const cameFrom  = new Map();
        const gCost     = new Map();
        const fCost     = new Map();

        // Convert grid coordinates to a unique string key for use in Maps and Sets
        const makeKey = (column, row) => `${column},${row}`;

        // Euclidean distance to goal — straight-line heuristic
        const estimateCostToGoal = (column, row) => Math.hypot(column - goalColumn, row - goalRow);

        // Initialize with start node
        const startKey = makeKey(startColumn, startRow);
        gCost.set(startKey, 0);
        fCost.set(startKey, estimateCostToGoal(startColumn, startRow));
        openSet.push({ column: startColumn, row: startRow });

        while (openSet.length > 0) {
            // Always process the node with the lowest estimated total cost first
            openSet.sort((nodeA, nodeB) =>
                fCost.get(makeKey(nodeA.column, nodeA.row)) -
                fCost.get(makeKey(nodeB.column, nodeB.row))
            );

            const current    = openSet.shift();
            const currentKey = makeKey(current.column, current.row);

            // Reached the goal — reconstruct path by walking back through cameFrom
            if (current.column === goalColumn && current.row === goalRow) {
                const path = [];
                let nodeKey = currentKey;

                while (nodeKey) {
                    const [column, row]    = nodeKey.split(',').map(Number);
                    const [worldX, worldZ] = this.gridToWorld(column, row);
                    path.unshift({ x: worldX, z: worldZ });
                    nodeKey = cameFrom.get(nodeKey);
                }

                return path;
            }

            closedSet.add(currentKey);

            // Check all 4 neighbors (4 cardinal)
            for (let columnStep = -1; columnStep <= 1; columnStep++) {
                for (let rowStep = -1; rowStep <= 1; rowStep++) {
                    if (columnStep === 0 && rowStep === 0) continue;

                    const neighborColumn = current.column + columnStep;
                    const neighborRow    = current.row    + rowStep;
                    const neighborKey    = makeKey(neighborColumn, neighborRow);

                    if (neighborColumn < 0 || neighborColumn >= this.width)  continue;
                    if (neighborRow    < 0 || neighborRow    >= this.height) continue;
                    if (!this.grid[neighborColumn][neighborRow].passable)    continue;
                    if (closedSet.has(neighborKey))                          continue;

                    const isDiagonal = columnStep !== 0 && rowStep !== 0;

                    // Don't let diagonals squeeze through blocked corners
                    if (isDiagonal) {
                        const sideAColumn = current.column + columnStep;
                        const sideARow    = current.row;
                        const sideBColumn = current.column;
                        const sideBRow    = current.row + rowStep;

                        if (!this.grid[sideAColumn][sideARow].passable) continue;
                        if (!this.grid[sideBColumn][sideBRow].passable) continue;
                    }

                    const moveCost = isDiagonal ? Math.SQRT2 : 1;
                    const tentativeCost = gCost.get(currentKey) + moveCost;

                    if (tentativeCost < (gCost.get(neighborKey) ?? Infinity)) {
                        cameFrom.set(neighborKey, currentKey);
                        gCost.set(neighborKey, tentativeCost);
                        fCost.set(
                            neighborKey,
                            tentativeCost + estimateCostToGoal(neighborColumn, neighborRow)
                        );

                        const alreadyQueued = openSet.some(
                            node => node.column === neighborColumn && node.row === neighborRow
                        );

                        if (!alreadyQueued) {
                            openSet.push({ column: neighborColumn, row: neighborRow });
                        }
                    }
                }
            }
        }

        // Exhausted all options
        return [];
    }
}