# Retro Hoops character v5

Build `character-v5-local`, assets `5.0.0`, rules `2.0.0`. Maintained runtime: Future Games Web. The stable game ID and existing host title are unchanged. Local only; no push, pipeline activation or publication.

The editable generator now constructs the chest over an independently planted pelvis. The jersey follows that tilted axis rather than retaining a vertical outline while limbs move. Original shoulder roll, head lead and chest offsets distinguish running, passing, shooting, crouching and dunking. Running uses explicit bent-elbow paths, ready arms relax beside the body, and front/back running centres the chest rather than inheriting a lateral lean. Smaller chest light clusters improve kit readability; the violet shorts now have the intended hem colour.

The runtime contact arm uses the current pose's shoulder and the authoritative ball endpoint. Its muscle belly, outline, flat shadow, highlights, sleeve and hand now match the authored atlas construction. Simulation rules, possession decisions and physical contact contracts were not retuned in this art pass. No bitmap stretching, extracted source sprites or traced source contours enter the executable pack. V4 remains intact; its anatomy and generator are also snapshotted in the v5 review directory.

Reference research: https://www.youtube.com/watch?v=_k8IIS9n3dk . Frames `first-possession/frame-0016.png` and `frame-0067.png` inform movement posture and defensive/carrying weight. They are research-only images; recording cadence is not native animation timing. The comparison remains qualitative because poses, depth and camera do not align exactly.

Passed: 84 rules/integration tests, eight asset integrity checks, 16 rendered and decoded production action loops, nine mobile/lifecycle checks, six team scenarios, six exported host-flow checks, lint, typecheck and static build. Both kits and attack directions appear in production captures. Browser checks use desktop Chromium/SwiftShader; they do not establish physical-phone performance.

Visual review is incomplete against the exact-likeness request. The poses are less upright and the arm rendering more coherent, but face/limb contours, reference-specific footwork and apparent scale remain different. Neither frame count nor technical checks establishes 1:1 likeness. Source likeness approval and native timing recovery remain false.

Review: http://127.0.0.1:8946/characters.html . Play: http://127.0.0.1:8946/game.html . Production inspector: http://127.0.0.1:8946/action-review.html . The review includes a V4/V5 comparison, both kits' twelve-pose running cycles and sixteen silent production loops.

Editable sources: `scripts/retro_hoops_character.py`, `scripts/build-retro-hoops-authored.py`, and `src/features/games/retro-hoops/contact-arm.ts`. Rebuild via the Python generator and verify with `python scripts/check-retro-hoops-authored.py`; version selection is in `character-pack.ts`. The new manifest records source and atlas hashes and retains explicit ground, hand, shoulder and limb anchors.
