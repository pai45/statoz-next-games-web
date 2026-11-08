# Cricketer characters — low-poly remake, 1 November 2026

Per the user's direction, every Cricketer player is now remade from the low-poly Sketchfab model **Virat Kohli Cricket Batting Animation - Low Poly** and its batting animation. The user chose to keep the players **unnamed, in original Cricketer kits**. The players carry no real-person name or likeness, team identity or bat brand. This replaces the earlier pass, which used the numaan.k99 "Indian Cricket Player Rigged" body with retargeted Stick Cricket motion. Both of those runtime files are removed, so no Stick Sports motion ships any more.

## Source

| Item | Facts |
| --- | --- |
| Model | https://sketchfab.com/3d-models/virat-kohli-cricket-batting-animation-low-poly-a21f5e7ee14f4b6aa5cf6c94a1016932 by bhagathartworks, CC-BY-4.0 (commercial use allowed with credit) |
| Download | `virat_kohli_cricket_batting_animation_-_low_poly.zip`, SHA-256 `dbb28d8b412d95d3bc50ba3c13f4b43240acc5ba54c54210571108b3214bbecb`; glTF + bin, two 2048² textures, license.txt |
| Mesh | 4,456 body triangles plus an 83-vertex bat; 49-joint Mixamo skin; bat parented to the right index finger |
| Animation | One 6.917s body clip plus a bat clip (332 keys): relaxed → get set → high backlift → stride → contact (~1.14s) → high follow-through → walk-off → loop |
| Textures | Body: projected photographs of a real player (face, tattoos, sponsor marks). Bat: real bat-maker logos. **Neither ships.** |

The source download stays outside the repository and is unchanged.

## Bake (`scripts/build-cricketer-player.mjs`)

- Reads the body texture only to classify each face (skin, hair, stubble, shirt, collar, sleeve, trousers, shoes, shoe accent), combined with each face's dominant bone group. The torso is simplified to a plain shirt with a collar band, so sponsor marks and shoulder panels from the photo do not survive. A neighbour-majority pass removes speckle.
- Writes a flat, de-indexed body with `_REGION` and `_KITUV` (back-number decal coordinates) attributes, byte joints/weights and no normals or texture coordinates. The bat keeps its UVs for an original runtime livery.
- Merges body and bat clips, drops 70 of 125 channels that never change, renames source nodes (no real-person names remain in node, mesh, material or clip names) and embeds the CC-BY credit in `asset.copyright`.
- Output `cricketer-player.glb` is 706,808 bytes, versus 2.54 MB for the previous body and motion files. The script also refreshes `characters-manifest.json`, and the bundle build verifies it: the manifest must match, the file must contain no images or textures, and it must carry the credit.

## Runtime (`character.ts`, `kits.ts`, `renderer.ts`)

- **Look:** faceted low-poly shading; kit palette per region per player (red/ivory/navy batting side, green/gold fielding side); per-player skin, hair and optional beard; back numbers; simple eyes and brows; batters get a team-colour helmet with grille, five-roll pads with knee roll and straps, and ivory gloves. The bat livery is original (green/red grip, "CRICKETER" sticker).
- **Batting:** the native cycle drives the batter directly. Swing progress 0→0.5 maps the trigger (0.30s) to contact (1.14s), and 0.5→1 maps contact to the finish (1.85s). Delivery height and line move the swing by the ball's offset from the native contact point: a planted-foot crouch, a CCD solve on spine and lead shoulder, and a wrist pivot about the handle, with the top hand re-gripping by two-bone IK. The blade snaps exactly onto the ball only in the last ~0.05 of progress. The follow-through leans toward the struck side.
- **Roles:** bowling (run-up, gather, side-on stride, release just past vertical, follow-through with back leg through), running with a wider arm swing, walking back to the mark, fielding crouch facing the batter, nearest-fielder chase and celebration are authored on the same rig, starting from the cycle's upright frame.
- **Guard and footwork (2 November 2026):** the striker no longer stands on each ball's line (which had left the batter up to 1.7 m outside off stump and revealed the line before release). The guard is fixed; after release a two-step footwork shuffle moves the batter toward the line, and only off-side balls at a comfortable height are reached partly by the swing. Across 60 randomised in-game contacts, blade and top-hand grip error were 0 mm.
- **Back numbers:** the number decal was sampled mirrored; the kit shader now flips it so numbers read correctly from behind.
- **Continuity:** role changes crossfade (0.12s into a swing, 0.26s otherwise). Static field/wait poses are reused once any blend finishes. The clip is sampled by direct keyframe-track evaluation, because AnimationMixer skips writing values that haven't changed, which had left stale corrections in the stance hold.
- **Scene:** contact blob shadows under every player, a tighter sun-shadow frustum over the pitch, and low-poly faceted trees.

## Validation

`npm run test:cricketer:characters` renders line-ups (front/back/action), a face close-up, batting stance views, get-set, all six shots at contact for 0.45 m and 1.10 m, and swing phases. Across 30 contact cases (six shots × 0.22, 0.45, 0.75, 1.10, 1.32 m), blade-to-ball error and top-hand grip error are below 1 mm, bounds are finite, and feet stay within 21 mm of the ground in every role. `npm run test:cricketer:browser` checks the real game: one skinned mesh, 49 bones, blade within 25 mm of the ball at contact, and all lessons and chases complete. These are rig target checks plus visual review, not physical collision measurements. The model provides one stroke clip, so cut/pull/hook/sweep/scoop are shaped variations of that swing rather than separately animated strokes.

The CC-BY credit appears in the menu, `CREDITS.md`, `PLAYER-LICENSE.txt`, the GLB and the bundle `LICENSES.txt`. The model's title names a real athlete; that title is kept only in the attribution the license requires. Physical-phone/WebView acceptance remains pending. No Flutter import is included.
