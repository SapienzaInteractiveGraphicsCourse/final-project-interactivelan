# Static Defense

A browser-based 3D game built with Three.js for the Interactive Graphics course.  
The player operates an ATGM launcher and must destroy waves of enemy tanks before they overrun their position.

---

## How to Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in a browser. A production build can be deployed with `npm run deploy`.

---

## Controls

| Input | Action |
|---|---|
| Right click | Toggle missile scope (aim mode) |
| Left click | Fire missile (scope must be active) |
| Mouse move | Aim launcher (while pointer-locked) |
| Arrow keys | Rotate launcher / adjust pitch |
| R | Reload (after missile impact) |
| Click canvas | Lock pointer for free-look |

---

## Project Structure

```
src/
  core/           — terrain, navigation, game logic, audio, input
  entities/       — Launcher, Tank, Missile, Prop
  rendering/      — materials, effects, shaders
  scenes/         — main scene, intro cutscene
  ui/             — HUD, crosshair, end-screen, transitions
  utilities/      — model loader
public/
  models/         — GLB assets
  textures/       — PBR texture sets
  sounds/         — positional audio clips
```

---

## Systems

### Terrain Generation

The terrain is a subdivided `PlaneGeometry` deformed procedurally using two layers of simplex noise — a low-frequency base shape and a higher-frequency detail pass. Heights are quantized to produce a stepped, stylised look. A third noise layer drives per-vertex colour variation blended across three zones (dirt, grass, rock) based on height.

After generation, the terrain is re-evaluated to find the best launcher spawn position: a scored candidate search weighing height, local flatness, distance from enemy spawns, and line-of-sight coverage over the enemy approach paths. If the selected position falls below a minimum height threshold the terrain is regenerated (up to ten attempts).

### Navigation & Pathfinding

A uniform grid `NavigationMap` covers the terrain. Cells are marked blocked by steep slopes, placed trees, and destroyed tanks. A\* pathfinding finds routes between any two world positions, with diagonal movement allowed only when neither flanking cell is blocked (preventing squeezing through corners). Each tank recomputes its path periodically and also triggers a repath when stuck detection fires.

### Enemy Tanks

Tanks follow a state machine: `ALIVE → HIT → COOKOFF → DEAD`.

- **ALIVE** — navigate toward the launcher with periodic repath, turret tracks the target via bone IK.
- **HIT** — missile impact triggers a primary explosion and a secondary delayed blast; the tank continues moving at reduced speed with hull fire for a brief period.
- **COOKOFF** — sustained turret fire and smoke before the final explosion.
- **DEAD** — charred material, gun droops, fire and smoke persist.

Hit detection uses invisible proxy `BoxGeometry` meshes parented to the hull, turret, and gun bones via `SkeletonUtils` so raycasts work correctly with skeletal animation.

### Missile Guidance

The missile is guided toward the sight camera's aim point (a ray projected 550 units forward from the scope). Each frame the missile direction lerps toward the target with a fixed guidance factor, giving a realistic curved intercept path. Raycasting against world obstacles (terrain mesh and tree proxies) handles impact detection before position is updated.

### Instanced Rendering

Trees and grass are rendered as `InstancedMesh` objects — one draw call per unique mesh inside each GLB. Placement is driven by noise-based clustering (trees) or uniform random sampling (grass) with per-instance jitter, scale variation, and random Y rotation. A protected corridor along each enemy approach path is left clear of clutter to preserve gameplay.

### Particle Effects

`spawnExplosion` creates short-lived spherical particles with random outward velocity and upward bias, shrinking to zero over their lifetime. Fire and smoke are billboard sprite systems (`PlaneGeometry` always facing the camera) that loop sprites from bottom to top of the effect height.

### Audio

Positional audio uses Three.js `PositionalAudio` nodes attached to scene objects. Each sound has tuned `refDistance`, `rolloffFactor`, and `maxDistance` values. The listener tracks the active camera each frame so audio perspective matches whether the player is in free-look or scope mode.

### Wave System

`GameManager` drives three waves defined as lists of spawn indices into `terrain.enemySpawnPositions`. Each wave only starts after all tanks from the previous wave are destroyed. A win is triggered when all waves are spawned and all tanks dead; a loss when any tank reaches within 20 units of the launcher.

---

## Rendering

- **Renderer** — `WebGLRenderer` with `PCFShadowMap`, `ACESFilmicToneMapping`, `SRGBColorSpace`  
- **Lighting** — warm directional sun (`0xffd6a3`), blue hemisphere light, weak ambient fill  
- **Materials** — PBR (`MeshStandardMaterial`) with base colour, normal, roughness, AO, and metalness maps loaded from Substance Painter exports. The terrain additionally uses vertex colours blended over the texture.  
- **Fog** — linear fog (`0x7a8694`, near 140, far 420) to bound the visible world and soften tree edges  
- **Sky** — equirectangular JPEG mapped as a scene background

---

## Third-Party Assets

| Asset | Source |
|---|---|
| Tree models | [Sketchfab — free-simple-lowpoly-trees](https://sketchfab.com/3d-models/free-simple-lowpoly-trees-3d-models-852b73cc6827491681ac56431e790746) |
| Tank model (base) | [Sketchfab — low-poly-tank](https://sketchfab.com/3d-models/low-poly-tank-308346f4741a48018c93ebe6f8e53905) |
| Grass models | [Sketchfab — low-poly-grass-pack](https://sketchfab.com/3d-models/low-poly-grass-pack-5194ac6d21c242e188c2fbbe0ac122e6) |
| TV model | [Sketchfab — portable-tv-set](https://sketchfab.com/3d-models/portable-tv-set-a8e4e31aa9a0439892b0b32a38a0fa3b) |
| Terrain / grass PBR textures | [FreePBR — stylized-grass](https://freepbr.com/product/stylized-grass1/) |
| Sky texture | [Poly Haven](https://polyhaven.com/) |

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| [three](https://threejs.org/) | ^0.184.0 | 3D rendering |
| [simplex-noise](https://github.com/jwagner/simplex-noise.js) | ^4.0.3 | Procedural terrain and scatter noise |
| [vite](https://vitejs.dev/) | ^8.0.14 | Dev server and bundler |
