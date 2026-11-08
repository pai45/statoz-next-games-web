# Character import validation — 26 October 2026

Active runtime: `imported-characters-9`. Validation was performed locally in Future Games Web before release.

## Results

- 12 original source atlas files retained with URLs, SHA-256 and REA evidence in Designer research.
- 1,637 source rectangles validated within atlas dimensions; all 210 composited runtime frames have nonempty alpha, padded bounds and valid durations/regions.
- Striker 55 frames; keeper 155 across six sequences. Runtime art is 744,568-byte striker and 612,094-byte keeper WEBP; runtime metadata/hash registration verified.
- `npm run test:shootout`: 31 passed. Final reach-timing change additionally passed all four sprite tests, including low-save reach-frame sampling.
- `npm run typecheck`: passed. Production build also completed TypeScript checking.
- `npm run lint`: zero errors. An unused import from the retired loader was removed; changed files then passed targeted lint. The unrelated existing `retro-circuit/data.ts` roadworks warning remains.
- Desktop browser test passed: shot, save, pause/resume, replay and training without rewards.
- Landscape phone touch test passed. Portrait phone touch and asset-failure retry/context-restoration passed against the production build (two tests, 1.2 minutes). Earlier development-server runs timed out during navigation/restoration waits; the production rerun passed without weakening assertions.
- Controlled production-renderer captures include striker ready, exact frame42 release, follow-through, grounded settled pose, left dive, mirrored high right dive, low catch and recovered keeper. The review harness reported no page errors.
- Complete shot/save motion recorded to `test-results/shootout-import/character-actions.webm`, encoded as silent 30 fps H.264 MP4 and fully decoded with FFmpeg without errors.
- Full `npm run build` passed, including prebuild game/typography/artwork checks and device asset packaging. The final source-only production rebuild also passed after the last keeper timing correction (57 pages; 267 device assets).
- `git diff --check`: passed. Existing untracked cache/test-output files were preserved; no push or publication.

## Art review corrections

The independent art pass found an indefinitely raised-boots striker result and missing floor shadows. Result reactions now return to the source neutral pose, with soft floor contact shadows. Original atlas layer rotations and kit/shading registration remain coherent. The low catch reaches its low-glove pose within the existing save-extension window, rather than stretching its preparation across the full recovery interval.

## Scope limits

These are the actual commercial reference sprites, composited and retimed for this game's existing scene, not original StatOz characters. On 26 October 2026, the user confirmed permission to publish these sprites on GitHub Pages; the underlying grant was not independently reviewed. Source AI, physics, hitboxes, audio and tournament code were not imported. Existing skeletal collision geometry remains behind the imported visuals; pixel-perfect glove/hitbox equivalence is not established. Three existing shot styles share the imported kick. The supplied source has no complete striker recovery or celebration sequence.

See [IMPORTED_CHARACTERS.md](IMPORTED_CHARACTERS.md) for mappings, camera/input adaptation, source locations and reproduction.
