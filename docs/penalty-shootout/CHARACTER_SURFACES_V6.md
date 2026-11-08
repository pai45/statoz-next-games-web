# Character surface and hair pass v6

Maintained source: Future Games Web. Runtime: `character-surface-6`. Local only; no deployment.

## Reference review

The supplied `yxvbfvs3pAo` recording at 8.0-11.75 seconds supports athletic silhouettes, fitted kit proportions and clear cloth shading at the penalty camera distance. At approximately 103.5 seconds the keeper's back shows kit fit and glove silhouette; at 115.5-118.5 seconds the celebration shows hair and fabric from the side. The gameplay footage is not precise facial scan evidence. No EA geometry, textures or motion was extracted.

The starting v5 model is visibly below the requested FIFA 14 production quality. This pass addresses solid-cap hair, uniform facial surfaces and overly faceted garment depth. It does not claim 1:1 player likeness or visual parity.

## Authored changes

- Original 512-square face pigment, fine pore normal and regional roughness maps; lips, cheek warmth, socket shading and restrained follicles have different surface response.
- Tapered hair locks projected onto the scalp, with four density/silhouette variants. They share scalp primitives and facial morphs rather than adding a draw call per strand.
- Garment depth cleanup, smooth shading with inherited custom normals recalculated, and a restrained neck taper.
- Separate face material uses the same seeded skin tint as the body. The runtime preserves its authored roughness map.
- Original 60-bone rig, all 35 clip names, controls, collisions and progression retained.

The first hair iteration produced visibly floating tips and was rejected. The final authoring projects each lock centre onto the scalp surface before adding a small bounded lift. Candidate assets are reviewed in the actual Three.js scene before installation.

## Editable assets and reproduction

`assets/athlete-source-v5.blend` is the input snapshot. `assets/refine-surfaces.py` generates the revised `.blend`, two GLBs and three original texture maps. `assets/athlete-source.blend` is updated only after review. The manifest records hashes and the CC0 foundation. Authoring uses Blender 4.5 LTS:

```text
blender --background --python docs/penalty-shootout/assets/refine-surfaces.py -- --source docs/penalty-shootout/assets/athlete-source-v5.blend --output .cache/penalty-model-v6/export
node scripts/install-shootout-surfaces.mjs
```

Review tools: `scripts/review-shootout-surfaces.mjs` (port 3156), `scripts/capture-shootout-surfaces.mjs` (also `--baseline` / `--low`) and `scripts/compare-shootout-surfaces.mjs`. Captures use original game lighting and matched head framing.

## Review and validation

- 27 shootout tests pass, including face-map export, morph-compatible hair, physical contacts, seed invariance and saved-data isolation.
- All six browser journeys pass in one final static/base-path run: desktop, portrait, landscape, full-match settlement/reload, asset retry/context restoration and muted-start audio.
- Repository lint and TypeScript pass; lint retains one unrelated existing Retro Circuit `roadworks` warning.
- Normal production and static/base-path builds pass. All 19 exported game asset hashes match the v6 source manifest.
- High/low review captures have no page errors. Both use 128 draw calls; scene triangles are 295,788 / 242,124. This measures the inspection view, not physical-device frame rates.
- Tracked game assets total 11,381,141 bytes (10.85 MiB), including both GLBs, audio and source texture PNGs, before transfer compression.

[Before/after comparison](evidence-model-v6/comparison.png), [high-detail quarter view](evidence-model-v6/after/preset-1-quarter.png), [mobile-detail quarter view](evidence-model-v6/low/preset-1-quarter.png), [shot contact view](evidence-model-v6/poses/driven-contact.png), [keeper late dive](evidence-model-v6/poses/keeper-late-dive.png), [browser results](evidence-model-v6/browser-results.json) and [validation summary](evidence-model-v6/validation-summary.json).

Thirteen seeded pose captures cover three shot styles and keeper push-off/extension/late dive/recovery. The late-dive image is a sampled pose, not a claim that the keeper has made ground contact. The earlier v5 physical and animation acceptance contracts are preserved; this pass does not reauthor movement.

## Remaining quality gap

The underlying heads remain generic CC0-based models; hair still uses budget polygon surfaces and the face maps are original procedural textures rather than scanned skin. Garment cuts, facial expression range and crowd presentation remain simpler than the reference game. Physical phone/GPU performance and controller ergonomics remain unverified. These limits must remain visible in any quality comparison.
