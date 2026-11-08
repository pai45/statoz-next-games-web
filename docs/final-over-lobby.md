# Final Over athletic pixel lobby

Final Over uses an original authored 192 × 256 pixel stadium scene on Flutter and web. A right-handed navy/cyan batter stands at the near crease; an amber/navy right-arm bowler runs in from the far end. Both use athletic 16-bit proportions, separate anatomical limbs and consistent equipment. There are 27 authored batsman poses and 27 bowler poses, with manually simplified distance rendering for the bowler. The supplied GIFs guide composition and delivery timing only; no GIF frames, generated images or bitmaps appear in runtime artwork.

The twelve-second, 30 fps loop covers guard, run-up, gather, overarm release, bounce, coordinated swing, lofted-six contact, follow-through and recovery. Both wickets sit on the pitch centre line. The simplified batter uses a side-on guard, waist-height grip, forward front-foot plant and rear-heel pivot; the front foot stays planted through the shot. Release, bounce and contact are explicit shared anchors; flags, a short ball trail, contact marks, pivot-anchored dust and staggered crowd reactions add restrained activity. The camera, title and controls stay fixed. Pose switching and motion use held integer-pixel positions. Character sheets and anchor data live beside the source.

A Fuse CTA now anchors the bottom dock: a slanted cyan icon core, dark chamfered body, restrained glow and animated chevrons. The old lobby tagline is removed. No countdown is shown because the lobby is untimed. TAKE GUARD / BUILD SQUAD, loading protection, keyboard focus, native typography, difficulty inside the menu and safe-area access are retained.

Canonical source: web `scripts/final-over-lobby-source/artwork.mjs`, `characters.mjs` and `pixels.mjs`. Production `final-over.json` and `final-over-poster.svg` are byte-identical in both projects. They contain only local vector shapes/precompositions; no external resources or expressions. Wrappers align the stage to physical pixels. Loading, reduced motion and failure show the neutral guard poster. Playback pauses under panels, in the background and when inactive; starting play never waits for the art.

Squad readiness, starter-pack gating, tier persistence, state ownership, saved data, gameplay and match flow are unchanged. Short/enlarged-text layouts scroll supporting content above the reachable CTA. The original anonymous characters imply no athlete, club or sponsor endorsement.

## Rebuild and checks

Run `node scripts/final-over-lobby-source/artwork.mjs --flutter C:/Users/priya/OneDrive/Desktop/flutter_projects/card_game`; add `--check` to verify exact snapshots. Run `node --test tests/final-over-lobby-artwork.test.mjs` for vector integrity, unique poses, complete bat geometry, ball anchors, single-pose visibility and loop closure.

Captures, pose sheets and 14-second motion previews are delivered under the Designer workspace's `output/final-over-pixel`. Flutter visual QA uses its compiled web preview; Android/iOS hardware is not covered.

## Compact athletic revision

The original anonymous players now use compact athletic proportions, shorter two-bone arms, broader shoulders and simplified material clusters. The user-supplied retro batter reference informs the enlarged navy helmet, readable side profile, shoulder guard, cyan shirt, pale trousers/pads and navy shoes; no reference pixels are copied. The guard/backlift separates the blade from both arms; the preparation blade sits behind the shoulder/helmet while gloves remain on the handle. A pixel-mask check verifies arm clearance outside the shared grip in every pose. The batter is approximately 96 authored pixels tall, excluding the bat. There are 27 batter poses and 27 bowler poses. Hands share the bat-handle anchor; blade geometry stays fixed, head position holds through impact, the front foot plants before contact and recovery includes a lifted step back. The downswing and follow-through use an unwrapped continuous blade arc rather than reversing at contact.

The bowler uses a dedicated fixed-size 45 × 52 distance canvas with simplified clusters. Run-up and walking positions follow the pitch ground projection with authoring-time support-foot locking; there are no three-step character scale changes. Pitch edges, creases and both centred wickets derive from one centre-line model. Crowd reactions begin after the lofted ball reaches the stands.

The shared twelve-second timeline remains 30 fps: release frame 114, bounce frame 125 and contact frame 132. Editable movement metadata records pose anchors and the full bowler trajectory. Preview and production Lottie are derived from the same pixel source; the neutral guard SVG is the fallback. Existing lobby wrappers, controls, game state and match flow remain unchanged.

Revision evidence is in Designer's `output/final-over-compact`. Run `node --test tests/final-over-lobby-artwork.test.mjs` for supported vectors, reproducible assets, geometry, delivery anchors, grip/arm reach, planted feet, fixed distance dimensions and loop closure. Platform checks and their practical limits are recorded with the captures.

## Fuse launch dock — 17 October 2026

The bottom section now contains the native FINAL OVER title and Fuse CTA, with the previous tagline removed. The shared slanted cyan icon core, dark chamfered body, restrained glow and chasing chevrons replace the pixel button. No countdown strip is supplied because the lobby is untimed. TAKE GUARD / BUILD SQUAD, loading protection, keyboard/focus behavior, squad setup destination and safe-area access are retained. On web, the reusable Fuse component uses native button/link semantics; Flutter uses CyberFuseCtaButton with a feature-local keyboard/focus adapter.
