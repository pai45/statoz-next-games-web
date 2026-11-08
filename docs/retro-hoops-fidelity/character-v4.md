# Retro Hoops / source-directed character v4

Build `character-v4-local`, assets `4.0.0`, rules `2.0.0`. This pass targets the Street Hoop Steam/video reference selected earlier in the conversation; the separate Hoop Duel game is not the maintained target. No push, pipeline or publication occurred.

The user requested exact likeness. This candidate does **not** meet that acceptance criterion. It is a source-directed original art revision, and its source-likeness approval remains false. Passing the technical checks must not be presented as an exact-art pass.

The generator changes original point construction rather than stretching v3 rasters: smaller head/face clusters, a shorter vest, higher hip line and longer lower-leg silhouette; saturated azure/violet and white-sleeve/red kits; warmer skin highlights, blonde/red hair clusters, brighter socks and dark shoes. Running uses explicit authored support/stride samples. Neutral arms relax beside the torso; raised/supporting elbows are separated; the held-ball arm chooses its bend from the target's position. Ground, hand, rim and simulation ownership contracts are retained.

The game continues using original geometry and palette assets. Earlier v2/v3 packs remain intact, with the previous generator/anatomy snapshotted under the v4 review folder. No source video pixels enter the executable pack. Source recording material appears only in the local research comparison.

Reference: https://www.youtube.com/watch?v=_k8IIS9n3dk . The selected `first-possession/frame-0067.png` is around requested source 68.6s. Recording time/cadence is not native input timing. Dense athlete overlaps in other frames must not be mistaken for a single silhouette. The comparison is qualitative: poses, depth and camera are not aligned precisely.

Validation passes: 84 tests, eight asset hash/anchor checks, 16 rendered and decoded action loops, nine mobile/lifecycle checks, six team scenarios, six exported host checks, lint, typecheck and static export. These checks establish integrity/playability, not exact likeness. Apparent player size, contours and complete source motion character remain open visual differences. Physical-phone validation remains unperformed.

Review: http://127.0.0.1:8945/characters.html . Play: http://127.0.0.1:8945/game.html . Complete production actions: http://127.0.0.1:8945/action-review.html .

The editable sources are `scripts/retro_hoops_character.py` and `scripts/build-retro-hoops-authored.py`. Rebuild with the latter; verify with `python scripts/check-retro-hoops-authored.py`. The runtime selects the version through `character-pack.ts`. Further exact-likeness work needs a matched-pose measurement/review pass; another arbitrary palette or bulk frame-count increase is not acceptance evidence.
