"""Shared helpers for the athlete Blender scripts (Blender 4.2 LTS, run headless).

Conventions (see tools/athletes/README.md):
- Geometry is authored in normalized units (athlete height = 1), A-pose bind, three.js axes
  (Y up, +Z forward, the athlete's left at +X). Blender works Z-up, so `to_bl` maps three -> Blender
  and the glTF exporter (export_yup) maps it back.
- Every skinned asset is bound to an armature built from build/rig.json with the game's bone names.
  The runtime remaps joints by name and discards the glTF scene graph.
"""
import json
import os
import sys

import bpy


def args():
    """Parses `-- --key value --flag` arguments after Blender's own."""
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = {}
    i = 0
    while i < len(argv):
        k = argv[i]
        if k.startswith("--"):
            if i + 1 < len(argv) and not argv[i + 1].startswith("--"):
                out[k[2:]] = argv[i + 1]
                i += 2
                continue
            out[k[2:]] = True
        i += 1
    return out


def to_bl(p):
    """three.js (x, y, z) -> Blender (x, -z, y)."""
    return (p[0], -p[2], p[1])


def from_bl(p):
    """Blender (x, y, z) -> three.js (x, z, -y)."""
    return (p[0], p[2], -p[1])


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def load_rig(path):
    with open(path) as f:
        rig = json.load(f)
    rig["byName"] = {b["name"]: b for b in rig["bones"]}
    return rig


def build_armature(rig, name="rig"):
    """Creates an armature whose bone heads sit at the rig's bind-pose joints (A-pose)."""
    data = bpy.data.armatures.new(name)
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    children = {}
    for b in rig["bones"]:
        if b["parent"]:
            children.setdefault(b["parent"], []).append(b)
    ebs = {}
    for b in rig["bones"]:
        eb = data.edit_bones.new(b["name"])
        head = b["bindPos"]
        kids = children.get(b["name"], [])
        # tail toward the first child that is not co-located; leaf bones extend along their parent's direction
        tail = None
        for c in kids:
            d = [c["bindPos"][k] - head[k] for k in range(3)]
            if sum(x * x for x in d) > 1e-8:
                tail = c["bindPos"]
                break
        if tail is None:
            par = rig["byName"][b["parent"]]["bindPos"] if b["parent"] else [head[0], head[1] - 0.1, head[2]]
            d = [head[k] - par[k] for k in range(3)]
            n = max(1e-6, sum(x * x for x in d) ** 0.5)
            tail = [head[k] + d[k] / n * 0.05 for k in range(3)]
        eb.head = to_bl(head)
        eb.tail = to_bl(tail)
        eb.roll = 0.0
        eb.use_deform = True
        ebs[b["name"]] = eb
    for b in rig["bones"]:
        if b["parent"]:
            ebs[b["name"]].parent = ebs[b["parent"]]
            ebs[b["name"]].use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    return obj


def make_mesh(name, verts_three, faces, uvs=None):
    """Creates a mesh object from three.js-space vertices. `uvs` is per-vertex (u, v), glTF convention (v down)."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([to_bl(v) for v in verts_three], [], faces)
    me.validate()
    if uvs is not None:
        layer = me.uv_layers.new(name="UVMap")
        for poly in me.polygons:
            for li in poly.loop_indices:
                u, v = uvs[me.loops[li].vertex_index]
                # Blender UVs have v up; the glTF exporter flips v back
                layer.data[li].uv = (u, 1.0 - v)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def skin_to(obj, arm, weights):
    """`weights[vi] = [(boneName, w), ...]`. Normalizes and keeps the 4 largest influences."""
    groups = {}
    for vi, infl in enumerate(weights):
        infl = sorted(infl, key=lambda t: -t[1])[:4]
        s = sum(w for _, w in infl) or 1.0
        for bone, w in infl:
            if w <= 0:
                continue
            groups.setdefault(bone, []).append((vi, w / s))
    for bone, items in groups.items():
        vg = obj.vertex_groups.get(bone) or obj.vertex_groups.new(name=bone)
        for vi, w in items:
            vg.add([vi], w, "REPLACE")
    obj.parent = arm
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = arm


def add_shape_keys(obj, keys):
    """`keys = {name: [three.js-space delta per vertex]}`; creates Basis plus one key per entry."""
    if not keys:
        return
    if obj.data.shape_keys is None:
        obj.shape_key_add(name="Basis", from_mix=False)
    base = [v.co.copy() for v in obj.data.vertices]
    for name, deltas in keys.items():
        k = obj.shape_key_add(name=name, from_mix=False)
        for i, d in enumerate(deltas):
            db = to_bl(d)
            k.data[i].co = (base[i][0] + db[0], base[i][1] + db[1], base[i][2] + db[2])


def export_glb(path, objects, arm):
    """Exports the given mesh objects plus their armature as a skinned GLB (no materials, no animation)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for o in list(objects) + [arm]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
        export_materials="NONE",
        export_skins=True,
        export_all_influences=False,
        export_def_bones=False,
        export_morph=True,
        export_morph_normal=True,
        export_morph_tangent=False,
        export_animations=False,
        export_extras=False,
    )


