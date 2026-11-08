# Retro Circuit continuation — 24 October 2026

Maintained build0.6.2-fidelity-study, rules104. Agreed mobile adaptations retained. Physics, route, original art, AI and camera tuning remain unchanged from the reviewed0.6.1 version. No push/deployment or Flutter import.

## New measured source anchors

Dense retained-recording review independently read the upper white player's HUD. First lap announcement27.76s, second/final-lap announcement46.30s, frozen finish64.96s. Event-derived splits27.76/18.54/18.66s are approximate±0.15s because announcement onset can lag the crossing. Nitro decrements occur at27.81 and42.98s. Recording timestamps are approximate±0.1s and are not native ticks.

These supersede the earlier28.66 first-lap value and two identical18.15 remaining-lap estimates. Source-event JSON, hashes, exact frame paths and a review board are in source-events/. No throttle, steering or brake input trace was recovered.

## Reviewable comparison

`index.html` compares source event frames against the maintained game replayed from its full grid/countdown through public inputs. First-lap, final-lap and finish comparisons were browser checked with no page errors or state injection. The candidate is not teleported to a matching position/result. Its public-driver splits25.50/20.383/20.367 and66.24589s total remain different. The new board makes these mismatches reproducible; it does not accept fidelity.

All six event comparisons are saved in `event-comparison-measurements.json`. Against the corrected approximate source splits, candidate lap1 is2.26s shorter and later laps about1.84s/1.71s longer. Source announcement latency and unknown inputs remain explicit; these are comparison differences, not isolated physics errors.

## Runtime improvement

Road/car clipping now reuses a prefix horizon instead of repeatedly allocating sliced arrays and recomputing minima. All36 actual WebGL frames across six courses/six positions were pixel-identical to the preserved baseline. Independent runtime review found no blocking semantic/lifecycle issue.

An explicitly labelled Node CPU microbenchmark measured median16.255ms→3.684ms for100 synthetic workloads per iteration, with identical numerical checksums. This is about4.4× faster for this clipping workload, not overall FPS or a phone-performance claim.

Live diagnostics now include bounded trailing600-frame sample count, median,p95,p99. Race lifetime mean/max remain separately labelled; the quantiles reset on rematch and ignore paused idle time. Repeated session/context-loss/disposal browser checks pass. Desktop SwiftShader timing remains desktop evidence, not a representative phone result.

## Crest study and retained limits

120 isolated gain/fade variants were sampled across1001 centre positions and source frames inspected. None justified a faithful production replacement. Current accepted functional camera was retained; no arbitrary physics/terrain shift or visual phase gate was introduced. See crest-experiment/review.md.

Exact source crest composition/timing, lap pacing, complete coastal/dusk source routes, traffic/resource response comparison, human audio listening, physical Android/iPhone60fps acceptance and Flutter WebView acceptance remain open. Original asset/audio choices remain intentional adaptations. Full-plan or exact1:1 acceptance is not claimed.

Validation records: clipping-equivalence.json, clipping-benchmark.json, independent-runtime-review.md, event-viewer-check.json, lifecycle.json and checks.json. Required repository/build results are copied after the run completes; earlier pass counts must not be substituted for the new build.

Current run:287repository tests pass; lint/typecheck and production build pass. Static export and final app route are recorded once completed. No unrelated game bundle bytes changed.

Static export also passed; complete results are pinned in `checks.json`. Actual app-route results are saved separately in `app-checks.json` after launch/pause/restart/garage/exit verification.
