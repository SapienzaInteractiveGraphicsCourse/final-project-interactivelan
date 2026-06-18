# Static Defense

[![Play](https://img.shields.io/badge/Play-staticdefense-brightgreen)](https://sapienzainteractivegraphicscourse.github.io/final-project-interactivelan/)

Final project for the Interactive Graphics course at Sapienza, 2025–2026.

You're fixed in place. Tanks are coming. You have one missile launcher and have to reload manually between every shot.

---

## How it plays

Three waves of enemy tanks spawn from the map edges and path toward your position using A\*. They slow down when hit, catch fire, and eventually cook off. If any of them reach you, it's over.

You control the launcher with the mouse — rotating left/right, pitching up/down — and guide each missile after firing. Reloading is animated and takes a moment, so shot selection matters.

The terrain is procedurally generated each run from simplex noise. Map size and noise parameters can be adjusted before starting.

## Controls

| Input | Action |
|---|---|
| `←` `→` | Rotate launcher |
| `↑` `↓` | Elevate gun |
| `RMB` | Toggle scope |
| `LMB` | Fire (scoped only) |
| `R` | Reload |
| `Click` | Lock pointer |

## Debug scenes

The scene selector has four additional scenes for isolated testing:

- **Terrain** — live sliders for size, frequency, amplitude, and clutter density. Regenerates on the fly with a navmap overlay.
- **Launcher** — full launcher controls, no terrain. Six tanks spawn at staggered distances; `[G]` respawns them.
- **Tank** — single tank patrolling toward a fixed point, for hitbox and behavior inspection.
- **TV** — the intro TV prop in isolation.

---

**Lorenzo Carlini** — [github.com/lorenzocarlini](https://github.com/lorenzocarlini)
