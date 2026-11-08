# Retro Hoops / Blue versus Red

Build `character-v6-local`, asset pack `6.0.0`. User-requested colour change: one blue team, one red team. Jerseys and shorts are coordinated per team, including generated directional/mirrored and movement variants. Garment highlights follow each palette instead of using blue-only trim. The red team's contrasting white undershirt is retained. The scoreboard, scoring callouts, winner text and result table now say BLUE / RED.

Internal sprite/team keys `navy` and `amber` remain stable for compatibility. V5 art and its review remain preserved. Current pack selection and asset provenance point to `authored-v6`. No movement, AI, ball contact, rules or account storage changes are part of this colour revision.

Validation: 84 tests, eight asset integrity checks, nine browser/mobile lifecycle checks, lint, typecheck and production static export passed. Inspected both kits' poses and the 844 by 390 production handheld capture. No physical-device test performed. Existing source-fidelity limitations remain recorded in the V5 review.

Play: http://127.0.0.1:8947/game.html . Team comparison: http://127.0.0.1:8947/teams.html . Local only; no push, pipeline activation or publication.
