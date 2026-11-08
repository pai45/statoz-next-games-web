# Character upgrade validation — 21 October 2026

Local runtime version: **character-motion-3**. [Play the static/base-path build](http://127.0.0.1:3139/statoz_web/play/penalty-shootout/).

## Delivered files

- [Gameplay review, approximately 12 s with original game audio](evidence-motion-v3/gameplay-review.mp4)
- [Previous / updated presentation comparison, approximately 12 s, silent](evidence-motion-v3/comparison-review.mp4). These are different seeded plays; timing is illustrative.
- [Character and reference notes](CHARACTER_ANIMATION.md)
- [Editable Blender source](assets/athlete-source.blend), [asset builder](assets/build-athlete.py), and [motion compiler](../../scripts/build-shootout-motion.mjs)
- [Asset provenance and hashes](../../public/assets/games/penalty-shootout/manifest.json)
- [Desktop](evidence-motion-v3/screens/desktop-shooting.png), [portrait](evidence-motion-v3/screens/portrait-shooting.png), [landscape keeping](evidence-motion-v3/screens/landscape-keeping.png), and [character close-up](evidence-motion-v3/poses/character-ready.png)

## Automated checks

| Check | Result |
| --- | --- |
| Complete repository suite | **109 passed**, 0 failed |
| Shootout suite, including animation regressions | **24 passed**, 0 failed |
| Lint and TypeScript | Passed on final source |
| Normal production build | Passed |
| Static/base-path production build | Passed; final bundle contains cosmetic identity and eye-direction code |
| Playwright browser journeys | **6 passed**, 0 unexpected / skipped / flaky |
| Fresh final static smoke | Shot, replay and skip passed; no uncaught JavaScript errors |
| Model loaded by final static smoke | HTTP 200, 2,906,808 bytes; SHA-256 matches the asset manifest |
| Review MP4s | H.264, 30 fps; both files decoded completely with FFmpeg |

Coverage includes all three shots, composure/power/aim locking, physical goal/wide/high/woodwork/keeper outcomes, slow catches versus fast/torso parries, animated-hand agreement, support-foot drift at or below 2 cm, 30/60/144 Hz determinism, seeded AI information boundaries, recovery in place, replay pose retention, fixed per-kick appearance, five-kick/early-finish/sudden-death rules, old saves, account isolation, reward idempotency, touch/keyboard/gamepad adapters, pause, asset retry and graphics recovery. Logs and browser results are in the evidence folder.

## Visual review

Inspected desktop, phone portrait and phone landscape captures. The goal, ball, players and controls remain visible with no page overflow. Reviewed preparation, approach, support-foot plant, contact, follow-through, goalkeeper extension, landing, get-up and four appearance presets in the same runtime renderer. Side contact pairs show the adjacent 119/120 and 120/120 second simulation samples for driven, placed and chip shots. Replays use recorded final poses.

The review led to corrections to shirt boundaries, glove construction, ankle pivots/footwear fitting, placed-shot stance compression, recovery hand support and per-kick identity stability. These observations and original adaptations are distinct from documented FIFA controls; no EA character or animation data is included.

## Measured performance and payload

Host: Windows 10.0.26200, 12th Gen Intel(R) Core(TM) i7-12650H, 16 GiB RAM; NVIDIA GeForce RTX 3070 Ti Laptop GPU via ANGLE/Direct3D11; Chromium 156.0.8078.4.

Each sample covers approximately 15 s of warm gameplay rendering with the existing adaptive resolution/shadow system enabled. Phone results use this desktop GPU and emulated viewports.

| View | CSS viewport | Mean fps | P95 frame | Draw calls | Internal canvas |
| --- | --- | --- | --- | --- | --- |
| desktop | 1280 × 800 | 75.0 | 13.5 ms | 72 | 1088 × 680 |
| portrait-emulation | 412 × 915 | 74.9 | 13.5 ms | 111 | 412 × 685 |
| landscape-emulation | 915 × 412 | 75.0 | 13.5 ms | 110 | 915 × 412 |

The independent live keeping capture reported 74.1 fps and 80 draw calls. Captured view/review samples remained below 150 reported draw calls. The captured static session transferred 6,516,842 bytes (6.52 MB), below the 15 MB initial payload target. All registered game assets, including both detail levels, total 6,039,584 bytes; only one character detail level is loaded for a session.

## Limitations and environment observations

Physical midrange phone performance, iOS/Safari and a real controller remain unverified. Desktop viewport emulation does not establish sustained phone performance. Audio assets and engine behaviour were preserved; the new review mix was encoded/decoded, and mute/unmute browser coverage passed.

The test browser needed its verified childless Chromium process closed after all six journeys had completed; Playwright then finished with six passes. One inspection run recorded an aborted model request. A fresh static smoke successfully loaded the exact shipped model and completed a kick/replay with no model failure. The preserved lobby ad script was blocked by this environment's external network policy; game play remained usable. No ad behaviour was changed.

No push, deployment or backend service was added. Existing unrelated owner edits were preserved by hash-checked application.
