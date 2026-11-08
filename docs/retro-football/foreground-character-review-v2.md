# Foreground character v2 — independent review round1

Candidate0.9.1, actual served bundle SHA256 `cb7f809afb465b55eb2500c2df2796e6d758a08c9865643a21b829a62aa2cc14`. Read-only review against source first-goal0020/0023/0025, previous dedicated art, all16new poses in `art/review.png`, native contact/entry/follow PNGs,4×contact enlargement and actual gameplay screenshots.

## Visual verdict

**Material improvement; pass for the requested bounded art refinement.** The old hinged/blocky impression is substantially reduced. The new character reads as a coherent athlete with a curved shirt/waist, distinct shorts volume, tapered knees/calves and connected arms. Copper hair now forms a layered shoulder-length mass with purposeful light/mid/shadow locks. Fabric folds follow the torso rather than floating as noise. At native gameplay size these changes remain visible; they are not detail that only appears when enlarged.

The near sleeve/deltoid, elbow and wrist connect naturally. The far arm belongs to the opposite shoulder and remains distinct; no extra/duplicated arm was observed. A narrow cheek/ear edge remains, but the hair-covered head and broad shoulder plane no longer read as a front-facing portrait. Both kits retain the same anatomy and action family.

Source difference remains: the recording's contact torso has stronger rear-facing hip/shoulder twist and more aggressive forward lean. The candidate is still more upright and partly side-facing, with broad clean color planes compared with the source's dense clusters. Source follow0025 turns away with the trail leg behind, whereas the accepted action still uses a raised extended leg. That motion was explicitly preserved in this art-only phase. Do not call the source anatomy/pose family1:1 or native-timed.

## Preservation and functional evidence

- All16pose anchor dictionaries match the accepted0.9.0 parent exactly.
- `simulation.ts`, `geometry.ts`, `renderer.ts` and `close-view.ts` are byte-identical to that parent. Physics, camera, phase timing and contact mapping were not changed by this art revision.
- Eight independent browser checks passed; zero page errors. Contact error remains0.0751px in half1 and0.2826px in half2 against actual emitted release, within2px.
- Tested entry/preparation/contact/follow display, real same-ball outcomes in both halves, pause/resume/restart,568×320/844×390 mobile layout, non-aim SHOT/WATCH disabled controls,320×224 reference framing/timeout/pitch return and aiming touch cancellation.
- Inspected native rendered scene and contact/frame screenshots. The boot remains visibly connected to the contact pose; no second ball or new detached limb observed. At narrow mobile size the detailed hair/torso still reads clearly, with lower limbs intentionally near the screen edge.

Evidence: `round-1-checks.json`, `review-character.mjs`, `contact-enlarged.png`, `round1-native.png` and phase/mobile screenshots. Structural checks support preservation; the visual judgment above is separate.

## Limits and next work

This pass accepts an original source-informed foreground-art improvement, not exact commercial character recreation. Physical-phone comfort/performance, source-native timing and perspective remain unverified. Stronger source-style body rotation or a different follow-through requires a separately scoped movement phase because it would alter the preserved action skeleton/anchor choreography. No correction is required for this bounded art pass; a second automatic correction round need not be consumed without a material issue. No multiplayer scope.
