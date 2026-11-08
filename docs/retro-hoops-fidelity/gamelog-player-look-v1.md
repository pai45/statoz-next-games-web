# User-selected GameLog video and player-design pass

Scope: Future Games Web only. Stable game ID retro-hoops; current host title Rimforge 3. Rules 1.7.0. Local only; no remote push/workflow/publication or Flutter import.

## Reference dissection

User-selected source: https://www.youtube.com/watch?v=_k8IIS9n3dk ? [ARCADE 60fps] Street Hoop longplay, GameLog. Opening/instructions and first-match excerpts approximately 0?53 and 53?113 seconds were downloaded with provenance and decode verification. The selected recording stream reports 59 fps. This pass did not inspect the entire 2063-second recording. Exact revision, native timing and input stream remain unknown.

Editable source study lives in the Designer research workspace at output/retro-hoops/gamelog-study-v1/dissection.json. The recording player/action catalogue is served at http://127.0.0.1:8940/ . It includes dense non-resampled recording frames for the shot at ~37.5?38.7s and pass at ~68.7?69.7s, plus opening possession and rebound surveys. Source time uses requested excerpt origin and can differ slightly from decoded origin.

## Court and animation

The selected first venue is a dark exhibition setting, rather than the earlier beach/park target: draped backdrop, standing/seated spectators, speaker/DJ desks, scaffold basket supports, and unpainted grey/olive lanes with pale court markings. Scenery was reconstructed in original code; source logos, soundtrack and video pixels were not imported into that scenery. Four authored spectator gesture phases animate independently of gameplay.

Observed pass gather/release is approximately 0.17?0.27 seconds; release-to-reception in the sampled pass is approximately 0.2?0.3 seconds. The existing world scale is calibrated with 14 preparation ticks, 16 minimum flight ticks and nine world units per tick; flight remains distance-dependent. Teaching jump takeoff/landing spans roughly 0.8 seconds, so shot takeoff velocity is now 240 at existing gravity 600. These are authored fits to recording observations, not recovered native constants. Shared phase values drive preparation, release, grip and recovery consistently. Current independent team AI and projection stay intact.

## Player family

The former black/grey and mustard kits did not match the user's video. The new family uses azure jerseys with violet shorts for one fictional team and azure jerseys with pale sleeves/red shorts for the other. Locomotion has a broader authored jersey silhouette, collar/hem trim, fold shading and original number-like marks. Action jerseys receive matching palette treatment and fuller edge clusters without stretching the sprite or moving hands/feet. Skin colours remain separate from gold-kit mapping. Socks/shoes preserve the existing family.

player-look-v1 contains 72 adapted existing action/idle layers plus unchanged equipment copies. locomotion-v4 contains 552 layers, retaining pre-existing reference heads and authoring jerseys, limbs and movement. Earlier assets and locomotion-v2/v3 remain intact. Generators: scripts/build-retro-hoops-player-look.py and scripts/build-retro-hoops-locomotion.py --v4. Structural review: scripts/check-retro-hoops-player-look.py. Provenance, source hashes, masks, frame anchors and output hashes remain explicit. No new video-derived commercial sprites were extracted. Existing retained heads/action silhouettes remain reference material and are not relabelled original or rights-cleared.

## Review boundary

Play http://127.0.0.1:8941/game.html ; inspect http://127.0.0.1:8941/ . Family sheet and actual production action loops live in test-results/retro-hoops-player-look-v1. Source recording sheets remain outside the production runtime. The original whole head/action poses are not fully rebuilt, native front/back torso variants and special effects remain gaps, and the full video is not recreated frame-for-frame. The result is a closer local reference-led player/venue family, not a certified 1:1 clone.

73 gameplay tests pass. Asset checks cover 552 locomotion and 72 action layers, hash/mirror/bounds, high-ball hand contact and unchanged foot regions. Lint/typecheck and production/static build are separate. Final production-loop, mobile UI and host flow results are recorded in gamelog-player-look-v1-validation.json. Physical devices and exact native source behaviour remain unverified.

Final verification: 73 tests, 552 locomotion/72 action-layer structural checks, 16 rendered/decoded action loops, six team scenarios, nine mobile console checks, lint, typecheck, offline/static builds and six actual host flow checks pass. The final exported game completes a match, stores one rules-1.7.0 result, rematches and exits/re-enters without browser/resource errors. The earlier concurrent-build lock was left intact and the later retry passed. No push/publication occurred.
