# Retro Circuit fidelity execution — 23 October 2026

Maintained candidate: Future Games Web `src/features/games/retro-circuit`, build **0.5.0-fidelity**, rules **103**. Existing product identity APEXBREAK 3 is preserved. No push, publication or Flutter import.

This is a reference-led playable candidate, **not accepted as an exact Top Gear port**. Unknown controller inputs, inferred route geometry and original replacement artwork prevent a frame/input-equivalence claim.

| Plan point | Delivered | Remaining gate |
|---|---|---|
| 1. Reference contract | Primary original SNES white-car Las Vegas/km-h recording, retained hashes, rollback feature/bundle | Region/emulator settings unconfirmed |
| 2. Comparison lab | Side-by-side pane, overlay, source stepping, fixed simulation step, playback rate, native size, horizon/width/curve diagnostics | Matched-event acceptance thresholds and human approval |
| 3. Camera | Wide 480×180 study field, horizon48, separate continuous road physics, hills and crest clipping | Full anchor sweep on all bends and physical screens |
| 4. Cars | Four original families, straight/flanks/brake/boost/contact, deliberate distant LOD, overhead art, independent shadow anchors | Final scene motion acceptance |
| 5. Route | Separate 1.20km three-lap Vegas study, predominantly left triangular route; canonical map/progress/hazards/pit data | Distances/connecting geometry inferred, not recovered source course |
| 6. Handling | White211km/h manual baseline, source-envelope launch, ~1.36 boost ceiling, gradual decay; separate350km/h arcade profile | Controlled input comparison unavailable |
| 7. Opponents | Seeded full-course traffic, held passing choices, queues/avoidance, boost and pit strategy | Full source traffic distribution match |
| 8. Resources | Three edge-triggered nitros, warnings, partial refuel, correct car pit scene, coasting/DNF | Source fuel/collision thresholds remain authored |
| 9. Presentation | Original retro menu/car selection, six course options, names/countdown/GO, run-out/rank/fade, track records | Results hierarchy and remaining source presentation differences |
| 10. Complete race | Decoded30fps uninterrupted public-input race:66.031s, three laps, position7, no forced stop; reference64.96s | Full manual human play-feel acceptance |
| 11. Courses/audio | Reference-led green/coast/dusk routes plus three preserved arcade courses; original event audio and gear pitch | Additional exact routes not surveyed; listening/mixed recording pending |
| 12. Integration | Selected offline bundle, existing host bridge, local saves, simultaneous touch and four landscape sizes | Final checks recorded separately; physical Android/iPhone and WebView acceptance pending |

## Verification artifacts

- [Source measurements](reference-measurements.json), [source review](reference-review.md), [comparison board](source-comparison-board.png).
- [Art manifest](art/manifest.json), [registered assets](art/registered-assets.json), [frame inspector](art/index.html). Forty original sprite PNGs and four review artifacts registered as reference review, not production accepted. Art validation120checks; art-only silent movie5.2s decoded.
- [Browser checks](evidence/browser-checks.json): menus and controls fit568×320,667×375,844×390,932×430; minimum44px targets; three simultaneous touches/cancellation; pause/restart/records.
- [Full race](evidence/complete-reference-race.mp4), [race events/inputs/result](evidence/complete-reference-race.json). Recording starts at the grid, not selection; no race-state injection.
- [App checks](evidence/app-checks.json), [repository checks](checks/results.json), [independent review](independent-review.md), [second review](independent-review-round2.md).

Final checks:279/279 repository tests pass; lint/typecheck pass; production build passes. Ten landscape/touch/menu checks pass. Actual static app launch,pause,restart,garage and exit pass with no browser errors. Final static-export status is recorded in checks/results.json. Other four game bundle hashes are unchanged. The first run’s compulsory-pit assertion was corrected because the efficient car safely retained24.69%fuel without stopping; the rerun passes.

## Deliberate differences and unresolved work

Single full landscape view replaces source split panes. Touch controls, automatic transmission, local ranking and original artwork/music remain product choices. Vegas primary has no roadworks; black/yellow corridors belong to secondary evidence and adapted longer routes. Dusk source course card has five laps; candidate short format deliberately uses three. No campaign/manual/multiplayer parity is claimed.

Physical Android Chrome, iPhone Safari and mid-range-phone60fps median/p95/p99 measurements remain unavailable. Headless Chromium is software rendered and is not phone performance evidence. Original audio has not received a listening acceptance or mixed-race review. No source ROM, exact physics, native frame holds or source-code recovery is claimed.

Preview: http://127.0.0.1:3127/fidelity-v1/ (comparison), `play.html` (built game). Editable maintained source is in Future Games Web; Designer work copies are evidence/history, not a second runtime owner.

Scene stills are labelled fixtures in evidence/README.md. In particular the synthetic finish still uses source64.96 for layout review; only the actual MP4/JSON establishes the candidate66.031-second seventh-place result.

Second independent review resolved the four concrete direction/layout/countdown/LOD findings. Future rules-version record compatibility remains open; current source-study courses use separate IDs from legacy arcade courses.
