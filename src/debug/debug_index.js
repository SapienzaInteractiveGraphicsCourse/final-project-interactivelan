// I Want to be able to test different things not necessarely togeather, so I need a debug scene selector.

// Depending on url, we load a different scene
const params = new URLSearchParams(window.location.search);
const scene  = params.get('scene');

if (scene) {
    // HHide the scene selection menu before loading a new scene
    document.body.innerHTML = '';

    if (scene === 'terrain')  import('./debug_terrain.js');
    // if (scene === 'launcher') import('./launcher.js');
    // if (scene === 'targets')  import('./targets.js');
}