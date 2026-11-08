# FIFA 14 Vita reference study

This is an original StatOz browser game. Reference evidence informs the control relationships and presentation, not recovered source code, hidden AI logic or measured native physics constants.

## Documented controls

EA's FIFA 14 PlayStation Vita US manual, pages 28–29: directional aiming accumulates while the stick is held; power is charged; placed/chipped variants exist; the keeper can move on the line and dive independently. Committing early helps corner reach but exposes the middle; slower shots allow a reaction after contact.

Page 36 documents touch penalties with a composure meter followed by aiming and power determined by touch duration. Combining composure timing with classic stick/buttons across touch, keyboard and gamepad is our adaptation.

Source: https://eaassets-a.akamaihd.net/eahelp/manuals/fifa-14-manuals_Sony%20Playstation%20Vita_US.pdf

## Observed footage

Public recording: **Fifa 14 vita clips: The Ultimate Penalty Shootout!**
https://www.youtube.com/watch?v=WW2CxYhux5I

Inspected the bounded 0–60-second excerpt and a 12-frame contact sheet. The recording shows a physical screen; controller inputs, emulator settings, native frame rate and precise game revision cannot be verified from it.

| Approximate source time | Direct observation |
| --- | --- |
| 0 s | Taker and ball in foreground; full goal and keeper in frame; score at upper left and compact strips at lower corners. |
| 5 s | Taker in follow-through; keeper extended horizontally near goal. |
| 10 s | Next taker set behind the spot; camera remains behind the attacking player. |
| 15 s | Short approach toward the ball, with the whole goal retained in view. |
| 20 s | Post-kick reaction and transition/reset. |
| 30 s | Preparation stance before another kick. |
| 35 s | Approach/contact sequence around the spot. |
| 40 s | Keeper extends laterally while the taker finishes the motion. |
| 50 s | Follow-through and keeper recovery/reset. |

These samples establish pose/camera relationships, not exact contact-frame timing. The first implementation's one-second run-up, 100 ms aim lock, 1.5-second composure cycle and 0.9-second charge are original tuning values. The defensive camera behind the keeper, visible accuracy ring, replay angle, bounded ball dispersion and AI reaction delays are also original design decisions.

Research recording, downloaded manual and contact sheets remain in the local Designer work folder and are excluded from runtime assets. No FIFA logo, model, animation, sound or texture is copied into the game.
