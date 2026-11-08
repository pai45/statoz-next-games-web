# Retro Hoops handheld/park validation

20 October 2026. Future Games Web only. Rules 1.3.0, motion1.0.0, handheld-v1.

The mobile landscape game uses a640 x360 view into the existing900 x360 world, with smaller surrounding chrome and a full-viewport handheld shell. The actual game image at844 x390 is roughly twice the area of the first handheld draft. View expansion adds horizontal court visibility without stretching player sprites or changing ball/rim coordinates.

The scenery was reconstructed from inspected Street Hoop park frames: grey asphalt, blue/orange paint, yellow arc, paved walkway, lawn, benches/bicycles/spectators, low brick wall, sea/sand and palms. Court/background shapes are original code-drawn approximations; existing player/basket rasters retain reference provenance. This is not an exact background or native animation recovery.

## Passed

- 42 Retro Hoops tests, including six seeded matches and movement/ball continuity checks.
- 16 existing Retro Circuit regressions and one product-catalog ownership test.
- Lint, TypeScript and production static export;51 static segment aliases verified.
- Nine standalone browser checks at six landscape/portrait sizes: fit, touch/cancellation, settings slider keys, Escape/pause and fullscreen.
- Fourteen two-second native640 x360 action loops, both attack directions, captured from the actual Three renderer and decoded as silent30fps MP4s.
- Six actual exported-app checks: auth gate, catalog, iframe launch, fullscreen, a complete match with one result/rematch, and exit/repeated navigation. No browser errors or failed HTTP responses. Fullscreen entered successfully in the actual iframe.
- Separate owner visual inspection of the native contacts/landing, park backdrop and small-phone/landscape screenshots.

The machine-readable record contains source hashes, scenario coverage and limits. Local screenshots and clips are under `test-results/retro-hoops-console-v1` and `test-results/retro-hoops-motion-v1`; generated bundles and images are excluded from source lint and Git, while authored game/review scripts remain linted.

Physical phones and native WebViews remain untested. Original synthesized audio retains provisional approval; no acoustic listening is claimed. Dedicated off-ball running, backpedalling, defensive slides and denser native timing evidence remain future work. Future Sports, current StatOz and the pinned Games Flutter import are unchanged.
