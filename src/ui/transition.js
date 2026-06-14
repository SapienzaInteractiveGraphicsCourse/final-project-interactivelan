import * as THREE from 'three';


export class Transition {
    constructor(durationSeconds = 3.0){
        // Our duration in millisceconds
        this.duration = durationSeconds * 1000;

        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: black;
            opacity: 0;
            pointer-events: none;
            z-index: 500;
            transition: opacity ${durationSeconds}s ease;
        `;
        document.body.appendChild(this.overlay);
    }
    // Fade to black 
    fadeOut() {
        return new Promise(resolve => {
            this.overlay.style.pointerEvents = 'all';
            this.overlay.style.opacity       = '1';
            setTimeout(resolve, this.duration);
        });
    }

    // Fade out to scene
    fadeIn() {
        return new Promise(resolve => {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                this.overlay.style.pointerEvents = 'none';
                resolve();
            }, this.duration);
        });
    }

    dispose() {
        this.overlay.remove();
    }
}