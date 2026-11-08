# Retro Hoops / Street Hoop likeness pass v16

Matched the heavy Street Hoop build seen on the team-select lineups of the Arcadexzone recording (aspect-corrected from its 16:9 upload): thick arms, broad shoulders, square front stance, chest-band tee, shades and moustaches. The build is `character-v16-local`, assets `16.0.0`, rules `2.0.0`. V15 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Arms thickened everywhere (upper arm 13, forearm 9.5) in the atlas and the live contact arm; reach and hand endpoints unchanged.
- Front/back ready and defend: hips centred, legs straight under the hips, arms hanging close with hands at hip height; fixes V15's off-centre front hips that bent one knee inward.
- Broader front shoulders (±13) and barrel torso; tank team shows skin traps between neck and armholes.
- Red team tee gains a yellow horizontal chest band (front, back and side), the most common Street Hoop kit motif; raglan sleeves now sit only at the shoulder ends.
- Faces: squarer jaws; dark shades on four of six identities; moustaches on three.

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Build (arms, shoulders, chest) | approximate | Heavier silhouette close to the team-select lineups at equal height. |
| Front/back standing stance | approximate | Square stance with hanging arms like the lineups. |
| Faces (shades, moustaches, jaws) | adapted | Original heads using the observed motifs. |
| Kits (tank team; tee with chest band) | adapted | Fictional palettes in the observed constructions. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections

1. Raglan panels plus sleeves formed a wide white yoke across the red team's shoulders. → Panels limited to the shoulder ends.
2. Side-view chest band sat where the near hand passes and read as a yellow glove. → Band moved lower on the spine-aligned torso.

## Open findings

- Source defenders appear to spread their arms wide toward the ball handler; our defend clip keeps the crouch with hands by the knees (needs a closer look).
- Dunk hang at the rim and other actions not yet compared with the new footage.
- Front proof crop from the 16:9 upload remains slightly soft after aspect correction; widths are approximate.
- Venue regressed relative to footage (drapes, HIP HOP stage, scaffold) — deferred until characters are done, per the user.
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v16/characters.html`, `game.html`, `action-review.html`.
