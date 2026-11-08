# Retro Hoops / Street Hoop likeness pass v26

Polished the three most-seen movements after comparing generator clip strips with dense 60fps reference runs (Arcadexzone 28.4-28.8s dribble; GameLog shot study): the dribble now bounces in front of the lead leg (it was behind the body in the simulation), the run is upright with pumping 90-degree arms, and the passer faces the receiver. Venue polish: scaffold tops lowered to the backboard, duffel bag redrawn on the floor by the crowd. The build is `character-v26-local`, assets `26.0.0`, rules `2.1.0`. V25 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Dribble path (motion.ts, simulation-owned) moved in front of the lead leg: side offsets [-12,8,-20,-12] -> [14,22,10,14] times facing; the atlas dribble-arm overlay follows the same path.
- Steal reach split: against a dribbled (in-front) ball the reach is the new STEAL_REACH_DRIBBLE=16; against a held/carried ball it stays 26. Across 180 seeded computer-vs-computer matches steal success is 15.14% (was 15.19%); steals per match ~8% lower (fewer attempts) and points per match ~6% higher. Rules 2.0.0 -> 2.1.0, motion 2.1.0. User-approved gameplay change; the steal-geometry test now places the thief in front of the dribbler and expects the ball at owner.x+14.
- Run: torso upright (lean ~22 degrees instead of ~45), elbows bent ~90 degrees with fists pumping opposite to the legs (non-ball hands).
- Pass: body drawn facing the receiver stepping into a two-hand push, mirrored with the pack's 144-x convention so the ball-holding hand endpoints are unchanged; the head layer flips with it.
- Venue: scaffold tower tops lowered to the backboard; duffel bag redrawn as a rounded bag with strap on the floor by the crowd.
- Review tooling: the host route check now reads the expected rules version from rules.json instead of a hardcoded 2.0.0.

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Dribble ball side | approximate | In front of the lead leg like the reference; steal fairness measured and preserved. |
| Run silhouette | approximate | Upright with pumping arms like the 28.4-28.8s reference run. |
| Pass facing | approximate | Passer faces the receiver. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections

1. A single global steal reach of 16 would make a stationary ball carrier almost impossible to steal from (body collision keeps defenders 26 apart), even though the average rate matched. → Reach split by ball state: 16 against the dribble, unchanged 26 against a held ball.

## Open findings

- Steals per match ~8% lower and points per match ~6% higher with the in-front dribble; steal success rate is unchanged.
- Pass reads as an overhead outlet pass; a chest-pass variant would need new simulation anchors.
- Shot animation unchanged this pass.
- Street Hoop changes venue by matchup; Retro Hoops keeps the shared reference venue.
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v26/characters.html`, `game.html`, `action-review.html`.
