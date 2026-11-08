# Retro Circuit — finish-horizon continuation

Candidate0.9.3-finish-horizon, rules107. Maintained runtime is Future Games Web. Existing mobile scope, three study tracks, four original cars and local-only records are retained. No deployment or Flutter import.

The previous independently reviewed finish road ended at a finite far sample. Its extrapolated edges could disagree with the separately inferred top anchor, leaving an abrupt clipped end. This revision includes that top anchor in each terminal edge profile and closes the far plane to an explicit zero-width horizon point. Measured source rows and the independently fitted ground trajectory remain unchanged. Horizon placement outside measured recording rows is still an inference, not recovered console geometry.

The correction affects successful source-study finish presentation only. Normal racing, physics, track data, AI, fuel/nitro, saved results and rule107 compatibility are unchanged. DNF and the three legacy arcade finish views retain their existing behavior. Original car, environment and audio source data remain unchanged.

The new geometry tests check strict convergence, nonnegative/narrowing width, exact connection to the inferred top, and agreement with source-observed rows. The initial0.1pixel row tolerance caught a0.133pixel piecewise interpolation difference; this was measured before adopting a0.5pixel raster tolerance. Recording readings have roughly3logicalpixels of uncertainty, so the test remains tighter than that evidence supports. The original failure and probe are retained in this revision's working record.

All288 native car/course/inspection fixtures capture. Implementing-agent inspection shows connected road framing, readable near/far cars and no returned player after disappearance. All38 ordinary racing PNGs remain pixel-identical. Nine repeated-render fixtures retain authoritative snapshots unchanged. The source horizon positions, far-road taper, place typography, gate transition and exact frame cadence remain approximate or unmeasured.

The local review server was found stopped and restarted at127.0.0.1:3127. Play/Review link checks apply after pinning the current playable bytes. Previous playable builds remain preserved.

Current source evidence comes from the original SNES Top Gear upper-player recordings and is retained in ../fidelity-v9/finish-source/. Source timestamps are recording times, region/native cadence unknown. Findings are separated into observed source rows/ground, inferred horizon/framing and designed mobile/asset adaptations. Commercial sprites, music and branding are not imported into the original runtime artwork.

Independent review, repository/build checks, current mixed race audio and app-route results are recorded separately beside this file. Exact1:1 acceptance, human audio listening and physical Android/iPhone testing remain open. The full twelve-point gate ledger is retained in ../fidelity-v8/status.md; this finish correction does not close unrelated handling, traffic, resource or phone-performance comparison gates.

Independent checks:10836 terminal samples pass purity, held-road and monotonic-departure checks. Nine geometric fixtures cover all3studytracks at3lateralpositions:82finitepoints, nonnegative/narrowing widths, exactcap anchor, zero accepted vertical road gaps fromtop45/-60/16to180. Observed ground discrepancy stays below0.65logicalpixels; measured-edge interpolation stays below0.133pixels. Repeatedpalette sessions stay at10?11textures anddispose tozero. The pointed continuation is an inferred adaptation; native stepped far-plane geometry is unproven. Current original audio is version-pinned with exact replay assertions and complete decode, at reference approval; human listening remains open.

Final repository validation:331tests pass;lint,typecheck,productionbuild andstaticexport pass. Native browser checks cover four handheld sizes, simultaneous touch/cancellation, pause/restart andlocalrecords. Play/Review/mixedvideo load checks pass. All other game bundle hashes match the exact start-of-pass snapshot. See checks.json,bundle-verification.json andevidence/.
