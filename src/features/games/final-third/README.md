# Final Third

3D football attack-and-defend game (six chances, swipe to shoot and curl, tap to
pass and dive). Route `/play/final-third`, in the football deck after Pitch Rush.

## Source and updates

The game is developed in its own project (`StatOz Future/final-third`). This
repo holds a vendored production build in `vendor/final-third/`, with file
hashes in `SOURCE.json` and credits in `ASSETS.md` and
`OFL-barlow-condensed.txt` (also copied into `public/embedded-games/LICENSES.txt`).

To update:

```text
# in final-third
npm run build
# here
npm run import:final-third -- ../final-third
npm run build:final-third
npm run test:final-third
```

`scripts/build-final-third.mjs` packs the build into one offline document
(`public/embedded-games/final-third/index.html`): inline script and styles, with
the athlete model, sounds and fonts as data URLs. It refuses to build if a
vendored file no longer matches its recorded hash.

## Host integration

The shared `BundledGame` host loads the document. The game's `src/host.ts`
reports `ready` and `error`, posts a `result` at full time, pauses on `pause`
and releases WebGL and audio on `dispose`. When hosted, its menu shows **Back to
games**, which returns to `/games/football`.

Phones keep portrait: the game is designed portrait-first, so it is excluded
from the forced-landscape viewport (`shared/mobile-viewport/policy.ts`).
Cover art is an in-game render (`public/games/final-third/cover-source.json`).
