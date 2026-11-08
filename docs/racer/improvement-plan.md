# Racer: review and improvement plan

1 November 2026. A review of Racer's mechanics, opponent AI, graphics, surroundings and UI, followed by what this pass built and what to do next. The review used the game-feel, game-AI, asset-pipeline and three.js glTF skills.

## What the review found

| Area | Finding before this pass |
| --- | --- |
| Mechanics | The pedals, gearing and fixed-step simulation were solid, but the race gave little to master. The start was a passive countdown, boost charged only passively or from slipstream, and nothing rewarded racecraft. |
| Opponent AI | Every CPU drove the centreline and only ever swapped between ±2.8 m lanes to pass. CPUs could not boost, never defended and never made mistakes, and pace differed only by a 0–4% spread. |
| Graphics | Cars were inherited reference meshes in one material, marked as temporary in AGENTS.md. There were no brake lights, smoke, skid marks or boost visuals, and the camera had a fixed FOV with no impact feedback. |
| Surroundings | Flat grass, a single grey run-off band, icosahedron trees, box-built pits, one reused grandstand mesh and no horizon. |
| UI | A 3-2-1 countdown, a static race order with no gaps, no lap call-outs or best lap, no rival-skill or car choice, no sound, and the result showed only your own time. |

## Built in this pass

### Assets (Kenney, CC0)
- **Car Kit 3.1:** the `race` and `race-future` F1-style cars, offered as Classic and Future. Livery paint is recoloured in the shader: only saturated paint texels change, so Kenney's shading and dark parts stay intact.
- **Racing Kit 1.2:** covered grandstands, pit garages and offices, the start gantry with lights, billboards, red and white tyre barriers, marshal light posts, flags, hospitality tents, timing radar, and large and small trees.
- **Starter Kit Racing audio:** engine, skid and impact sounds.
- Kenney's fictional "Tankco" banner is replaced by StatOz CIRCUITS signage. Everything is packed into one 777 KiB GLB with pinned hashes, and the JS bundle dropped from 1.7 MiB to 1.1 MiB.

### Mechanics
- **Five-light start with a launch window.** Gas on the fifth light gives a perfect start: a 9 m/s rolling start and +15 boost. Holding gas earlier gives 0.9 s of wheelspin.
- **Boost earned for overtakes,** but only when you reach a new best position, so trading places cannot farm it.
- **Kerb, skid and off-track state** drives camera rumble, sound, smoke and skid marks. It is presentation only and never feeds back into physics.
- **Simulation events** (launch, contact, position, lap, final lap, reset) are separated from presentation, so feedback is layered without touching physics.

### Opponent AI
- **Racing line.** A filter over track curvature produces outside → apex → outside offsets, limited so no lane is tighter than a ~9 m turning radius. The line is also painted faintly on the track, which teaches it to the player.
- **Passing** chooses the side away from the blocker and tries the other side if that is busy, with clearance checks.
- **Defending** is one move on straights, used only by assertive drivers.
- **Side-by-side spacing:** CPUs keep a car's width from anything alongside and sweep across gradually instead of darting.
- **Driver profiles** are fixed per grid slot (pace, engine, aggression, consistency, boost use, line commitment). Faster drivers start nearer the front, as if after qualifying.
- **Seeded mistakes:** occasional late braking into slow corners, replayable and scaled by consistency.
- **CPU boost and slipstream** use exactly the player's rules.
- **Rookie / Pro / Elite.** Measured median CPU race times are about 201 s, 188 s and 186 s with the player parked.
- **Safety:** a CPU that keeps moving without gaining ground for 4 s is put back on the road. Zero warps were seen across all difficulties.
- **Still no rubber band.** Pace never reads the player's race position, and the existing test still enforces this.

### Graphics and surroundings
- Brake lights, boost flames, tyre smoke, grass and gravel dust, and skid marks.
- Mown-stripe grass, gravel traps on the outside of slow corners, an asphalt texture, a sky gradient and a horizon tree line.
- Camera: FOV widens with speed and boost, the chase cam sits lower at speed and lifts over a car tucked in behind, and trauma shake comes from impacts, kerbs and grass. A **Reduce camera shake** option cuts shake to a quarter.

### UI
- Start lights with a "gas now" prompt.
- Call-outs: perfect start, wheelspin, P-changes with boost earned, lap times, fastest lap, final lap.
- Live gaps (seconds) to the cars directly ahead and behind; best lap under the timer; RPM bar with redline; boost speed lines.
- Start screen: Classic or Future car, colour, and rival skill. Pause: sound and reduce camera shake.
- Results: classification (top five plus the cars around you), gaps to the winner, launch rating and rival skill.

## Suggested next steps (not built)

1. **Drift and slide model.** Add a small lateral-slip state above a steering-to-speed threshold, so throttle can steer the rear and over-driving costs time visibly. This needs careful tuning against the existing pedal tests.
2. **Tyre or kerb grip:** a small grip loss on painted kerbs when wet, or for aggressive kerb use.
3. **Sector timing and ghost car.** Split the lap into three sectors with purple/green deltas, and save a best-lap ghost locally (namespaced, account-scoped).
4. **More circuits and a championship.** Kenney's Racing Kit road tiles can author short arcade tracks; a three-race cup with points would reuse the classification screen.
5. ~~Damage and debris~~ — built: boundaries, barrier and car-to-car collisions, spin-outs, damage and debris (see the README section "Circuit boundaries, collisions and crashes").
6. **Crowd and life:** animated flags, crowd billboards in the grandstands, and a marshal waving a blue flag when the leader laps you.
7. **iOS sound.** Ship AAC (`.m4a`) copies of the three clips. No encoder is installed here, so iOS Safari versions without Ogg support currently race silently.
8. **Performance:** on low-end phones, drop shadows and halve the tree count. The scene is about 75 draw calls and 150k triangles at desktop size.
9. **Physical-device acceptance.** All checks so far are automated (Chrome desktop and emulated touch). Driving feel, launch timing and difficulty balance need hands-on play.
