# Street Hoop fidelity pass 1

Target selected: European Neo Geo MVS Street Hoop. Exact revision/settings are not yet verified. This does not freeze guessed source timing.

The retained opening frame is 320x224 (10:7); the production viewport is 640x360 (16:9). Recording dimensions alone do not prove native display aspect. Composition, actor scale and camera coverage must be aligned before changing animation speed. Existing motion-v2 is the playable baseline, not a frame-exact result.

Run `node scripts/build-retro-hoops-fidelity.mjs` and serve `test-results/retro-hoops-fidelity-v1` locally. Load the reference frame named in reference-spec.json through the file picker. The workbench uses the current production Three renderer and simulation; it supports manual landmark pairs, single ticks, moving dribble, pass, shot, overlay and JSON export. No source image is bundled or uploaded.

Next gate: measure court/athlete landmarks across opening play and both basket views, then implement the resulting camera/geometry correction. Do not infer timing from sparse frame samples. Obtain verified source/input capture before claiming native holds or control windows. Fictional teams, original audio and mobile shell remain explicit adaptations. No push, pipeline or publication is authorized.

## Independent arcade identity

The game console now owns its cream/olive housing, mustard/red buttons and monospace arcade lettering. StatOz token references, chamfer buttons and cyan lamp glow were removed from Retro Hoops only. The selection indicator is a red 1P arrow above the athlete, based on the inspected opening reference frame, replacing the cyan floor ring. This is an authored reconstruction, not a copied source glyph. Host navigation remains unchanged.
