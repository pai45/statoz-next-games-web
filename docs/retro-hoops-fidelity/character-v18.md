# Retro Hoops / Street Hoop likeness pass v18

Dunkers now hang upright at the rim with legs together, slightly bent and toes pointed, matching the 1P dunker in the Arcadexzone recording (about 36s); the validated dunk arm/shoulder contract is unchanged. The build is `character-v18-local`, assets `18.0.0`, rules `2.0.0`. V17 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Dunk gather/contact/finish frames: legs hang together under the hips with pointed toes while airborne (previously split wide); landing frames unchanged.
- Dunk shoulders, elbows, hands and 41-pixel reach unchanged (V11 contract).

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Dunk leg silhouette | approximate | Legs hang together like the observed dunker; arms unchanged by contract. |
| Defence, build, stance, kits, faces | adapted | Unchanged from V17. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections



## Open findings

- Source knock-down after a super dunk has no simulation trigger; adding it is a gameplay change needing the user's approval.
- Source blockers often raise one straight arm; ours raise both.
- Venue regressed relative to footage (drapes, HIP HOP stage, scaffold-mounted baskets) — deferred until characters are done, per the user.
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v18/characters.html`, `game.html`, `action-review.html`.
