# Last Circle

A wave-survival arena game: hold the circle, build element combos, survive the endless waves.

## Android app (offline)
Download the latest APK on your phone:
**https://github.com/Darkz94/last-circle/releases/latest/download/LastCircle.apk**

Open the downloaded file and allow installing from this source when Android asks.
A new APK is built automatically (GitHub Actions) every time `main` is updated; installing it updates the app in place.

## How it's put together
`game.html` is the whole game. `index.html` is a tiny loader that runs the newest copy available: the bundled one, or a newer one the app downloaded from this repo (it checks `version.json` on start).

**Releasing an update:** change `game.html`, bump `GAME_VERSION` in it and `version` in `version.json` to the same number, push. Installed apps offer the update next time they open — no reinstall.

## Web version
`index.html` loads the game. If GitHub Pages is enabled it's playable at https://darkz94.github.io/last-circle/.
When updating `index.html`, bump `VERSION` in `sw.js` so installed web copies refresh.

`android-signing/debug.keystore` keeps the app's signature stable so updates install over the previous version.