def save_png(path, width, height, pixels):
    """Saves a flat RGBA float list (bottom row first, Blender convention) as an 8-bit PNG."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img = bpy.data.images.new(os.path.basename(path), width=width, height=height, alpha=True)
    img.pixels.foreach_set(pixels)
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)


def write_meta(build_dir, name, meta):
    path = os.path.join(build_dir, "meta", name + ".json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(meta, f, indent=2)
        f.write("\n")


def write_raw(path_noext, bones, meshes):
    """Writes skinned meshes as <path>.json + <path>.bin for pack.mjs (tools/athletes/lib/raw.mjs).

    `meshes`: list of dicts with numpy arrays in three.js model space (normalized units):
      name, positions (n,3), normals (n,3), uvs (n,2) [glTF convention, v down], joints (n,4) rig indices,
      weights (n,4), indices (m,), morphs: [(name, dpos (n,3), dnrm (n,3) or None)], optional uv1 (n,2),
      optional colors (n,4) float in 0..1 (COLOR_0), tangents (bool, default True).
    """
    import numpy as np

    os.makedirs(os.path.dirname(path_noext), exist_ok=True)
    blob = bytearray()

    def put(arr, dtype):
        a = np.ascontiguousarray(arr, dtype=dtype)
        while len(blob) % 4:
            blob.append(0)
        off = len(blob)
        blob.extend(a.tobytes())
        return {"offset": off, "count": int(a.shape[0]), "size": int(a.shape[1]) if a.ndim > 1 else 1, "dtype": np.dtype(dtype).name}

    out = []
    for m in meshes:
        e = {"name": m["name"], "attributes": {}, "morphs": [], "tangents": m.get("tangents", True)}
        e["attributes"]["POSITION"] = put(m["positions"], "float32")
        e["attributes"]["NORMAL"] = put(m["normals"], "float32")
        if m.get("tangents4") is not None:
            e["attributes"]["TANGENT"] = put(m["tangents4"], "float32")
            e["tangents"] = False
        if m.get("uvs") is not None:
            e["attributes"]["TEXCOORD_0"] = put(m["uvs"], "float32")
        if m.get("uv1") is not None:
            e["attributes"]["TEXCOORD_1"] = put(m["uv1"], "float32")
        if m.get("colors") is not None:
            e["attributes"]["COLOR_0"] = put(m["colors"], "float32")
        e["attributes"]["JOINTS_0"] = put(m["joints"], "uint16")
        e["attributes"]["WEIGHTS_0"] = put(m["weights"], "float32")
        e["indices"] = put(np.asarray(m["indices"]).reshape(-1), "uint32")
        for name, dpos, dnrm in m.get("morphs", []):
            mm = {"name": name, "POSITION": put(dpos, "float32")}
            if dnrm is not None:
                mm["NORMAL"] = put(dnrm, "float32")
            e["morphs"].append(mm)
        out.append(e)
    with open(path_noext + ".bin", "wb") as f:
        f.write(bytes(blob))
    with open(path_noext + ".json", "w") as f:
        json.dump({"bones": bones, "bin": os.path.basename(path_noext) + ".bin", "meshes": out}, f, indent=1)
        f.write("\n")
