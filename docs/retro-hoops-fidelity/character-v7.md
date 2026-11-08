# Retro Hoops / character v7

Build `character-v7-local`, assets `7.0.0`, rules `2.0.0`. Blue/red teams, stable `retro-hoops` ID, existing host title and account storage are preserved. This is local-only work in Future Games Web; no push, pipeline activation or publication.

The original generator now draws compact adult faces with cropped dark/blond hair, warm skin tones, fuller shoulders/upper arms, thighs and calves. The runtime's authoritative-ball contact arm shares the revised palette and widths. Broadening the jersey and lowering the neutral stance slightly gives the characters more athletic visual weight. These are original fictional characters, not extracted or traced Street Hoop sprites.

Running uses twelve authored projected knee positions rather than always placing a knee near the hip/ankle midpoint. The trailing leg folds and the recovering knee drives forward. High-top shoes rotate their original polygon points through authored foot-roll angles; front and back views use distinct foreshortened footwear. The sole is clamped above the existing ground plane, and toe/heel anchors are exported beside the existing hips, knees, ankles, shoulders and hands. No sprite stretching, movement-speed retuning or simulation ownership changes are included.

The source study uses the supplied https://www.youtube.com/watch?v=_k8IIS9n3dk recording and retained first-possession frames 0016/0067. Observations concern readable limb mass, adult face clusters, folded running legs and dark footwear with light soles. Specific knee positions and foot-roll angles are authored approximations, not recovered native values. Research rasters are excluded from the executable asset pack. V6 assets and its review remain intact; the previous generator and anatomy are snapshotted in this review directory.

The comparison viewer loads exact V6/V7 atlas crops, offers side/front/back and mirrored running, frame scrubbing/stepping, and knee/ankle/toe overlays. Its inspection playback uses one pose per 60 ms; the production gait remains driven by displacement. Inspection playback is not source timing evidence.

Passed: 84 rules/integration tests, nine asset integrity/ground checks, 16 rendered and decoded production action loops, nine mobile/lifecycle checks, six team scenarios, twelve gallery combinations, six exported host-flow checks, lint, typecheck and production/static export. Actual-size production captures and enlarged character studies were inspected. Desktop Chromium/SwiftShader and emulated viewports do not establish physical-phone performance.

Exact Street Hoop likeness remains incomplete. Action-specific silhouettes, transitions and native timing remain approximate; current production and research frames are not precisely pose/depth aligned. Source-likeness approval remains false. Technical checks establish integrity and playability, not a 1:1 art pass.

Review: http://127.0.0.1:8948/characters.html . Play: http://127.0.0.1:8948/game.html . Complete production actions: http://127.0.0.1:8948/action-review.html . Editable sources: `scripts/retro_hoops_character.py`, `scripts/build-retro-hoops-authored.py` and `src/features/games/retro-hoops/contact-arm.ts`.
