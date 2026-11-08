# Filled discovery artwork

Original StatOz vectors for all 18 games. Canonical masters and tracks live in the Flutter checkout's assets/game_discovery; scripts/game-discovery-source is a versioned local snapshot.

Run node scripts/sync-game-discovery.mjs --from <Flutter checkout> to update the snapshot and outputs. Run npm run artwork:sync to regenerate offline, npm run artwork:check to detect stale output, and npm run test:discovery to verify the family. Never hand-edit generated files.

Both platforms use a 220 × 160 master, 4.8-second loops, smoothstep interpolation, and phase 0.28 for stills. Each individual game's accent is preserved from Flutter; sport navigation and semantic feedback retain their own palettes. Anonymous portraits, equipment and invented liveries are original artwork. No endorsements are implied.

Wide cards place art beside copy; compact cards stack it above. Authentication and routes remain the web app's own. Reduced motion, background tabs and offscreen cards stop animation. Loops are silent.
