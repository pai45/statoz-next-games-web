# Engine acceptance — 8 November 2026

The implementation and builds remain local. No asset candidate was activated and
no push, release, deployment or cross-project synchronization was performed.

| Check | Result |
| --- | --- |
| Engine plus 14 game logic suites | 15 script groups, 342 tests passed |
| Offline device-asset tests | 15 passed, including shared ESM dependency closure and missing-build rejection |
| Browser load checks | All 14 registered game routes loaded without page errors or failed asset requests |
| Formula browser acceptance | Desktop driving, menus, career/save isolation, cameras, pause/restart and landscape/rotated-phone touch passed |
| Rally Dash browser acceptance | Complete Stage Attack and Rallycross, ghost/medal saves, keyboard/touch controls and phone layouts passed |
| Football Chess browser acceptance | Complete games, keeper release, saved progress and desktop/phone layouts passed |
| Pitch Rush career browser acceptance | Four divisions, training, exact save/RNG resume, visible equipped kits, account isolation, gamepad navigation, simultaneous phone touch and pause passed |
| Studio browser acceptance | All 14 definitions, protected bridge, model inspection, full preview capture, actual Yorker candidate binding and live Pixi stage switching passed |
| Blender 5.2.3 round trip | Original bytes preserved; editable sources exported and validated as both a GLB and a transparent 2D atlas |
| Compilation | Root, Formula, Holdover and Hoop Legacy TypeScript checks passed; authored engine/studio/tooling ESLint checks passed |
| Production | Build and offline packs generated; `/studio/games` and its preview query return 404 in production |

Local logs and screenshots are in `test-results/game-engine/`,
`test-results/game-studio/` and each game's existing acceptance directory.
The studio also saved an actual managed-browser capture under
`output/game-studio/portfolio-formula/`.

These checks establish runtime integration and browser behavior. Physical-phone
frame times and memory still need device testing. The Blender bowler candidate
remains unapproved artwork; successful loading does not constitute art acceptance.
Compatibility adapters and game-specific asset-role bindings are described in
[GAME-ENGINE.md](GAME-ENGINE.md).
