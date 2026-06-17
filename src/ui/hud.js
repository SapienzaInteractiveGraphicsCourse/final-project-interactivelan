import * as THREE from 'three';

export class HUD {
    constructor() {
        // Wave counter in the top right
        this.waveCounterElement = null;
        // State indicator in the bottom center
        this.stateElement       = null;
        this.crosshairElement   = null;

        this.buildWaveCounter();
        this.buildScore();
        this.buildStateIndicator();
        this.initCrosshair();
    }

    async initCrosshair() {
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}ui/crosshair.svg`);
            const svgData  = await response.text();

            this.crosshairElement = document.createElement('div');
            this.crosshairElement.id = 'crosshair-ui';
            this.crosshairElement.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100vw; height: 100vh;
                pointer-events: none;
                display: flex;
                justify-content: center;
                align-items: center;
                visibility: hidden;
                z-index: 100;
            `;
            this.crosshairElement.innerHTML = svgData;
            document.body.appendChild(this.crosshairElement);
        } catch (error) {
            console.error('Failed to load crosshair:', error);
        }
    }

    setCrosshairVisible(visible) {
        if (!this.crosshairElement) return;
        this.crosshairElement.style.visibility = visible ? 'visible' : 'hidden';
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

    // Announcement text on top screen, disappears after duration ms
    showAnnouncement(text, duration = 3000) {
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

        setTimeout(() => announcement.remove(), duration);
    }

    // Big center overlay for end of game, with a restart button
    showEndScreen(title, subtitle, score = 0, isWin = true) {
        if (document.pointerLockElement) document.exitPointerLock();

        this.injectEndScreenStyles();

        const accent = isWin ? '#3dff7e' : '#ff3333';
        const bg     = isWin ? 'rgba(0,8,0,0.9)' : 'rgba(20,0,0,0.92)';
        const flash  = isWin ? 'rgba(80,255,140,0.18)' : 'rgba(255,40,40,0.28)';

        const overlay = document.createElement('div');
        overlay.className = 'escreen-overlay';
        overlay.style.cssText = `
            background: ${bg};
            --accent: ${accent};
        `;

        overlay.innerHTML = `
            <div class="escreen-flash" style="background:${flash};"></div>
            <div class="escreen-content">
                <div class="escreen-rule"></div>
                <h1 class="escreen-title"></h1>
                <p class="escreen-subtitle">${subtitle}</p>
                <div class="escreen-rule"></div>
                <button class="escreen-restart">[ RESTART ]</button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Typewriter on the title, starts after the overlay has faded in
        const titleEl = overlay.querySelector('.escreen-title');
        setTimeout(() => {
            let i = 0;
            const timer = setInterval(() => {
                titleEl.textContent = title.slice(0, ++i);
                if (i >= title.length) {
                    clearInterval(timer);
                    titleEl.classList.add('done');
                }
            }, 55);
        }, 700);

        overlay.querySelector('.escreen-restart').addEventListener('click', () => {
            window.location.reload();
        });
    }

    injectEndScreenStyles() {
        if (document.getElementById('escreen-styles')) return;

        const style = document.createElement('style');
        style.id = 'escreen-styles';
        style.textContent = `
            @keyframes esFadeIn    { from { opacity: 0; } to { opacity: 1; } }
            @keyframes esFlash     { from { opacity: 1; } to   { opacity: 0; } }
            @keyframes esSlideUp   { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

            .escreen-overlay {
                position: fixed; inset: 0;
                display: flex; align-items: center; justify-content: center;
                z-index: 200;
                font-family: monospace;
                color: white;
                animation: esFadeIn 0.6s ease 0.1s both;
            }

            .escreen-flash {
                position: absolute; inset: 0;
                pointer-events: none;
                animation: esFlash 0.4s ease-out both;
            }

            .escreen-content {
                display: flex; flex-direction: column;
                align-items: center; gap: 1.1rem;
                text-align: center;
                animation: esSlideUp 0.5s ease 0.4s both;
            }

            .escreen-rule {
                width: 300px; height: 1px;
                background: var(--accent); opacity: 0.5;
            }

            .escreen-title {
                font-size: 2.6rem; margin: 0;
                letter-spacing: 0.18em;
                color: var(--accent);
                text-shadow: 0 0 18px var(--accent);
                min-height: 3.2rem;
                border-right: 2px solid var(--accent);
                padding-right: 2px;
            }
            .escreen-title.done { border-right: none; }

            .escreen-subtitle {
                margin: 0; font-size: 0.95rem;
                letter-spacing: 0.06em; opacity: 0.8;
                animation: esSlideUp 0.4s ease 2.1s both;
            }

            .escreen-stats {
                display: flex; flex-direction: column;
                align-items: center; gap: 0.2rem;
                animation: esSlideUp 0.4s ease 2.5s both;
            }
            .escreen-stat-label {
                font-size: 0.75rem; letter-spacing: 0.12em;
                opacity: 0.5;
            }
            .escreen-score {
                font-size: 2.2rem; color: var(--accent);
            }

            .escreen-restart {
                background: transparent;
                color: var(--accent);
                border: 1px solid var(--accent);
                font-family: monospace; font-size: 0.95rem;
                letter-spacing: 0.12em;
                padding: 0.45rem 2.2rem;
                cursor: pointer;
                animation: esSlideUp 0.4s ease 2.9s both;
                transition: background 0.15s, color 0.15s;
            }
            .escreen-restart:hover {
                background: var(--accent);
                color: black;
            }
        `;
        document.head.appendChild(style);
    }
}

// Renders a keybind legend for debug scenes.
// bindings: array of [keyLabel, actionLabel] pairs.
// Returns a { setLabel(keyLabel, newActionLabel) } handle for live updates.
export function createDebugKeys(bindings) {
    const el = document.createElement('div');
    el.style.cssText = [
        'position:fixed',
        'bottom:16px',
        'left:16px',
        'font-family:monospace',
        'font-size:12px',
        'color:#ccc',
        'background:rgba(0,0,0,0.5)',
        'padding:7px 14px',
        'border-radius:4px',
        'pointer-events:none',
        'line-height:1.85',
        'z-index:9999',
        'user-select:none',
    ].join(';');

    const rows = new Map();

    for (const [key, label] of bindings) {
        const row = document.createElement('div');
        row.innerHTML = _keyRowHTML(key, label);
        el.appendChild(row);
        rows.set(key, row);
    }

    document.body.appendChild(el);

    return {
        setLabel(key, label) {
            const row = rows.get(key);
            if (row) row.innerHTML = _keyRowHTML(key, label);
        },
    };
}

function _keyRowHTML(key, label) {
    return `<span style="color:#7bcfff;display:inline-block;min-width:76px">${key}</span>${label}`;
}