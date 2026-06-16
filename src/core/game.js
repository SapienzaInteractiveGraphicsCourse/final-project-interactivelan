import { TankState } from '../entities/tank.js';

// How close a tank needs to get before it's game over
const LOSE_DISTANCE = 20;

const GameState = Object.freeze({
    PLAYING: 'PLAYING',
    WIN:     'WIN',
    LOSE:    'LOSE',
});

// Each wave lists which spawn indices to use and how long after the previous wave to wait
// spawnIndices refer to the terrain.enemySpawnPositions array
const WAVE_DEFINITIONS = [
    { delay: 1,  spawnIndices: [0, 8] },
    { delay: 1, spawnIndices: [1, 7, 3] },
    { delay: 1, spawnIndices: [2, 4, 5, 6 ] },
];

export class GameManager {
    constructor(terrain, launcher, tanks, addTank, hud) {
        this.terrain  = terrain;
        this.launcher = launcher;
        this.tanks    = tanks;
        this.addTank  = addTank;
        this.hud      = hud;

        this.state = GameState.PLAYING;

        this.currentWaveIndex = 0;
        this.waveTimer        = 0;
        this.allWavesSpawned  = false;

        // Score: one point per tank destroyed
        this.score = 0;
    }

    // Spawn every tank of a wave at the assigned spawns
    spawnWave(wave) {
        for (const spawnIndex of wave.spawnIndices) {
            this.addTank(this.terrain.enemySpawnPositions[spawnIndex]);
        }
    }

    // Returns true if every tank currently on the map is dead
    // Used to gate the next wave so the player clears before more arrive
    allCurrentTanksDead() {
        return this.tanks.length > 0 &&
               this.tanks.every(tank => tank.state === TankState.DEAD);
    }

    // Advance wave timing and spawn the next wave when delay expires
    // Next wave only starts once all current tanks are dead
    updateWaves(delta) {
        if (this.allWavesSpawned) return;

        // Don't start the timer for the next wave until the map is clear
        if (this.currentWaveIndex > 0 && !this.allCurrentTanksDead()) return;

        this.waveTimer += delta;

        if (this.waveTimer >= WAVE_DEFINITIONS[this.currentWaveIndex].delay) {
            this.waveTimer = 0;

            this.spawnWave(WAVE_DEFINITIONS[this.currentWaveIndex]);

            // Announcement auto-dismisses after 2 seconds
            this.hud.showAnnouncement(
                `Wave ${this.currentWaveIndex + 1} of ${WAVE_DEFINITIONS.length}`,
                2000
            );

            this.currentWaveIndex++;

            if (this.currentWaveIndex >= WAVE_DEFINITIONS.length) {
                this.allWavesSpawned = true;
            }
        }
    }

    // A tank just died — add a point and tell the HUD
    onTankDestroyed(tank) {
        this.score++;
        this.hud.updateScore(this.score);

        // Block the dead tank's cell so live tanks path around it
        this.terrain.navMap.setBlocked(
            tank.group.position.x,
            tank.group.position.z,
            2
        );
    }

    // Check for win and lose conditions
    checkConditions() {
        if (this.state !== GameState.PLAYING) return;

        // Lose: any living tank got too close to the launcher
        for (const tank of this.tanks) {
            if (tank.state === TankState.ALIVE) {
                const distanceToLauncher = tank.group.position.distanceTo(this.terrain.launcherSpawn);
                if (distanceToLauncher < LOSE_DISTANCE) {
                    this.state = GameState.LOSE;
                    this.hud.showEndScreen('POSITION OVERRUN', 'A tank reached your position.', this.score, false);
                    return;
                }
            }
        }

        // Win: all waves done and every tank is dead
        if (this.allWavesSpawned && this.allCurrentTanksDead()) {
            this.state = GameState.WIN;
            this.hud.showEndScreen('AREA SECURED', 'All enemy armor destroyed.', this.score, true);
        }
    }

    update(delta) {
        if (this.state !== GameState.PLAYING) return;

        this.updateWaves(delta);
        this.checkConditions();
        this.hud.updateWaveCounter(this.currentWaveIndex, WAVE_DEFINITIONS.length);
    }
}