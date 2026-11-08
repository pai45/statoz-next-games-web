# Independent Hiroshima review

24 October 2026. Maintained build `0.9.0-hiroshima-study`, rules107. This review covers the final source/lab after the art correction. No maintained source was edited by this reviewer. Initial browser measurements remain in `evidence/independent-browser-round1.json`; current browser results and native film boards describe the final version.

The retained source card was visually inspected: **Hiroshima, Japan; 2.34km; five laps; printed record3′24″55**. The candidate uses2340 inferred distance units and an explicit **three-lap mobile adaptation**. Its closed asymmetric map includes the right lobe, inward waist and lower hook. Shared road/map coordinates and ordered hill sections are inferred rather than recovered ROM data. No roadway obstacle corridor is claimed; placed roadside kinds exclude the authored close gate and rock variants.

The source palette board was also inspected. It supports dark first-lap asphalt/ground, red sunset, sun/torii silhouettes, lamps, banners and blue billboards, then brighter green/grey/orange scenery around the first gantry. The candidate's first-lap headlight patch and lap-boundary palette trigger are original presentation choices. The exact source trigger is unknown. Current native dark/bright frames show a readable player and original billboard/banner family rather than the former generic modern city.

All four ordinary public-input Hiroshima races against19AI, seed42, complete without pits:

| Car | Place | Total seconds | Lap1 | Lap2 | Lap3 | Fuel remaining |
|---|---:|---:|---:|---:|---:|---:|
| White |12|132.735|46.183|42.233|44.333|34.3%|
| Orange |3|122.150|44.017|38.117|40.017|35.2%|
| Purple |7|128.169|45.200|40.617|42.367|40.4%|
| Black |4|126.912|43.900|40.533|42.483|48.4%|

All retain one nitro charge and stay below0.769 lateral magnitude in these runs. Source announcement-derived first three laps are approximately46.21/37.99/38.51, with at least half-second survey uncertainty and unknown announcement delay. White first lap is close to that first anchor, while later laps are about4.24 and5.82seconds slower. The candidate three-lap total must **not** be compared directly with the source's198.88-second five-lap finish. The source low-fuel warning late in its five-lap run also cannot be treated as a required event in this shortened three-lap race.

All9009 full-lap/lateral projection fixtures across Vegas,LosAngeles andHiroshima retain player visibility, continuous accepted vertical road intervals and coverage to the180pixel bottom. Hiroshima contact y stays163.906–163.933; minimum projected road y is−28.509, allowing real blind-crest occlusion. Vegas andLosAngeles camera values are unchanged. Public-input white regression races remain exactly66.9048076089seconds onVegas and135.0378443821seconds onLosAngeles, matching their accepted prior versions.

Save fixtures preserve105Vegas and106LosAngeles compatibility. Old106Night results remain in saved history but are excluded from the new Hiroshima board;107Night results rank normally and establish a new compatible best time. No old Night best is silently applied to changed Hiroshima geometry.

Four browser renderer sessions each switched between explicitly injected dark/bright lap fixtures20times. GPU texture counts rose10→11 on the first bright upload, then remained stable through the repeated switches. Every disposal returned textures/geometries to zero. The daylight panorama is cached rather than rebuilt each frame. Nine driving/finish/DNF fixtures, each rendered ten times without simulation steps, retained identical authoritative snapshots. The prior finish-render mutation is therefore fixed in these tested paths.

The final141.8-second MP4 was independently decoded successfully. Quarter-second native motion boards at16,49,90and136seconds were inspected, plus a whole-film survey. Dark traffic and road contrast remain readable; skyline occlusion reveals the sunset again; the palette switches once around the first crossing without a simulation reset; later traffic and hills continue coherently. Finish clock freezes, the player scales away and the place stamp grows. No previous renderer-state alias or disappearing-player failure recurred. The recording is silent and provides no audible approval.

Remaining source differences are explicit. Original sprite/HUD typography, exact opponent placement, landmark spacing, curve/hill metrics and response are not matched measurements. The finish car briefly drops behind the near crest and reappears before receding farther, rather than reproducing the source's particular departure composition. Lap-boundary colour change is an inferred trigger, and mobile three laps intentionally differ from source five. Desktop deterministic capture does not establish physical-phone performance or exact native timing.

**Verdict:** accepts this revision for the scoped four-car completion, study-camera safety, palette caching/disposal, save compatibility, unchanged-course simulation and render-purity gates. No additional automatic art correction is requested for this revision. It does not establish exact1:1 fidelity or complete all remaining physical-device/audio/source-comparison gates.

Reproduction lives in `prepare-independent.mjs`, `independent-probe.ts`, `independent-browser.mjs` and `review-film.mjs`. Race probes use public input. Projection, storage and palette-switch probes are separately labelled injected fixtures.
