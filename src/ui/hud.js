import * as THREE from 'three';

export class HUD {
    constructor() {
        // Wave counter in the top right
        this.waveCounterElement  = null;
        // State indicator in the bottom center
        this.stateElement        = null;

        this.buildWaveCounter();
        this.buildScore();
        this.buildStateIndicator();
    }

    // I'm not a big CSS guy, so most of it has been stolen from stackoverflow or kindly offered by Claude
    buildWaveCounter() {
        this.waveCounterElement = document.createElement('div');
        this.waveCounterElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 24px;
            color: white;
            font-family: monospace;
            font-size: 1rem;
            text-shadow: 0 0 6px black;
            z-index: 150;
            pointer-events: none;
        `;
        document.body.appendChild(this.waveCounterElement);
    }

    buildScore() {
        this.scoreElement = document.createElement('div');
        this.scoreElement.style.cssText = `
            position: fixed;
            top: 20px;
            left: 24px;
            color: white;
            font-family: monospace;
            font-size: 1rem;
            text-shadow: 0 0 6px black;
            z-index: 150;
            pointer-events: none;
        `;
        this.scoreElement.textContent = 'KILLS: 0';
        document.body.appendChild(this.scoreElement);
    }

    buildStateIndicator() {
        this.stateElement = document.createElement('div');
        this.stateElement.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-family: monospace;
            font-size: 1rem;
            letter-spacing: 0.15em;
            text-shadow: 0 0 6px black;
            z-index: 150;
            pointer-events: none;
        `;
        document.body.appendChild(this.stateElement);
    }

    // WAve counter in top right
    updateWaveCounter(currentWaveIndex, totalWaves) {
        if (!this.waveCounterElement) return;
        const displayWave = Math.min(currentWaveIndex, totalWaves);
        this.waveCounterElement.textContent = `WAVE ${displayWave} / ${totalWaves}`;
    }

    // Launcher State in bottom
    updateLauncherState(stateName) {
        if (!this.stateElement) return;

        const labels = {
            READY:      'Ready to fire',
            FIRED:      'Missile in flight',
            POST_FIRE:  'Press R to reload',
            TOSSING:    'Reloading...',
            RELOADING:  'Reloading...',
        };

        this.stateElement.textContent = labels[stateName] ?? stateName;
    }

    // Update the score counter
    updateScore(score) {
        if (!this.scoreElement) return;
        this.scoreElement.textContent = `KILLS: ${score}`;
    }

    // Announcement text on top screen, disappears quickly
    showAnnouncement(text) {
        const announcement = document.createElement('div');
        announcement.style.cssText = `
            position: fixed;
            top: 10%;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-family: monospace;
            font-size: 2rem;
            text-shadow: 0 0 8px black;
            z-index: 150;
            pointer-events: none;
        `;
        announcement.textContent = text;
        document.body.appendChild(announcement);

        // Fade out and remove after 3 seconds
        setTimeout(() => announcement.remove(), 3000);
    }

    // Big center overlay for end of game, with a restart button
    showEndScreen(title, subtitle) {
        // Release pointer lock so the player can click the button
        if (document.pointerLockElement) document.exitPointerLock();

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: rgba(0, 0, 0, 0.65);
            color: white;
            font-family: monospace;
            z-index: 200;
        `;
        overlay.innerHTML = `
            <h1 style="font-size: 3rem; margin: 0 0 0.5rem 0;">${title}</h1>
            <p style="font-size: 1.1rem; margin: 0 0 2rem 0;">${subtitle}</p>
            <button id="restart-button" style="
                font-size: 1.1rem;
                font-family: monospace;
                padding: 0.5rem 2.5rem;
                cursor: pointer;
                background: transparent;
                color: white;
                border: 1px solid white;
                letter-spacing: 0.1em;
            ">RESTART</button>
        `;
        document.body.appendChild(overlay);

        // Full reload is the simplest restart and regenerates the map too
        document.getElementById('restart-button').addEventListener('click', () => {
            window.location.reload();
        });
    }
}