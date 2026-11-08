# Retro Hoops / Street Hoop likeness pass v25

Rebuilt the venue after the one shared by both reference videos (GameLog Korea vs France; Arcadexzone Italy vs Taiwan): dark draped warehouse with warm light, a dense muted crowd standing and sitting on the floor, a centre DJ booth, and baskets mounted on steel scaffold towers with spare balls and bags. Characters unchanged from V24. The build is `character-v25-local`, assets `25.0.0`, rules `2.0.0`. V24 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Backdrop: near-black warehouse with drape folds and three warm overhead light pools; brick wall, buildings and chain-link fence removed.
- Crowd: standing rows of muscular spectators in muted beige/grey/khaki/olive tees and tanks with generic printed numbers, maroon/brown shorts, caps; seated front row cross-legged on the floor; occasional cheering.
- Centre DJ booth: DJ in headphones behind turntables over a navy booth banner with a red stripe, gold star and original text STREET JAM (source lettering and logos not copied).
- Baskets: chunky braced light-grey steel scaffold towers behind each baseline with arms to the backboards; spare balls and a duffel bag at each tower foot.
- Backboard art: perforated grey-white board in a dark steel frame, white net, orange rim; rim anchors unchanged.
- Court surface and legal markings unchanged.

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Backdrop, crowd and DJ booth arrangement | approximate | Arrangement and palette follow the shared reference venue; all code-drawn original art. |
| Scaffold-mounted baskets | approximate | Tower construction follows observed frames; rim anchors unchanged. |
| Branding and lettering | adapted | Original STREET JAM banner; no source logos or text. |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections

1. First scaffold towers were too tall, thin and ladder-like and stood too far outside the court. → Shorter, chunkier towers placed closer behind each baseline with fewer, thicker braces.

## Open findings

- Duffel bag near the left tower base reads as a floating black box; scaffold towers stand taller than the backboards (next pass).
- Street Hoop changes venue by matchup (brick street court with fence, park court, Champion Ship arena); Retro Hoops keeps one venue (the one shared by both reference videos).
- DJ figure and crowd are simpler than the source's painted spectators.
- Knock-down after super dunks deferred by the user (gameplay unchanged).
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v25/characters.html`, `game.html`, `action-review.html`.
