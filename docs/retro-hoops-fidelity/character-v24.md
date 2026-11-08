# Retro Hoops / Street Hoop likeness pass v24

Fixed the V23 front-view findings: the blue team's tank top now narrows to straps over bare shoulders with a deeper scoop (as on the source tank kits) instead of an egg-shaped vest, and front-facing hands hang at hip height. The build is `character-v24-local`, assets `24.0.0`, rules `2.0.0`. V23 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Front/back tank jersey volume narrows toward the top; bare-shoulder skin region widened to leave straps; deeper front scoop neck.
- Tees (red team) keep the broad sleeve line.
- Front/back ready and defend elbows and hands raised to hip height (non-ball hands).

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Front tank construction | approximate | Straps over bare shoulders like the observed tank kits. |
| Front arm hang | approximate | Hands at hip height. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections



## Open findings

- Front jersey still bulges slightly over the shorts waistband.
- Street Hoop uses several venues by matchup; venue pass deferred until characters are done, per the user.
- Source knock-down after super dunks has no simulation trigger (gameplay change needs approval).
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v24/characters.html`, `game.html`, `action-review.html`.
