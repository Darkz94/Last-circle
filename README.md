# Last Circle

A wave-survival arena game: hold the circle, build element combos, survive the endless waves.

## Android app (offline)
Download the latest APK on your phone:
**https://github.com/Darkz94/last-circle/releases/latest/download/LastCircle.apk**

Open the downloaded file and allow installing from this source when Android asks.
A new APK is built automatically (GitHub Actions) every time `main` is updated; installing it updates the app in place.

## Web version
`index.html` is the whole game. If GitHub Pages is enabled it's playable at https://darkz94.github.io/last-circle/.
When updating `index.html`, bump `VERSION` in `sw.js` so installed web copies refresh.

`android-signing/debug.keystore` keeps the app's signature stable so updates install over the previous version.
