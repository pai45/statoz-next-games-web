# Hoop Legacy athlete production plan

Date: 2026-11-06. Source study: the supplied `plans/nba2k-grade-athletes.md`.

## Visual target

Original basketball athletes with adult athletic proportions, a convincing face
and eyes, layered mid-top shoes, loose basketball uniforms, readable hairstyles,
and restrained skin/cloth highlights. Close-up player creation and replay views
are the quality gate; broadcast views must retain clear silhouettes and team kits.
NBA 2K is a fidelity reference. Player identities, team graphics and footwear are
Hoop Legacy's own.

## Findings

The imported renderer still constructs each character from SDF geometry. The
supplied pipeline contains a useful MakeHuman body/conforming stage and a loader,
but the shipped asset is only a smoke-test mesh. Uniform, footwear, hair, runtime
assembly and hero switching are unfinished. Its build paths assume Linux, whereas
this workspace has Blender 4.5 on Windows. Activating the existing manifest alone
would not deliver the intended artwork.

## Execution

1. Preserve the imported baseline and capture representative current players.
   Build the new pipeline in `tools/hoop-legacy-athletes`, with runtime changes in
   `src/features/games/hoop-legacy/source/statoz/athletes`. Keep the original Downloads folder unchanged.
2. Acquire the pinned MakeHuman CC0 data, verify the existing SHA-256 lock, and
   conform the body/head/morphs to the game's exact 19-bone bind pose. Reuse the
   supplied offline readers/conformer as attributed build inputs. Use the installed
   Blender, without installing or running MakeHuman application code.
3. Author a basketball uniform with shoulder bridges, bound neck/armholes,
   drape/fold geometry, separate shorts legs and waistband. Build mid-top shoes
   with separate sole layers, toe spring, heel counter, tongue, laces and panels.
   Fit eyes/brows, hair and accessories to the conformed head and existing rig.
4. Produce game and hero meshes from the same source. Share geometry and textures,
   retain per-player face/build variation, and generate skin/cloth/shoe surface maps.
   Use lossless WebP/PNG maps initially rather than making a platform-specific
   KTX executable a prerequisite. Record decoded GPU size as well as download size.
5. Connect the authored character to the unchanged animation/ball-contact API.
   Preload game assets before character construction, lazy-load hero geometry for
   close-ups, and retain the procedural character if loading fails. Keep all
   appearance options, team prints, career saves and gameplay rules.
6. Capture and inspect face, full-body, footwear, diverse roster, crouch/run/shot,
   creator and broadcast views. Fix visible defects in the source geometry or
   material. Validate hashes, finite data, weights, morphs, pose continuity,
   budgets, browser errors, local requests and asset-failure recovery. Rebuild the
   game, update its cover only after visual review, and document measured results.

## Acceptance

- A material improvement visible in close-up captures, with real authored meshes
  active in the game rather than a separate illustration or unused model.
- Compatible rig, height, palm and sole alignment; no NaN or detached body parts.
- All original hair, skin, kit, sleeve, sock and shoe-colour options remain usable.
- Game assets target <=55k triangles on low and <=110k on desktop; hero <=300k.
  Shared gameplay download targets <=8 MB and optional hero <=20 MB. Report actual
  construction/render costs; do not infer them from polygon counts.
- Source provenance and notices ship with the assets. Baseline hashes still pass.
- No push, publication, changes to other games, or cross-project synchronization.

## Work log

- Plan written; source/renderer audit completed. MakeHuman's pinned asset licence
  and the original system-asset CC0 listing verified at their original sources.
- Completed the conformed CC0 body/head, 30 face targets, three build targets,
  tone-neutral skin detail/normal/roughness maps, fitted eyes/brows/lashes, nine
  hair meshes plus bald, original uniforms, shoes and accessories. The system
  archive is SHA-256 pinned; afro/high-top cards retain their CC0 source notice.
- Integrated the authored character into every original game mode. Game assets
  preload locally; creator/intro/replay close-ups request hero detail. Low quality
  and medium handhelds use the gameplay mesh. Changing quality updates existing
  athletes; asynchronous detail requests cannot replace a newer request or a
  disposed character. Failed/blocked asset loading retains playable SDF athletes.
