# Retro Hoops / Street Hoop likeness pass v21

Rebuilt all six heads in the same lit style as the bodies after a 10x native comparison with GameLog heads: rounded lit skull and jaw, lit hair or headwear masses with highlights, then small pixel features (shades band, nose, ear, moustache, goatee, headbands, spikes, ponytail, cap brim). The build is `character-v21-local`, assets `21.0.0`, rules `2.0.0`. V20 is preserved. The pass follows the `street-hoop-assets` workflow with shared tooling in Designer `output/retro-hoops/likeness-loop/`.

## Changes

- Skull and jaw are one lit volume (profile jaw slightly forward); same light, ramps and outline rules as the body.
- Hair, bandana and cap are lit dome masses clipped to the scalp; spikes are small lit spikes attached to the hair; ponytail is a lit tapered volume.
- Features drawn as pixels over the lit skull: dark shades band with a glint, nose and ear shading, moustaches and goatee, headbands.
- All six identities stay distinct in side, front and back views; 32x32 head layer and [16,16] anchor unchanged.

## Fidelity

| Feature | Status | Review |
|---|---|---|
| Head rendering | approximate | Lit skull/hair masses like the observed native heads; features authored. |
| Identity designs | adapted | Original six identities using observed motifs (shades, caps, headbands, flat-tops). |
| Native timing, input windows, hidden AI | unverified | Not recovered. |

## Corrections

1. Headband player's spikes floated as dotted specks above the head. → Spikes drawn as small lit tapered volumes attached to the hair.

## Open findings

- Blond back view still reads as a smooth helmet-like mass; strand detail would help.
- Street Hoop uses several venues by matchup; venue pass deferred until characters are done, per the user.
- Source knock-down after super dunks has no simulation trigger (gameplay change needs approval).
- Bodies stay per team; native timing and physical devices unverified.

## Evidence boundary

The art is an original reconstruction; no Street Hoop sprites, names, flags or branding are used, and source crops stay research-only. Contracts: foot origin, ball-holding hand endpoints, dribble-ball endpoints and dunk reach are unchanged (`rig-contract-checks.json`). Simulation, AI and input are untouched. Source-likeness approval is false until the user reviews it. Nothing was pushed or published.

Review: `test-results/retro-hoops-character-v21/characters.html`, `game.html`, `action-review.html`.
