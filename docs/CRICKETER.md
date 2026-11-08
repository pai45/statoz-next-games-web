# Cricketer

Cricketer is an editable Three.js batting-chase game in Future Games Web at `/play/cricketer`. Its game simulation and interface are original. Its players are low-poly remakes built from **Virat Kohli Cricket Batting Animation - Low Poly** (bhagathartworks, CC-BY-4.0), shown unnamed in original Cricketer kits. The installed Stick Cricket Chase game remains separate.

## Play

Use left/right arrows, A/D or the two touch buttons. Read the delivery line and tap just before arrival. Direction, length and timing select drives, cuts, pulls, hooks, sweeps and scoops. One press commits one swing. Running and fielding are automatic; misses/catches consume a delivery. Batters set off once the swing finishes and take 2.4s per run, so running overlaps the ball's flight; an odd number of runs rotates the strike. The return throw reaches the keeper after the final run, and the delivery remains open until the throw arrives. Result labels and boundary crowd cues follow the completed action. Runs and boundary highlights can be skipped without changing the result. Sweeps and scoops go behind square; a catch carries to the fielder on that side nearest the shot's angle. Three academy lessons lead into twelve ball-limited chases across three tiers, starting at five runs from five balls. Win to unlock the next challenge; completed challenges can be replayed.

## Character design

Every player shares one 49-joint skinned low-poly body (`public/games/cricketer/cricketer-player.glb`), baked by `scripts/build-cricketer-player.mjs` from the downloaded Sketchfab source. The source body texture is photographic and the bat texture carries real brands, so neither ships: the bake reads the body texture only to sort faces into skin, hair, stubble, shirt, collar, sleeve, trousers and shoe regions, and `character.ts` paints Cricketer's own kit colours, back numbers and bat livery from those regions at runtime. Skin, hair and beard vary per player (`kits.ts`). Batters add an original helmet with grille, rolled pads and gloves.

The batter plays the model's own 6.9s batting cycle directly on its own skeleton; there is no retargeting. Each delivery runs relaxed → get set → high backlift → downswing → contact (1.14s in the clip) → follow-through → walk-off. Swing progress maps onto the cycle so the bat meets the ball at contact. Different deliveries shift the native swing by the ball's offset from the native contact point: a planted-foot crouch, a spine and lead-shoulder solve, and a wrist pivot, with the top hand re-gripping the handle. The bat snaps exactly onto the ball only in the final instant. A shot-direction lean shapes the follow-through toward the struck side. Poses crossfade when the role changes, so there are no snaps between stance, swing, run and celebration.

The striker takes the same guard every ball, so the stance never gives away the line. After release the batter steps across toward the line: the lead foot lifts and plants first, the back foot follows. The swing reaches the last few centimetres only for off-side balls at a comfortable height; low and leg-side balls are reached entirely by footwork, because reaching for them pulls the top hand off the handle. Players walk to their marks between deliveries instead of jumping there.

Bowling (run-up, gather, side-on stride, arm over the top, release, follow-through), running, walking, standing, fielding crouch, the wicketkeeper's crouch, catching and celebration are authored on the same rig, starting from the cycle's upright standing frame. Leg cadence follows the ground actually covered (one footstep per stride length), with per-player offsets so no two players move in step. Ground speeds are capped at believable values: batters about 8 m/s between the creases, a chasing fielder 7 m/s, the bowler's jog back 5 m/s and walking 2.2 m/s. The fielder nearest where the ball comes down chases it, picks it up and throws it to the wicketkeeper, who also takes every ball the batter misses. The wicketkeeper crouches outside off stump in pads and pale gloves, clear of the batting camera's view. The clip is sampled by direct track evaluation so every frame writes every animated bone.

`CREDITS.md`, `PLAYER-LICENSE.txt`, `PROVENANCE.json` and `characters-manifest.json` record the source, hashes and terms. See `CRICKETER-CHARACTERS.md` for the design record.

