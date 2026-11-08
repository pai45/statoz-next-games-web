# Retro Circuit fidelity continuation — Los Angeles

24 October 2026. Candidate `0.8.1-render-state-fix`, rules `106`, maintained in Future Games Web. Agreed mobile adaptations remain: one landscape driving view, automatic transmission, three laps, steering on the left, pedals/nitro on the right, and local records. Product title APEXBREAK 3 is preserved. No publication, deployment or Flutter bundle import was performed.

The Las Vegas geometry correction is retained from rules105. The second study course now uses the observed Los Angeles card distance, 2.40km, and three laps. Its closed two-lobe map, curvature and terrain placement are inferred from recording evidence. Original golden hills, palms, rounded trees, rocks and invented SUNSET HILLS lettering replace the former coastal water/city scenery. The sampled dark green hierarchy and both alternating curbs are visible in native captures. Commercial source pixels and soundtrack were not used for this artwork.

## Source and adaptation record

Primary source is the upper white player's view in [the retained gFM recording](https://www.youtube.com/watch?v=gFMgYrdlTF8), bounded excerpts240–390s and the preceding course card. Recording960×720/60fps; region and native console cadence remain unconfirmed. Full source evidence, decoded clips, hashes, source cards, event boards and route proposal are in `../fidelity-v6/coastal-source/`.

Observed source HUD events: first lap announcement45.08s, final-lap announcement84.33s, frozen finish121.23s, N0. Announcement-derived intervals45.08/39.25/36.90s carry at least0.2s recording uncertainty plus unknown crossing-to-announcement delay. Unknown source controls and traffic prohibit treating these as recovered physics constants.

Designed adaptations: three-lap format, retained optional pit lane90–260m, original art/audio, automatic gears and device-local records. A fuel stop is available but not forced on this shorter source-study course. The original arcade courses keep their distinct longer-race fuel tuning. LA lamp/prop ordering and exact terrain scale remain authored choices.

## Measured candidate

Seed42, ordinary public-input driver, fixed60Hz; no race-state injection:

| Car | Time | Place | Fuel remaining | Pit stops |
|---|---:|---:|---:|---:|
| White |135.038s|13|33.0%|0|
| Orange |123.423s|3|34.3%|0|
| Purple |133.143s|11|38.4%|0|
| Black |128.693s|6|47.5%|0|

The white candidate is13.81s slower than the source finish. Candidate laps46.80/43.617/44.633s and one unspent nitro differ from the recorded source. This is an explicit mismatch, not source-equivalent play. All twelve study car/course combinations complete with a feasible fuel strategy; some longer night-course combinations use a stop.

The complete LA film is `evidence/complete-reference-race.mp4`:4323frames at30fps,144.1s including countdown/run-out, fully decoded with FFmpeg. Race time is135.038s. It advances the real simulation through public driving input. Separate `la-*.png` images are labelled posed layout fixtures and must not be presented as achieved race frames.

Camera gain8 is the smallest tested LA-only variant producing two later skyline-hiding crests. All9009 study-course/lateral projection fixtures keep the player visible, have zero foreground vertical gaps and cover the180px display bottom. Original source crest timing is not matched: the initial grid rise is still missing and the later occlusion windows differ. Vegas geometry, simulation result and camera gain remain unchanged; night uses its existing gain. The LA foreground camera guard changes presentation, not physical position or progress.

## Twelve-point gate ledger

| Plan point | Current evidence and remaining gate |
|---|---|
|1. Reference contract/baseline|Identifiable SNES sources, manual, pinned historical builds and explicit mobile adaptations retained. Region/native inputs unconfirmed.|
|2. Comparison lab|Production renderer, frame stepping, anchors, event comparison and retained source boards available. Recording frames remain separate from simulation steps.|
|3. Road/camera|Foreground visibility and clipping verified; crests now visible on LA. Exact camera composition and event timing remain mismatched.|
|4. Cars/opponents art|Four original near/flank/far/pit families are implemented. Native scenes and motion reviewed separately; commercial artwork is not reproduced.|
|5. Ordered route|Vegas closed direction/joins corrected; LA source-card two-lobe course implemented. Metres-to-landmark mapping inferred. Third dusk course still needs complete source-route study.|
|6. Handling/speed/contact|Source profile, acceleration/nitro/contact regressions and replayable public controls implemented. Unknown reference inputs prevent exact response equivalence.|
|7. Traffic|19 seeded, continuous opponents, avoidance and finish ordering implemented. Full races complete. Native AI equivalence is unproven.|
|8. Resources|Fuel, nitro, pits, partial departure and DNF checks retained. Source-study routes do not artificially force a stop. Exact reference fill/consumption timing remains open.|
|9. UI/flow/records|Retro selection, source-proportioned HUD, grid/finish/classification and local rankings implemented. Old LA-layout records remain archived rather than ranked against the new course; unchanged compatible routes retain rankings.|
|10. Full race|LA complete public-input film and independent review available; source time difference remains explicit. Simulation success does not approve source fidelity.|
|11. Expansion/audio|Three study choices and three preserved arcade courses are playable. LA has its own original environment. Complete Hiroshima evidence and listening acceptance remain open; original soundtrack differs intentionally.|
|12. Integration/devices|Selected bundle, full repository/build checks, actual app route and handheld touch/lifecycle checks recorded separately. Physical Android/iPhone and sustained phone60fps remain unavailable. Flutter WebView packaging follows web acceptance.|

Art correction ended after round2. `la-art-scene-review-round2.md` accepts the targeted sign/palette/curb corrections in eight native fixtures. It does not approve exact source parity. Changed panorama/contact exports are registered through the studio importer at reference status; earlier assets and approvals remain intact.

Current-run results are pinned in `checks.json`, `bundle-verification.json`, `source-pin.json`, independent review files and `evidence/`. A source-fidelity, audio or physical-device gate is not closed merely by a passing build. Exact1:1 completion is not claimed.

## Separate renderer regression correction

The two-round art/scene review found a finish-render state alias in0.8.0: rendering without an interpolation snapshot changed authoritative player distance. The rejected film and source are retained in render-state-fix/. The0.8.1 technical correction always copies presentation state. Nine immutable before/after fixtures fail on the previous renderer (all three finish scenarios) and pass after correction, with twelve zero-step render calls per fixture. This is a renderer regression fix, not a third automatic artwork correction or a claim of source fidelity.

The full race was regenerated and decoded. render-state-fix/corrected-finish-motion.png shows continuous finish roadway and the receding player/place stamp; it no longer jumps through multiple course positions. Result, input and event traces remain unchanged apart from build identity. The historical independent-final-review.md describes the rejected0.8.0 finish; it must not be relabelled as0.8.1 approval.

Final292 repository tests, lint, typecheck, production build and static export pass. Mobile layout/touch and actual app-route checks are recorded separately. The unchanged game bundles match the preserved baseline byte hashes.
