# Handheld revision review

Scope: Retro Football 0.6.0, `exhibition-handheld-v1`, `football-handheld-atlas-v1`. The frozen 0.5.0 bundle remains unchanged: SHA-256 `f9dd3c8c5e60d68a0d9a76a66e566bdd0b7a191586030d469ca30e80571182d9`.

**Structural verdict: pass.** Repository lint and type checks pass. All 101 repository tests pass, including 11 football tests. The static Next.js export completes with the existing `/statoz-games-web` base path. The runtime/offline bundles rebuild locally. New art hashes, atlas pixels and replayable edits are tested; registered asset IDs persist across builds.

**Visual verdict: accepted for this bounded local revision, with fidelity gaps.** Inspected native/enlarged pose sheets and landscape, expanded-screen, stadium, menu, portrait and hosted match/result screenshots against the requested layout and saved reference observations. The pitch is larger in Screen +; nearest-neighbour sprites retain their shapes; P1 and the ball remain visible. Rebuilt stands, track, mowing bands, boards and nets create the studied stadium composition. Native-loop motion evidence contains 242 frames, 30 fps, including the four movement directions and tackle/recovery, and decodes fully with FFmpeg. This is sampled visual inspection and a motion artifact, not native-game timing recovery. The large foreground shooter and fuller diagonal/keeper action coverage remain incomplete.

**Gameplay/integration verdict: browser checks pass.** Ten standalone checks cover the five landscape sizes, keyboard and simultaneous touch/cancel, Screen + state preservation, menu/pause, fullscreen, portrait, offline native host commands and repeated cleanup. Five actual static-route checks cover authentication, launch without a deck, iframe fullscreen entry/exit using the same button, a complete two-half exhibition with one namespaced 0.6.0 result, rematch and return to the football hub. Both suites report no page errors. The route suite reports no failed resource requests. Match advancement uses the actual deterministic engine rather than waiting three real minutes; this is not a physical-device performance result.

**Audio:** inherited original synthesis and event triggers retained, independent controls exercised. No new cues or musical content; this revision does not constitute a fresh listening approval.

**Release verdict: not evaluated.** Derived artwork retains reference approval and explicit provenance. Physical-phone performance, source-native timing and rights/owner clearance remain unverified. Nothing was pushed, deployed or published.

Evidence: `test-results/retro-football-handheld/browser-checks.json`, `route/checks.json`, screenshots and `movement-review.mp4`; `docs/retro-football/handheld-build.json` pins current bundle hashes. Earlier failed test-harness observations remain preserved as failure records; the final check files state the current results.
