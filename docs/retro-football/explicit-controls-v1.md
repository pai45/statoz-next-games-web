# Explicit football controls and source-inspired SHOOT cue

Runtime0.11.0; rules exhibition-explicit-controls-v1; unchanged football-chance-atlas-v2. Maintained runtime: StatOz Future/statoz-games-web.

User-requested three touch buttons, in fixed physical slots:

| State | First | Second | Third |
|---|---|---|---|
| Attack | Pass(P) | Loft(L) | Shoot(S) |
| Defence/loose ball | Tackle(T) | Switch(S) | Slide(D) |

Keyboard uses these same contextual letters; arrow keys move/aim. WASD movement was removed to avoid S/D dispatching movement and actions together. Buttons keep their DOM slots when possession changes so a held direction pointer remains captured. CHANCE uses the third Shoot button/S to confirm; other action buttons are disabled while aiming. Pass remains a pass in shooting range. Shoot initiates a regular shot outside the existing CHANCE geometry. Throw-ins keep the existing two-handed throw rule; penalty/free-kick shooting uses the relevant restart action. The old A/B/C commands remain internal compatibility paths for prior deterministic fixtures and existing AI, not advertised player controls.

T uses an original short standing challenge from the already admitted compress/settle/ready poses, with a short movement/contact window and30-tick recovery. D uses the existing long sliding sequence and84-tick recovery. Both resolve swept contacts and existing foul/possession rules; no automatic possession award. T retains aerial body control when the ball is loose and aerial control is available. These timings and the new standing challenge are original tuning, not recovered source behavior.

Additional bounded reference-plan aspect: pitch-level SHOOT callout. Saved source evidence: source-study-v1 sequence shoot-prompt; https://www.youtube.com/watch?v=ftohDx8JaLo around118.9seconds, sample0030. Directly observed: a prominent SHOOT callout above/beside an attacking player. Unresolved: exact native trigger geometry and acceptance timing. Adaptation: controlled player owns the ball, playing/open phase, ready, attack progress greater than70. The original pixel-letter blue/yellow callout is positioned beside that player, below the score/clock exclusion area and inside the horizontal viewport. It clears on possession loss, action, pause, goal or special camera. Its pixel shapes share a batched mesh. This is reference-inspired behavior, not a claim of1:1 recovered geometry or copied artwork.

Validation: dedicated semantic rule tests plus all earlier football tests; actual keyboard and simultaneous touch, possession-label swaps and cancellation; both attacking directions for cue eligibility; native-size screenshots;8second30fps challenge/cue review MP4, decoded with FFmpeg. Independent review found clock overlap in the first larger cue; the retained correction moves it beside the player and below the clock. Physical-phone performance/ergonomics and human difficulty review remain unavailable. No source art approval or publication inferred.
