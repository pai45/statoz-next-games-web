# Retro Hoops / Street Hoop likeness pass v23

Re-coloured the cast from colour clusters measured on native GameLog sprites (frames 0048/0067): near-black outlines, deep saturated orange-brown skin ramps, darker cloth shadows; red team shorts changed to charcoal for the kit/skin contrast seen on Street Hoop teams. The build is `character-v23-local`, assets `23.0.0`, rules `2.0.0`. V22 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Skin ramps from measured clusters: blue team #62381c/#ad4d09/#df750e/#fea53d; red team #5c180c/#b54510/#e47435/#feaa61; near-black outlines.
- Cloth ramps darkened toward measured values (blue jersey #233b78/#326cbd/#629ef7; red #7b0d02 to #e2300a).
- Shading bands shifted so lit sides cover more of each form, matching the bright-orange-with-dark-edges look (atlas and live grip arm).
- Red team: red tee, white sleeves, yellow chest band and charcoal shorts (original combination; previously orange shorts merged with skin).

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Colour ramps and outlines | approximate | Derived from measured native sprite colour clusters. |
| Kit contrast | adapted | Fictional kits using the observed jersey/shorts contrast. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections

1. Measured ramps with V22 shading bands left most of each limb in dark tones. → Shading thresholds lowered so lit tones dominate (generator and grip arm).
2. Red tee, orange shorts and orange skin merged into one warm mass. → Red team shorts changed to charcoal.

## Open findings

- Front-view tank top still reads slightly egg-shaped at the shoulders.
- Front-view hands hang slightly below the source's hip-height hands.
- Street Hoop uses several venues by matchup; venue pass deferred until characters are done, per the user.
- Source knock-down after super dunks has no simulation trigger (gameplay change needs approval).
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v23/characters.html`, `game.html`, `action-review.html`.
