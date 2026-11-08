# Retro Hoops / Street Hoop likeness pass v28

Two reference-motion refinements: the released shooting arm now stays fully extended through the descent (tick 26 to 36) before lowering over 14 ticks, and the block jump reaches up with one straight arm while the other stays out at shoulder height, as Street Hoop blockers do. The build is `character-v28-local`, assets `28.0.0`, rules `2.1.0`. V27 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Shot follow-through: post-release hands hold the extended release position until tick 36, then lower to the chest by tick 50 (was lowering from tick 26). Post-release hands are cosmetic (the ball is in flight).
- Block jump: near arm straight up, far arm out at shoulder height during the rise, both lowering on the descent. Block contact is computed by the simulation, not the drawn hands.
- Catch-overhead and reach poses that hold the ball are unchanged.
- Teammate body/skin variety assessed and not adopted: the body atlases use ~88 MB of texture memory (2304x4096 x2 + 2304x1792 RGBA); three variants per team would need ~260 MB, too much for phones. Heads remain per identity.

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Shot follow-through | approximate | Arm held up through the descent like the reference. |
| Block jump | approximate | One-arm reach like the observed blockers. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections



## Open findings

- Shot arm folds briefly over the head mid-lowering (transitional frames 18-21).
- Pass reads as an overhead outlet pass; a chest-pass variant would need new simulation anchors.
- Street Hoop changes venue by matchup; Retro Hoops keeps the shared reference venue.
- Bodies stay per team (memory budget); native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v28/characters.html`, `game.html`, `action-review.html`.
