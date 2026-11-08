# Retro Hoops / Street Hoop likeness pass v27

After release the live grip arm stops (the ball has no owner), so the atlas shot frames now draw the shooting arm, keeping both arms up through the follow-through as in the reference. Jerseys and shorts gain fold creases; the run's forward fist no longer rises to the chin. The build is `character-v27-local`, assets `27.0.0`, rules `2.1.0`. V26 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Shot frames from the release tick on draw the near (shooting) arm in the atlas; before release the live grip arm still draws it against the ball.
- Jersey creases: diagonal folds from armpit toward waist (side) and waist folds (front/back), kept strictly inside the jersey outline.
- Shorts creases: an inner-leg fold and a hem fold on each leg.
- Run: forearm swing flattened so the forward fist stays around chest height.

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Shot follow-through | approximate | Both arms visible after release, like the reference. |
| Cloth detail | approximate | Fold creases like the observed loose jerseys and shorts. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections



## Open findings

- Shot follow-through lowers the arm over ~24 ticks; the reference holds it up a little longer during the descent.
- Pass reads as an overhead outlet pass; a chest-pass variant would need new simulation anchors.
- Street Hoop changes venue by matchup; Retro Hoops keeps the shared reference venue.
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v27/characters.html`, `game.html`, `action-review.html`.
