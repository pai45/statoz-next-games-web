# Retro Hoops / Street Hoop likeness pass v22

Tuned figure proportions after the equal-height V21 comparison: the source's jersey/upper body is fuller, its shorts are a bigger baggy block and its head is about 16% of body height (ours was about 13.5%). The build is `character-v22-local`, assets `22.0.0`, rules `2.0.0`. V21 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Side jersey volume ~12% deeper with a stronger upper-back hunch.
- Shorts reach 90% of the way to the knee and are ~10% wider.
- Heads redrawn 12% larger (geometry scaled, not raster-stretched) inside the unchanged 32x32 layer.
- Front/back torso broadened at the chest and tapered at the waist (V shape).

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Body proportions (upper body, shorts, head) | approximate | Closer to the native GameLog sprites at equal height. |
| Figure and head rendering | approximate | V19/V21 renderers retained. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections

1. Broadened front torso read pot-bellied (widest at the bottom). → Waist radius reduced so the front torso tapers from chest to waist.

## Open findings

- Front-view hands hang slightly below the source's hip-height hands.
- Blond back view still reads as a smooth mass.
- Street Hoop uses several venues by matchup; venue pass deferred until characters are done, per the user.
- Source knock-down after super dunks has no simulation trigger (gameplay change needs approval).
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v22/characters.html`, `game.html`, `action-review.html`.
