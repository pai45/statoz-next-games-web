# Independent Retro Football comparison — baseline 0.6.0

Scope: mobile landscape handheld; no multiplayer. Read-only runtime review, fresh Chromium interaction and saved source-frame inspection. No code or assets in Future Games were changed by this reviewer.

## Evidence

Reference recording: https://www.youtube.com/watch?v=ftohDx8JaLo . Saved provenance/index: `output/retro-football/source-study-v1/sources.json`. These images are resampled recording samples, not recovered native sprites or controlled input captures. Exact edition/region remains unresolved; no native timing is established here.

- Kickoff sample0001 =84.0s; sample0020=85.9s; sample0040=87.9s; sample0060=89.9s.
- First-goal sample0040=93.9s shows the large foreground cyan shooter, keeper diving right and front-goal net/stadium perspective.
- Attack and defence instruction sample0020 directly show the contextual button descriptions.
- Fresh current preview: `http://127.0.0.1:3064/`, 844×390 CSS viewport, 406×224 canvas. `current-kickoff.png` is the unadvanced live kickoff. `current-chance.png` uses a disclosed controlled state fixture to enter the real CHANCE rendering path. `browser-evidence.json` preserves state and touch results. No page errors occurred.

## Ranked findings

### 1. Pitch-to-player scale and composition diverge substantially — high confidence, high impact

At source85.9s the centre-circle top/bottom are approximately y72/y154 on the 320×224 study grid. Both horizontal ends extend beyond the image. The arc is still around y86–90 and y138–141 at the side edges; a simple ellipse fit suggests horizontal diameter roughly400–450px, not an exact recovered measurement. The vertical diameter is about82px. In current code the centre ellipse has explicit radii55×29, diameter110×58. It appears as a small closed ellipse, while kickoff exposes many players in close parallel columns and the opposite penalty area at once.

Source upright players around kickoff appear roughly43–51px high; current rendered native figures are broadly comparable (~45–50px). The primary discrepancy is field geometry relative to actors. Zooming the entire image to enlarge the circle would incorrectly enlarge players. Merely drawing a huge ellipse without changing projection would misalign rules, spaces and contact.

**Correction:** calibrate a configurable shared world-to-pitch projection against three or more source frames, including centre-circle arcs, player roots and box lines. Regenerate stadium geometry and camera bounds from the same projection. Keep sprites on their admitted native grid. First implement fixed320×224 reference framing so measurements are comparable, while retaining mobile-wide as a separately labelled mode.

**Acceptance:** a source/current kickoff comparison with mapped landmarks and actor-height measurements; circle geometry within declared uncertainty, no visible field/contact discrepancy; switching reference/wide view preserves world positions, ownership and ball trajectory. Recheck both attack directions and field edges.

### 2. CHANCE lacks the defining foreground shooter — observed, high impact

Source93.9s has a large cropped cyan shooter in the left foreground with the keeper and goal behind. Current CHANCE screenshot shows only the small keeper, target and ball. Its net is a flat black rectangle with regular orthogonal grid; source has oblique side supports, visible depth and layered pitch/net occlusion. Current renderer only creates `closeKeeper`; no foreground shooter exists.

**Correction:** build an evidenced complete close-view shooter preparation/contact/recovery family and separate net rear/side/front layers. Do not stretch a pitch player to fabricate the foreground asset. Keep the ball attached to the real shot-release anchor through the view switch. Preserve source/reference provenance.

**Acceptance:** side-by-side preparation→release→keeper→outcome→pitch-return recording, no missing shooter, ball jump or contact discontinuity. No new native timing claim without measurement.

### 3. Single-thumb steering cannot slide between directions — reproduced, mobile blocker

Fresh CDP emulated touch: press UP, slide the same pointer to RIGHT. State stays `up:true,right:false`. Captured pointer events remain attached to the initial directional button, and current input handles no directional pointermove. This forces lifting the thumb between directions; diagonal travel requires two independent direction touches rather than one thumb.

**Correction:** one sliding eight-way directional surface or joystick with pointer capture on the surface, local-coordinate direction resolution, centre dead zone and per-pointer source tracking. It must work while the other thumb holds an action button.

**Acceptance:** one contact traverses all eight directions and centre without lift; direction state matches region, diagonals normalize speed, independent action touch remains active; cancel/lost capture/blur/pause clears input. Test 568×320 and844×390. Physical ergonomics remain unverified by emulation.

