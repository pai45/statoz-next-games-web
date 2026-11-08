# Creasefire Six (Retro Innings): retired

> Removed from Future Games Web on 30 October 2026 at the user's request. Discovery and direct play routes are disabled; normal builds and device downloads exclude the runtime. Source and local save namespaces are retained as development history. The implementation notes below describe the retired preview.

The Cricket catalog opens the shared offline bundle through BundledGame. The game owns its entire viewport: a landscape handheld shell, a central native 256×224 field, D-pad/run/loft on the left, stroke/action controls on the right, and a fullscreen/menu/exit bar. Portrait remains usable and prompts rotation. Native fullscreen/orientation availability depends on the browser; fitted viewport play remains available when denied.

Source lives in src/features/games/retro-innings/runtime. The ordinary bundle pipeline excludes this retired game, and explicit `--game=retro-innings` selection is rejected. A selected bundle build preserves other game entries/files. No Flutter import occurs automatically.

The authoritative match is preserved in match-template.html/simulation.mjs. Renderer/ground/motion/console modules own presentation and controls. There is one copy of each gameplay control and one scoring engine. The state bridge is intentionally opaque at the legacy JavaScript boundary; strict TypeScript checks and complete-state parity checks validate the adapter. This is not a complete TypeScript rules rewrite.

Source reference order: Super International Cricket (SNES), saved screenshot frames 007/011/012/018, supplied D2D2t1JfZDk and tn2SvnEA9w4 recordings. Native region/revision and ROM cadence are not recovered. Existing source-derived athlete masks retain their ground anchors. Bowling now joins run-up/gather/brace/release/follow-through/recovery/ready. Sample positions establish observed order; holds remain authored. Runner poses use run progress rather than the idle/global clock. No unobserved keeper throw or dive is fabricated.

Ground construction samples reference greens and pitch colours, with broad checked outfield, parallel mowing near the strip, wear, white boundary/picket fence, crowd terraces, sight screens and a small pavilion. World stadium placement is authored; it is not a recovered native map. The legal rope remains the simulation's 240-unit radius. Scenery is painted behind players/ball, never used as fielding/collision logic. StatOz font, cyan signal and dark shell remain.

The browser receives the self-contained srcdoc artifact. The existing protocol validates game/session identity and source/origin; saves stay in the account/game namespace. Console Exit emits through that protocol. Fullscreen is a user gesture. Menu pauses and only resumes its own pause on Return/Escape; a pre-existing pause remains paused.

This remains a private source-reference build. No source asset clearance, independent approval, physical-phone acceptance or public-release readiness is claimed. Keeper pursuit/throw/full dive and additional directional/close movement remain unfinished. See handheld-v1.json and public/games/retro-innings/provenance.json for pinned hashes and limitations. Detailed source frames, decoded action-loop video and browser/parity evidence live in the Designer output/retro-innings/handheld-v1 checkpoint; they are not published by these scripts.
