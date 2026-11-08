# Retro Hoops / fidelity candidate v2

Local web candidate: `fidelity-authored-v2-local`; rules `2.0.0`; asset pack `2.0.0`; reference profile `2`. Stable game ID `retro-hoops`; host display name remains Rimforge 3. No push, workflow activation, deployment or Flutter import.

## Implemented

- Preserved rules-1.7.0 runtime, fidelity records and offline bundle under `test-results/retro-hoops-baseline-1.7.0`. Source snapshots use `.snapshot` suffixes to avoid compiling a second runtime.
- Replaced the executable athlete and basket rasters with an original geometry-authored pack. The editable generator never loads source images. Its 1,556 frame entries contain 900 distinct pixel frames; repeated holds and aliases are not additional animation drawings. Two deduplicated atlas pages are used by the current manifest. Historical assets stay on disk but are excluded from the executable bundle.
- Added front/back locomotion variants, coordinated run/dribble/shuffle/brake/pivot/backpedal poses and explicit shooting, passing, dunking, blocking, reach, gather, recovery, fake and catch clips. Action metadata separates contact/release and recovery. Source/native timing is not claimed.
- Added a simulation-driven articulated hand overlay for held-ball actions, including perspective-correct grip. Shared authored rim coordinates align the basket artwork and simulation contact. Existing swept pass/block collision and authoritative ownership remain in simulation.
- Added a mobile landscape cream/olive handheld with red/gold buttons, a fitted 514×360 playfield, left-handed controls, bounded touch sizing, sliding diagonal pad input, cancellation cleanup and optional scanlines. The game fixes its own handheld layout; shared fullscreen/rotation lifecycle remains intact. Other games' saved presentation preferences are not rewritten to force this layout.
- Added a visible opening tip sequence, two periods beginning at 2:00, interval, result statistics and rematch. One-period C-type remains selectable. Period duration supports the documented 1:00–4:00 range in 15-second steps. The 2× countdown is an authored fit to recording observations, not a recovered native constant. The prior NBA-style 24/14 possession rule is disabled in normal play, with an opt-in diagnostic fixture retained for edge-case testing.
- Added second-A fake during early shot/dunk and existing B dunk-pass transitions. Dunk fake is instruction-documented; a second press for the light-press shot fake is an explicit mobile adaptation. Windows remain authored and labelled.
- Added staggered off-ball replanning and weak-side help while preserving unique assignments, passing lanes, cutting/outlet spacing, box-out/rebound/safety roles and the same actor action constraints. These are deterministic authored behavioural fits, not recovered AI.
- Extended existing saves without discarding historical results. Results include rules/build/asset/reference versions and match statistics. Host protocol stays at version 1. Existing identity, route, account isolation and reward-free play remain.
- Preserved original procedural audio, added a subdued crowd response and cue variation/priority handling, and rendered individual cues, music and a real simulated-event mix for review. No reference recordings or third-party samples are used.
- Extended the actual production inspector with source video, independent seeking/scrubbing, event markers, action phases, contact/collision overlays and repeatable scenarios in both directions.

## Evidence and deliberate limits

The intended product is [Street Hoop, Steam app 1189520](https://store.steampowered.com/app/1189520/). The [Steam announcement](https://steamcommunity.com/app/1189520) describes a rebuilt wrapper and controls; it does not verify that the arcade recording has identical settings or timing. The store page was region-blocked on direct access; indexed store text and the community announcement were available.

The user-selected [GameLog longplay](https://www.youtube.com/watch?v=_k8IIS9n3dk) supplies the exhibition-court study. Bounded, hashed, silently decoded research excerpts cover requested seconds 0–283. The opening and selected actions have dense inspection; later sections were surveyed at coarse intervals. This is not a continuous frame-by-frame dissection of the complete recording.

Observed landmarks include shot preparation/release/landing around 37.5–38.7, pass/reception around 68.7–69.7, first-half end around 143, second-half 2:00 reset around 158 and final result/statistics around 270–278. The selected stream reports 59 fps; those recording frames do not establish native frames or controller-input times. Requested seek origins have the capture tool's recorded uncertainty.

The [arcade settings sheet](https://www.arcade-museum.com/manuals-videogames/S/Street-Slam--Street-Hoop-Soft-DIP-Settings.pdf) documents configurable period structures and play time. The [Dunk Dream home manual](https://www.gamesdatabase.org/Media/SYSTEM/Arcade/Manual/formated/Street_Hoop_-_Street_Slam_-_Dunk_Dream_-_1994_-_Data_East.pdf) is supplementary, edition-labelled evidence; it is not treated as proof of Steam behaviour.

Reference recordings remain in research/review tools only. REA was not used to recover console code, AI or native constants. No binary algorithm recovery is claimed.

## Review state

This is an implemented and technically tested local reconstruction candidate, **not a completed Street Hoop fidelity sign-off**. The current original player construction, front/back anatomy, venue detail, camera composition and special effects remain approximate. The source's full animation richness and motion character have not been established by the frame count or unit tests. Keep visual approval false until the actual-size comparisons pass an independent review.

The opening winner is deterministically seeded, rather than a recovered native jump-ball algorithm. Two-button selection, draw/buzzer policy, action interruption windows, shot probabilities and AI reaction tuning retain authored decisions. Difficulty remains one balanced implementation, not a false claim of recovered arcade difficulty levels. Effects use original equivalents and the full source special-effect family is not reproduced.

Physical Android Chrome and iPhone Safari testing is unavailable in this session. Browser emulation and SwiftShader measurements are reported separately. No physical-device performance pass is asserted. The updated sound mix is rendered and structurally checked; listening review remains pending. The user's earlier provisional audio approval is preserved accurately.

## Local review and repeatability

- Play: http://127.0.0.1:8942/game.html
- Source/production inspector: http://127.0.0.1:8942/
- Action loops: http://127.0.0.1:8942/action-review.html
- Character sheet: http://127.0.0.1:8942/player-family.png
- Original audio: http://127.0.0.1:8942/audio/

The server is a local Python HTTP server serving `test-results/retro-hoops-authored-v2`; it can be restarted on port 8942. Review output contains commercial reference footage and must not be included in a release package.

Rebuild art with `python scripts/build-retro-hoops-authored.py`; validate it with `python scripts/check-retro-hoops-authored.py`. Run `npm run test:retro-hoops`, lint, typecheck and the local static build. Production inspector builders and dedicated browser checks live under `scripts` with the `retro-hoops` prefix. See `fidelity-v2-validation.json` for the final check results and hashes.

## Completion and later deployment checklist

1. Review complete production action loops against reference sequences at actual mobile display size. Record specific anatomical, timing, camera and contact differences; do not certify them from structural checks.
2. Resolve the recorded visual mismatches in a separately versioned revision. Preserve this candidate and its research evidence. Do not silently promote draft art to approved status.
3. Listen to the revised individual cues and full gameplay mix. Record the verdict without substituting waveform checks for listening.
4. Run full-match, rotation, backgrounding and repeated-navigation checks on physical Android and iPhone devices; record frame-time percentiles and device/browser versions.
5. Recheck protocol/save compatibility, current offline bundle hashes and source/audio provenance. Keep native-input/AI limitations explicit unless controlled reference access becomes available.
6. Only after a later explicit publication request, prepare a concrete reviewed file scope, exclude other games' concurrent edits, push the authorized candidate and verify the repository's existing deployment pipeline and live build identity. Nothing in this local implementation activates a remote pipeline.
