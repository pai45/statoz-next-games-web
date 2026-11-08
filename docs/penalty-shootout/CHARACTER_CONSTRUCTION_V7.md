# Character construction pass v7

Runtime `character-construction-7`, maintained only in Future Games Web. Original assets on the existing CC0 human foundation; local work, no deployment.

## Gaps addressed

The v6 review still showed faceted torso clothing, visibly separate padded finger pieces and bare skin protruding through keeper gloves. Surface maps could not fix those construction problems.

- Replaced the central jersey torso with an authored continuous loft, restrained waist folds, consistent surface normals and shared-vertex bridge panels into the retained sleeves/shoulders. Preserved original kit identities, stripes, collar and cuffs.
- Rebuilt glove fingers as tapered articulated tubes around the existing three-bone finger chains, with curved palms, shaped backs and longer wrist cuffs. High and mobile meshes use different surface resolution.
- Separated bare-hand skin into role-owned meshes: visible for takers, hidden beneath keeper gloves. Body/head surface maps, skin tints and facial morphs survive the split.
- Added tapered brow ends, restrained chin/cheek refinement, an asymmetric quiff and an irregular hairline. These remain original generic identities.

The 60-bone rest rig, all 35 clip names, one-second kick contact and gameplay contracts remain unchanged. The installer compares joint rest transforms and clip names before replacing assets.

## Rejected iterations and review

The initial torso replacement left open underarm joins. It was rejected and replaced with shared-vertex bridge faces. A glove close-up then exposed the incompatible bare skin finger silhouette beneath the football finger rig. Keeper skin hands were separated, followed by a longer cuff to cover the wrist join. Review therefore covers the defects themselves, not only flattering camera angles.

- [Jersey and glove before/after](evidence-model-v7/construction-comparison.png)
- [Head and hair comparison](evidence-model-v7/comparison.png)
- [Final glove palm](evidence-model-v7/after/glove-palm.png) / [back](evidence-model-v7/after/glove-back.png)
- [Jersey side view](evidence-model-v7/after/jersey-side.png)
- [Keeper pose](evidence-model-v7/poses/keeper-late-dive.png)
- [Rejected open-underarm iteration](evidence-model-v7/iterations/unbridged-torso-rejected.png)

Matched front/quarter/profile captures cover all four presets at both mesh detail levels, with extra equipment and seeded shot/keeper poses. Automated renderer inspection requires bare hands to remain visible for the taker and hidden for the keeper.

## Editable source and reproduction

`assets/athlete-source-v6.blend` preserves the input. `assets/refine-construction.py` authors v7; `assets/athlete-source.blend` is the installed editable result. The public asset manifest retains foundation URLs/license evidence and hashes for every asset and authoring source.

```text
blender --background --python docs/penalty-shootout/assets/refine-construction.py -- --source docs/penalty-shootout/assets/athlete-source-v6.blend --output .cache/penalty-model-v7/export
node scripts/install-shootout-construction.mjs
```

Review server: `scripts/review-shootout-construction.mjs`, port 3157. Capture tools use the same `construction` stem; `--baseline` uses the preserved local v6 GLBs and `--low` uses mobile detail.

## Validation

Final build/browser results are recorded here after completion. Initial acceptance: 27 shootout tests pass, including skinned boot contact for three styles, keeper pose/contact agreement, seeded render-rate equivalence and save/reward contracts. Both review detail levels have no page errors and 132 draw calls. High/low scene triangle counts are 311,828 / 247,416. Tracked game assets total 12,718,808 bytes before the small final provenance note update; the final manifest is authoritative.

## Remaining gap

This is not established 1:1 FIFA 14 quality. Heads still use generic foundation topology, fine hair remains polygon-based, glove construction lacks production seam/stitch detail, and cloth has simpler draping and wrinkles. Bare taker hand anatomy and the inherited finger rig still merit further alignment work. Physical phone/GPU frame rates and controller ergonomics remain unverified. No EA meshes, textures or animation data were extracted.
