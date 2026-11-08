# Retro Hoops court and depth projection v2

Scope: Future Games Web only. Gameplay remains rules 1.5.0, including independent off-ball roles. Presentation build: future-games-court-perspective-v2-local. No push, workflow or Flutter import.

The inspected opening-play and score-restart frames show slanted baselines and court depth. The old rectangular markings and fixed athlete scale did not express that geometry. One approximate right-baseline pair in the processed score-restart frame gives dx/dy about 0.565; the new authored fit gives 0.564. The editable points, uncertainty, source path/hash and chosen scales live in court-v2-measurements.json. This is a limited calibration, not proof of the original projection or native resolution.

A shared pure projection now widens the court from far to near. Court paint and lines, athletes, independent arm overlays, ball, shadows, baskets, selection marker, camera and debug targets use that same ground plane. Athlete width and height scale uniformly; grip/release offsets and airborne height use the same depth scale. Paint is clipped to the legal court polygon. Canvas inspection and Three presentation share the projection. Rendering does not alter simulation positions, AI, contact resolution or scoring.

The handheld still fills mobile landscape with its current wide viewport. The inspector also offers a reference-frame aspect crop without stretching artwork. This revision does not claim that the processed recording dimensions establish the native aspect ratio.

Local playable candidate: http://127.0.0.1:8937/game.html . Inspector: http://127.0.0.1:8937/ . Prior review folders are retained. Full-renderer contact loops and browser evidence live in test-results/retro-hoops-court-v2 and test-results/retro-hoops-court-ui-v2.

60 Retro Hoops tests pass, including full seeded matches, independent team movement and new projection/grip/camera invariants. Six team scenarios and nine console/browser checks pass. Separate lint/typecheck, action-loop decoding, static export and host-route results are recorded in court-v2-validation.json after completion. No source frames were added to the playable bundle. Existing art remains reference-classified. Native source timing, exact projection, physical-device performance and full source fidelity remain unverified.

Final validation: scoped lint and typecheck pass; the static export succeeds; 14 action loops render and decode; all six actual host checks pass, including complete match, single result, rematch and exit/re-entry. A stale catalog-name selector was replaced with the stable game URL after another workstream changed the displayed title. No catalog or other-game implementation was changed by this pass.
