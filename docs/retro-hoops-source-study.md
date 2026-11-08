> Local movement v2 now provides dedicated authored running, dribbling and defensive clips. See [movement v2](retro-hoops-movement-v2.md). Historical1.3 gaps below describe the prior release; native timing and eight-direction turns remain unverified.

# Retro Hoops source comparison and movement refinement

Scope: Future Games Web only. Rules 1.3.0, motion 1.0.0, handheld-v1. Existing registered reference rasters are reused; no new commercial sprites have been extracted or traced in this pass. This is a source-informed adaptation, not a completed frame-exact recreation.

## Evidence boundary

The retained primary recording is https://www.youtube.com/watch?v=6fyRg0wTEYY (uploader claims PAL; Street Hoop title/country selection visible, exact revision/settings unknown). The comparison is https://www.youtube.com/watch?v=Q6ThHgZ4Lnk (Neo Geo per title, exact region/revision unknown). These were studied in the prior evidence pack; this pass does not claim a new native-frame capture or verified input stream.

The Japanese home manual diagrams document contextual A shoot/dunk/block, B pass/steal, scoring and area-dependent specials. They do not establish European timing windows or movement algorithms. The official reissue description https://www.arcadearchives.com/en/title/ang-054/ identifies super dunks. All numerical AI, physics, clip holds and timing here remain authored tuning.

| Aspect | Source evidence / gap | Previous implementation | This pass |
|---|---|---|---|
| Court composition | Observed selected marker, elevated full-court scrolling around primary 62 x 73s | 480 x 360 orthographic court (previous version) | 640 x 360 wider view; preserve sprite scale and expose more world inside a slimmer bezel |
| Movement | Documented eight-way joystick; complete native gait cadence unknown | Every actor used global tick modulo3 | Per-athlete travelled distance advances poses; stationary actors stop cycling gait |
| Dribble | Source-derived three-pose reference study; sampling is not native cadence | Global loop; abrupt horizontal ball offsets; cosine bounce | Local owner clock shared with pose selection; continuous horizontal/vertical path and one floor-contact cue per cycle |
| Pass | Manual contextual B; existing preparation/release reference poses | Gather12, extension/release18 | Preserve hand/release anchors and complete preparation -> flight -> receive; inspect both directions |
| Shot | Manual A; existing four source-derived poses | Preparation?rise?release?follow | Preserve release at22 and authored holds; verify ball contact/airborne recovery |
| Dunk | Documented direction+A and charged action; existing gather/contact/landing rasters | Ball release immediately selected a generic landing pose even high in air | Keep contact silhouette aloft after score, then landing pose near ground; preserve physical descent |
| Defensive action | Manual block/steal; dedicated footwork and recoil sets incomplete | Reused crouch/overhead/neutral | Retain explicit authored clips, improved grounding; dedicated lateral slides remain a gap |
| Score feedback | Observed large score overlays around primary73 x 85s | HUD score only | Brief team/point callout derived from authoritative score event, never duplicate scoring |
| Depth and weight | Observed raised ball and airborne players | Selection ring only in Three renderer | Player and ball ground shadows; height-dependent athlete shadow size |
| Cabinet controls | New product direction, not a Street Hoop feature | Controls below court; landscape required scrolling | Full viewport handheld shell; thumb controls beside court; gesture fullscreen; portrait fallback |

## Review procedure

`npm run test:retro-hoops` verifies six seeded full matches plus contact/buzzer/input/storage cases and continuity/ownership properties. `node scripts/build-retro-hoops-motion-review.mjs` builds an offline diagnostic inspector using the same simulation and actual Three renderer beside Canvas anchor overlays. `scripts/check-retro-hoops-motion.mjs` captures 61 native-size frames per scenario in both directions. Captured loops cover dribble, block, dunk, charged dunk, pass, shot and recoil. Holds are authored; 30fps exports do not establish source timing.

`node scripts/review-retro-hoops-console.mjs` checks landscape and portrait viewports, real browser touch pointers/cancellation, keyboard sliders, modal Escape, pause and fullscreen. Physical Android/iOS devices and WebView fullscreen/safe-area/audio policies remain unverified. Reference art remains temporary per ASSET-REPLACEMENTS.md. Original synthesized audio is retained without third-party tracks or samples.

## Remaining source-detail work

Dedicated off-ball sprint, backpedal, defensive slide, directional receiving/turning and aerial pass sequences need coherent original or rights-cleared art before replacing the current sparse-pose adaptations. A faithful source cadence needs denser verified frame/input evidence; footage sampling alone cannot supply it. Crowd animation, net deformation, contact variants and more detailed court dressing need their own bounded visual pass. These are explicit gaps rather than claimed recovered features.


## Outdoor venue reconstruction ? enlarged landscape pass

This pass visually inspected retained source frames `opening-play/sample-0030.png`, `opening-play/sample-0070.png`, `score-restart/sample-0015.png` and `second-possession/sample-0010.png`. The charged dunk sample114 shows a white special-effect background and is excluded as a normal scenery reference. The primary opening/score frames show grey asphalt, a broad blue lane, orange/blue center paint, white boundaries and yellow arc; a raised paved strip borders green lawn with spectators/benches/bicycles and a low brick wall. Sand, water and palms appear beyond that wall. The comparison venue differs, so this is the primary park arrangement, not a claim of one universal source court.

`court.ts` reconstructs these bands and equipment relationships with original code-drawn shapes and pixel clusters. Proportions and palette are authored approximations fitted to the existing legal court, not measurements recovered from a console binary. No source logos, country names, commercial background sprites or screenshot pixels are copied into the scenery. Existing player/basket rasters retain their reference classification.

The 640 x 360 view changes presentation only. Simulation remains on the same900 x 360 world with unchanged ball/rim anchors and legal movement boundaries. Bounded camera placement expands the visible horizontal range rather than scaling athletes differently. The source aspect ratio is not stretched. Normal overlay/HUD space moves into the bezel; landscape browser chrome still depends on user-gesture fullscreen support.
