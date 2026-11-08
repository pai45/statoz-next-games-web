# Steering animation correction

0.10.2-steering / rules107. The distant road sweeps opposite steering with depth-dependent camera yaw, pivoting behind the player contact. All world objects derive from the same projected road. Speed gates the yaw; stopped cars do not swivel the road. Panorama reacts to steering.

All four original cars now use neutral, half and full authored turn geometry. Actual filtered simulation steering is interpolated for presentation. Turning remains visible while boosting/braking; original plumes, brake lights and collision feedback remain separate. Finish presentation is preserved. No physics, track geometry, lap, scoring or save-rule change.

These are designed camera/pose adaptations, not recovered Top Gear native timing. Original assets, reference provenance and editable source are retained in art/. Physical-phone checks and human audio listening remain pending. Local only; no deployment or Flutter import.

Validation: all344 repository tests, lint, typecheck, production build and static export passed. The reviewed first-frame interpolation correction additionally passed final lint, steering regressions and a fresh production build. Four landscape viewport/control checks, simultaneous touch/cancel, pause/restart/garage/records and pinned Play launch passed in desktop Chromium emulation. Physical Android/iPhone checks remain pending.

Resume integration audit (25 October 2026): all30 maintained source files and both public/static-export bundles match the reviewed0.10.2 pin. Actual exported app route passed launch, pause, restart with one canvas, garage and exit to motorsport, with no browser errors. See evidence/integration-hashes.json and evidence/app-checks.json.
