# Retro Hoops movement v2 ? local candidate

Scope: Future Games Web only. Rules1.4.0; motion2.0.0. No GitHub push, workflow activation, publication or Flutter import is authorized by this movement request.

## Movement changes

The previous pack reused three crouched dribbling poses for off-ball movement. This family has12 dedicated running poses,12 dribbling body poses,8 defensive shuffles,4 stopping/settling poses and18 separate dribbling-arm poses. Navy/amber and explicit left/right variants produce216 PNG layers. All are144x128 with the existing feet anchor72,116; no character scaling or full-body rotation is used.

The run cycle coordinates shoulder, elbow, wrist, hip, knee, ankle and shoe positions. Stance feet counter the travelled distance while the swing foot lifts and recovers. Torso inclination, short hems, separate leg shading, socks and shoes stay consistent. Close defenders keep their chest facing the ball while retreating or shuffling. The stop clip bends and settles into neutral over8 simulation ticks without delaying control input.

The dribbling body and arm are intentionally separate layers. Legs advance by postcollision travel; the arm uses the owner-local18tick dribble cycle. The hand, ball and torso share the same bob offset near the grip. The overlay is hidden immediately when ownership/action changes, preventing a spare arm during passes, shots, dunks or turnovers. Stopping mid-bounce finishes the bounce before returning to carry, avoiding a floor-to-hand snap. Stationary close defenders retain a low ready stance. Body collisions no longer advance the gait as if attempted movement had succeeded.

## Art/provenance boundary

The existing reference-classified head and jersey pixels are retained from each kit's `neutral-a-source.png`, using the editable mask in `scripts/build-retro-hoops-locomotion.py`. New limbs, shading, joint geometry, frame holds and mirrors are authored adaptations. No additional commercial-game frames were extracted or traced in this pass. Because retained pixels remain reference material, the combined family is not relabelled wholly original or rights-cleared. `public/games/retro-hoops/locomotion-v2/manifest.json` records source hashes, frame hashes and both-direction anchors.

This is source-inspired arcade movement, not recovered native Street Hoop animation. Dedicated turn-in-place/eight-direction torso variants and richer aerial/contact reactions remain explicit gaps. The existing shot/pass/block/dunk artwork is preserved. The park court, handheld shell and original synthesized audio remain unchanged.

## Review and local preview

`python scripts/build-retro-hoops-locomotion.py` regenerates the frames. `python scripts/check-retro-hoops-locomotion.py` verifies hashes, dimensions, explicit mirrors, bounds and high-ball grip geometry; it does not substitute for visual review.

`node scripts/build-retro-hoops-family-review.mjs` creates a side-by-side pose workshop with normal/half speed, per-tick stepping, both kits/directions and the ground anchor. The previous panel shows the three-pose reuse; the new panel uses the same `poseFor`/arm overlay as production. It isolates animation, not full match rules.

`node scripts/build-retro-hoops-motion-review.mjs retro-hoops-movement-v2` creates the same-state Canvas/Three action inspector. The browser check and encoder accept this version as an argument so prior review artifacts remain separate. `node scripts/serve-retro-hoops-local.mjs 8933` serves the workshop at `/`, the actual offline game at `/play/`, and full action inspection at `/review/action-review.html`.

Use `PLAYWRIGHT_MODULE_PATH` for an externally installed Playwright module when needed by development review tools. Pillow and imageio-ffmpeg are required for the Python preview/check tools only; there are no new production dependencies.

Physical phones/WebViews and acoustic listening are not verified by this pass. No remote push or pipeline activation should be performed unless the user explicitly requests it.

## Validation result

46 Retro Hoops tests and 16 Retro Circuit regression tests pass. Scoped lint, TypeScript and the production/static build pass. Review artifacts contain 216 verified asset layers, eight decoded comparison loops, 14 decoded production action loops, nine browser checks and six exported-app integration checks, including a complete match/result/rematch. The final running and stopping contact sheets were visually inspected for the local candidate.

Whole-project lint reports errors in concurrent Retro Football edits; those files were preserved. Native source cadence and physical devices remain unverified. See `retro-hoops-movement-v2-validation.json` for hashes and limitations. This revision has not been pushed or published.