### 4. Defensive A and B collapse distinct documented actions — documented, high confidence

Source instructions explicitly separate A SLIDING and B TACKLE/ROUGH PLAY; C is ACTION/PLAYER SHIFT. Current `Simulation.command` calls the same `tackle(p)` for A or B, so both use the same slide/recovery family. Attack A/B/C descriptions broadly match the source instructions.

**Correction:** separately study B standing/body challenge and its recovery/contact/foul behaviour before adding a distinct action. Keep A slide. Do not equate two labels with source reconstruction.

**Acceptance:** defensive A and B create distinct evidenced action families and physically appropriate contact windows. Include misses, successful possession changes, interrupted challenges, fouls and recoveries. Unknown exact windows must stay labelled authored.

### 5. Directional animation remains four cardinal families — observed in code, source coverage incomplete

The renderer selects N/S/E/W cycles with facing hysteresis; diagonal movement uses a cardinal pose. Current counter-stride variants preserve head/torso but do not establish authentic unseen diagonal silhouettes. Source kickoff87.9–89.9s shows oblique player orientations and ball-leading variation as direction changes. Sequence holds cannot be recovered from this sparse sample alone.

**Correction:** inventory genuine directional/action coverage and first reconstruct high-use oblique dribble/turn poses, rather than another blanket mirror family. Separate direction, foot phase, anticipation/contact and recovery. Measure screen-root movement only after subtracting camera movement.

**Acceptance:** eight-direction loops shown at1× and enlarged with root/foot/ball anchors; planted-foot continuity and unchanged identity; full pass/receive and turn sequences, not isolated poses. Missing reference directions remain explicit.

### 6. Stadium construction and HUD remain stylized approximations — observed, medium impact

Current crowd is regular repeated dots/rows with large uniform aisles, boards use repeated ARCADE/FOOTBALL typography and field grass is visibly sparse procedural marks. Source displays denser varied crowd/structure, textured mowing bands and irregular board compositions. Invented board lettering is an appropriate deliberate adaptation, but not 1:1 art. The current HUD uses invented team names, numeric clock and permanent exhibition/radar/message overlays; source framing uses country badges, TIME motif and contextual markers.

**Correction:** preserve invented identity/branding while studying palette, layer spacing, crowd density and type scale. Reduce permanent instruction density during active play and make contextual action labels accurate. Treat texture/detail as original authored reconstruction with evidence links.

**Acceptance:** composition comparisons at kickoff, far touchline, goalmouth and CHANCE; score/time readable at568×320, no action obscured by controls. Static art quality is a separate verdict from rule correctness.

### 7. Current camera/physics parameters are adaptations, not recovered rules — verified limitation

Following camera damping0.22, velocity lookahead, running speed7.2worldunits/s, CHANCE eligibility progress>70/y20..48 and90tick auto-release are visible authored constants. Footage observations do not establish their native equivalence. AI/closeness cannot be judged from one fixture or one completed match.

**Correction:** use synchronized comparator scenarios and a tuning ledger with measurement units, camera subtraction, sample count and confidence. Keep visual-match scores separate from simulation scenario outcomes. Avoid claiming a native AI match from short recordings.

**Acceptance:** several repeated scenarios covering forwards/backwards delivery, dribble turns, aerial actions, pressing and keeper outcomes. Each parameter is measured, inferred or deliberately redesigned; no unqualified 1:1 verdict.

## Recommended bounded first correction

1. Fix single-thumb sliding control and accurate contextual button labels.
2. Add fixed320×224 reference framing and a source/current comparison inspector.
3. Calibrate projection/landmarks before expanding more artwork.

Review this slice independently, preserve0.6.0, and permit at most two automatic correction rounds for the bounded slice. Foreground CHANCE art and distinct defensive B are the next action/art slice; do not mark them resolved by the mobile controls work.

## Verdicts

- Existing handheld shell: readable and functional in desktop-emulated landscape; physical-phone ergonomics unverified.
- Mobile steering: **needs correction** (reproduced sliding defect).
- Reference composition: **needs correction** (field scale, CHANCE foreground, environment detail).
- Native behaviour/timing and full AI fidelity: **unverified**, not failed solely because unknown.
- Public release: **not assessed**. Source asset release status remains separate.
