# Crazy Grand Prix mechanics → Racer

31 October 2026. Local implementation and checks only.

## Evidence inspected

This pass uses the existing **Crazy Grand Prix build 6c65ae46-cd7f-4feb-be39-441821588cdf**, its REA IL2CPP metadata records, exact WABT output, and the verified RCC serialized-object extraction. It does not substitute a generic racing tutorial or infer AI from screenshots.

Original identities:

- WASM SHA-256: `8380d1bc31a4b614ccce006d705653a9485b15160e57ce7373c6fc1c563f0bba`.
- Metadata SHA-256: `ae7a57b1089cc5e03fc5515e5038a191b042976113fea1cb91c53f68ec472700`.
- Unity data SHA-256: `224b7cafb5f19bee9ac8b7235c9d6f411920d9c86c9ef43cb0e8800e043c0896`.
- REA metadata parent `ev_d94616c6e68616a0af9eecc6c3dceab85f8dc5ee5ecab8028ba63c4ba960062c`; typed declaration view `ev_6cc3a8e85075b4e43da76869d210aaa0aa882c6a5470b1abdb860f7f92d3c48d`.

Designer research retains `output/research/full-game-rea-2026-10-29`, `full-game-rea-gap-pass-2026-10-29/unity-layouts`, and `game-dissection-pass-3-2026-10-29/crazy-grand-prix`. This pass adds `research/crazy-grand-prix/racer-mechanics`: reproducible focused extractor, runtime-field offsets, 191 named WAT bodies, and an index carrying byte/line ranges and individual SHA-256 hashes. It reads the original artifacts without executing or patching them. The metadata-token → initialized CodeGenModule → function-table mapping is a supplementary static parser, distinct from REA's metadata observations.

The local `.local-game-assets/f1-racing/decoded-rcc-objects.json` retains all 144 RCC records (26 vehicle, 13 AI, 104 wheel, one settings), whose 58,168 bytes roundtrip exactly in the prior extraction. These are scene/prefab instances, not 26 distinct models. Runtime source does not depend on the research checkout.

## Findings and implementation

| Mechanic | Original evidence | Racer implementation |
| --- | --- | --- |
| Pedals | Independent throttle/brake inputs; published W/up and S/down. `RCC_AICarController.FeedRCC` function 53812 feeds the same car controller used for player driving. | Shared world-motion/pedal model for player and every CPU; manual gas default, coast on release, brake takes priority and holds at rest. Retains independently owned keyboard and touch holds. |
| Engine | F1 torque curve keys 4500 RPM/350, 11000/700, 16000/466.6666565; typical AI peak 650. Max field 380, final drive 5. | `reference.ts` retains these source values. Torque affects physical acceleration; CPU/player torque ratio is 650/700. Torque interpolation and drag are authored browser adapters. |
| Transmission | Eight gear ratios 4.6, 2.5, 1.86, 1.43, 1.23, 1.05, .9, .72; per-gear max/shift speeds are preserved in `reference.ts`. Shipped shift delay 0. | Eight automatic gears and RPM telemetry; a hysteresis band prevents hunting. Speed thresholds scale to Racer's shorter circuit and 49 m/s road cap. This is not a Unity drivetrain equation port. |
| Steering/grip | Shipped curve endpoints 17.5 at speed 0, 7.5 at 380, with zero tangents. ABS/TCS enabled, ESP/NOS/turbo and vehicle damage disabled. | Source-shaped speed-sensitive steering, damped input, a weak yaw stabilizer, no wheel-lock/pedal inversion, and momentum loss off track/contact. Full tire slip, suspension and ABS solvers remain Unity-specific. |
| CPU navigation | Function 53809, `Navigation`, uses current waypoint, targetSpeed, nextWaypointPassDistance, lap and totalWaypointPassed. Near a waypoint, throttle/brake respond to targetSpeed minus current speed. Above speed 30 it subtracts abs(steer)/5 from throttle and adds abs(steer)/3 to brake, then clamps inputs. | Silverstone waypoints carry target speeds, a braking-distance envelope, turn-demand slowing and physical steering. The CPU consumes gas/brake/steer through the same driving function. Its position is integrated rather than placed on the spline every tick. |
| Brake zones | `CheckBrakeZones` 53804 and final branch of Navigation read `RCC_AIBrakeZone.targetSpeed` (offset 16), `distance` (20); within the zone and above target it writes throttle 0 / brake 1. | Authored Silverstone corner/braking zones supply target speeds; CPUs brake before turns and accelerate on exit. Original scene brake-zone placements are not copied onto Silverstone. |
| Obstacles | `FixedUpdate` 53807 only calls `FixedRaycasts` 53808 when useRaycasts is true. Extracted scene AI instances have useRaycasts false. | Clearance-checked persistent passing lanes and same-course forward contact are explicit Racer additions for twenty cars. No claim that the original has a recovered overtaking strategy. There is no artificial player-position catch-up multiplier. |
| Stuck recovery | `CheckReset` 53810: slow below speed 5 with forward local velocity below 1 accumulates time; reverse begins at 2 seconds; ends at 4 seconds or speed ≥25. Navigation/FeedRCC apply direction-aware steering/pedals. | Bounded two-second reverse after a two-second blockage; reverse steering follows direction. Off-course/missed-route recovery returns before the next unvisited gate and cannot grant distance or a lap. |
| Lap/order | `PlayerManager.Update` 67624 increments ordered waypoints within distance 40, accumulates route distance and detects regression; `FinishedLap` 67625 updates best lap, lap count and total-lap completion. Sorters 67497/67498 compare traveled distance and total finish time. | All twenty cars use the same ordered route gates, completed-lap timing, earned route distance and finish-time classification. Starting grid sits behind the finish stripe; crossing it initially does not complete a lap. Off-track shortcuts, wrong-way crossings and reset cannot skip gates. |
| Presentation | Observed native HUD: position, rival order, lap/time, minimap dots, gear/RPM/speed. B looks back; C switches camera. | Gear/RPM, nearby classified rivals, all-car minimap, wrong-way warning and held B/touch Rear view join the existing camera control. Large phone pedals remain. |

## Deliberate adaptations and limits

Racer keeps the user-requested new identity, improved recovered meshes, StatOz Circuits signs, twenty cars, Silverstone arcade layout, two-lap quick race and mobile controls. Source practice defaults (eight cars/three laps), garage onboarding, career/economy, teammate progression, online multiplayer and SDK services are outside this quick-race pass.

The existing optional auto-throttle, boost/slipstream recharge and passing lanes remain **Racer additions**. Original serialized NOS/turbo are disabled; boost is not presented as recovered Crazy Grand Prix behavior. Speed is scaled because this Silverstone adaptation is shortened. The 120 Hz authored browser simulation retains render interpolation; it does not claim byte-identical Unity/PhysX handling, exact native timing, recovered original C#, or complete behavioral parity. Native runtime overrides and every game mode are not established by static defaults.

Validation combines source-value/behavior tests, complete manual/automatic/coasting races, a CPU pack run, actual Chrome driving and phone-layout/input checks. Generated reports live in `test-results/racer`. Automated input and desktop Chrome do not establish physical-handset driving feel.
