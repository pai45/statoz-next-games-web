# Retro Hoops / Street Hoop likeness pass v15

Rebuilt the most frequent on-court pose and the airborne silhouettes after comparison with the GameLog first possession and the jump-shot study crops. The build is `character-v15-local`, assets `15.0.0`, rules `2.0.0`. V14 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Ready/defend/backpedal crouch: hips pushed back, both thighs angled forward, knees close over a narrow stance, upper arms hanging down the torso side and forearms reaching to the knees (non-ball hand endpoints re-authored).
- Jump shot: legs straighten and hang together with pointed toes while airborne, blended by the existing lift curve; ball-holding hands unchanged.
- Jump block: hanging straight legs instead of a straddle.
- Blond back view rebuilt as layered locks (was helmet-like); white sleeves shorter and slimmer.

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Ready/defend crouch | approximate | Hips back, knees forward and hands by the knees match the source structure at equal height. |
| Airborne shot/block legs | approximate | Straight hanging legs with pointed toes, as in the jump-shot study crops. |
| Kits, identities, camera, venue | adapted | Unchanged from V14. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections

1. Round-0 crouch torso leaned ~45 degrees and read as a large slanted slab. → Lean reduced to ~35 degrees with the head pushed further forward.
2. Near upper arm bent its elbow forward across the chest, hiding the jersey (read as a bare chest). → Explicit elbows below the shoulders so upper arms hang along the torso and forearms reach to the knees.

## Open findings

- Far arm in the crouch is heavier/darker than the source.
- Team-select footage (38Qlqw2re1w) shows a much bulkier build than ours: broad rounded shoulders, thick arms, barrel chest, arms hanging close in front view, near-universal dark sunglasses and moustaches/stubble, chest band stripes on T-shirt kits. Targeted next (V16).
- Venue: GameLog and 38Qlqw2re1w match footage both show dark drapes, a HIP HOP DJ stage and scaffold supports; V14's chain-link fence replaced V13's footage-derived elements and should be revisited after characters, per the user's priority.
- Near-side athletes can sit under the joystick and A/B overlays.
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v15/characters.html`, `game.html`, `action-review.html`.
