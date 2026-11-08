# Football Shooting

> Release exclusion — 30 October 2026: Street Hoop (`retro-hoops`), Retro Football 2 (`retro-football-2`) and Football Shooting (`football-shooting`) are removed from discovery, play routes, bundle builds and GitHub Pages artifacts. All source, runtime assets, notices and local saves remain on this workstation. This does not publish a release.

Original offline browser football game for Future Games Web, at `/play/football-shooting`.

## Play

- **Shootout:** five alternating shooting and goalkeeper turns against a local CPU. Win to unlock the next of six competitions. A tied score is a draw; there is no sudden death.
- **Practice:** five shots at gold rings. Three hits complete the challenge. The personal best is saved.
- Swipe upward anywhere on the pitch. Vertical travel controls height; speed controls power; deviation from a straight path creates curve. The goalkeeper turn shows a gold destination marker before the CPU shoots. Swipe toward it or use the dive buttons. Each turn permits one committed dive.
- Touch/mouse aiming and Strike buttons are available. Keyboard: Space to strike or continue, arrows to dive, P/Escape to pause (when not focused on a native control).
- The game adapts to portrait and landscape. Settings offer handheld/full-screen presentation, sound and swipe sensitivity. Buttons remain available in both screen styles.

Progress and settings use the existing account-specific host storage bridge. There are no online opponents, purchases, ads, account services or global rankings. Browser/site storage removal resets local progress.

## Source boundary

The user explicitly selected **an original browser recreation** on 27 October 2026. This is an independently written arcade interpretation of the researched shooting/keeper concepts, not the Miniclip app, a native port, or a claim of matching its internal physics. The prior REA investigation found an Android Unity IL2CPP APK and static metadata; it did not recover a matching WebGL export or observe native gameplay. The similarly named web embed was a different DEFU Games product and is not used.

The local integration was extended on 30 October 2026 with recovered original Football Strike character geometry, skin weights, hierarchy, runtime textures and eight native-curve-derived clips, plus all 524 typed customization records and 43 selected keeper/shot records. `recovered-athlete.ts` renders the original skinned parts; the local player-kit editor applies and persists jersey tint/palette changes. The installed Unity2022 Avatar solver converts original humanoid samples; exact Unity6000 runtime IK/shader parity is not asserted. The complete optional editable library lives in `.local-game-assets/football-shooting`, indexed under `public/games/football-shooting/dissection`.

Stadium geometry, ball/net/HUD/rules/CPU and synthesized audio remain authored browser code. The native APK is not executed, native physics units are not blindly substituted, and this is not an identical Miniclip port. Source ownership/provenance is retained and the assets stay local. See [the local integration report](local-games/README.md).

## Implementation and verification

- `engine.ts`: viewport-relative gestures, curved flight, goal bounds, keeper reach/reaction, seeded CPU behavior, match state, validated local progression.
- `stadium.ts`: procedural Three.js scene; capped device pixel ratio; disposable RAF, resize observer, GPU buffers, materials, texture and context.
- `game.tsx`: touch cancellation, pause/visibility lifecycle, account save bridge, settings, accessible button alternatives, host result/session handling.
- `npm run build:football-shooting`
- `npm run test:football-shooting`
- `npm run test:football-shooting:browser`

Browser verification covers real CDP touch swipes/cancellation, a paused flight, complete practice and shootout matches, host results, save reload/account isolation, 320px phone/landscape/desktop bounds, protocol validation, disposal and absence of remote requests. Screenshots and the machine-readable report are under `test-results/football-shooting`. Browser emulation is not a physical-device test.
