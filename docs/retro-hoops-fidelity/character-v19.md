# Retro Hoops / Street Hoop likeness pass v19

Rebuilt how athletes are drawn after an 8x native pixel study of GameLog frames 0048/0067: in-game Street Hoop sprites are lean and wiry with smooth lit gradients and continuous limbs, unlike our bulky flat-polygon figures with outlined joints. The build is `character-v19-local`, assets `19.0.0`, rules `2.0.0`. V18 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- New original renderer scripts/retro_hoops_volume.py: limbs, torso, shorts, socks, seat and neck are tapered volumes along the existing rig joints, lit from one direction and quantised into five-tone ramps with a darker rim; one continuous outline per part group, so elbows and knees have no seams.
- Measured in-game proportions: upper arm ~8px, forearm ~6px, thigh ~10px, shin ~7px wide; head drawn at 80% size; shoes at 80% size with visible white socks.
- Jersey materials per pixel: chest band, raglan sleeve panels, tank-top bare shoulders and front scoop neck; broad front shoulder line.
- Ready crouch arms bend with forearms forward at waist height (non-ball hands).
- Live ball-holding arm (contact-arm.ts) ported to the same volume renderer, constants and palettes, mirrored per pixel for left-facing players.
- V16's team-select bulk is retired for in-game sprites: those lineups are larger select-screen illustrations; in-game sprites are lean.

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Figure rendering (lit gradients, continuous limbs, outlines) | approximate | Matches the observed in-game sprite rendering much more closely at 8x native comparison. |
| In-game proportions (lean limbs, head, shoes) | approximate | Widths measured from native GameLog frames. |
| Front/back construction | approximate | Broad shoulders achieved; jersey length still wrong. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections

1. Representative shorts and seat ballooned into round bulbs; torso too thin; ready arms hung long and straight. → Thigh-following shorts radii, smaller seat, fuller jersey volume, bent ready arms.
2. Front torso read as an egg-shaped sack with narrow rounded shoulders. → Added a shoulder volume across the front/back torso top.

## Open findings

- Front/back jersey hangs too low between the legs (leotard look); fix next (V20).
- Seat volume bulges behind the hips in run/dribble side views (bustle); fix next (V20).
- Heads keep the earlier polygon construction at 80% scale; not yet volume-shaded.
- Street Hoop uses several venues by matchup (brick street court with chain-link fence for USA/England, park court for Korea/Japan, Champion Ship arena for China, HIP HOP drapes/scaffold in the GameLog match); venue pass deferred until characters are done, per the user.
- Source knock-down after super dunks has no simulation trigger (gameplay change needs approval).
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v19/characters.html`, `game.html`, `action-review.html`.
