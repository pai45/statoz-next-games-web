# Character and movement validation — 21 October 2026

Runtime: **character-motion-4**. [Play local static build](http://127.0.0.1:3139/statoz_web/play/penalty-shootout/).

## Review and editable assets

- [14-second character showcase, 30 fps, silent](evidence-motion-v4/character-showcase.mp4)
- [Character/kit/movement changes](CHARACTER_REALISM_V4.md)
- [Editable Blender source](assets/athlete-source.blend), [authoring script](assets/build-athlete.py), [motion compiler](../../scripts/build-shootout-motion.mjs)
- [Provenance and SHA-256 hashes](../../public/assets/games/penalty-shootout/manifest.json)
- [Desktop](evidence-motion-v4/screens/desktop-shooting.png), [phone portrait emulation](evidence-motion-v4/screens/portrait-shooting.png), [phone landscape emulation](evidence-motion-v4/screens/landscape-keeping.png)
- [Previous validation](MOTION_VALIDATION_V3.md), whose evidence remains archived separately.

## Checks

| Check | Result |
| --- | --- |
| Repository tests | 111 passed, 0 failed |
| Final shootout regressions | 26 passed, 0 failed |
| Full lint and TypeScript | Passed; final changed-source type/lint checks passed |
| Normal production build | Passed |
| Static/base-path production build | Passed |
| Browser journeys | 6 passed, 0 unexpected |
| Final static shot/replay smoke | Passed; no uncaught JavaScript errors; exact model hash verified |
| Showcase | 420 deterministic frames at 30 fps; fully decoded with FFmpeg; no page errors |

Coverage includes distinct shot styles, animated boot/ball contact, fixed support feet at contact, approach footfall drift below 2 cm, physical keeper outcomes, final glove/collider agreement, seed-stable interruptible gestures, return of recovered feet beneath the hips, seeded 30/60/144 Hz equivalence, pause/replay, input cancellation, account isolation, old saves and exactly-once rewards.

## Visual and movement review

Inspected preparation, moving approach, support-foot plant, contact and follow-through, all four appearance presets, keeper extension/landing/get-up, and front/back kit lettering. The side contact pairs show adjacent 119/120 and 120/120 second samples for driven, placed and chip. The 14-second reel uses the same runtime pose evaluator and renderer as live play. It demonstrates authored motion, not measured device fps.

Review corrected panel boundaries, shoulder weighting, local-space animation baking, keeper elbow poles, raised-glove reach and the final recovery replant. Body and cloth are skinned original adaptations; clothing is authored deformation, not a dynamic cloth simulation. This remains a handheld-era character presentation rather than scanned-player fidelity.

## Performance

Host: 12th Gen Intel(R) Core(TM) i7-12650H, 16 GiB RAM, Windows 10.0.26200, Chromium 156.0.8078.4. See performance.json for the renderer identity. Samples cover approximately 15 seconds of warm gameplay with adaptive resolution enabled.

| View | Viewport | Mean fps | P95 frame | Draw calls |
| --- | --- | --- | --- | --- |
| desktop | 1280 × 800 | 74.1 | 13.8 ms | 89 |
| portrait-emulation | 412 × 915 | 74.2 | 13.8 ms | 89 |
| landscape-emulation | 915 × 412 | 74.9 | 13.5 ms | 88 |

The close character reel peaked at 136 draw calls, below 150. Registered runtime assets including both GLB detail levels total 6,848,456 bytes. One detail level loads per session. The fresh static session reported 7,328,978 response Content-Length bytes (7.33 MB), below the 15 MB target. This counts observed response bodies, not HTTP headers or rejected third-party requests; cold-network.json preserves the measurements.

## Limits and environment observations

Physical midrange phones, iOS/Safari and real controllers remain unverified. Desktop viewport emulation does not establish sustained phone performance. Original audio was unchanged; the design reel is silent. The existing lobby ad script can be blocked by this environment's network policy without preventing play.

The first browser run reported two test failures: desktop fixture teardown exceeded its budget after gameplay assertions completed, and a landscape touch assertion checked a transient charging phase after the shot had already resolved. The harness now bounds the optional ad wait, observes entry to charging inside the page and unloads WebGL before teardown. A second bundled-Chromium run stalled on startup/teardown; final browser journeys were run in installed stable Chrome 155.0.8059.85 using an isolated temporary profile. The initial report is retained as browser-initial-results.json; the final result is listed above. Performance and static smoke used bundled Chromium 156 as recorded in their own evidence.

One intermediate review browser failed decoding blob textures while other review work was active; fresh final captures and static smoke loaded the shipped models successfully. The viewport capture log also records one aborted low-detail model request. The phone captures show the loaded revised kits; final touch journeys and the static smoke provide separate load/gameplay evidence. Isolated Chromium teardown can leave a childless browser process; cleanup is restricted to confirmed review-owned processes and never touches user browser sessions. See evidence logs for actual results.

No push, deployment, new backend or runtime dependency was added. Unrelated owner changes were preserved by the hash-protected apply script.
