import * as THREE from 'three';

import { loadModel, loadTreeModels, loadGrassModels, loadRockModels } from '../utilities/loader.js';

import { Launcher } from '../entities/launcher.js';
import { Tank, TankState } from '../entities/tank.js';

import { Terrain } from '../core/terrain.js';
import { placeTrees, placeRocks } from '../entities/clutter.js';
import { createGrass } from '../entities/grass.js';

import { updateExplosions } from '../rendering/effects.js';

import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { GameAudio, preloadAudio } from '../core/audio.js';

import { runIntro }    from '../scenes/intro.js';
import { setupMenuBg } from '../scenes/menu_bg.js';

import { GameManager } from '../core/game.js';
import { HUD } from '../ui/hud.js';


const scene = new THREE.Scene();

const skyTexture      = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/sky.jpeg`);
skyTexture.mapping    = THREE.EquirectangularReflectionMapping;
skyTexture.colorSpace = THREE.SRGBColorSpace;
scene.background         = skyTexture;
scene.backgroundRotation = new THREE.Euler(-0.15, 0, 0);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
if ('outputColorSpace' in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
} else {
    renderer.outputEncoding = THREE.sRGBEncoding;
}
document.body.appendChild(renderer.domElement);

window.scene = scene;
window.camera = camera;

let lastTime = performance.now();

scene.fog = new THREE.Fog(0x7a8694, 140, 420);

const sun = new THREE.DirectionalLight(0xffd6a3, 2.4);
sun.position.set(55, 38, -25);
sun.castShadow = true;
sun.shadow.bias = -0.0005;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 260;
sun.shadow.camera.left = -140;
sun.shadow.camera.right = 140;
sun.shadow.camera.top = 140;
sun.shadow.camera.bottom = -140;

const hemisphere = new THREE.HemisphereLight(0x9bbcff, 0x2a221c, 0.38);
const ambient = new THREE.AmbientLight(0xffffff, 0.05);

scene.add(sun);
scene.add(hemisphere);
scene.add(ambient);

const gameAudio = new GameAudio(camera);

// Load audio and all models before the menu so the user doesn't wait after clicking Start
const [launcherModel, tankModel, treeModels, grassModels, rockModels] = await Promise.all([
    preloadAudio(gameAudio).then(() => loadModel(`${import.meta.env.BASE_URL}models/launcher.glb`)),
    loadModel(`${import.meta.env.BASE_URL}models/tank.glb`),
    loadTreeModels(),
    loadGrassModels(),
    loadRockModels(),
]);

// Show the pre-game menu and resolve with chosen params
function showMenu() {
    return new Promise(resolve => {

        // CSS
        const style = document.createElement('style');
        style.textContent = `
            #menu-overlay {
                position: fixed; inset: 0; z-index: 9999;
                color: #c8c4bb;
                font-family: "Courier New", monospace;
                display: grid;
                grid-template-rows: auto 1fr auto;
                overflow: hidden;
            }
            #menu-overlay::before {
                content: '';
                position: fixed; inset: 0;
                background: repeating-linear-gradient(
                    to bottom,
                    transparent 0px, transparent 3px,
                    rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px
                );
                pointer-events: none; z-index: 1;
            }
            #menu-header, #menu-footer {
                display: flex; justify-content: space-between; align-items: center;
                padding: 13px 48px;
                font-size: 11px; color: #4a4844; letter-spacing: 0.1em;
                background: rgba(10,10,10,0.9);
                backdrop-filter: blur(0px);
            }
            #menu-header { border-bottom: 1px solid #1d1d1b; }
            #menu-footer  { border-top:    1px solid #1d1d1b; }
            #menu-layout  { display: grid; grid-template-columns: 1fr 1fr; }
            #menu-left {
                display: flex; flex-direction: column; justify-content: flex-end;
                padding: 48px; border-right: 1px solid #1d1d1b;
                position: relative; overflow: hidden;
            }
            #menu-bg {
                position: absolute; inset: 0;
                width: 100%; height: 100%; display: block; z-index: -1;
            }
            #menu-left h1 {
                font-size: clamp(52px, 8vw, 100px);
                line-height: 0.9; letter-spacing: 0.04em; margin-bottom: 28px;
            }
            .menu-cursor {
                display: inline-block; width: 0.5em; height: 0.8em;
                background: #c8c4bb; vertical-align: middle; margin-left: 6px;
                animation: menu-blink 1.1s step-end infinite;
            }
            @keyframes menu-blink {
                0%, 49%  { opacity: 1; }
                50%, 100% { opacity: 0; }
            }
            #menu-left .meta {
                font-size: 11px; color: #4a4844;
                letter-spacing: 0.1em; text-transform: uppercase; line-height: 2.2;
            }
            #menu-right {
                display: flex; flex-direction: column; justify-content: center;
                padding: 48px; gap: 6px;
                background: #0a0a0a;
                background-image: radial-gradient(rgba(255,255,255,0.028) 1px, transparent 1px);
                background-size: 28px 28px;
            }
            .menu-section-label {
                font-size: 10px; letter-spacing: 0.15em;
                text-transform: uppercase; color: #4a4844;
                margin-bottom: 8px; margin-top: 16px;
            }
            .menu-section-label:first-child { margin-top: 0; }
            .menu-row {
                display: flex; justify-content: space-between; align-items: center;
                border: 1px solid #1d1d1b; padding: 12px 16px;
                font-size: 13px; letter-spacing: 0.07em; text-transform: uppercase;
                gap: 12px;
            }
            .menu-row input[type=range] {
                -webkit-appearance: none; appearance: none;
                flex: 1; max-width: 140px; height: 2px;
                background: #2a2a28; cursor: pointer; outline: none; border: none; padding: 0;
            }
            .menu-row input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 10px; height: 10px; background: #c8c4bb;
                border-radius: 0; cursor: pointer; transition: background 90ms;
            }
            .menu-row input[type=range]::-moz-range-thumb {
                width: 10px; height: 10px; background: #c8c4bb;
                border-radius: 0; border: none; cursor: pointer; transition: background 90ms;
            }
            .menu-row input[type=range]::-moz-range-track {
                height: 2px; background: #2a2a28; border: none;
            }
            .menu-row:hover input[type=range]::-webkit-slider-thumb { background: #7a9450; }
            .menu-row:hover input[type=range]::-moz-range-thumb     { background: #7a9450; }
            .menu-row .val { color: #4a4844; min-width: 40px; text-align: right; font-size: 11px; }
            .menu-toggle {
                display: flex; justify-content: space-between; align-items: center;
                border: 1px solid #1d1d1b; padding: 12px 16px; cursor: pointer;
                font-size: 13px; letter-spacing: 0.07em; text-transform: uppercase;
                user-select: none; transition: border-color 90ms, color 90ms;
            }
            .menu-toggle:hover { border-color: #7a9450; color: #7a9450; }
            .menu-toggle .indicator { color: #4a4844; font-size: 11px; transition: color 90ms; }
            .menu-toggle.on .indicator { color: #7a9450; }
            .menu-toggle:hover .indicator { color: #7a9450; opacity: 0.7; }
            #menu-start {
                margin-top: 8px; padding: 14px 16px;
                border: 1px solid #4a4844; background: none;
                color: #c8c4bb; font-family: "Courier New", monospace;
                font-size: 13px; letter-spacing: 0.07em; text-transform: uppercase;
                cursor: pointer; width: 100%;
                display: flex; justify-content: space-between; align-items: center;
                transition: border-color 90ms, color 90ms;
            }
            #menu-start:hover { border-color: #7a9450; color: #7a9450; }
            #menu-back {
                background: none; border: none; color: #4a4844;
                font-family: "Courier New", monospace; font-size: 11px;
                letter-spacing: 0.1em; cursor: pointer; padding: 0;
                transition: color 90ms;
            }
            #menu-back:hover { color: #c8c4bb; }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = 'menu-overlay';

        // Header
        const header = document.createElement('div');
        header.id = 'menu-header';
        header.innerHTML = '<span>static defense</span><span>mission setup</span>';

        // Layout
        const layout = document.createElement('div');
        layout.id = 'menu-layout';

        // Left panel — bg canvas sits behind the text content
        const left = document.createElement('div');
        left.id = 'menu-left';
        const bgCanvas = document.createElement('canvas');
        bgCanvas.id = 'menu-bg';
        left.append(bgCanvas);
        left.insertAdjacentHTML('beforeend', `
            <h1>STATIC<br>DEFENSE<span class="menu-cursor"></span></h1>
            <div class="meta">
                <div>mode &mdash; campaign</div>
                <div>waves &mdash; 3</div>
            </div>
        `);

        // Right panel
        const right = document.createElement('div');
        right.id = 'menu-right';

        const params = {
            terrainSize:      320,
            terrainFrequency: 0.005,
            terrainAmplitude: 8,
            playIntro:        true,
        };

        function makeSlider(label, min, max, step, initVal, fmt, onChange) {
            const row = document.createElement('div');
            row.className = 'menu-row';

            const lbl = document.createElement('span');
            lbl.textContent = label;

            const input = document.createElement('input');
            input.type = 'range';
            input.min = min; input.max = max; input.step = step; input.value = initVal;

            const val = document.createElement('span');
            val.className = 'val';
            val.textContent = fmt(initVal);

            input.addEventListener('input', () => {
                const v = parseFloat(input.value);
                val.textContent = fmt(v);
                onChange(v);
            });

            row.append(lbl, input, val);
            return row;
        }

        const terrainLabel = document.createElement('div');
        terrainLabel.className = 'menu-section-label';
        terrainLabel.textContent = 'map parameters';
        right.appendChild(terrainLabel);

        right.appendChild(makeSlider('Size',      200, 600, 50, 320, v => v,                   v => { params.terrainSize      = v; }));
        right.appendChild(makeSlider('Frequency', 1,   20,  1,  5,   v => (v/1000).toFixed(3), v => { params.terrainFrequency = v / 1000; }));
        right.appendChild(makeSlider('Amplitude', 2,   30,  1,  8,   v => v,                   v => { params.terrainAmplitude = v; }));

        const optLabel = document.createElement('div');
        optLabel.className = 'menu-section-label';
        optLabel.textContent = 'options';
        right.appendChild(optLabel);

        const toggle = document.createElement('div');
        toggle.className = 'menu-toggle on';
        toggle.innerHTML = '<span>Play intro</span><span class="indicator">ON</span>';
        toggle.addEventListener('click', () => {
            params.playIntro = !params.playIntro;
            toggle.classList.toggle('on', params.playIntro);
            toggle.querySelector('.indicator').textContent = params.playIntro ? 'ON' : 'OFF';
        });
        right.appendChild(toggle);

        const startBtn = document.createElement('button');
        startBtn.id = 'menu-start';
        startBtn.innerHTML = '<span>Start Mission</span><span>→</span>';
        right.appendChild(startBtn);

        layout.append(left, right);

        // Footer
        const footer = document.createElement('div');
        footer.id = 'menu-footer';
        const back = document.createElement('button');
        back.id = 'menu-back';
        back.textContent = '← back';
        footer.append(back, document.createTextNode('interactive graphics — 2026'));
        overlay.append(header, layout, footer);
        document.body.appendChild(overlay);

        // Canvas is now in the DOM — getBoundingClientRect() returns correct dimensions
        const stopBg = setupMenuBg(bgCanvas, launcherModel);

        startBtn.addEventListener('click', () => {
            stopBg();
            style.remove();
            overlay.remove();
            resolve(params);
        });

        back.addEventListener('click', () => {
            stopBg();
            window.location.href = window.location.pathname;
        });
    });
}

const { terrainSize, terrainFrequency, terrainAmplitude, playIntro } = await showMenu();

// Scale fog with terrain size
scene.fog.near = terrainSize * 0.4375;
scene.fog.far  = terrainSize * 1.3125;

// Scale spawn positions proportionally to terrain size
const h = terrainSize / 2;
const terrain = new Terrain(
    terrainSize,
    Math.round(terrainSize / 3.2),
    terrainFrequency,
    terrainAmplitude,
    new THREE.Vector3(h * 0.625, 0, h * 0.625),
    [
        new THREE.Vector3(-h * 0.875,  0, -h * 0.5625),
        new THREE.Vector3(-h * 0.844,  0, -h * 0.4375),
        new THREE.Vector3(-h * 0.8125, 0, -h * 0.875),
        new THREE.Vector3( 0,          0, -h * 0.875),
        new THREE.Vector3( h * 0.0625, 0, -h * 0.875),
        new THREE.Vector3( h * 0.1875, 0, -h * 0.875),
        new THREE.Vector3(-h * 0.875,  0,  0),
        new THREE.Vector3(-h * 0.875,  0,  h * 0.0625),
        new THREE.Vector3(-h * 0.875,  0,  h * 0.1875),
    ]
);

const worldObstacles = await placeTrees(scene, terrain, treeModels, 3, 0.55);
createGrass(scene, terrain, grassModels, 3, 10);

const rockProxies = placeRocks(scene, terrain, rockModels, 200, 0.15);
placeRocks(scene, terrain, rockModels, 300, 0.05, { blockNav: false, collision: false, safeRadius: 0, ignoreProtected: true });
worldObstacles.push(...rockProxies);
worldObstacles.push(terrain.terrain);

const hud         = new HUD();
const launcher    = new Launcher(launcherModel, worldObstacles, gameAudio);
launcher.setHUD(hud);
const tanks       = [];
const gameManager = new GameManager(terrain, launcher, tanks, addTank, hud);

window.addEventListener('resize', onResize);

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    launcher.onResize();
}

function addTank(position) {
    const safeSpawn = terrain.navMap.findNearestPassable(position.x, position.z);

    const groundedPosition = new THREE.Vector3(
        safeSpawn.x,
        terrain.getHeightAt(safeSpawn.x, safeSpawn.z),
        safeSpawn.z
    );

    // SkeletonUtils.clone is required because model.clone() doesn't copy the skeleton correctly
    const clonedModel = SkeletonUtils.clone(tankModel);
    const tank        = new Tank(clonedModel, gameAudio);

    tanks.push(tank);
    tank.addToScene(scene, terrain, groundedPosition);
    launcher.registerTank(tank);
    tank.setNavigation(terrain.navMap, terrain.launcherSpawn);

    return tank;
}

async function init() {
    terrain.addToScene(scene);
    launcher.addToScene(scene, terrain.launcherSpawn);
    launcher.setMapCenter(new THREE.Vector3(0, 0, 0));
    launcher.faceToward(new THREE.Vector3(0, 0, 0));
    launcher.setMainCamera();
    terrain.terrain.updateMatrixWorld(true);
}

if (playIntro) {
    await runIntro(renderer, camera, init);
} else {
    await init();
}

function animate() {
    const now   = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime    = now;

    launcher.update(delta, scene, terrain.terrain);

    for (const tank of tanks) {
        const wasDead = tank.state === TankState.DEAD;
        tank.update(delta, launcher.activeCamera ?? camera);
        if (!wasDead && tank.state === TankState.DEAD) {
            gameManager.onTankDestroyed(tank);
        }
    }

    gameManager.update(delta);
    hud.updateLauncherState(launcher.state);
    updateExplosions(delta);

    const activeCamera = launcher.activeCamera ?? camera;
    gameAudio.setCamera(activeCamera);
    renderer.render(scene, activeCamera);

    if (gameManager.isOver) renderer.setAnimationLoop(null);
}

renderer.setAnimationLoop(animate);
