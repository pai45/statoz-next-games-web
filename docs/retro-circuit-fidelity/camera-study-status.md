# Retro Circuit resumed camera delivery — 24 October 2026

Maintained candidate **0.6.1-camera-study / rules104**. User-confirmed mobile adaptations remain: one landscape view, automatic gears, left steering, right pedals/nitro, three study courses and local records. No release/deployment or Flutter import.

## Delivered in this revision

Fixed the previously rejected crest regression through a camera-follow height model. The nearest camera/player strip is protected from terrain displacement; distant height fades between300–540 track units, preventing repeated-lap crests from occluding the first straight. Physics, terrain grades, AI, fuel and results remain unchanged.

The corrected projection passes3003 independent full-lap/lateral fixtures: player always visible, contact approximately163.90–163.94px, horizontal position77.65–400px, no numerical vertical road gaps, foreground reaches the180px bottom. Six native rendered scenes were independently inspected: start, climb, crest, descent and lateral extremes. The prior missing player/foreground failure is resolved in the sampled scenes. Crest hides the skyline around68.4–90.1% of the candidate lap, then restores it. Source event alignment remains unaccepted; the observed source late blind crest is closer to the lap end.

Two maintained camera regression tests cover the full-lap near-road/player relationship, crest occlusion, traffic clipping and skyline return. Ten browser checks cover menus/controls at568×320,667×375,844×390,932×430, simultaneous touch cancellation and pause/restart/records. Required repository/build checks are in ../fidelity-v1/checks/results.json; copy final results before claiming completion.

Final repository run:286/286 tests pass; lint and typecheck pass. The corrected-camera complete public-input film decoded successfully at30fps with the unchanged66.24589s sixth-place result. Production/static export status is retained in the validation JSON. Other games' four pinned bundle hashes are unchanged.

Production and static-export builds both passed. Version-pinned check results are copied to `checks.json`. Final actual-app launch/pause/restart/garage/exit results are in `app-checks.json` after that check completes. No remote pipeline or publishing action was run.

## Pacing evidence correction

The public driver still completes6th in66.24589s, laps25.50/20.383/20.367. Source first lap is approximately28.66s and total64.96s. **18.15s is only the mean of the two remaining source laps; it is not two independently measured lap records.** Earlier reports using18.15/18.15 as separate targets are superseded.

The isolated pacing study rejects changing boost acceleration: existing physics already reaches the observed boost-speed envelope. Traffic accounts for only0.85s of the first-lap difference. Different input timing/route pacing remain unresolved. A source-clock nitro replay is diagnostic evidence, not an authorized reason to insert throttle lag or change engine tuning. No physics adjustment was applied.

## Twelve-point status

| Point | Current status / remaining gate |
|---|---|
|1 Reference contract|Pinned primary recording, units and manual; region/input trace unknown|
|2 Comparison lab|Playable side-by-side, overlays, frame/event review; exact matched-scenario acceptance open|
|3 Camera|Foreground/player regression resolved and reviewed; source composition/event timing still differs|
|4 Car family|Four original near/flank/distant/overhead families registered; source artwork differs intentionally|
|5 Route|Ordered Vegas sweep windows/crests; metric geometry and lap pacing inferred|
|6 Handling|Measured envelope study; exact source inputs unavailable; no unsupported physics retune|
|7 Traffic|Continuous seeded grid/passing/hazard/pit AI; source motion distribution unaccepted|
|8 Resources|Nitro/fuel/pit/DNF exercised; exact source thresholds remain authored|
|9 Race flow|Menus/car/track selection, countdown, run-out/results/full classification and local records; hierarchy remains adapted|
|10 Full race|New corrected-camera30fps public-input movie decoded; fixture frames labelled separately|
|11 Content/audio|Three study courses plus retained arcade layouts;13original cues and mixed older race exported; human listening and full source-course mapping open|
|12 Integration|Offline bundle/local profile/landscape/browser/lifecycle checks; physical Android/iPhone and same-runtime Flutter acceptance pending|

Evidence: independent-review.md, independent-probe.json, native PNGs, pacing-experiment/review.md and evidence/complete-reference-race.mp4. Independent review accepts the narrow functional visibility gate only. Exact1:1 equivalence and full-plan acceptance are **not claimed**.
