# Grand Prix Dash — racing rules v2

> Superseded on 2026-11-04 by Rally Dash (docs/RALLY-DASH.md). The `rebuild/` code described here was removed and remains in git history; this file is kept as the record.

Future Games web only. Independent game-owned art direction, following the Designer `independent-game-style`, `pixel-game-design` and `pixel-art-animation` skills. Two modes: Quick Race and Time Trial. No championship, card gate, Shop dependency or shared rewards.

## Reference and original design

Reference: Ultimate Racing 2D (2018 PC), Applimazing; Defunct Games review https://www.youtube.com/watch?v=dbENZmcWy34&t=90s . Research samples inspected: 0–60 and 85–115 seconds. Observed: fixed-orientation overhead circuit presentation, small shaded cars, broad corner visibility, compact timings, grid-based vehicle selectors and checker menu backgrounds. Samples show multiple classes and do not establish Formula physics or exact input timing. Official feature description: https://store.steampowered.com/app/808080/Ultimate_Racing_2D/ .

Original adaptations: world-space bicycle-style handling, 60 Hz fixed step, 24 ordered lap gates, five fictional spline circuits, ten invented teams/twenty fictional drivers, original car paths and seeded environment paintings. None of the reference footage, sprites, layouts, logos or audio is shipped. No external raster generation or external font download is used. System Impact/Arial Narrow/Arial are requested through normal system font fallback. Retained old Grand Prix files and legacy records are inactive historical sources, not reused racing art.

## Authored assets and sound

`rebuild/art.ts` is the editable car master (nose-up paths, centre anchor 50/105 in a 100×210 viewBox). The same paths draw team previews and race cars. The world sprite rotates by heading + pi/2; light/shadow treatment remains consistent. `geometry.ts` owns control knots and all racing geometry. `renderer.ts` paints cached scenery, twenty grid slots, pit apron, grandstands, barriers and vegetation. Motion is continuous simulation, not a sprite sheet with invented source frame durations. Discovery art has a separate SVG master under `public/assets/games/grand-prix-dash`; Retro Circuit references are untouched.

Audio is original Web Audio synthesis: a speed-controlled filtered sawtooth engine and short event tones. Engine follows simulation velocity. One-shot cues consume simulation events exactly once. Pause/background ramps engine gain to zero, resume requires a gesture when the browser requires it, and dispose closes the context. No music or reference recordings. Runtime event cues are lights (420 Hz), launch (840), contact (90), lap (660), pit (510), finish (990), invalid lap (180), with short attack/release envelopes. Engine/effects volume and mute are independent.

## Rules and persistence

Three/five/ten-lap races, P10 default grid, optional three-minute qualifying and same-physics AI difficulties. Strategy uses ten laps, a mandatory stop, three tyre compounds and a three-second service. Pit entry captures a requested car onto an offset lane with a 13.8 m/s limiter and releases it at the exit. The pit crew is automatic. Missing the mandatory stop disqualifies the finisher. Time Trial has no AI or tyre strategy; completed valid laps produce sector records and a 10 Hz interpolated ghost. Recovery invalidates the current lap; track limits invalidate trial/qualifying laps, and ordered gates prevent shortcut lap completions. Invalid full race laps add five seconds. No reverse throttle; recovery is the supported escape from barriers.

Save key: `statoz.games.web.grandprix.v2`, registered with existing account-switch isolation. v1 is never migrated, overwritten or compared to v2 records. Rules version 2 separates manual and assisted combinations; guide visibility does not change records. Recent results have stable session IDs to prevent duplicate collection. Unknown save versions are preserved. Blocked storage falls back to session memory. Ghost data is bounded and validated before drawing. Race results and account data never transmit to a server.

## Review gates

1. One circuit, original car art, new lobby, twenty-car field, camera and controls.
2. All five circuits, ten team choices, qualifying, tutorial, valid laps, sectors and ghosts.
3. Pit strategy, audio lifecycle, mobile controls, input/focus accessibility, storage failure and local builds.

Read `validation.md` for exercised checks and remaining device/audio limitations. A structural or headless test is not a real-device or listening pass.
