# Grand Prix Dash v2 — local validation

Implementation is limited to Future Games web. No push, deployment, Flutter import or current-app edits were performed. Existing unrelated Retro Football/Retro Innings work was preserved.

## Checks completed

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, including new racing modules |
| `npm run typecheck` | Passed; static build also rechecked TypeScript |
| `npm run test:grand-prix` | 11/11 passed |
| `npm run test:demo` | Passed existing catalog and route ownership checks |
| `npm run build` | Passed, including typography/artwork/discovery/background checks |
| `npm --ignore-scripts run build:pages` | Passed: 53 generated pages, 51 static segment aliases |
| Isolated desktop and mobile browser flows | Passed against development and the completed static export; no page errors |
| Offline rendering of actual Web Audio source | Peak 0.0512, RMS 0.00768; zero signal after the pause ramp |

The static build deliberately skipped its unrelated embedded-game regeneration hook. Grand Prix remains a direct browser game, so no new embedded bundle or Flutter artifact is required. Existing embedded artifacts were preserved; this does not certify the independently modified embedded games.

## Gameplay coverage

- Reproducible seeded twenty-car simulation and ten equal-performance teams.
- Autonomous player completed three-lap races on every circuit; at least sixteen cars had reached two laps at the player's finish on each circuit.
- A complete ten-lap strategy run serviced the player's tyres and every AI car's tyres; the player's mandatory stop and compound change were verified.
- A complete driven Time Trial lap produced three sectors, a validated ghost and a save that reloaded the same ghost sample count.
- Ordered checkpoints rejected a teleport across the finish; recovery invalidated the lap. Missing the mandatory stop disqualified the finisher.
- Qualifying times ordered the grid and race state reset cleanly; pause froze simulation; simultaneous keyboard/finger sources released independently.
- Storage refusal retained in-memory settings, unknown schemas were preserved, malformed ghosts were rejected and duplicate results were not collected twice.

## Browser and visual evidence

An isolated Chromium profile used invented local test account data. No owner's browser profile or live account was accessed. Checks exercised team/circuit selection, reload persistence, both session launches, keyboard acceleration, pause/resume, background interruption, session exit, the portrait rotate prompt and real multi-touch input with release/cancel.

Reviewed viewport sizes: 1440×1000, 390×844 lobby, 844×390 racing. Evidence:

- [Desktop lobby](review/lobby-desktop.png), [mobile lobby](review/lobby-mobile.png), [team grid](review/teams.png).
- [Quick Race](review/quick-race-desktop.png), [Time Trial](review/time-trial-desktop.png), [mobile race](review/race-mobile.png).
- [Browser measurements](review/browser.json), [audio measurements](review/audio.json), [rendered engine and cue sample](review/audio-review.wav).

A 180-frame sample of the running twenty-car field in the 844×390 viewport measured 16.7 ms median / 16.8 ms p95 in headless desktop Chromium. This is a short desktop measurement at mobile dimensions, not sustained real-phone performance certification.

## Rules and remaining acceptance

- Results freeze the order when the player takes the flag. Cars still on track show their completed laps rather than fabricated finish times.
- The circuit renderer and sound are original procedural sources. There are no remote gameplay artwork/font dependencies. Canvas initialization failure offers a return to paddock.
- Physical Android/iOS devices, Safari, orientation/OS interruption behaviour and long-session thermal performance still require device testing.
- Engine and cues were rendered and measured, but subjective listening/mixing on speakers and headphones is still pending. The included WAV is available for that review; automated signal checks do not establish audio quality.
- Commercial-reference physics were not measured or reproduced. Handling, AI and tyre values are original tuning that may need further player feedback.
- No claim of multiplayer, championship, production economy or real-world team affiliation is made.
