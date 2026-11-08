# Character shoulder pass v8

Runtime `character-shoulders-8`, maintained only in Future Games Web. Local work, no deployment.

## Gap addressed

From v5 to v7 the jersey was mostly weighted to the chest bone. When an arm lifted past roughly 45 degrees (keeper wave, catches, high dives, celebrations), the sleeve, its cuff trim and the side panels stayed behind and hung from the shoulder.

- Shirt vertices beyond the garment builder's sleeve seam (about 0.2 m from the centreline) now blend continuously from chest to clavicle to upper arm, with upper-arm twist toward the cuff.
- Upper-arm skin moves only its former chest share onto the upper arm. Elbow and forearm blends are unchanged.
- Geometry, UVs, materials, the 60-bone rest rig, all 35 clip names, contact markers and gameplay contracts are unchanged. The installer checks clip names, joint rest transforms, skin joint count and the mesh set before replacing assets.

[Before (left) / after (right): keeper wave, high dive, celebrate](evidence-model-v8/shoulders-before-after.png)

## Editable source and reproduction

`assets/athlete-source-v7.blend` preserves the input. `assets/refine-shoulders.py` authors v8, and `assets/athlete-source.blend` is the installed result.

```text
blender --background --python docs/penalty-shootout/assets/refine-shoulders.py -- --source docs/penalty-shootout/assets/athlete-source-v7.blend --output .cache/penalty-model-v8/export
node scripts/install-shootout-shoulders.mjs
```

The same weighting is used by the separate Final Third prototype (`StatOz Future/final-third/art/author-motion.py`), which also adds its own original locomotion and ball-skill clips. Those clips are not added to Penalty Shootout because its motion comes from `animation/athlete-motion.json`.

## Validation

- `npm run test:shootout`: 27/27 pass.
- `tsc --noEmit` and ESLint on the changed files pass.
- Browser suite against a local dev server: 5/6 pass. "Phone portrait ... readable keeping" is intermittent with both v7 and v8 assets. Alternating runs showed v8 pass once and v7 fail twice; the failure screenshot shows the Next.js dev "Compiling" badge over the portrait dive pad. This is a dev-server timing issue that exists independently of this pass.

## Remaining gap

Fabric still stretches between torso and sleeve under a fully raised arm; there is no cloth simulation or corrective shape key. Physical device frame rates remain unverified.
