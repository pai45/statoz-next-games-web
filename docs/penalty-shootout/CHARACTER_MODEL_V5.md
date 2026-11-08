# Character model refinement v5

The maintained local game is `StatOz Future/statoz-games-web`, route `/play/penalty-shootout`. Runtime and asset version: `character-model-5`. No deployment or upstream sync.

## Design and reference boundary

This pass follows the athletic silhouettes, restrained proportions and fitted football clothing visible in the user-selected FIFA 14 PC/PS4 recordings. Their gameplay views do not establish precise facial measurements. These are four original generic footballers on the existing CC0 Blender Studio Human Base Meshes foundation, with no EA meshes, textures, animation data or claimed real-player likeness.

The close-up review identified a concrete older defect: inserted eyes and removed face patches sat above the base mesh's natural sockets. The original CC0 face polygons have been restored. Eye whites, irises and pupils now fit the measured anatomical openings, with matching blink and gaze shapes. Brows follow the face surface.

Hair now follows the actual scalp instead of a separate ellipsoid behind the forehead. Four profiles combine crop, swept quiff, textured curls and close cut with distinct jaw, cheek and nose geometry. An original directional normal map and vertex tones add restrained surface variation. Jersey panel boundaries are cleaner; boot uppers, heels, soles and studs have slimmer proportions while retaining the authored front contact surface.

## Review evidence

- [Before/after four-preset comparison](evidence-model-v5/comparison.png)
- [Final high-detail front](evidence-model-v5/after/preset-0-front.png)
- [Final quarter view](evidence-model-v5/after/preset-1-quarter.png)
- [Outfield kit](evidence-model-v5/after/taker-body.png)
- [Goalkeeper kit](evidence-model-v5/after/keeper-body.png)
- [Mobile-detail quarter view](evidence-model-v5/low/preset-1-quarter.png)

All four profiles were captured front, quarter and side in the actual Three.js game renderer, with the same stadium lighting. `before/` is v4, `after/` is final v5 and `low/` is final mobile-detail geometry. `iterations/` preserves superseded diagnostic captures and is not final acceptance evidence.

## Editable source and reproduction

`assets/athlete-source.blend` is the refined editable source. `assets/athlete-source-v4.blend` preserves its reproducible input. `assets/refine-athlete.py` consumes that file and the official CC0 Human Base Meshes bundle. Run Blender 4.5 LTS with:

```text
blender --background --python docs/penalty-shootout/assets/refine-athlete.py -- --source docs/penalty-shootout/assets/athlete-source-v4.blend --output .cache/penalty-model-v5/export --foundation <human_base_meshes_bundle.blend>
node scripts/install-shootout-model.mjs
```

The installer verifies skeleton joint order, the 60-bone cap and all 35 clip names before installing both GLBs. The public manifest records source/license evidence and SHA-256 hashes for runtime and editable assets. Existing CPU pose data and contact markers are retained. The historical motion compiler is absent from this migrated checkout; this model-only pass does not regenerate motion.

The local review is reproducible with `node scripts/review-shootout-model.mjs` and `node scripts/capture-shootout-model.mjs` (also `--low` and `--baseline`). Baseline re-capture uses the installer's local `.cache/penalty-model-v5/baseline` backup.

## Validation

- All 26 shootout tests pass, including actual skinned boot contact for all three styles, planted-foot drift, keeper hand/collider agreement, seeded 30/60/144-Hz equivalence and replay/reward isolation.
- TypeScript passes. ESLint passes with one unrelated existing unused `roadworks` warning in Retro Circuit.
- Normal production build passes.
- Final high/low review captures report no page errors and 124 draw calls; scene triangle counts are 293,740 / 241,100. These are review-view measurements, not measured phone frame rates.
- Tracked game assets total 8,163,776 bytes (7.79 MiB), including both model detail levels and audio, before transfer compression.

The final static export completed with build ID `8rIRO0kRmzzyPuYteAORo` and a fresh `.nojekyll` marker. All 16 exported game asset hashes match the versioned source manifest. Both high/low GLBs preserve every joint rest transform. The recovery test now intercepts both `athlete.glb` and `athlete-low.glb`. Its scoped browser context blocks the production cache service worker and waits for the supported Play online fallback before testing renderer failure; other journeys retain normal device caching. The maintained launcher currently presents coarse-pointer phone play inside its landscape iframe, including when the physical viewport is portrait.

## Final browser acceptance (2026-10-25)

All six journeys passed against the static `/statoz-games-web` preview: desktop shot/replay/pause/training, portrait touch, landscape touch, full-match exactly-once settlement and reload, muted-start audio recovery, and asset retry/context restoration. The five ordinary journeys passed in the full static run; the corrected fault-injection journey passed in a focused final run (44.3 seconds). This is six covered journeys across those runs, not a claim that the earlier full run was green.

Fault injection initially missed service-worker-served assets. The recovery test now uses a service-worker-blocked context and waits for the actual 30-second download fallback before selecting Play online. This tests the renderer's real error and retry path without changing production code. Context restoration requires explicit Resume and returns to preparation.

The final test file passes ESLint and TypeScript. [Static gameplay capture](evidence-model-v5/static-gameplay.png), [static smoke result](evidence-model-v5/static-smoke.json), [final recovery result](evidence-model-v5/recovery-results.json) and [validation summary](evidence-model-v5/validation-summary.json) are retained. Nothing was pushed or deployed.

## Remaining visual limits

These are original budget web-game humans with simplified hair surfaces and facial shading. They do not reproduce FIFA's scanned player heads, detailed strand hair or production facial animation. Physical phone/GPU frame rates and controller ergonomics remain unverified. The preserved rig, clips and input contracts keep this pass focused on character modelling.
