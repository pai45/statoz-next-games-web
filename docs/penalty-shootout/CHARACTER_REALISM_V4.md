# Character realism pass — character-motion-4

This pass keeps the native Three.js game and the existing controls. It targets believable handheld-era football characters, not a claim of modern scanned-player fidelity. All kit identity and added geometry are original; the official CC0 human foundation remains documented in the asset manifest.

## Character and equipment

The shared athletic body has restrained calf and quadriceps refinement, region-blended shoulder weights and authored eyebrows. Four existing face/hair presets retain equal gameplay dimensions. Blinking, gaze and outcome expressions remain supported. The 60-bone skeleton includes clavicles, twist bones, toe pivots and finger chains; both mesh detail levels use the same motion data.

The outfield kit combines ivory fabric, navy shoulder/chest panels and copper trim. The goalkeeper kit uses forest green, amber panels and matching socks. Separate shirt and shorts geometry includes side vent panels, waist folds, sleeve edging and hems. Fabric and skin receive original subtle normal maps. New boot tongues, laces and heel counters complement soles and studs. Articulated gloves have padded palms, fingers and back ridges. The fictional Athletic Club shield, Morgan/Ward lettering and kit numbers are game-owned artwork, not real team or athlete identities.

## Connected movement

Preparation includes breathing, a small weight shift and bounded gaze. The diagonal approach now authors foot targets against the same root path used by the simulation. Stance intervals anchor the ankle; swing intervals add toe clearance and coordinated arm swing. Driven, placed and chip contact remains at 1.0 seconds, with the existing 0.9-second aim lock. The striking boot is verified against the physical ball at contact.

The animation exporter explicitly converts posed bone matrices into local channels before keyframing. This fixes constant leg tracks caused by earlier matrix/channel baking. The editable Blender file and authoring script retain the corrected motions.

Keeper anticipation selects a seeded wave or crouch while waiting. A movement command or dive interrupts it immediately; the gesture does not delay input or consult an unreleased target. Raised gloves use reachable pose targets. The same final bones supply visible motion and collision shapes. Elbow poles favor a natural ready stance. Directional dives connect to side-specific folding, ground support and getting up at the landing position. A final foot replant removes temporary landing anchors so the standing feet return beneath the hips.

Blending, ball contact, physics, seeded gameplay variation, replay pose storage and exactly-once settlement retain their existing contracts. No animation samples an outcome or moves a ball into a glove. The runtime library set is unchanged.

## Review material and reproduction

See [the validation report](MOTION_VALIDATION.md) for final automated results, desktop/phone viewport captures and the 30 fps character showcase. The showcase uses the runtime renderer and fixed 120 Hz simulation samples; it is not a different character renderer or a claim of measured device frame rate.

Editable assets: [Blender source](assets/athlete-source.blend), [authoring script](assets/build-athlete.py), [motion compiler](../../scripts/build-shootout-motion.mjs), [provenance and hashes](../../public/assets/games/penalty-shootout/manifest.json).

The new keeper gesture idea comes from documented PSP controls. BitRunLog's linked game did not launch successfully during research, so no new FIFA animation timings or joint trajectories are claimed. See [reference notes](CHARACTER_ANIMATION.md) for the earlier video observations and their limits. Camera captures are visual evidence; physical phone, Safari and real-controller testing require separate hardware checks.
