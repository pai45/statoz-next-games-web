# Retro Hoops independent team movement ? local rules 1.5.0

Scope: Future Games Web, Retro Hoops only. Independent arcade style retained. No push, workflow, release or Flutter import.

## Behaviour

The prior AI assigned lanes using athlete IDs and sent almost everybody toward an airborne/free ball. A single court snapshot now assigns separate cutter/outlet lanes, unique defensive marks, on-ball pressure, one chaser/rebounder per team, box-out positioning and a safety player. Every athlete executes its own intent through the existing movement, collision, action and recovery rules. Human selected input retains priority; the other five continue acting independently.

Attackers seek open passing corridors and keep a trailing outlet. Defensive matching minimizes travel, discourages unnecessary switches and accounts for the human selected defender. Close off-ball markers face their own mark and use defensive shuffle poses rather than running sideways away from them. A pass receiver retains its existing reception lock; other actors do not swarm the pass. Rebound plans use visible flight/velocity, never the hidden made/miss flag. The same seeded decisions replay deterministically. These are authored basketball rules, not recovered Street Hoop algorithms.

Steering uses arrival dead zones and teammate separation. It does not teleport actors, reset animations or bypass recovery. Contest decisions distinguish an active shot phase from an old or completed action. Existing possession/contact resolution, scoring and event-triggered audio remain authoritative.

## Camera and review

`node scripts/build-retro-hoops-fidelity.mjs retro-hoops-team-ai-v1` builds the actual Three renderer inspector with live role/target overlays, both attack directions, support/loose-ball/rebound scenarios, manual input and six-player AI mode. A single local asset index avoids hundreds of preview fetches. Camera comparison switches between the existing 640x360 wide view and a 514x360 crop approximating the retained 320x224 frame aspect, with unchanged sprite scale. Renderer resizing preserves its WebGL context. This comparison is diagnostic; recording dimensions do not prove native display geometry and the playable game's default viewport remains unchanged.

Local preview: http://127.0.0.1:8936/ ; playable game: http://127.0.0.1:8936/game.html . Review artifacts live in test-results/retro-hoops-team-ai-v1. The previous fidelity-v1 review remains separate.

## Validation and limits

56 Retro Hoops tests pass, including complete matches across six prior seeds, a further full match, deterministic replay, unique marks, support for every ball handler, no hidden shot-outcome reads, recovery locks, arrival and defensive footwork. Six full-renderer scenarios cover both directions. Nine playable console checks cover six viewport sizes and simultaneous touch/cancellation, settings/pause and fullscreen. TypeScript and scoped lint are checked separately. Offline bundling targets Retro Hoops only; concurrent cricket edits remain untouched.

Physical phones/WebViews, exact source AI and native input/frame timing remain unverified. Box-out currently means positioning backed by existing body collision; no new grabbing/pushing action is claimed. Court geometry has not yet passed a measured source match. This candidate is local and is not a 1:1 completion claim.

Final evidence: both live recordings decode with FFmpeg; their contact sheets were inspected. Repeated reference-aspect/wide camera switches pass without a lost WebGL context. See team-ai-v1-validation.json. The optional Retro Circuit run was stopped after its account test; this pass does not claim a completed Circuit suite.
