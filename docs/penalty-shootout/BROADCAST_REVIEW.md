# FIFA 14 reference review and presentation revision

21 October 2026. Local design revision: `football-broadcast-2`.

## References actually inspected

| Reference | Coverage and evidence |
| --- | --- |
| [Real Madrid vs Barcelona — Penalty Shootout — FIFA 14 (HD)](https://www.youtube.com/watch?v=yxvbfvs3pAo) | Shade, 128 seconds. The uploader specifies PC and Professional difficulty. Inspected the full clip through three-second overview samples, plus quarter-second samples around the first kick. |
| [Fifa 14 Demo PS4: Penalty Shootout: FCB VS MAN CITY](https://www.youtube.com/watch?v=pXgs9D7KnKM) | ThriceaMafiaseries, 92 seconds. Uploader-labelled PS4 demo. Inspected the full clip through three-second overview samples and quarter-second first-kick samples. |
| Earlier Vita recording and official manual | Retained in [REFERENCE.md](REFERENCE.md) for the original control reconstruction. The two newly supplied videos inform this presentation revision; they are not Vita captures. |

The videos, metadata and diagnostic frame sheets remain research-only in the Designer work folder. They are excluded from the game's public assets and documentation evidence images. No FIFA, EA, club, athlete, kit, sound or texture asset was extracted for the runtime.

## Detailed observations

Times below are approximate source-video times. Quarter-second samples establish the order and visible poses, rather than a native contact frame or exact game timing constant.

### PC clip

| Time | Observation | Design implication |
| --- | --- | --- |
| 0–3 s | Two-column penalty taker selection, restrained grey/blue menu surfaces and compact type. | Use an original quiet football menu; retain standalone skill gameplay instead of importing roster selection or ratings. |
| 4.5–8.5 s | Stable view from behind the taker. The goal spans roughly half the picture width; the taker waits to the left of the ball. A dense stand and advertising band fill the background. | Use a long-lens composition, diagonal approach and enclosed stand. Keep the complete opening in view. |
| 8.75–9.75 s | Weight shifts forward; the approach crosses toward the ball. The keeper changes ready pose while remaining on the line. | Stage the authored approach across the spot rather than translating straight forward. |
| Around 10 s | The plant/contact pose occurs near the ball. The body continues through the kick. | Preserve the measured boot contact event and continue the animation after launch. |
| 10.25–10.75 s | Keeper extension follows contact; the ball and goal stay visible. | Keep the camera stable through the fast part of the shot. Preserve pose-aligned hand collisions. |
| 11–12 s | The keeper is on the ground, then starts recovering; the taker relaxes out of follow-through. | Keep the result tail and recovery visible instead of cutting away on first contact. |
| About 13–83 s | Alternating takers reuse the same main composition. Top-left scoring stays compact, with kick indicators. Player strips sit in the lower corners. | Move score and player information to the corners, keeping the middle of the pitch clear. |
| About 85–89 s and 103–107 s | Short reverse/keeper-oriented shots show the goal foreground and the wider stadium. | Keep an original reverse camera for direct browser keeping, and a separate side replay view. |
| About 115–128 s | End-of-shootout reaction and stadium/player views. | Use a restrained result presentation after the physical outcome. Keep settlement separate from camera playback. |

### PS4 demo clip

| Time | Observation | Design implication |
| --- | --- | --- |
| 0–3 s | Similar restrained selection menu, with clear hierarchy and small supporting data. | Give the game its own conventional football interface, without large cyber panels over play. |
| About 4.5–6 s | Taker and ball occupy the lower half, goal and keeper the centre, crowd the upper band. | Preserve the three layers of foreground player, goal and stand. |
| 6–6.5 s | Short angled approach; supporting leg and shoulders prepare for contact. | Use the diagonal root path while keeping the contact pose calibrated. |
| 6.75–7 s | Contact and follow-through; the keeper begins the response. | Ball launch remains tied to the authored contact event. |
| 7.25–7.75 s | Full lateral keeper extension, followed by landing/roll. | Maintain visible dive reach and follow-through in the renderer and replay. |
| 8–9.75 s | Recovery and transition into the next action. | Retain a readable result tail before advancing. |
| About 13.5–88.5 s | Repeated preparation/contact/result cycles. Compact upper-left information, slim lower-corner strips, natural grass, near-continuous crowd and ad-board band. | Keep the field as the main visual surface and use restrained interface overlays. |
| About 91 s | Wide stadium transition. | Enclose the reverse/replay views with stands rather than an empty far boundary. |

## Implemented interpretation

- **Camera:** original long-lens shooting camera, full opening retained across desktop and both phone orientations, small optional shot tracking and stable reverse/side views. The approximately 43.5-m virtual position and chosen fields of view are our tuning values, not recovered FIFA camera settings.
- **Approach:** the taker starts left of the ball and approaches diagonally. At the one-second contact event, the lateral offset returns to the measured boot/ball calibration. Replays record the lateral path with the other transforms.
- **Stadium:** four seated stands, an upper-deck break, cantilever roofs, rails, floodlight structures and original football messaging. Instanced spectators have varied clothing, proportions and arm poses; coarse-pointer devices use reduced crowd density.
- **Pitch and athletes:** muted olive grass, calmer daylight, original kit fabric, back numbers and hair geometry. The CC0 human foundation and original rig/football clips remain editable.
- **HUD:** compact upper-left score strip with five-kick indicators; lower-corner player strips; a slim composure/power bar; quiet role hints and result information. The game uses its own neutral sports palette, standard sans-serif type and simple rectangular controls. Host authentication, navigation, ads and economy remain integrated.
- **Touch:** matte physical-style stick, shot button and dive pad. Portrait keeps controls below the scene. Landscape keeps the main action between the two touch areas. Keyboard/gamepad views use the small HUD instead of displaying inactive virtual pads.
- **Scope:** physics outcomes, AI information boundaries, composure/charge/aim locking, rewards and save compatibility remain intact. Reference footage cannot establish hidden physics or AI constants.

## Verification and local evidence

Final visual captures, the [30 fps gameplay recording](evidence-broadcast-v2/gameplay-review.mp4), and [performance measurements](evidence-broadcast-v2/performance.json) are saved under `evidence-broadcast-v2`. Desktop, portrait and landscape shooting/keeping screenshots and the replay angle were visually inspected. The recording includes the live browser audio mix, and its complete H.264/AAC streams were decoded with FFmpeg. The previous version's [validation report](VALIDATION.md) and evidence remain as the initial delivery baseline.

Final checks: **102 repository tests passed**, including **17 shootout-specific cases**; **six browser journeys passed** against the static `/statoz_web` export; full ESLint, TypeScript, normal production build and static export passed. Geometric regressions cover full goal/ball/taker framing in desktop, portrait and landscape, plus diagonal approach convergence, exported boot contact and glove/collider alignment.

Physical phone sustained performance, Safari/iOS and physical gamepad ergonomics remain device acceptance work. A sampled headless desktop frame rate does not establish those results.

## Measured final package

156.0.8078.4 on Windows 10.0.26200, 12th Gen Intel(R) Core(TM) i7-12650H, 16 GiB RAM. Desktop GPU: ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Ti Laptop GPU (0x000024A0) Direct3D11 vs_5_0 ps_5_0, D3D11). Each viewport was warmed up for four seconds, then measured for fifteen seconds, at browser DPR 1. Adaptive resolution and shadow reduction were enabled; the JSON records the actual internal canvas size, which can be smaller than the CSS viewport.

| Viewport | Mean fps | 95th percentile frame time | Draw calls |
| --- | ---: | ---: | ---: |
| desktop, 1280 x 800 | 75.0 | 13.5 ms | 57 |
| portrait-emulation, 412 x 915 | 74.9 | 13.5 ms | 57 |
| landscape-emulation, 915 x 412 | 75.0 | 13.5 ms | 78 |

The cold capture recorded 3.98 MiB of response bodies, with text compressed by the local preview server. No HTTP errors, horizontal overflow or browser runtime errors were observed. These are headless desktop-GPU samples; phone dimensions use touch emulation and do not establish physical-phone performance. The original spectator atlas is generated from local code and rendered with one instanced draw call; no reference image is used.
