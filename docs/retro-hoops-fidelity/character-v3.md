# Retro Hoops character generator v3

The current character pack is `authored-v3`, asset version 3.0.0, in build `character-v3-local`. Match rules remain 2.0.0. No AI, audio or host-branding changes were made in this pass. Earlier original v2 assets and their frozen playable candidate remain intact.

The generator now separates anatomy construction (`scripts/retro_hoops_character.py`) from clip/atlas generation (`scripts/build-retro-hoops-authored.py`). Both remain editable original geometry and palette code. They do not load reference raster inputs; the separate review script reads only the prior original v2 pack to prepare the comparison sheet.

Changes include fuller tapered thighs/calves/arms, a broader jersey silhouette, shorter head/neck proportions, purposefully clustered skin/clothing highlights, distinct front/back collars/numbers/hair, revised sock/shoe shapes, a grounded support phase and folded running recovery. Knee paths track the feet rather than crossing or bowing outward. Preparation/catching arm bends are kept below the face.

Every pose exports ground, shoulders, hips, hands and limb anchors. Production's held-ball arm uses the current pose's shoulder instead of fixed coordinates, including mirrored views. Dribbling arm layers have matching front/back variants to prevent a side-view shoulder being attached to a rear-view torso.

The pack has 2,276 frame entries and 1,264 distinct pixel frames. These counts include explicit mirrors, view variants and repeated holds; they are not claims of recovered Street Hoop frames. The 144x128 virtual canvas and (72,116) ground anchor remain stable. Existing contact/scoring positions and simulation timing remain authoritative.

Validation: 84 targeted tests; eight asset structural/hash/anchor checks; 16 actual Three-rendered action loops, encoded and decoded; nine mobile/lifecycle checks; six team scenarios; six exported host-flow checks; lint, typecheck, static export and scoped diff checks pass. The two new regression tests cover directional body/arm shoulder agreement and non-crossing neutral knees. Physical-device performance and exact reference likeness are not certified.

Review locally:
- Game: http://127.0.0.1:8944/game.html
- Character gallery: http://127.0.0.1:8944/characters.html
- Before/after body layers: http://127.0.0.1:8944/before-after.png
- Actual complete actions: http://127.0.0.1:8944/action-review.html

Rebuild with `python scripts/build-retro-hoops-authored.py`. Generate the comparison with `python scripts/review-retro-hoops-character-v3.py`; this also regenerates the pack from its sole authored source. Verify with `python scripts/check-retro-hoops-authored.py`. Production and inspection use the same versioned pack. Visual approval remains explicitly pending; this revision improves the original family rather than claiming 1:1 source art. Nothing was pushed or published.
