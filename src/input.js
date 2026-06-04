import * as THREE from 'three';

// We need a dedicated InputHandler for our ATGM
export class InputHandler {
    constructor() {
        this.keys = {};

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Prevent arrow keys from scrolling the page away
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    isDown(code) {
        return !!this.keys[code];
    }
}