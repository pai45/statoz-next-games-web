# Retro Football — handheld and source-fidelity revision

Runtime **0.6.0**, rules **exhibition-handheld-v1**, assets **football-handheld-atlas-v1**. This is an editable local revision of the retained 0.5.0 exhibition. It does not replace the frozen Designer candidate or authorize publishing.

## Requested result

Make Retro Football fill mobile landscape, enlarge the playable screen, use a retro handheld-console frame, and study the reference's animation, movement, pitch and stadium more closely. The selected reference remains Super Sidekicks 2. Clubs and sound remain invented/original.

## Evidence and interpretation

The saved Designer evidence pack is `output/retro-football/source-study-v1`, especially `sources.json`, `kickoff-dribble/sample-0040.png` and `first-goal/sample-0040.png`. Its recording is [LongplayArchive's Super Sidekicks 2 gameplay](https://www.youtube.com/watch?v=ftohDx8JaLo). The visible English MVS options identify a two-minute half setting; exact region/edition remains unconfirmed. Saved samples are resampled study images, not a native sprite atlas.

| Evidence | Direct observation | This revision |
| --- | --- | --- |
| Kickoff/dribble, about 84–90 seconds | Broad bright mowing bands, elevated following camera, compact top scores, selected-player label/arrow | Rebuilt stripe/line geometry, compact HUD and P1 marker; wide camera follows the ball with bounded look-ahead |
| First goal, about 90–94 seconds | Net, track, stepped seating, crowd, boards, closer shooting perspective; large foreground shooter | Added layered crowd/aisles/rails, track, original lettered boards, mesh/posts and close-view backdrop. Foreground shooter remains incomplete |
| Second-half pitch study, about 340.2/340.5/341.1/341.6 seconds | Distinct north/south body silhouettes and leg positions | Keep admitted source-derived proportions; add four counter-strides in each kit without flipping the head/torso |
| Existing release/contact anchors | Ball release must follow the selected delivery pose | Pass/throw pose mirrors toward its actual target, including backward delivery; simulation events use that pose's contact anchor |

Camera damping, facing hysteresis and distance-based gait are **authored adaptations**. Exact reference input windows, pose holds, AI rules and diagonal/front/back coverage have not been recovered. Mirroring is not evidence for an unseen view. This revision does not claim a complete animation reconstruction.

## Implementation

- Full-height safe-area-aware handheld with physical directional/action grips, three contextual action buttons, pause, menu and fullscreen. The player may dismiss the portrait rotation guide.
- **Screen +** overlays the grips and grows the actual drawing width, rather than stretching a fixed canvas. Logical height stays 224; width adapts from 320 to 640. Sprite atlas filtering remains nearest-neighbour. Fullscreen and orientation lock depend on browser support and a user gesture.
- Travel-distance gait preserves six fixed updates per pose at full running speed, slowing the gait during short arrival steps. Facing hysteresis avoids north/east flicker under small steering changes.
- Eight additional native-grid poses, 79 total atlas regions. Head/central torso pixels stay fixed; declared lower-leg/outer-arm clusters exchange their stride. Both kit versions, editable pixel deltas, masks, parent regions, anchors and hashes are retained in `motion-assets`.
- Deterministic procedural stadium art follows the observed composition, with invented ARCADE/FOOTBALL boards. No source sponsor graphics are copied into the rebuilt stadium.
- Existing 11v11 match, two 90-second halves, AI, restarts, original audio, results and host messages remain in the same runtime. Protocol validation accepts both complete known version sets, rejecting mixed versions.
- Pure TypeScript simulation remains independent of the React/Three.js presentation. Resize observers, event subscriptions, graphics, audio and input are disposed on remount.

## Assets and provenance

`registered-handheld-assets.json` records 14 importer registrations: eight poses, four edit masks, native review and atlas. Approval remains **reference**, `productionEligible:false`. Build scripts reuse matching asset IDs by content hash. Parent source pixels and base atlas remain available under `src/features/games/retro-football/assets`. Editable ledgers distinguish source-derived pixels from authored cluster edits. Public asset rights/approval remain a separate release condition.

## Review and validation

Review the rendered evidence independently of the implementation description. Native/enlarged sheets: `motion-assets/native-review.png` and `enlarged-review.png`. Gameplay evidence: `test-results/retro-football-handheld/landscape-play.png`, `landscape-screen-plus.png`, `stadium-detail.png`, portrait/menu views and `movement-review.mp4`.

Automated structural checks, visual inspection and gameplay checks are separate evidence. The browser harness exercises keyboard, simultaneous touch/cancel, camera expansion, pause/menu, portrait, fullscreen, native host pause/resume/disposal and repeated resource cleanup. It includes 568×320, 667×375, 844×390, 915×412 and 1280×720 landscape layouts. The motion movie contains complete movement cycles and tackle/recovery at 30 fps and is decoded with FFmpeg.

Physical-phone frame time, input latency and memory have not been measured. Browser checks do not establish source-native timing, visual perfection or public release clearance. The inherited special shooting view still needs a coherent foreground-shooter sequence. Additional diagonal poses, source-specific aerial/keeper detail and reference camera transitions remain further fidelity work.

## Local preview

From this checkout run `npm run build:games`, then `node scripts/preview-retro-football.mjs`. Open **http://127.0.0.1:3064/** in a browser; opening index.html in an IDE shows its code. `/offline` serves the same runtime as a standalone self-contained host bundle. No Next.js server or Flutter painter is needed for that bundle.
