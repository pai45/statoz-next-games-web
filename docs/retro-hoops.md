> Current local candidate: [movement v2](retro-hoops-movement-v2.md), rules1.4.0. The published handheld1.3 release below is historical; this movement pass has not been pushed or deployed.

# Retro Hoops web release

Retro Hoops is a separate full-court 3v3 basketball game at `/play/retro-hoops`. The existing authenticated launcher owns entry and return routing. It needs no deck and awards no currency or XP. Two fictional teams play one three-minute period; draws are allowed. Settings and the latest 20 results use the isolated `statoz.games.web.retro-hoops.v1` namespace.

## Runtime

Rules 1.3.0 run in seeded pure TypeScript at 60 Hz. Three.js presents a 640 by 360 landscape court viewport. React owns the HUD and simultaneous pointer controls. Keyboard controls are arrows/WASD, J shoot/block and K pass/steal. Editable controls retain native keyboard operation. Near-rim attempts use contextual dunk contact and physical landing. Numerical tuning, AI, probabilities and animation holds are original adaptations.

The game supports lazy asset loading, abort/retry, resize, explicit pause/resume, background input clearing and disposal. Completed results are emitted once and immediate rematch starts a fresh match. No durable mid-match save is implemented.

## Art and audio provenance

`public/games/retro-hoops/credits.json` records reference-art provenance and the 75 PNG hashes. Athlete and basket rasters remain source-derived reference material; no additional source clearance or endorsement is asserted. Authored sparse-pose clips are not a recovered complete native animation pack.

Audio is original procedural synthesis from `audio.ts`: authored oscillator/envelope cues and an original note sequence, with no third-party recordings, downloaded samples or commercial-game audio. `audio-provenance.json` records this selection. The owner provisionally approved audio; acoustic listening has not been performed. Music and SFX have independent volume/mute controls, a combined eight-voice cap and pause/background handling.

## Verification

Run `npm run test:retro-hoops`, `npm run test:retro-circuit`, `npm run lint`, `npx next typegen`, `npx tsc --noEmit` and `npm run build:pages`. The Retro Hoops suite includes six seeded complete matches, scoring/possession/buzzer rules, contact transitions, storage isolation, catalog routing, animation ownership and portable message validation.

Separate browser evidence in the Designer workspace covers loading failures, host rerenders, volume/mute/pause, touch cancellation, results/rematch, both attack directions, Canvas/Three same-state comparison and decoded native-size action loops. Browser emulation and SwiftShader measurements do not establish physical-phone performance. Historical rejected Canvas versions are preserved and are not superseded as approved labs by the production code review.

A same-source portable browser package and host contract are prepared for a later Flutter WebView. Actual Flutter integration remains separate.


## Future Games handheld pass

This revision changes Games Web only. Sports Web, Sports Flutter, Games Flutter and the current StatOz repositories are unchanged. The generated offline Retro Hoops bundle uses the same React/Three runtime; its manifest now requests landscape. Do not import it into another app automatically.

Mobile landscape uses a fixed safe-area viewport shell: physical-style left D-pad, right A/B controls, recessed centered widescreen display, compact scoreboard and super meter. Fullscreen is requested only from a button gesture and gracefully falls back to a viewport-filling layout when unavailable. Portrait remains playable and suggests rotation. Sound options pause play, preserve native slider keys and trap focus; closing does not automatically resume. Original audio remains unchanged.

The actual movement changes and evidence limits are in [source comparison](retro-hoops-source-study.md) and `public/games/retro-hoops/motion.json`. Browser/loop checks and screenshots are generated under `test-results/retro-hoops-console-v1` and `test-results/retro-hoops-motion-v1`. Test tools accept `PLAYWRIGHT_MODULE_PATH` for an externally installed Playwright module; this is a development-only tool, not a game dependency.


The enlarged landscape pass reclaims the header/footer space and uses a 640 x 360 presentation window into the same 900 x 360 world. Sprite proportions, feet anchors, ball/rim coordinates and simulation geometry are unchanged. The camera adds bounded horizontal visibility; there is no stretched 4:3 image. At 844 x 390 the effective drawing area grows from about346 x 260 to about563 x 317 pixels (roughly twice the area).

`court.ts` reconstructs the primary reference park composition in code: asphalt, blue/orange paint, yellow arc, walkway, brick wall, grass, benches, bicycles, spectators, beach/sea and palms. Its geometry/palette approximate observed layers; spectator pixels and decorative shapes are newly authored, not extracted/traced background sprites. It is not a pixel-exact background recovery. Existing source-derived player/basket provenance is unchanged.
