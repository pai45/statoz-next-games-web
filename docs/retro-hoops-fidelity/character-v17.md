# Retro Hoops / Street Hoop likeness pass v17

Defenders now reach toward the ball like the in-game defence in the Arcadexzone recording (about 104-106s): forward at chest height in side view, both arms spread wide in front/back views. The build is `character-v17-local`, assets `17.0.0`, rules `2.0.0`. V16 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Defend/backpedal side view: both arms extend forward toward the ball at chest height, alternating slightly with the shuffle.
- Defend/backpedal front/back views: arms spread wide at shoulder height over a slightly wider stance.
- Idle ready poses keep the V15/V16 hands-by-the-knees crouch.

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Defence arms | approximate | Arms reach toward the ball like the observed defenders. |
| Build, stance, kits, faces | adapted | Unchanged from V16. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections

1. Round-0 side defence raised the far fist to face height and read as a boxing guard. → Hands lowered and pushed forward so both arms reach toward the ball.

## Open findings

- Source knock-down after a super dunk (defender thrown back, then sitting propped on hands) has no simulation trigger; adding it is a gameplay change needing the user's approval.
- Dunk legs split wide; source dunkers hang upright with legs together (next pass).
- The defence source crop is partly occluded by the HUD; the full-frame review carries most of the evidence.
- Venue regressed relative to footage (drapes, HIP HOP stage, scaffold-mounted baskets) — deferred until characters are done, per the user.
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v17/characters.html`, `game.html`, `action-review.html`.
