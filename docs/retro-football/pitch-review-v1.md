# Pitch/player calibration — independent final review

Candidate0.8.0 at `http://127.0.0.1:3066/play/`. Final automatic review round for this geometry phase. Read-only reviewer; no runtime files changed.

## Measured visual result

- Centre ellipse421×82px versus source static-kickoff fit409×81px. This is a substantial improvement from110×58. The different86.9s source fit372×77 remains evidence of an unresolved perspective/camera difference.
- Uniform0.8 pitch representation gives ready47px and run-e-0 45px alpha heights under nearest-neighbour resampling, versus baseline58/56px. Source central cyan bodies were about43–44px; the candidate is now much closer, within pose/bounds uncertainty for running and around7–9% taller for ready. Source far/near body scaling is not reconstructed by this uniform adaptation.
- Actual native320×224 canvas,844×390 and568×320 handheld screenshots were inspected. The field is broad, players are smaller and five nearby players now occupy the reference kickoff crop instead of the previous two. Exact source kickoff positions/poses are still not matched; invented red team and HUD are intentional adaptations.
- Source atlas pixels remain unchanged. The reduced displayed representation is an authored nearest-neighbour adaptation, not new recovered native art.

## Rendering/contact coherence

An independent direct renderer audit exercised79poses×2mirror states×4anchors (foot, left hand, right hand, ball):632 comparisons. Rendered mesh anchor coordinates and `Simulation.anchor` agreed within1.01pixel, with **zero failures**. This checks actual renderer geometry and simulation inversion, rather than just comparing two expected formulas. Source UV extents remain tied to the original atlas while mesh width/height and anchor coordinates use the same transformed pose.

Close-view keeper retains original geometry and hand anchors; pitch scaling is not applied to that separate goal projection. Shared projection and body/boot/receive contact radii are explicitly authored calibration parameters.

## Runtime checks

Eight independent browser fixture checks passed; no page errors:

1. Ground pass released and teammate received.
2. Ground-foot pickup and sliding tackle made anchor contacts.
3. Standing keeper hand made a physical save.
4. Both goal lines scored correctly in both halves; halftime continuation reversed attack direction.
5. Reference framing at568×320 and844×390 kept the ball visible and320×224 backing canvas.
6. CHANCE in both attacking directions kept the same ball object through actual shot release and a save/goal/restart outcome.
7. Keeper secure→drop→punt-contact events occurred in both attack directions.
8. Four edge fixtures produced appropriate restarts and finite bounded camera coordinates.

Evidence: `round-2-checks.json`, `candidate-measurements.json`, reproducible reviewer scripts, `round2-native.png`, `round2-mobile-568.png`, `round2-mobile-844.png`. These controlled fixtures verify geometry/rules, not organic AI quality or source-native input/animation timing.

## Verdict

**Pass for the bounded pitch/player calibration phase.** The small-pitch/oversized-player complaint is materially addressed, renderer/contact coordinates remain coherent, and the tested match actions still function. Preserve0.7.0 and phase snapshots. Both automatic correction rounds for this phase are now consumed.

Do not promote this to an overall1:1 verdict. Remaining work includes source-dependent perspective/depth scaling, exact kickoff/AI positioning and pacing, foreground CHANCE shooter/net depth, distinct defensiveB action, complete oblique/action animation coverage, physical-phone performance/ergonomics and asset release status. Multiplayer remains excluded.
