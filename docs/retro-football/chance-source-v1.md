# CHANCE foreground and goal depth — independent evidence review

Reference https://www.youtube.com/watch?v=ftohDx8JaLo . Saved index `output/retro-football/source-study-v1/sources.json`. All coordinates below refer to its320×224 resampled study grid. They are approximate visible-image measurements, not native hardware dimensions or recovered frame holds. No Future Games or gameplay source files changed by reviewer.

## First-goal sequence: observed phases

| Source time / sample | Direct observation | Coverage limitation |
| --- | --- | --- |
|90.0s /0001|Normal pitch attack with selected cyan player.|No controlled input log establishes trigger or button timing.|
|90.9s /0010|Black transition frame.|Single10Hz study sample does not establish transition duration.|
|91.1–91.7s /0012–0018|Front-goal view; small purple keeper, moving crosshair, transparent net and boards. No full foreground shooter yet.|Scene pans horizontally; goal/keeper coordinates vary.|
|91.8s /0019|Cyan foreground shooter enters from left edge, arms/body in approach pose.|Body/legs partially outside image.|
|91.9s /0020|Forward lean, head/hair trailing, one arm ahead, torso bent over run-in.|A single sample does not identify a native pose hold.|
|92.0s /0021|Player turns/loads near left foreground, torso angled toward goal; large body fills lower-left.|Feet clipped.|
|92.1s /0022|Arms counterbalance and kicking leg gathers/crosses near foreground ball.|Which foot is planted needs finer sequence evidence.|
|92.2s /0023|Visible boot around100,215 and ball around107,215; body mainly0..90X, head around60..95Y; lower extremities clipped.|Apparent contact candidate, not proof of native collision frame.|
|92.3s /0024|Ball around142,113, shadow around142,159; shooter follows through at left, keeper centred near153,80.|Strong ground/height separation; ball and shadow must be distinct.|
|92.4–93.9s /0025–0040|Keeper dives right; shooter remains at left in follow-through/recovery. By93.9 ball is around148,77 near net.|Do not relabel every later keeper frame a catch/recovery action.|

Inspected full samples0012–0024 plus0001,0010,0030,0040. `source-contact-enlarged.png` is a nearest-neighbour research enlargement of0023, not a runtime asset.

## Goal/stadium composition

Around92.2s the bright front crossbar is approximately x34..209/y12; front posts terminate around y98. The right side of the net recedes toward approximately236,90. The roof/sides contain oblique lines and the back mesh is visible at a different depth. Crowd, rail, boards and track can be seen through the net: there is no opaque black rectangular backplane. The keeper stands in front of the mesh/front plane and can overlap its lower portion. Source shot pan changes these positions, so the above should be treated as one measured composition.

Current0.8 close view uses a wider front rectangle, x48..272, and its front-plane bottom is typically around140–143. Its ball starts around x160/groundY211. A depth rebuild must explicitly distinguish an authored local composition from a precise source match; shrinking/repositioning the goal independently of the gameplay goal projection could make shots look like misses despite scoring.

## Other sequences must remain distinct

- `second-foul-camera/sample-0121.png` at239.0s: enormous foreground cyan lower legs and large ball, with goal to the right.
- `/sample-0141.png` at241.0s and `/sample-0161.png` at243.0s: roughly100px foreground ball in front of a much smaller keeper; source follows a foul/set-piece presentation. This is a different scene from first-goal run-in CHANCE and must not be mixed into one presumed action family without context verification.
- `third-goal-survey/sample-0041.png` at208.0s: large keeper outcome/reaction close-up. It does not establish playable keeper recovery.

## Original dedicated foreground family recommendation

Author a new coherent rear/three-quarter cyan and red character family based on the observed composition/action, with its own original clusters and silhouettes. Do not enlarge the pitch sprite or copy commercial-frame pixels. Retain the research links as reference provenance and separate source observations from original pixel construction.

Suggested bounded poses: approach-left, loaded-step, plant, leg-back/windup, contact, extended-follow-through, settle and recovered hold. Actual pose count can change if continuity requires it. Record explicit ground, planted-foot, kicking-foot, hip, head and ball-contact anchors plus silhouette bounds. Preserve identity/limb lengths and shoulder/elbow/wrist continuity; the source's hair/kit must not flicker between poses. Native authored foreground height around140–160px is a plausible composition target, **not** a recovered native sprite size.

The foreground should be absent/entering during source-style aim/approach instead of permanently showing a ready player from the first camera frame. Original phase durations must be labelled authored. Drive contact/release from the existing simulation action/event, not an unrelated animation timer.

## Can current live goal projection accommodate the shooter?

Yes, without changing shot physics: anchor the dedicated pose's kicking-foot/contact point to the actual `goalProject(liveBall,shotView)` at release. Translate the actor's complete pose to that point, then retain its release-ground/root position during follow-through. Do not keep dragging the foot after the ball has left. Aim/windup may use a consistently forecast contact from the same release pose/anchor, with actual event contact taking precedence.

However, body/rootX70 and footX160 would require about90px horizontal reach. The source contact candidate is closer to bodyX50–70 and footX107 (~40–60px), so a current-view body/root near100 and foot160 is more credible than forcing the torso to70. Alternatively a coherent close-view camera translation may place ball/contact nearer110 while shifting goal, keeper, shadow and target together. Never offset only the ball to meet a drawn boot. Any goal-camera transform needs shared render and contact-space treatment and separate regression checks.

Aim/keeper/ball projection currently treats goal centre as160 and planeY as roughly143; that can remain for this bounded foreground/depth phase if documented as an adaptation. Goal visual geometry must use the same shotView planeY, width/height and target projection as scoring/keeper interactions. Retain current accepted pitch/player calibration untouched.

## Acceptance checks for later review

1. Dedicated original foreground silhouette is visibly larger/more detailed than a pitch actor, with coherent pose transitions and no pitch-sprite enlargement shortcut.
2. Approach→plant→contact→follow-through→recovery runs continuously; mirrored/other-team variants maintain anatomy and anchors.
3. Actual emitted release ball projects within1–2px of the declared boot/contact anchor in both halves; ball/shadow separate correctly in flight; no second visual ball.
4. Same live ball and physical outcome continue through keeper/save/goal/restart and return to pitch. Pause/resume/restart/disposal work at every phase.
5. Goal rear/roof/side/front layers show depth, transparent mesh, correct occlusion and no invisible collision mismatch. Existing aim/keeper bounds do not become visually outside the goal.
6. At568×320 and844×390 the foreground, boot and flight remain readable without action controls hiding the contact. Inspect native320×224 and wide handheld views.
7. Separate visual-loop, contact/rules and gameplay verdicts; maximum two automatic correction rounds for this new phase. Native timing, exact reference camera and physical-phone performance remain unverified.
