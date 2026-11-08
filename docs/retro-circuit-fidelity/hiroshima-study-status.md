# Retro Circuit — three source-led courses

24 October2026. Maintained Future Games Web candidate **0.9.0-hiroshima-study / rules107**. APEXBREAK3 identity and the agreed mobile adaptations are retained. This revision follows the pinned0.8.1 Los Angeles/renderer fix; earlier versions and incompatible results remain preserved. No publication, deployment or Flutter import.

The study choices are now Las Vegas, Los Angeles and Hiroshima. All three have identifiable recording evidence and distinct original environment families. Three legacy arcade circuits remain available, including their roadworks/obstacles and longer-race fuel choices.

## Hiroshima evidence and adaptations

The [primary source recording](https://www.youtube.com/watch?v=gFMgYrdlTF8) shows Hiroshima/Japan,2.34km,**five source laps**, printed record3′24″55. Eight new bounded excerpts2030–2270s cover the complete upper white player's race and results; hashes, recording properties and decode checks are in `hiroshima-source/sources.json`. Region, native console cadence and input trace remain unknown.

Observed: hooked asymmetric course map, lamp avenues, crests, chevrons, low sun, distant torii, festival banners, yellow pit markers and blue billboards. The first lap has near-black road/verges and dark red/orange sky. Later laps have orange/gold sky, grey road and green verges. The upper human finishes3′18″88,1st,N0, with low fuel and no pit visit. A lower-pane computer pit stop is explicitly excluded from the human record.

Designed or inferred: world geometry and metres-to-landmark mapping, terrain heights, first-crossing palette trigger, compact headlight projection, collision rules for roadside posts, retained pit lane980–1280m, original billboard motifs and all original art/audio. The agreed mobile race remains **three laps**. The source's five-lap finish must not be compared directly with the candidate's three-lap total.

Approximate source announcement-derived laps46.21/37.99/38.51/40.02/36.15s carry at least0.5s sampling uncertainty plus unknown announcement latency. Candidate white laps46.183/42.233/44.333s put the first within that recording envelope while later two are about4.24/5.82s slower. Unknown source controls and traffic prevent attributing the gap to one recovered constant.

## Complete races and presentation

Seed42, fixed60Hz, ordinary public-input driver, no race-state injection:

| Car | Hiroshima race time | Position | Pit stops |
|---|---:|---:|---:|
| White |132.735s|12|0|
| Orange |122.150s|3|0|
| Purple |128.169s|7|0|
| Black |126.912s|4|0|

All twelve study car/course combinations finish with feasible fuel; Hiroshima fuel remaining is34–48%. The white driver retains one nitro, unlike source N0. Vegas and LA deterministic outcomes are unchanged at66.905s and135.038s respectively.

`evidence/complete-reference-race.mp4` is4254frames/30fps,141.8s including grid and run-out. It records132.735s of racing through the real first-lap palette change and finish. The complete file was decoded with FFmpeg. Posed `hiroshima-*.png` images are separately labelled layout fixtures. `audio/` contains the same film mixed with current original synthesis; its result/events/active inputs exactly match, all13cue registrations are reused by byte hash, and only the new mix/video are registered. Zero clipped samples is a structural result; **human listening remains open**.

Two artwork review rounds are complete. Corrections make the sun approximately13×12 display pixels and the unlit road near black, with dim markers and a compact headlight pool. Lamps, banners, signs, curbs, player contact and both palette families pass targeted native checks. Original panoramas and props are registered at reference status; that is not user approval or exact Top Gear artwork parity.

Independent motion review finds a readable dark road, a single first-lap palette switch, continuous traffic and stable racing-camera contact. Finish rendering remains state-preserving after the0.8.1 fix. A remaining source-relative difference is the run-out car briefly passing behind a crest before receding further; source-monotonic finish composition is not accepted. Exact headlight placement, crest timing, opponent response and later-lap pace remain unproven.

## Twelve-point plan status

| Point | Implemented / measured | Remaining gate |
|---|---|---|
|1. Contract/baseline|Original SNES sources/manual, retained versions, single landscape/mobile/local-record scope.|Region/native input trace unknown.|
|2. Comparison lab|Production renderer, stepping/overlays/anchors, source/event boards, labelled fixtures and complete driving films.|No native-frame equivalence claim.|
|3. Road/camera|Segmented projection, continuous hills, horizon/traffic clipping;9009 study fixtures retain player visibility, zero foreground vertical gaps and full180px bottom coverage.|Exact crest timing/composition differs.|
|4. Cars/art|Four original rear/flank/distant/pit families, original scenery for all three studies, native and motion evidence.|Original art intentionally differs from commercial sprites.|
|5. Ordered routes|Closed Vegas direction/joins corrected; source-card LA two-lobe and Hiroshima hooked maps; shared distance for minimap/AI/physics.|Curve strength, heights and metre timing inferred.|
|6. Handling/speed/contact|Source profile, replayable launch/steer/brake/boost/contact checks and all-car completion.|Exact reference response/inputs unavailable.|
|7. Opponents|19 seeded continuous rivals, overtaking/avoidance, fuel strategy and finish order; complete moving races.|Native AI and relative-speed fidelity not established.|
|8. Resources|Fuel/nitro/pit/partial-fill/DNF mechanics and regressions; useful stops on longer legacy circuits; feasible study-course fuel.|Source warning/fill/consumption timings not fully measured.|
|9. UI/flow/records|Retro title, car/track selection, HUD, countdown, finish/classification/rematch, local-only rankings and record compatibility.|Finish crest composition still differs.|
|10. Complete loop|Public-input films, recorded inputs/events/results, decoded motion and independent review; render-purity regression.|Functional success is not exact fidelity acceptance.|
|11. Expansion/audio|Three identifiable study courses and four cars;13original cues and full current mixed race registered.|Human listening and source-exact artwork/audio remain separate.|
|12. Integration/devices|Maintained Three.js runtime, selected offline bundle, required repository/build checks, actual static app route, four handheld sizes, simultaneous touch/pointer cancellation, pause/restart and repeated-session checks.|Physical Android/iPhone, representative phone60fps and Flutter WebView acceptance unavailable.|

Results: `checks.json`, `bundle-verification.json`, `source-pin.json`, `independent-final-review.md`, scene reviews and `evidence/`. GPU lifecycle sampling shows the extra daylight texture uploads once (10→11textures), remains stable through repeated palette switches, and returns to zero textures/geometries after disposal. Nine racing/finish/DNF render fixtures preserve authoritative state during zero-step redraws. Desktop software rendering is not phone performance evidence.

Old generic night results through106 are retained in history and excluded from new Hiroshima rankings. Compatible LA106, Vegas105/106 and unchanged legacy-course versions retain rankings. These are local records, with no online service/rewards added.

The implementation covers the twelve work areas, with the unresolved fidelity/listening/device gates above. **Exact1:1 completion and final acceptance are not claimed.** Web acceptance precedes packaging these same runtime bytes in Flutter; no separate Dart gameplay reconstruction is planned.

Final validation:295tests,lint,typecheck,productionbuild andstaticexport pass. The pinned offline candidate is play.html; source/ retains its editable feature files. Other game bundle byte hashes are unchanged. Actual app-route,reviewlinks,touch and lifecycle results are in evidence/. Desktop SwiftShader180frame sampling measured median16.7ms,p9516.7ms,p9916.8ms; these are desktop software/browser scheduling measurements, not representative-phone acceptance.