- Reviewed identical baseline/authored face, body, footwear, back, crouch, run,
  shot, roster and broadcast captures, all ten hairstyle choices, five skin tones
  and three seeded heads per tone. Corrected shoe closure, kit print orientation,
  shoulder construction, hair cap silhouettes, strand frames and scalp roots.
  Retained the existing illustrated game cover after review.
- The repeatable review writes unretouched PNGs, JSON and an offline comparison
  divider to `test-results/hoop-legacy-athletes/comparison.html`. The actual game is
  available at `/play/hoop-legacy`; this is not a disconnected art demonstration.

## Recorded validation

The final pack check reports <=54,798 triangles per gameplay athlete and
<=133,698 per hero, with at most eight material calls. Complete shared packs
including every variant are approximately 2.63 MiB low, 4.93 MiB desktop and
5.89 MiB hero. These are full-tier sizes, not per-player downloads. Content hashes
share textures across tiers; the combined worst-case decoded texture budget is
156 MiB including mipmaps. The production cache includes each runtime file and
excludes the duplicate editable distribution.

The 1,200-frame authored motion sample stays finite, keeps hips above 0.417 in
normalized coordinates and palm/held-ball contact within 0.0152 m. Planted idle
foot drift is below 0.000001 m. Hero/game bone matrix change is below 0.000001.
These checks exercise the existing animator, not a replacement animation loop.

Chrome runtime checks passed for the real creator and six-player matches at low,
medium and high settings, including high-to-low-to-high switching and blocked
asset fallback. Low 3v3 also ran for 25 seconds after the intro. The complete host
suite passed all modes, held-input suspension, career creation/reload, account
isolation, return navigation and 844x390 / 390x844 touch viewports without page
errors or failed requests. Three import/hash checks and twelve device-cache
checks passed. Host and vendor TypeScript, scoped lint, the standalone game build
and the Next.js production build passed locally. No release was performed.

## Fidelity and measurement limits

This delivers the authored web-game athlete pipeline and a visible realism
improvement over the supplied SDF characters. NBA 2K remains the fidelity
reference: this pack uses generic conformed anatomy, authored cloth folds and
simplified hair/expressions. It does not contain scan-derived faces, groom
simulation, facial animation or a cloth-simulation bake. Further character-art
polish would be needed for console-level close-ups.

Construction and render submission measurements are recorded in `runtime.json`
and `review.json`. The latter resets renderer statistics around the complete
reflection/post pipeline, rather than reporting only its final full-screen pass.
Its nine-sample CPU submission median excludes GPU completion and presentation;
the eight-hero review can cost more CPU time than the procedural baseline despite
fewer triangles. Browser emulation is not physical iOS/Android GPU certification.

## Stretching regression correction

A subsequent gameplay report exposed a skin-binding defect that the original
bone-only checks missed. Detail swaps used a player's current court transform as
the mesh bind matrix while retaining origin-space skeleton inverses. The fix
keeps the construction-time bind matrix and changes meshes without resetting the
posed skeleton. The new vertex regression reproduced a 24.5 m extent before the
fix and now reports zero game/hero/game vertex-bound error across twenty moving,
rotating and jumping pose cases.

The strengthened runtime suite sampled 493 deformed athletes across 97 checks
in real intros, 1v1/3v3 play, inputs and quality switches; maximum sampled extent
was 2.77 m, with no browser errors. Both phone orientations, career persistence,
account isolation and pause/resume also passed in the production host. The local
production build, source-integrity checks, vendor TypeScript and scoped lint pass.

Geometry is now shared by content hash across tiers, unused attributes are
removed and player print materials survive swaps. All-tier decoded CPU geometry
buffers fell from 51,847,792 to 33,920,044 bytes (34.6%). The deformation regression
enforces geometry sharing, a 36 MiB decoded-buffer ceiling and one reused uniform
material across repeated swaps. These are allocation measurements, not device FPS.
