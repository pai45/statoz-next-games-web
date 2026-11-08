# Retro Hoops / Street Hoop likeness pass v14

The user asked for the Retro Hoops characters to match Street Hoop as closely as possible, building on the existing research. The work followed the `street_hoop_artist` role and the `street-hoop-assets` skill, executed inline. The build is `character-v14-local`, assets `14.0.0`, rules `2.0.0`. V13 (`authored-v13`, `character-v13-local`) is preserved as the predecessor. It had no separate write-up; its records live in `test-results/retro-hoops-character-v13`.

User decisions: match the reference framing; use source-style kits on fictional teams; cover athletes, shadows/ball and venue.

## Ranked gaps addressed

| Gap (source frames `first-possession/frame-0048`, `frame-0067`, `pass-dense/frame-0037`, `frame-0049`) | V13 | V14 change | Verdict |
|---|---|---|---|
| Athlete screen share: ~28-30% of screen height in the recording | ~20%, wide camera | 252-high window of the 360 world (~1.43x), two-axis follow | approximate |
| Body: strong forward lean, short jersey, loose contrasting shorts, high-tops, big hands | Upright box torso, dress-length jersey | Spine-aligned torso with rounded back, knee-length shorts, high-tops with socks, larger hands | approximate |
| Kits: contrasting jersey/shorts, tank vs raglan, no big numbers | Single-colour kits with "11" | Blue: sky tank/lavender shorts. Red: red raglan, white sleeves, orange shorts | adapted |
| Distinct player looks | Three similar heads per team | Six distinct original heads | adapted |
| Shading: warm orange skin with yellow highlights | Flatter 4-tone | Five-tone warm skin ramps | approximate |
| Checkerboard shadows, shaded ball | Solid ovals, flat 11px ball | Dithered shadows, 13px four-tone ball (draw size only) | approximate |
| Venue: fence, crowd, asphalt, pole basket | Bleachers, scaffold, DJ booth | Buildings, brick wall, chain-link fence, standing/seated crowd, curb, asphalt, pole baskets | approximate |

## Contracts kept

All 2276 body frames keep V13 foot origin, hand and dribble-ball endpoints. All 104 dunk poses keep shoulders and elbows; the maximum reach is 40.8px. Rim anchors are unchanged. Simulation, AI, input, timing, storage and audio files are byte-identical to V13, and 86 rules/integration tests pass. The camera change is presentation only. Review tooling, route checks and console checks now expect a 252-high canvas.

## Correction rounds

Two automatic rounds were used (`correction-record.json`): (1) shorts slabs, solid-blue shoes and the far-sleeve wedge; (2) the boxy between-leg block and the remaining sleeve wedge.

## Open findings

- Ready/defend stance still uses V13 wide flat-thigh leg geometry, so shorts read blockier than the source knees-forward crouch (pose change, outside the two automatic rounds).
- Blond identity back view reads like a helmet; red-team white sleeves flare wide in back view.
- Near-side athletes can sit under the joystick and A/B overlays at the bottom corners; larger players make this more visible than in V13.
- Crowd standing-row heads crop at the top when the camera follows play to the near sideline.
- Bodies stay per team (one skin ramp and one build per team); per-player skin tone and body-build variety remain open.
- Native frame holds, input windows, source camera algorithm and physical Android/iPhone performance remain unverified.

## Evidence boundary

The art is an original reconstruction from observed recordings. No Street Hoop sprites, team names, flags or branding were extracted, traced or used, and source crops stay research-only. Equal-height comparisons do not align pose, camera or depth. Source-likeness approval is false until the user reviews it. Nothing was pushed, published or imported into Flutter.

Review: `test-results/retro-hoops-character-v14/characters.html` · Play: `game.html` · Inspector: `action-review.html`. Editable sources: `scripts/retro_hoops_character.py`, `scripts/build-retro-hoops-authored.py`, `src/features/games/retro-hoops/{view,renderer,presentation,court,crowd,contact-arm}.ts`.
