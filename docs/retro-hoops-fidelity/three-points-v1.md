# Retro Hoops ? combined three-point implementation, local rules 1.6.0

Scope: Future Games Web only, stable game ID retro-hoops (the current host title is Rimforge 3). No push, pipeline, publication or Flutter import. Concurrent presentation, catalog and other-game changes were preserved.

## 1. Directional movement

Added authored four-pose weight-transfer pivots and eight-pose reverse defensive footwork. Pivot presentation does not lock control input. Eight-way movement retains normalized speed and distance-driven gait. A dribble reversal now transfers the ball across the body over four simulation ticks rather than changing side instantly. Matching arm layers cover the 18 ball phases and four intermediate hand positions. The arm, body bob and ball share the same phase/side; repeated reversals remain continuous.

locomotion-v3 contains 552 PNG layers (both kits and directions), retaining the existing reference torso and authoring limbs/hand transfer. Earlier locomotion-v2 is retained. scripts/build-retro-hoops-locomotion.py --v3 regenerates the pack. Its manifest records masks, anchors, hashes and authored timing. scripts/check-retro-hoops-locomotion.py --v3 checks dimensions, mirrors, bounds, retained source hashes and high-ball wrist geometry. This is not a recovered native movement atlas. Distinct native front/back torso poses and exact native frame holds remain unverified.

## 2. Complete action chains

Jump shots now take off during preparation at tick 10, release at tick 22 and continue the same vertical trajectory through recovery. Release no longer starts a second jump or resets vertical velocity. The shooter faces the attacked basket. Late preparation interpolates the held ball toward the release anchor. Pass preparation/release also interpolates its grip, and dunk-to-pass blends from the existing held-ball position.

The retained advanced-instructions/sample-0046.png explicitly shows B passing instead of a dunk. B can now cancel an airborne dunk before contact into one pass preparation and free flight. A cancelled dunk consumes no super charge and cannot score. The cutoff and animation holds are authored; the recording does not verify native input windows. Ordinary receive recovery continues to accept one buffered follow-up shot. Existing steal, block, rebound, landing, buzzer and restart constraints remain authoritative.

The teaching sequence also mentions a light A fake. Duration-sensitive fake input is not implemented by the current edge-action interface; this is a documented source-parity gap. Unverified shot-to-air-pass variants were not silently labelled recovered behaviour.

## 3. Rules, selection and six-player decisions

Two/three-point classification now uses the same ellipse radii and baseline centers as the drawn court instead of the earlier approximate circular distance. Selection has a ten-world-unit hysteresis margin to reduce near-tie flicker while transferring control to an owner immediately or a clearly closer defender. This is original tuning, not a measured native selection margin.

On-ball AI checks a clear forward passing corridor under pressure before taking a contested in-range shot; late-clock urgency still prioritizes a shot. Shot contest quality uses active defenders in front of the shooter, their distance and block state rather than counting every nearby body equally. The seeded probability formula remains original. Independent off-ball spacing, unique marks, rebound/chase, box-out and safety roles are preserved. Rebound planning does not inspect the hidden made/miss outcome. Completed matches, super-shot consumption, unique events and restart ordering remain tested.

## Source boundary and completion status

All three implementation areas are integrated and locally reviewable. Exact 1:1 verification is NOT complete: no verified edition/settings/input capture has been provided, and the existing recording samples do not establish native timing or AI algorithms. Retained controls are documented/observed; new numerical tuning, geometry and poses are authored. Existing short-match format, fictional teams, original audio and mobile controls remain explicit adaptations. No user visual approval, native-frame recovery or rights clearance is inferred.

Reference evidence: Designer/output/retro-hoops/source-study-v1/sources.json; advanced-instructions/sample-0046.png (~51.5 s in the primary recording); shoot-instructions and move-instructions. Reference pack nativeTimingRecovered remains false. The exact source revision/settings remain unknown. The source capture question was asked while implementation continued; no answer or approval is inferred from silence.

## Review

Play: http://127.0.0.1:8938/game.html . Inspector: http://127.0.0.1:8938/ . Select Pivot and backpedal, Dunk to pass, eight-way X/Y movement, or six-player AI. Handoff/export JSON remains separate from runtime code. Earlier court-v2 and team-ai-v1 review folders remain intact.

70 targeted tests pass. Asset checks cover 552 layers. The production inspector checks pivot/backpedal, hand transfer, dunk-pass and camera resizing. Six team scenarios cover both directions; 16 action loops are rendered and decoded at 30 fps (review sampling, not native source cadence). The current shared Settings/fullscreen policy and portrait rotation guard are tested without replacing those concurrent changes. Final lint, typecheck, static build and actual host-match outcomes are recorded in three-points-v1-validation.json. Physical devices, new audio listening and native source parity remain unverified.

Final validation: all 70 targeted tests, 552 layer checks, scoped lint, TypeScript, offline/static builds, four new feature checks, six team scenarios, nine console checks, 16 decoded action loops and six actual host flow checks pass. The host run completes a match, stores one rules-1.6.0 result, rematches and exits/re-enters successfully. Exact native parity remains unverified; this is a completed local implementation pass rather than a 1:1 certification.
