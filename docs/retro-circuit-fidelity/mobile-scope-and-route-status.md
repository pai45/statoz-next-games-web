# Confirmed mobile fidelity scope — 24 October 2026

The user confirmed **Keep agreed mobile adaptations**. This resolves the earlier scope question: retain one full landscape driving view, steering left, brake/accelerator/nitro right, automatic transmission, three study courses and local records. No split-screen, full original championship or manual-gears expansion is authorized by the exact-fidelity wording. Earlier arcade courses remain selectable history.

Maintained revision: **0.6.0-route-study / rules104** in Future Games Web. Prior route-study results remain archived; only compatible rules rank together. Arcade102/103 layouts remain compatible because their geometry/tuning were not changed.

## Route correction

The three Vegas left sweeps now occupy observed reference distance windows approximately23–37%,64–79%,90–98% of the lap rather than the earlier premature9–19%,38–46%,82–85%. These fractions are inferred from recording time/minimap, not recovered world metres. Map markers and road sampling use the same ordered canonical distance. The map contour is retained/inferred; geometric metric curvature is not recovered from ROM data.

Two compact continuous terrain regions replace repeated sinusoidal hills: mid-course crest55% and late crest96%. Their heights/grades are periodic at the lap seam. Visual elevation gain is separate from simulation height/grade, corrected after independent review demonstrated the old projection could not hide the skyline. Broad-left envelopes maintain the observed continuous sweep; magnitude remains authored.

## Evidence and limits

- New corner-order/height-continuity/archived-record tests are in maintained `tests/retro-circuit-route.test.ts`.
- Independent review/probes remain in this folder; first probe failed blind-crest presentation, subsequent correction must be judged from the second probe, not retroactively called a first-pass success.
- New complete rules104 movie/result retained under evidence; old rules103 footage/audio remains a separately pinned historical artifact.
- Full repository checks rerun under ../fidelity-v1/checks/results.json; final results must be read, not inferred from an earlier build.

Exact equivalence remains unproven. Unknown source inputs prevent controlled physics matching; first-lap pacing still differs from the source. Additional full coastal/dusk routes, opponent motion distributions, resource timing and source-event matching remain incomplete. Original art/audio are retained product adaptations. Audio listening and named physical Android/iPhone checks remain open. No publishing or Flutter import.

The previous report's pending mobile-versus-original scope decision is superseded by this explicit user answer.

The final safe rollback has its own decoded30fps public-input race movie at `evidence-safe/complete-reference-race.mp4` and actual result/input/event metadata beside it. Actual result66.24589s,6th,three laps,no stop; lap pacing still differs from source.284 repository tests pass; lint/typecheck pass. Production/static build outcome is read from the ongoing validation record, not assumed from successful compilation. All four unrelated game bundle hashes are unchanged.

## Final crest disposition

Gain16 reproduced skyline hiding but independent native frames demonstrated missing player/foreground road at the start and a floating car on descent. It failed review and was reverted to the last valid3.2 gain. The failed projection and evidence are preserved; no third automatic correction was attempted. Ordered corner/terrain regions remain. Full blind-crest fidelity is explicitly NOT accepted. The gain16 movie is failed-candidate evidence, not the final playable revision.