## Sound

All sound is synthesised at runtime with Web Audio (`audio.ts`), so no recorded audio ships and no third-party sound licence applies. Three buses (effects, crowd, interface) feed a limiter. Cues: footsteps for every moving player (timed to the stride and attenuated by distance and stereo position), the bowler's release, the ball pitching, the bat swing, bat on ball (a deep, round sound for a well-timed shot, a thin click for an edge), a chime for a middle-of-the-bat hit, the keeper's gloves, the ball landing in the outfield, a fielder's pick-up and throw, a catch, applause for runs, crowd roars for fours and sixes, an "ooh" when the batter is beaten or caught, a win or lose phrase, and interface clicks. A low crowd murmur plays throughout, softer behind menus. Small random pitch and level changes stop repeats sounding identical. The sound setting and pause suspend the audio context. Sound randomness never touches the simulation's seeded RNG.

## Simulation and saves

The simulation runs at 120 fixed steps per second with seeded deliveries; the renderer does not consume simulation RNG. Timing windows, scoring bands and bowling profiles are authored tuning informed by the reference, not recovered C# formulas. Bat face and ball use a shared contact target. A boundary trajectory crosses the actual circular rope.

The existing bundled-game host supplies session validation, account isolation, local saves and result deduplication. The version-1 Cricketer save records lessons, unlocks, best scores, preferences, result identity and completed-delivery checkpoints/RNG continuity. An unfinished delivery is replayed on Continue. Incompatible saves remain preserved while temporary play is allowed.

The mobile product route opens in the shared landscape viewport automatically, including on an upright phone. Backgrounding pauses play and releases input. Standalone previews still pause on physical portrait rotation and require explicit landscape resume. Mobile batting buttons are 10px larger and sit 8px farther inward. Reduced camera motion keeps the batting camera during flight and turns off the small camera kick on a struck ball. Assets are bundled locally; there is no remote fallback. WebGL/load failure has a retry screen. The three tiers share an original oval with sky variations.

## Assets and local checks

The original oval uses a 20.12m pitch. The CC0 pavilion and wicket come from 3DAssets.dev; its training-ground mesh and shortened strip are not used. The Innerscene link remains reference only. Barlow Condensed is locally embedded with its OFL notice. The downloaded player source is kept unchanged outside the repository; only the baked, texture-free runtime player is committed. Rebuild it with `node scripts/build-cricketer-player.mjs <extracted source folder>`, which also refreshes `characters-manifest.json`.

- `npm.cmd run build:cricketer` verifies character hashes and builds the offline bundle.
- `npm.cmd run test:cricketer`, `npm.cmd run test:cricketer:characters`, `npm.cmd run test:cricketer:browser`, and `npm.cmd run test:cricketer:app` cover simulation, visual rig, gameplay and product integration.
- `npm.cmd run preview:cricketer` serves the isolated local preview at `http://127.0.0.1:5254/fixture`.
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run build:pages` are local validation/build commands; none publishes.

Character close-ups are under `test-results/cricketer-characters/closeup`; gameplay evidence is under `test-results/cricketer`; exported-app evidence is under `test-results/cricketer-app`. Deliberately refresh the actual gameplay cover with `CRICKETER_CAPTURE_COVER=1`, then rebuild so device-manifest hashes stay consistent. Physical Android/iOS acceptance remains pending. No Flutter synchronization is included.

### Mobile refinement checks ? 8 November 2026

`node tests/mobile-gameplay-refinements.browser.mjs` passed the real app's portrait-to-landscape check, delayed six announcement, 88px batting buttons at 26px side insets, and a rendered three-run return received only after the final run. The focused engine tests cover fours, sixes, catches and return timing. Bundle build, repository typecheck and scoped lint pass. The broader unit suite retains an unrelated old catalog assertion expecting the removed Stick Cricket entry; the broad browser run passed eleven scenarios before a navigation timeout. Physical phone acceptance remains pending.
