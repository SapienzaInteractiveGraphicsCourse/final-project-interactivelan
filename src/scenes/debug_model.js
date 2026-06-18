import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadModel } from '../utilities/loader.js';
import { createDebugKeys } from '../ui/hud.js';
import { materialLauncher, materialTank } from '../rendering/materials.js';

// ── Renderer ──────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping          = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure  = 1.0;
renderer.outputColorSpace     = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ── Scene ─────────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Key light (warm, from upper-right front)
const key = new THREE.DirectionalLight(0xfff0d8, 2.0);
key.position.set(5, 8, 6);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
key.shadow.bias       = -0.0005;
key.shadow.normalBias =  0.02;
key.shadow.camera.near = 0.5;
key.shadow.camera.far  = 60;
key.shadow.camera.left = key.shadow.camera.bottom = -8;
key.shadow.camera.right = key.shadow.camera.top   =  8;
scene.add(key);

// Fill light (cool, opposite side — reduces harsh shadows)
const fill = new THREE.DirectionalLight(0xb0c8ff, 0.8);
fill.position.set(-5, 3, -4);
scene.add(fill);

// Rim light (back-top, separates model from background)
const rim = new THREE.DirectionalLight(0xffffff, 0.5);
rim.position.set(0, 6, -8);
scene.add(rim);

// Ambient ground bounce
const ambient = new THREE.HemisphereLight(0xffffff, 0x222222, 0.35);
scene.add(ambient);

// Ground plane (receives shadows, gives context)
const ground = new THREE.Mesh(
    new THREE.CircleGeometry(20, 64),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── Camera / Controls ─────────────────────────────────────────────────────────

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 500);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.08;
controls.minDistance    = 0.5;
controls.maxDistance    = 100;

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Model list ────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL;

const MODELS = [
    {
        label: 'Launcher',
        path:  `${BASE}models/launcher.glb`,
        applyMats(model) {
            model.traverse(child => {
                if (!child.isMesh) return;
                if (child.name === 'LauncherMesh' || child.name === 'TubeMesh')
                    child.material = materialLauncher;
            });
        },
    },
    {
        label: 'Tank',
        path:  `${BASE}models/tank.glb`,
        applyMats(model) {
            model.traverse(child => {
                if (!child.isMesh) return;
                if (child.name === 'HullMesh' || child.name === 'TurretMesh' || child.name === 'GunMesh')
                    child.material = materialTank;
            });
        },
    },
    { label: 'TV',     path: `${BASE}models/tv.glb`     },
    { label: 'Rock A', path: `${BASE}models/rock_a.glb`, elevFactor: 3.0 },
    { label: 'Rock B', path: `${BASE}models/rock_b.glb`, elevFactor: 3.0 },
    { label: 'Rock C', path: `${BASE}models/rock_c.glb`, elevFactor: 3.0 },
    { label: 'Tree A', path: `${BASE}models/tree_a.glb` },
    { label: 'Tree B', path: `${BASE}models/tree_b.glb` },
    { label: 'Tree C', path: `${BASE}models/tree_c.glb` },
    { label: 'Tree D', path: `${BASE}models/tree_d.glb` },
];

// ── Sidebar UI ────────────────────────────────────────────────────────────────

const sidebar = document.createElement('div');
sidebar.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'bottom:0',
    'width:180px',
    'background:rgba(10,10,10,0.82)',
    'backdrop-filter:blur(6px)',
    'border-right:1px solid #1d1d1b',
    'display:flex', 'flex-direction:column',
    'font-family:"Courier New",monospace',
    'z-index:100',
    'overflow:hidden',
].join(';');

const sidebarHead = document.createElement('div');
sidebarHead.textContent = '// MODELS';
sidebarHead.style.cssText = [
    'padding:14px 16px 10px',
    'font-size:10px', 'letter-spacing:0.12em',
    'color:#4a4844', 'text-transform:uppercase',
    'border-bottom:1px solid #1d1d1b',
].join(';');
sidebar.appendChild(sidebarHead);

const listEl = document.createElement('ul');
listEl.style.cssText = 'list-style:none;overflow-y:auto;flex:1;padding:6px 0;';

