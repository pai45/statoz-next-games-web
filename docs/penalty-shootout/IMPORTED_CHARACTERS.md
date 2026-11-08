# Imported Penalty Shooters 2 characters

User-requested local replacement, 26 October 2026. Active renderer: `rendering/imported-athletes.ts`; runtime version `imported-characters-9`.

The mounted game now displays the actual captured striker and goalkeeper art from 10x10games' Penalty Shooters 2 on Poki. These are commercial reference-game sprites, not original StatOz art and not covered by the retired Blender model's CC0 licence. On 26 October 2026, the user confirmed having permission to publish these sprites on GitHub Pages. The terms and underlying grant were not independently reviewed.

Runtime assets live in `public/assets/games/penalty-shootout/imported-characters/`. Its manifest records source URL, deployment, approval scope, animation holds, frame rectangles, pivots and contact anchors. The imported files are local and support the existing base-path and device-asset packaging.

The pack contains 55 striker frames and 155 goalkeeper frames across Idle, MidCatch, MidParade, LowCatch, HighCatch and HighParade. Body, shirt, shorts, stripes and shading were composited using native atlas rectangles, rotation flags, origins and layout scales. PNG actual-size frames, contact sheets, GIF loops, a frame inspector, original source sheets, REA captures and an editable compositor remain in Designer research at `research/penalty-shooters-2/2026-10-26/import/`. These are flattened bitmap layers; no 3D model or skeletal rig was recovered from this game.

## Adaptation to this game

- The 3D pitch and ball remain; camera-facing sprites replace both GLB actors. The live and replay camera stays behind the striker because the supplied art depicts the striker's back and keeper's front. Keeper commands are converted at the input boundary so controls still follow screen direction.
- Frame 42 is the visually inferred boot-contact frame, not an observed source-engine event. The approach is retimed to the existing one-second ball release; follow-through uses explicit source holds. The boot contact anchor is projected using camera right/up vectors.
- Native keeper sequences include drop, landing and recovery. Only lateral simulation travel is added; applying the old pelvis drop again would put the sprites below the pitch. Side dives use hand-placed keyframes (`DIVES` in `rendering/sprite-motion.ts`) inside the existing 2.75-second dive/recovery window; native left dives mirror for screen-right. See *Save animation and effects* below.
- The source striker has no complete recovery or celebration clip. Once the existing simulation enters a result reaction, the renderer returns to the grounded neutral frame rather than holding the source's raised-boots terminal pose.
- Source-perspective feet can project below the ball's ground point. Sprites therefore render without the flat plane's grass depth clipping, with keeper before striker. Shadows are described below.

## Save animation and effects (28 October 2026)

User request: better keeper save animation, plus shadows and effects on both athletes. Renderer-only; simulation, colliders, odds and replays are unchanged.

- **Dive timing.** Each source dive opens with five near-identical standing frames. Stretching them over the reach window left the keeper standing for about 0.4 s while sliding sideways, then popping into the air. Dives now start on the loaded stance, are airborne by 0.17-0.18 s, reach full stretch alongside the collider extension, land at 0.62 s (mid) / 0.68 s (high), and fill the rest of the window with the native ground, get-up and reset frames.
- **Low side dive.** There is no native one; the old renderer played the centre kneeling scoop while sliding sideways. `LowDive` reuses the mid dive's push and flat near-ground frames, with a short sprite tilt toward the post between them.
- **Centre saves** play at their authored 0.4-0.5 s speed, hold, then reverse into the ready stance (low centre saves keep their native get-up).
- **Shadows.** Every frame's silhouette is measured once at load. A silhouette shadow (the current frame laid on the grass) and a soft contact shadow follow the drawn feet. The keeper's fade and stay on the ground while airborne. Character shadows fall screen-right and toward the camera, because a shadow falling away from this low camera collapses to a line.
- **Effects** (off under reduced motion): a short afterimage trail of airborne dive frames, turf and dust thrown up on landing (drawn behind the body), a turf flick at boot contact, and a glove-impact flash when the ball is stopped or turned back near the keeper. Everything is computed from recorded simulation time, so pause and replay match.

## Limits

The current Rapier ball simulation, AI and skeletal collision rig remain in use. Imported glove pixels are not recovered collision geometry. Save poses and ball contacts are therefore an adaptation; source-game hitboxes, shot formula and AI were not imported. All three existing shot styles use the same imported kick sequence. Existing audio, scoring, accounts and rewards remain owned by Penalty Shootout.

The old GLBs and authoring documents remain as historical assets and collision-motion references, not the visible runtime athletes. Older reports about visible bone/boot alignment apply to that earlier renderer.

## Checks and review

`npm run test:shootout` includes source frame counts, atlas bounds, contact-marker sampling, deterministic replay sampling and source-facing camera checks. `node scripts/verify-shootout-sprites.mjs` renders actual scene screenshots at ready/contact/follow-through, left/high/low dives and recovery, then records both full actions to WebM under `test-results/shootout-import/`. Use `SHOOTOUT_CHROMIUM` for an existing Chromium executable when necessary. The script is a review harness around the production scene/simulation, not a second character renderer.

The separate art pass found and corrected a floating settled striker and missing contact shadows. Controlled captures show source frame42 at ball release with no missing layers or cropped limbs. Browser checks and build results are recorded in the task's validation report.
