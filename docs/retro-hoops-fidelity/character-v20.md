# Retro Hoops / Street Hoop likeness pass v20

Fixed the two V19 construction findings: the jersey volume now ends on the shorts waistband (no bustle behind running/dribbling hips, no leotard in front/back views) and a crotch seat joins the front/back shorts legs. The build is `character-v20-local`, assets `20.0.0`, rules `2.0.0`. V19 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Side jersey volume starts 22% up the spine from the hip joint, so its hem sits on the waistband.
- Front/back jersey volume starts above the hip line; a wider, lower shorts seat fills the crotch.
- Side shorts seat narrowed to avoid bulging behind the hips.

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Jersey/shorts construction | approximate | Hem on the waistband in all views, like the observed sprites. |
| Figure rendering and proportions | approximate | V19 volume renderer retained. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections



## Open findings

- Heads still use the earlier flat polygon construction at 80% scale; volume-lit heads prototyped for V21.
- Street Hoop uses several venues by matchup; venue pass deferred until characters are done, per the user.
- Source knock-down after super dunks has no simulation trigger (gameplay change needs approval).
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v20/characters.html`, `game.html`, `action-review.html`.
