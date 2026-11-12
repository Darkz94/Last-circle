# Last Circle

A wave-survival arena game: hold the circle, build element combos, survive the endless waves.

## Android app (offline)
Download the latest APK on your phone:
**https://github.com/Darkz94/last-circle/releases/latest/download/LastCircle.apk**

Once installed, the app updates itself: when a newer version is pushed here, the start screen offers **Update now**.

## How the code is organised
The game is written as small modules in `src/` and built into one file, `game.html`:

| File | What it holds |
| --- | --- |
| `00-core.js` | constants, helpers, the spatial grid |
| `10-audio.js` | synthesised sound effects and music |
| `20-data.js` | weapons, stats, element passives, enemies, difficulty curve |
| `21-abilities.js` | every element ability and boss relic (one entry each) |
| `30-state.js` | run state, stat totals, prices, save/load |
| `40-combat.js` | damage, status effects, lightning, thorns, loot |
| `41-weapons.js` | weapon attacks and golems |
| `42-world.js` | enemies, projectiles, summons, arena events |
| `50-update.js` | waves, the simulation step, level-ups, menu flow |
| `60-render.js` | all drawing |
| `70-ui.js` | menus and HUD |
| `80-main.js` | input, in-app updates, main loop |

Build: `python3 build.py` (writes `game.html`). `index.html` is a tiny loader that runs the newest copy of the game it has.

**Releasing an update:** change files in `src/`, bump `GAME_VERSION` in `src/00-core.js` and `version` in `version.json` to the same number, run `python3 build.py`, commit and push. Installed apps offer the update next time they open, and GitHub Actions builds a fresh APK.

To add an ability or relic, add one entry to `src/21-abilities.js`: its numbers, description and behaviour live together.
