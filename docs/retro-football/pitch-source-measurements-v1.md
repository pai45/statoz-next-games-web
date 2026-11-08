# Independent source projection measurements

Reference recording: https://www.youtube.com/watch?v=ftohDx8JaLo . Saved samples/index: `output/retro-football/source-study-v1/kickoff-dribble` and `sources.json`. Grid320×224 is the existing resampled study grid; these measurements do **not** establish native resolution, timing or exact original projection.

Method: manually select visible centre-circle line points, excluding overlays/players where possible; fit an axis-aligned ellipse by least-squares vertical error. Cyan dots mark admitted points, magenta line marks fitted ellipse, yellow brackets mark manually estimated visible actor top-to-ground bounds. Shadows and selection markers are excluded. Bodyheight uncertainty about±3px; partial/animated silhouettes make anatomical scale uncertain. The fitted offscreen circle endpoints are inferred, not directly observed. Raw point coordinates and fit data are in `source-measurements.json`; `measure-source.mjs` reproduces analysis images.

| Source time | Fitted ellipse centre | Fitted diameter X×Y | Sampled upright heights |
| --- | --- | --- | --- |
|84.9s, sample0010|159.5,113.1|409×81px|44px upper cyan;54px lower blue|
|85.9s, sample0020|160.0,113.1|409×81px|44px upper cyan;43px centre cyan;59px bottom blue|
|86.9s, sample0030|129.1,82.9|372×77px|38px upper cyan;41px right upper cyan;48px right near cyan|

The line fits agree with the visible arcs to approximately0.3–0.7px vertical RMSE **for the selected points**. That small residual is not the uncertainty of the entire game's projection. Camera movement, possible depth-dependent perspective and missing arc portions limit generalization.

## Interpretation

The existing flat projection6×3.2 produces a110×58px centre circle. It is about3.7× too narrow and1.4× too short compared with the static kickoff study. A shared flat projection23×4.5 yields421×82.4px, a useful initial local approximation within roughly3% of the two static-circle horizontal measurements and2% vertically. For an exact static kickoff fit,22.35×4.45 follows from the assumed world radius9.15. That calculation assumes the reference circle corresponds to the game's chosen world dimensions; the recording alone does not prove that mapping.

The86.9s ellipse is smaller while its centre shifts upward. Together with taller near-field players, this suggests depth-dependent perspective or another camera/scene-scale change. It does **not** prove which technique the original used. Constant23×4.5 therefore must remain an authored bounded calibration rather than a recovered global projection. The new inspector should make the residual visible.

Upright source bodies occupy roughly38–59 study pixels depending on screen position, player and pose. Existing native actor heights of roughly45–50px overlap that range. First enlarging coherent field spacing while retaining actor grid dimensions is better supported than uniformly shrinking all players. Far/near apparent body scaling remains separate research; avoid adding arbitrary Y-based scale without multi-frame ground/height measurements.

## Camera-area implications

Using the candidate projection, a320px reference view spans about13.9world X units versus53.3 under the old projection. A406px mobile view spans17.7 versus67.7. A224px-high view spans49.8world Y units versus70.0. These are flat-projection consequences, not measured native field coverage. At the centre, less than the complete horizontal circle should be visible in reference framing; the old view shows the entire circle and much of the field.

## Required coherent changes

- Derive pitch lines, circle, boxes, goal mouths, flags and stadium boundaries from shared projection. Preserve105×68 simulation dimensions.
- Use the same inverse projection in every foot/hand contact, swept collision, receiving radius and keeper conversion. Distinguish visual-pixel thresholds from world distances explicitly.
- Recompute follow-camera bounds, initial/restart framing and screen lookahead. A larger pitch must not expose old empty extents or force the selected player off-screen.
- Keep source-facing actor grid unchanged for this slice, with explicit future perspective-scale limitation.
- Recheck normal and close shooting views: their distinct projection spaces must not be accidentally mixed.

## Acceptance for the new geometry slice

1. Reference320×224 kickoff shows the calibrated broad circle arcs; sprite heights remain in the admitted range and increased spacing reduces crowding.
2. Source/current overlays report landmark offsets with uncertainty; do not call flat projection globally1:1.
3. Diagonal/cardinal speed, world bounds, ownership and pass/shot target semantics remain stable. Contact release and receive anchors map through the same projection.
4. Pass/receive/intercept, standing keeper catch, close-view parry/goal, touchline/goal-line restarts and both attack directions still work.
5.568×320 and844×390 handheld views retain reachable controls and visible active play; fullscreen/resize changes display only.

No gameplay candidate was changed by this reviewer. This is a distinct geometry phase with its own maximum two automatic correction rounds; it does not reopen the consumed mobile-slice correction rounds. No multiplayer scope.
