# StatOz onboarding animation — version 2

Two six-second, 30 fps motion-graphics videos for the login entry screen:

- `public/assets/backgrounds/onboarding/desktop.webm` and `.mp4`: 1080 x 1200.
- `public/assets/backgrounds/onboarding/mobile.webm` and `.mp4`: 900 x 720.
- Matching WebP posters show the five-athlete finale.

## Design and motion

Version 2 uses a generated stadium environment with roof structure, distant seating, floor reflections, and atmospheric haze. Animated volumetric lights, orbiting floor rings, particles, camera drift, and curved light ribbons add movement behind and around the cards.

The five collectible cards have metallic chamfered rims, inset face frames, sport symbols, nameplates, edge lighting, simulated thickness, and moving foil highlights. Entrances use perspective rotation and deceleration; portraits move independently inside the cards. Departing cards move into the background while the next athlete arrives. The final deck fans out with all five names visible, then collapses into depth to reset the loop. The headline reveals one line at a time through masks.

- 0.0-1.3: opposing football-card entrances for Messi and Ronaldo.
- 1.3-2.2: Kohli moves into the foreground as football cards recede.
- 2.1-3.0: Hamilton rotates forward through a light-ribbon transition.
- 2.9-3.8: LeBron takes the foreground; earlier cards remain visible behind.
- 3.8-5.3: staggered five-card fan, foil sweep, and headline reveal.
- 5.3-6.0: cards rotate and collapse into depth while the arena completes its loop.

Desktop and mobile have independent positions, card scales, and typography placement. Both use the app's exact self-hosted Orbitron and Space Grotesk fonts. No animation library or browser renderer ships to the client; the website receives standard video files.

## Sources and prompts

`background-prompt.json` records the successful built-in imagegen prompt used for the new arena. The original PNG and compressed WebP are retained as `sources/arena-v2.png` and `sources/arena-v2.webp`.

Athlete artwork is retained in `sources/`:

- Messi and Ronaldo: embedded WebP assets 4 and 5 in the reference clip's accompanying local source file, `fifa-arena (4) - optimized.json`.
- Kohli: existing project illustration `public/assets/shop/portraits/cricket/virat_kohli.webp`.
- Hamilton: existing project illustration `public/assets/shop/portraits/motorsport/lewis-hamilton.png`, encoded as WebP.
- LeBron: existing project illustration `public/assets/shop/portraits/basketball/lebron_james.webp`.
- Logo: existing project asset `public/assets/icons/app_logo.png`.

The initial request to generate new named-athlete artwork was rejected by the image service's public-figure filter. `prompts.json` retains those unsuccessful prompts. These are animated portrait cards; the athletes are not newly generated action poses. Existing jersey details remain in the source illustrations.

## Reproduce or edit

Edit `scene.html` to change card styling, artwork placement, copy, lighting, easing, or timing. `window.drawFrame(t)` deterministically sets every animated property at time t; there are no wall-clock animations.

```powershell
node scripts/media/onboarding/render.mjs --preview
node scripts/media/onboarding/render.mjs
# Optional single composition:
node scripts/media/onboarding/render.mjs --only=mobile
```

The renderer uses Node, Sharp, Playwright with Chromium, and FFmpeg with libx264/libvpx-vp9. `PLAYWRIGHT_PATH` can point to a Playwright package directory; the bundled Codex runtime is detected automatically. Set `FFMPEG_PATH` if the executable is not on PATH. The renderer also detects an installed Python `imageio_ffmpeg` package. No network is used when rendering.

Intermediate PNG frames go into ignored `build/onboarding/`. Six final media files go into `public/assets/backgrounds/onboarding/`. The first version's videos are backed up under ignored `build/onboarding/v1/`. The old `lettering.mjs` and lettering PNGs are retained only as source history; version 2 renders the web fonts directly.

## Integration and validation

The existing auth feature selects one video at the 1024px breakpoint, with MP4 fallback and responsive posters. Reduced motion loads a poster until the user chooses Play. Pause/Play remains keyboard accessible and has a 44px minimum touch target. Failed media leaves the poster visible.

With the application running locally:

```powershell
$env:ONBOARDING_QA_URL='http://127.0.0.1:3001/login'
node scripts/media/onboarding/verify.mjs
```

The browser checks cover the five requested viewport sizes, source selection, overflow, autoplay, pause/play, breakpoint changes, reduced motion, blocked autoplay, MP4 fallback, and complete media failure. Screenshots go under `build/onboarding/qa/`; the retained results are in `validation.json`.

The local Windows WebKit runtime rejects both video formats even in standalone players. Its poster fallback can be verified here; Safari playback requires a supported device/runtime.

### Version 2 verification

Production build, focused ESLint, and scene-script syntax checks passed. All ten Chromium scenarios passed using the final version 2 videos. Visual QA covered 1280x720, 1440x900, 360x800, 390x844, and 430x932. Names, faces, headline, and the existing playback control remain visible in those layouts. WebKit's standalone players rejected both formats with code 4; the poster fallback passed.

Every video decodes to exactly 180 frames at 30 fps and 6.0 seconds. Final sizes: desktop WebM 1,521,721 bytes; desktop MP4 1,422,325 bytes; mobile WebM 1,017,614 bytes; mobile MP4 778,336 bytes. The first/last-frame mean absolute channel differences are 0.180 desktop and 0.232 mobile on a 0-255 scale, with cyclic camera/light/particle motion continuing through the seam.
