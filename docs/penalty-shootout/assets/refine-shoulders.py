"""Shoulder deformation pass (v8) for the StatOz athlete.

The jersey was mostly weighted to the chest, so sleeves and their trims stayed
behind when an arm lifted past ~45 degrees (keeper wave, catches, celebrations).
This re-weights only the shirt around each shoulder, plus the chest share of the
upper-arm skin, with a continuous chest -> clavicle -> upper-arm blend across the
garment builder's sleeve seam (~0.2 m from the centreline). Skeleton, clips,
contact markers and every other weight are unchanged.

blender --background --python docs/penalty-shootout/assets/refine-shoulders.py -- \
  --source docs/penalty-shootout/assets/athlete-source-v7.blend --output .cache/penalty-model-v8/export
"""
import bpy, math, json, argparse, sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument("--source", required=True)
p.add_argument("--output", required=True)
a = p.parse_args(sys.argv[sys.argv.index("--") + 1:])
out = Path(a.output).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(Path(a.source).resolve()))
scene = bpy.context.scene
rig = bpy.data.objects["FootballRig"]
assert len(rig.data.bones) == 60


def smooth(v):
    v = max(0.0, min(1.0, v))
    return v * v * (3 - 2 * v)


def seg_param(p, a, b):
    ab = b - a
    return (p - a).dot(ab) / ab.length_squared


rest = {n: (rig.data.bones[n].head_local.copy(), rig.data.bones[n].tail_local.copy()) for n in rig.data.bones.keys()}
changed = 0
for ob in scene.objects:
    if ob.type != "MESH" or not (ob.name.startswith("Jersey") or ob.name.startswith("Body")):
        continue
    skin = ob.name.startswith("Body")
    groups = {g.name: g for g in ob.vertex_groups}
    for name in ("chest", "clavicle_L", "clavicle_R", "upper_arm_L", "upper_arm_R", "upper_arm_twist_L", "upper_arm_twist_R"):
        if name not in groups:
            groups[name] = ob.vertex_groups.new(name=name)
    for v in ob.data.vertices:
        co = v.co
        side = "L" if co.x >= 0 else "R"
        sh, el = rest["upper_arm_" + side]
        t = seg_param(co, sh, el)
        tube = smooth((abs(co.x) - 0.175) / 0.06)  # 0 on the torso, 1 past the sleeve seam
        if tube <= 0 or co.z < 1.1:
            continue
        arm = smooth((t + 0.12) / 0.3)               # 0 at the shoulder cap, 1 down the sleeve
        if skin:
            # Move only the torso share of upper-arm skin; elbow/forearm blends stay as built.
            if t < 0.0 or t > 0.95:
                continue
            torso = {"chest", "spine", "clavicle_" + side}
            share = 0.0
            for g in list(v.groups):
                if ob.vertex_groups[g.group].name in torso:
                    share += g.weight
                    ob.vertex_groups[g.group].remove([v.index])
            if share <= 1e-4:
                continue
            moved = share * tube * arm
            groups["upper_arm_" + side].add([v.index], moved, "ADD")
            if share - moved > 1e-4:
                groups["chest"].add([v.index], share - moved, "ADD")
            changed += 1
            continue
        cap = math.exp(-((t + 0.05) / 0.15) ** 2)
        w_arm = tube * arm
        w_clav = 0.3 * tube * cap * (1 - arm)
        w_chest = max(0.0, 1.0 - w_arm - w_clav)
        w_twist = 0.3 * w_arm * smooth((t - 0.35) / 0.65)
        w_arm -= w_twist
        for g in list(v.groups):
            ob.vertex_groups[g.group].remove([v.index])
        for name, w in (("chest", w_chest), ("clavicle_" + side, w_clav), ("upper_arm_" + side, w_arm), ("upper_arm_twist_" + side, w_twist)):
            if w > 1e-4:
                groups[name].add([v.index], w, "REPLACE")
        changed += 1
print("shoulder re-weight:", changed, "vertices")

scene.frame_set(0)
rig.animation_data.action = bpy.data.actions.get("prepare")
bpy.ops.wm.save_as_mainfile(filepath=str(out / "athlete-source.blend"), compress=True)
for lod in [0, 1]:
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for ob in scene.objects:
        if ob.type == "MESH":
            ob.select_set(ob.get("lod") == lod)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=str(out / ("athlete.glb" if lod == 0 else "athlete-low.glb")), export_format="GLB",
                              use_selection=True, export_animations=True, export_animation_mode="ACTIONS",
                              export_nla_strips=True, export_force_sampling=True, export_frame_range=False,
                              export_anim_slide_to_zero=True, export_materials="EXPORT", export_vertex_color="ACTIVE",
                              export_active_vertex_color_when_no_material=True)
(out / "model-refinement.json").write_text(json.dumps({
    "version": "character-shoulders-8",
    "originalFeatures": ["continuous chest-clavicle-upper-arm sleeve weights", "upper-arm skin follows raised arms",
                         "construction v7 torso, gloves, hands and faces retained"],
    "preserved": ["60-bone skeleton", "35 animation clip names", "physical dimensions and contacts", "input and progression contracts"],
    "limits": "Fabric still stretches under a fully raised arm; no cloth simulation",
}, indent=2))
print("SHOULDERS_V8_COMPLETE")