const listItems = MODELS.map((m, i) => {
    const li = document.createElement('li');
    li.textContent = m.label;
    li.style.cssText = [
        'padding:9px 16px',
        'font-size:12px', 'letter-spacing:0.06em', 'text-transform:uppercase',
        'cursor:pointer',
        'color:#4a4844',
        'transition:color 80ms,background 80ms',
    ].join(';');
    li.addEventListener('mouseenter', () => { if (i !== currentIndex) li.style.color = '#c8c4bb'; });
    li.addEventListener('mouseleave', () => { if (i !== currentIndex) li.style.color = '#4a4844'; });
    li.addEventListener('click', () => { if (i !== currentIndex) selectModel(i); });
    listEl.appendChild(li);
    return li;
});
sidebar.appendChild(listEl);
document.body.appendChild(sidebar);

function updateSidebar() {
    listItems.forEach((li, i) => {
        if (i === currentIndex) {
            li.style.color      = '#7a9450';
            li.style.background = 'rgba(122,148,80,0.08)';
        } else {
            li.style.color      = '#4a4844';
            li.style.background = 'transparent';
        }
    });
}

// ── Wireframe / state ─────────────────────────────────────────────────────────

let currentModel = null;
let currentIndex = 0;
let wireframe    = false;
const origMats   = new Map();

// Status badge (top-right)
const badge = document.createElement('div');
badge.style.cssText = [
    'position:fixed', 'top:14px', 'right:16px',
    'font-family:"Courier New",monospace', 'font-size:12px',
    'color:#c8c4bb', 'background:rgba(0,0,0,0.55)',
    'padding:5px 12px', 'pointer-events:none',
    'z-index:200', 'user-select:none',
    'border:1px solid #1d1d1b',
].join(';');
document.body.appendChild(badge);

function updateBadge() {
    badge.innerHTML = MODELS[currentIndex].label +
        (wireframe ? ' &nbsp;<span style="color:#7a9450">[WF]</span>' : '');
}

function frameCamera(model) {
    const box    = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    const size   = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim    = Math.max(size.x, size.y, size.z);
    const dist      = maxDim * 2.4;
    const elevFactor = MODELS[currentIndex].elevFactor ?? 0.5;
    camera.position.set(center.x + dist * 0.6, center.y + size.y * elevFactor, center.z + dist);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();

    // Fit shadow camera around model
    const r = maxDim * 1.5;
    key.shadow.camera.left   = -r;
    key.shadow.camera.right  =  r;
    key.shadow.camera.top    =  r;
    key.shadow.camera.bottom = -r;
    key.shadow.camera.updateProjectionMatrix();
}

function applyWireframe(model, on) {
    model.traverse(child => {
        if (!child.isMesh) return;
        if (on) {
            if (!origMats.has(child.uuid)) origMats.set(child.uuid, child.material);
            child.material = new THREE.MeshBasicMaterial({ color: 0x7a9450, wireframe: true });
        } else {
            const orig = origMats.get(child.uuid);
            if (orig) child.material = orig;
        }
    });
}

async function selectModel(index) {
    if (currentModel) {
        scene.remove(currentModel);
        origMats.clear();
        wireframe    = false;
        currentModel = null;
    }
    currentIndex = index;
    currentModel = await loadModel(MODELS[currentIndex].path);

    // Apply model-specific PBR materials before anything else (wireframe saves originals after this)
    if (MODELS[currentIndex].applyMats) MODELS[currentIndex].applyMats(currentModel);

    // Ensure every mesh casts/receives shadows
    currentModel.traverse(child => {
        if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
        }
    });

    scene.add(currentModel);
    frameCamera(currentModel);
    updateBadge();
    updateSidebar();
}

// ── Keys ──────────────────────────────────────────────────────────────────────

createDebugKeys([
    ['[← →]', 'Previous / next model'],
    ['[W]',   'Toggle wireframe'],
    ['[F]',   'Reset camera'],
]);

window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft')  selectModel((currentIndex - 1 + MODELS.length) % MODELS.length);
    if (e.code === 'ArrowRight') selectModel((currentIndex + 1)                 % MODELS.length);
    if (e.code === 'KeyW' && currentModel) {
        wireframe = !wireframe;
        applyWireframe(currentModel, wireframe);
        updateBadge();
    }
    if (e.code === 'KeyF' && currentModel) frameCamera(currentModel);
});

// ── Boot ──────────────────────────────────────────────────────────────────────

selectModel(0);

renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
});
