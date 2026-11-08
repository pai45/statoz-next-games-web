Latest implementation: [character-motion-4 realism pass](CHARACTER_REALISM_V4.md). The following records the earlier foundation and reference review.

# Character and animation upgrade — character-motion-4

## Reference review

The user selected FIFA 14-era character detail and visual variety with the existing controls. This is original work informed by visible reference poses, not recovered EA animation, physics or character data.

| Reference | Timestamp | Observed movement | Original adaptation |
| --- | --- | --- | --- |
| [PC shootout](https://www.youtube.com/watch?v=yxvbfvs3pAo&t=8s) | 8.00–8.75 | Balanced preparation and anticipation | Breathing, weight shift, small gaze/head changes |
| Same | 8.75–10.00 | Accelerating angled approach, support-foot plant, contact | Three shot-specific sequences; 1.0 s contact and 0.9 s aim lock |
| Same | 10.00–11.75 | Follow-through, balancing steps, keeper landing/recovery | Connected follow-through and seeded reactions |
| [PS4-labelled demo](https://www.youtube.com/watch?v=pXgs9D7KnKM&t=6s) | 6.00–7.00 | Approach, hip/arm coordination and strike | Explicit backswing, ankle action and planted support foot |
| Same | 7.00–8.25 | Push-off, extension, side landing | Directional low/middle/high dives with bounded reachable hands |
| Same | 8.25–9.75 | Ground support and recovery | Hand support, folded legs and getting up where the keeper landed |

### Additional browser reference checked 21 October 2026

[BitRunLog](https://bitrunlog.com/) links to [FIFA 14 Web Online](https://fifa14.online/). The destination documents PSP Ad Hoc multiplayer, PSP SAVEDATA and PSP controller mappings, and credits [PSP Web Recomp](https://github.com/snuri00/psp-web-recomp). Treat it as a potential PSP presentation reference rather than evidence of Vita-specific controls. It could support comparison of silhouettes, run-up cadence, support-foot placement, keeper push-off/landing and recovery once playable footage is verified. The browser opened the page, but automation could not attach to its debugger, so no live gameplay or new animation timings were verified in this pass. No game data was downloaded or incorporated into StatOz.

## Delivered character work

The official CC0 Human Base Meshes realistic male object remains the foundation. Garments are separate eased shells with split sleeve boundaries, collar and shorts hems. Footwear has continuous uppers, soles and studs. Gloves have padded palms, backs, cuffs and articulated digits. Four original hair/face presets retain identical gameplay dimensions. Face morphs provide blinking, small iris movements, smiles and tension.

The anatomical rig uses 60 deform bones, including root, clavicles, toe pivots, limb twist bones and finger chains. Region-specific weighting prevents torso/arm and left/right leg attraction. The original rig's ankle pivots were recalibrated to the source mesh before fitting the footwear. Two mesh detail levels share the skeleton and motion contract; narrow viewports or four-core devices load the lower mesh.

There are 33 exported clip names, including compatibility aliases. Runtime states select shot styles, shuffles, directional dives, centre blocks, contact reactions, recovery and seeded taker reactions. Clips are authored in Blender at 30 fps and sampled by the simulation at 120 Hz. Ordinary transitions blend for 17 simulation ticks, approximately 142 ms. Support-foot IK includes a bounded 5.5 cm pelvis correction when necessary; limb lengths never stretch.

## Runtime and compatibility

One CPU skeleton evaluator owns the final pose. Goalkeeper palm, head, torso and limb collision shapes follow its bones. The renderer interpolates those recorded local transforms. Pose snapshots and ball transforms are held in memory for at most 1,920 ticks (16 s); replays do not rerun physics or settlement. Backward tick jumps discard the preceding live frame before replay interpolation begins.

Contact facts include tick, body part, solver contact position, incoming relative velocity and catch status. Catches require actual hand contact, relative speed below 13 m/s, hands less than 0.75 m apart and an uncommitted/centre keeper. Captured balls retain their contact offset from the contacting palm. Other contacts remain dynamic parries/deflections. A keeper touch alone never resolves a kick.

Cosmetic choices derive separately from the session seed and do not consume gameplay randomness. Controls, launcher props, match rules, saved progress and rewards retain their contracts. Contact facts are optional on results, and older history remains readable. The post-result movement tail is three seconds and can be skipped immediately.

## Editable source and reproduction

Use the pinned Blender LTS toolchain and the source URL/archive hash recorded in the asset manifest. Run Blender in background mode with the authoring script and explicit paths:

`blender --background --python docs/penalty-shootout/assets/build-athlete.py -- --source <human-base-meshes-bundle.blend> --output <export-directory>`

Copy the generated GLBs, movement metadata and textures into the game asset directory, retain the compressed editable Blender source in this document's assets folder, then run `node scripts/build-shootout-motion.mjs`. Regenerate manifest hashes after exporting. Inspect both mesh levels and contact frames before accepting an asset revision. The motion compiler samples the exported skeleton/tracks directly rather than maintaining a second set of animation constants.

No new runtime dependency, paid asset, reference logo or EA asset was added. Work remains local; no push or deployment was performed.

## Validation evidence

See [MOTION_VALIDATION.md](MOTION_VALIDATION.md) and [evidence-motion-v3](evidence-motion-v3) for final checks, captures and hardware limitations. Physical phone, iOS/Safari and real controller performance must be recorded separately from desktop viewport emulation.
