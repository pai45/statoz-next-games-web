# Retro Football — pitch and player calibration

Scope: user reports the pitch is too small, players too big and the ground crowded. Prioritize single-player handheld mobile landscape. Runtime0.8.0, rules exhibition-pitch-v1, unchanged football-handheld-atlas-v1 assets. Preserve0.7.0 baseline and source-derived reference provenance.

Three recorded kickoff samples were independently measured:84.9s and85.9s centre ellipses approximately409×81 on the320×224 study grid;86.9s approximately372×77 as the camera/scene changes. Source cyan upright bodies approximately38–44px in sampled far/central positions; near blue bodies54–59px. Original admitted cyan ready/run alpha heights58/56px are too large for the central comparison. Offscreen ellipse endpoints are fitted/inferred, not directly observed.

## Changes

- Shared world-to-pitch projection changes6×3.2 to23×4.5 pixels per world unit. Centre circle becomes421×82.35 instead of110×58. World dimensions remain105×68.
- Uniform0.8 pitch sprite representation, nearest-neighbour with integer dimensions and pixel-centre anchor mapping. Original atlas, UV regions, editable poses and native source pack remain intact. This is deliberately resampled presentation, not a claim of recovered native source sprites. Close-view keeper remains in its existing separate projection.
- Renderer, simulation foot/hand/upper-body anchors, receiving/tackling contacts and AI entry offsets use the same transformed poses and projection. Contact radii remain explicit pixel tolerances, reduced for the smaller pitch representation. No remote/timer-based possession grants.
- Stadium markings, penalty/goal areas, goal mouths, posts and flags derive from world coordinates. Camera limits and initial framing derive from the expanded pitch. Close-shooting view retains its existing independent goal-space mapping.
- Kickoff layout puts the taker at centre, two supporting outlets nearby and two defenders wide, mirrored by team/attack direction. Existing minimum restart distances still apply. This is an authored reference-informed formation approximation, not recovered team AI.
- Preserve handheld full screen, simultaneous sliding controls, wide/reference framing, original audio, both halves, match results and standalone host bundle.

## Validation contract

Compare source/current native gameplay areas and mobile568×320/844×390. Count visible kickoff actors, inspect actor height and broad-circle landmarks, and retain source uncertainty. Verify contact/reception, tackles/fouls, keeper catch/drop/punt, loft/control, CHANCE parry/goal, both attacking directions, restarts, halftime and complete deterministic matches. Check pause/restart/resize/disposal and local result version compatibility.

Existing keeper and body-first fixtures are adapted from fixed world offsets to the **same original pixel offsets** using the new projection; no contact radius is relaxed to make them pass. Their adaptation code is retained in prepare-checks.mjs. The first old body-first fixture failure correctly exposed that1.4worldunits now corresponds to32.2px rather than8.4px; revised fixture preserves the intended8.4px body approach.

## Limits

The constant projection is a bounded local fit. Source depth-dependent player/circle size remains unresolved; uniform0.8 is not a complete perspective model. Running, ball speed, native timing and hidden AI have not been recovered. Whole-ball boundary padding and existing match rules retain prior authored world tuning. Foreground CHANCE shooter and distinct defensiveB remain later work. Physical-phone performance and public asset release approval remain unverified. No multiplayer or deployment.
