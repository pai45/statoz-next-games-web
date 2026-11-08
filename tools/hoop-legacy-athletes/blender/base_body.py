"""Stage 'body': the authored athlete body and head, built from MakeHuman CC0 assets.

- Shapes in MakeHuman space: the base athlete (young male, athletic), three build keys and ~30 face targets.
- conform.py: every shape conformed to the rig with the same fixed deformation.
- Feet below the shoe collar are removed (always inside shoes). The mesh splits at the neck base into `head`
  (head + neck, with face morphs) and `body`; seam vertices share positions and normals for every morph.
- UVs: MakeHuman's islands re-packed per region (head and body get their own texture spaces).
- Levels: lod0 and lod1 use the base topology, hero is one Catmull-Clark level (subdiv.py), with morphs, UVs
  and weights subdivided by the same linear operator.
- Writes raw meshes (common.write_raw), meta, region masks for skin_bake.py, fitted shapes for eyes_cards.py,
  and placeholder uniform shells (replaced by uniform.py in phase 2).
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import numpy as np  # noqa: E402

import common  # noqa: E402
import conform  # noqa: E402
import mh  # noqa: E402
import raster  # noqa: E402
import subdiv  # noqa: E402

BASE = dict(muscle=1.0, weight=0.5, height=0.72, proportions=0.75)
# regional muscle on top of the macro blend: deltoids, arms, pecs, lats, V-taper, calves, neck
ATHLETIC = {
    "armslegs/l-upperarm-muscle-incr": 0.75, "armslegs/r-upperarm-muscle-incr": 0.75,
    "armslegs/l-upperarm-shoulder-muscle-incr": 0.75, "armslegs/r-upperarm-shoulder-muscle-incr": 0.75,
    "armslegs/l-upperarm-scale-horiz-incr": 0.25, "armslegs/r-upperarm-scale-horiz-incr": 0.25,
    "armslegs/l-upperarm-scale-depth-incr": 0.3, "armslegs/r-upperarm-scale-depth-incr": 0.3,
    "armslegs/l-lowerarm-muscle-incr": 0.65, "armslegs/r-lowerarm-muscle-incr": 0.65,
    "armslegs/l-lowerarm-scale-depth-incr": 0.2, "armslegs/r-lowerarm-scale-depth-incr": 0.2,
    "armslegs/l-upperleg-muscle-incr": 0.45, "armslegs/r-upperleg-muscle-incr": 0.45,
    "armslegs/l-lowerleg-muscle-incr": 0.6, "armslegs/r-lowerleg-muscle-incr": 0.6,
    "torso/torso-muscle-pectoral-incr": 0.5, "torso/torso-muscle-dorsi-incr": 0.5, "torso/torso-vshape-incr": 0.45,
    "neck/neck-scale-horiz-incr": 0.25, "stomach/stomach-pregnant-decr": 0.3,
}
# build keys: (macro sliders, scale of the regional muscle set); deltas from the base drive `bulk` at runtime
BUILDS = {
    "build_lean": (dict(muscle=0.72, weight=0.28, height=0.72, proportions=0.75), 0.55),
    "build_heavy": (dict(muscle=0.9, weight=0.85, height=0.72, proportions=0.75), 0.85),
    "build_muscular": (dict(muscle=1.0, weight=0.6, height=0.72, proportions=0.75), 1.5),
}
LR = lambda t: [("l-" + t, 1.0), ("r-" + t, 1.0)]  # noqa: E731
FACE = [
    ("face_head_wide", [("head/head-scale-horiz-incr", 1.0)]),
    ("face_head_narrow", [("head/head-scale-horiz-decr", 1.0)]),
    ("face_head_long", [("head/head-scale-vert-incr", 1.0)]),
    ("face_head_short", [("head/head-scale-vert-decr", 1.0)]),
    ("face_jaw_wide", [("chin/chin-bones-incr", 1.0)]),
    ("face_jaw_narrow", [("chin/chin-bones-decr", 1.0)]),
    ("face_chin_wide", [("chin/chin-width-incr", 1.0)]),
    ("face_chin_forward", [("chin/chin-prominent-incr", 1.0)]),
    ("face_chin_back", [("chin/chin-prominent-decr", 1.0)]),
    ("face_chin_long", [("chin/chin-height-incr", 1.0)]),
    ("face_cheekbones", [("cheek/" + t, w) for t, w in LR("cheek-bones-incr")]),
    ("face_cheeks_full", [("cheek/" + t, w) for t, w in LR("cheek-volume-incr")]),
    ("face_cheeks_hollow", [("cheek/" + t, w) for t, w in LR("cheek-volume-decr")]),
    ("face_nose_wide", [("nose/nose-scale-horiz-incr", 1.0)]),
    ("face_nose_narrow", [("nose/nose-scale-horiz-decr", 1.0)]),
    ("face_nose_long", [("nose/nose-scale-vert-incr", 1.0)]),
    ("face_nose_hump", [("nose/nose-hump-incr", 1.0)]),
    ("face_nose_flare", [("nose/nose-flaring-incr", 1.0)]),
    ("face_nose_tip_up", [("nose/nose-point-up", 1.0)]),
    ("face_mouth_wide", [("mouth/mouth-scale-horiz-incr", 1.0)]),
    ("face_lips_full", [("mouth/mouth-upperlip-volume-incr", 1.0), ("mouth/mouth-lowerlip-volume-incr", 1.0)]),
    ("face_lips_thin", [("mouth/mouth-upperlip-volume-decr", 1.0), ("mouth/mouth-lowerlip-volume-decr", 1.0)]),
    ("face_eyes_big", [("eyes/" + t, w) for t, w in LR("eye-scale-incr")]),
    ("face_eyes_narrow", [("eyes/" + t, w) for t, w in LR("eye-height2-decr")]),
    ("face_eyes_tilt", [("eyes/" + t, w) for t, w in LR("eye-corner1-up")]),
    ("face_eyes_set_wide", [("eyes/" + t, w) for t, w in LR("eye-trans-out")]),
    ("face_brow_low", [("eyebrows/eyebrows-trans-down", 1.0)]),
    ("face_brow_ridge", [("forehead/forehead-nubian-incr", 1.0)]),
    ("face_ears_big", [("ears/" + t, w) for t, w in LR("ear-scale-incr")]),
    ("face_ears_out", [("ears/" + t, w) for t, w in LR("ear-wing-incr")]),
]
# cranium-shape targets are capped so a full weight changes the head by at most 4%
CRANIUM = {"face_head_wide": 0, "face_head_narrow": 0, "face_head_long": 1, "face_head_short": 1}
FOOT_CUT_Y = 0.05


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def vertex_normals(V, tris):
    fn = np.cross(V[tris[:, 1]] - V[tris[:, 0]], V[tris[:, 2]] - V[tris[:, 0]])
    N = np.zeros_like(V)
    for k in range(3):
        np.add.at(N, tris[:, k], fn)
    return N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-20)


def quads_to_tris(Q):
    return np.concatenate([Q[:, [0, 1, 2]], Q[:, [0, 2, 3]]])


def top4(W):
    idx = np.argsort(-W, axis=1)[:, :4]
    w = np.take_along_axis(W, idx, 1)
    w = w / np.maximum(w.sum(1, keepdims=True), 1e-12)
    return idx.astype(np.uint16), w.astype(np.float32)


def components(face_ids, quads):
    """Connected components (sharing an edge) of a face subset. Returns list of face-id arrays."""
    parent = {f: f for f in face_ids}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    edge_owner = {}
    for f in face_ids:
        q = quads[f]
        for k in range(4):
            a, b = int(q[k]), int(q[(k + 1) % 4])
            key = (a, b) if a < b else (b, a)
            o = edge_owner.get(key)
            if o is None:
                edge_owner[key] = f
            else:
                ra, rb = find(o), find(f)
                if ra != rb:
                    parent[ra] = rb
    groups = {}
    for f in face_ids:
        groups.setdefault(find(f), []).append(f)
    return [np.array(g) for g in groups.values()]


def pack_uvs(V, quads, corner_uv, margin):
    """Re-packs UV islands into [0,1] with Blender (no rotation). corner_uv: (nf,4,2) OBJ convention."""
    me = bpy.data.meshes.new("uvpack")
    me.from_pydata(V.tolist(), [], quads.tolist())
    uvl = me.uv_layers.new(name="UVMap")
    flat = corner_uv.reshape(-1, 2)
    uvl.data.foreach_set("uv", flat.ravel())
    ob = bpy.data.objects.new("uvpack", me)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.context.scene.tool_settings.use_uv_select_sync = True
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.pack_islands(rotate=False, margin=margin)
    bpy.ops.object.mode_set(mode="OBJECT")
    out = np.zeros(len(flat) * 2)
    me.uv_layers["UVMap"].data.foreach_get("uv", out)
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
    return out.reshape(-1, 4, 2)


def split_region(face_ids, quads, corner_uv):
    """Unique (vertex, uv) pairs for a face subset -> (vmap, uv (glTF v-down), local quads)."""
    keys = {}
    vmap, uvs = [], []
    local = np.zeros((len(face_ids), 4), np.int64)
    for i, f in enumerate(face_ids):
        for k in range(4):
            v = int(quads[f, k])
            u = corner_uv[f, k]
            key = (v, int(round(u[0] * 1e6)), int(round(u[1] * 1e6)))
            j = keys.get(key)
            if j is None:
                j = len(vmap)
                keys[key] = j
                vmap.append(v)
                uvs.append((u[0], 1.0 - u[1]))
            local[i, k] = j
    return np.array(vmap), np.array(uvs), local


def main():
    a = common.args()
    build, cache = a["build"], a["cache"]
    t0 = time.time()
    MH = os.path.join(cache, "makehuman")
    rig = common.load_rig(a["rig"])
    names = [b["name"] for b in rig["bones"]]
    o = mh.Obj(os.path.join(MH, "3dobjs", "base.obj"))
    T = mh.Targets(MH, len(o.v))
    sk = mh.Skeleton(os.path.join(MH, "rigs", "default.mhskel"), os.path.join(MH, "rigs", "default_weights.mhw"))

    # ---------------------------------------------------------------- shapes in MakeHuman space
    def athlete(params, mscale):
        w = mh.macro_weights(**params)
        for k, v in ATHLETIC.items():
            w[k] = w.get(k, 0) + v * mscale
        return mh.apply_targets(o.v, T, w)

    base = athlete(BASE, 1.0)
    shapes = {"base": base}
    for name, (params, ms) in BUILDS.items():
        shapes[name] = athlete(params, ms)
    W_mh_head = conform.rig_weights(sk, len(o.v), names)[:, names.index("head")]
    head_pts = base[W_mh_head > 0.9]
    head_extent = head_pts.max(0) - head_pts.min(0)
    for name, parts in FACE:
        d = np.zeros_like(base)
        for rel, w in parts:
            d += T.get(rel) * w
        if name in CRANIUM:
            ax = (0, 1)[CRANIUM[name]]
            m = np.abs(d[:, ax]).max()
            d *= min(1.0, 0.04 * 0.5 * head_extent[ax] / max(m, 1e-9))
        shapes[name] = base + d
    print("[body] shapes", len(shapes), "in %.1fs" % (time.time() - t0))

    # ---------------------------------------------------------------- conform
    nbody = max(i for fi in o.faces_in("body") for i in o.f[fi]) + 1
    shapes = conform.pass1(sk, base, shapes)
    shapes, W19, info = conform.pass2(sk, rig, shapes["base"], shapes, nbody)
    print("[body] conformed: MakeHuman height %.3f m, torso scale %.3f" % (info["heightDm"] / 10, info["torsoScale"]))
    V0 = shapes["base"]
    w_head = W19[:, names.index("head")]
    head_pivot = np.array(rig["byName"]["head"]["bindPos"])
    face_taper = smoothstep(0.25, 0.75, w_head)
    for name, _ in FACE:
        shapes[name] = V0 + (shapes[name] - V0) * face_taper[:, None]
    # per-player head proportion (taller players get relatively smaller heads), fading out down the neck
    shapes["head_scale"] = V0 + (V0 - head_pivot) * smoothstep(0.3, 0.8, w_head)[:, None]
    shape_names = ["base"] + list(BUILDS) + [n for n, _ in FACE] + ["head_scale"]

    # fitted shapes for the proxies (eyes, brows, lashes, teeth): full vertex set incl. helpers
    os.makedirs(os.path.join(build, "body"), exist_ok=True)
    np.savez_compressed(
        os.path.join(build, "body", "shapes.npz"),
        names=np.array(shape_names),
        V=np.stack([shapes[n] for n in shape_names]).astype(np.float32),
        W19=W19.astype(np.float32),
        headPivot=head_pivot,
    )

    # ---------------------------------------------------------------- topology: cut feet, split head/body
    bf = np.array(o.faces_in("body"))
    Q = np.array([o.f[i] for i in bf], np.int64)
    QT = np.array([o.ft[i] for i in bf], np.int64)
    keep = ~(V0[Q][:, :, 1] < FOOT_CUT_Y).all(1)
    Q, QT = Q[keep], QT[keep]
    used = np.unique(Q)
    compact = -np.ones(len(o.v), np.int64)
    compact[used] = np.arange(len(used))
    Qc = compact[Q]
    corner_mh_uv = o.vt[QT]  # (nf, 4, 2) OBJ convention
    hv = W19[:, names.index("neck")] + w_head
    is_head = hv[Q].mean(1) > 0.5
    for _ in range(2):
        for region in (True, False):
            comps = components(np.where(is_head == region)[0], Qc)
            big = max(len(c) for c in comps)
            for c in comps:
                if len(c) < max(60, 0.05 * big):
                    is_head[c] = not region
    print("[body] faces: %d head, %d body (feet cut below y=%.3f)" % (is_head.sum(), (~is_head).sum(), FOOT_CUT_Y))

    # ---------------------------------------------------------------- UVs (packed per region)
    common.reset_scene()
    packed = np.zeros_like(corner_mh_uv)
    for region in (True, False):
        ids = np.where(is_head == region)[0]
        packed[ids] = pack_uvs(V0[used], Qc[ids], corner_mh_uv[ids], 0.004 if region else 0.003)

    # ---------------------------------------------------------------- per-vertex masks for baking (compact domain)
    def mag(rels):
        return sum(np.linalg.norm(T.get(r), axis=1) for r in rels)[used]

    def norm01(x):
        return np.clip(x / max(np.percentile(x[x > 0], 98) if (x > 0).any() else 1, 1e-9), 0, 1)

    VJ = {k: V0[np.array(v)].mean(0) for k, v in sk.joints.items()}

    def near(points, radius):
        P = V0[used]
        m = np.zeros(len(P))
        for p in points:
            m = np.maximum(m, 1 - smoothstep(0, radius, np.linalg.norm(P - p, axis=1)))
        return m

    knuckles = [VJ[sk.bones["finger%d-1.%s" % (f, s)]["head"]] for f in range(2, 6) for s in "LR"]
    knuckles += [VJ[sk.bones["finger%d-2.%s" % (f, s)]["head"]] for f in range(2, 6) for s in "LR"]
    elbows = [np.array(rig["byName"]["forearm" + s]["bindPos"]) for s in "LR"]
    knees = [np.array(rig["byName"]["shin" + s]["bindPos"]) for s in "LR"]
    masks = {
        "lips": norm01(mag(["mouth/mouth-upperlip-volume-incr", "mouth/mouth-lowerlip-volume-incr"])),
        "undereye": norm01(mag(["eyes/l-eye-bag-incr", "eyes/r-eye-bag-incr"])),
        "flush": norm01(mag(["cheek/l-cheek-volume-incr", "cheek/r-cheek-volume-incr", "nose/nose-volume-incr", "ears/l-ear-scale-incr", "ears/r-ear-scale-incr"])),
        "nose": norm01(mag(["nose/nose-volume-incr"])),
        "dark": np.maximum(near(knuckles, 0.012), np.maximum(near(elbows, 0.035) * 0.8, near(knees, 0.04) * 0.6)),
        "head": w_head[used],
    }

    # ---------------------------------------------------------------- levels
    W_c = W19[used]
    S_c = {n: shapes[n][used] for n in shape_names}
    bones = names

    def emit(level, quads, corner_uv, corner_mhuv, region_flags, P, Wv, vmasks):
        """P: shape -> (n,3) positions on this level's vertex domain."""
        tris_all = quads_to_tris(quads)
        N = {n: vertex_normals(P[n], tris_all) for n in shape_names}
        out_meta = {}
        for region, label in ((False, "body"), (True, "head")):
            ids = np.where(region_flags == region)[0]
            vmap, uv, lq = split_region(ids, quads, corner_uv)
            # MakeHuman UV per split vertex (same split keys) for texture transfer in skin_bake
            mhuv = np.zeros((len(vmap), 2))
            for i, f in enumerate(ids):
                for k in range(4):
                    mhuv[lq[i, k]] = (corner_mhuv[f, k][0], 1 - corner_mhuv[f, k][1])
            tris = quads_to_tris(lq)
            j, w = top4(Wv[vmap])
            tan = raster.tangents(P["base"][vmap], N["base"][vmap], uv, tris)
            morphs = []
            for n in shape_names[1:]:
                dp = P[n][vmap] - P["base"][vmap]
                if np.abs(dp).max() < 1e-6:
                    continue
                morphs.append((n, dp.astype(np.float32), (N[n][vmap] - N["base"][vmap]).astype(np.float32)))
            common.write_raw(
                os.path.join(build, "raw", level, label),
                bones,
                [{"name": label, "positions": P["base"][vmap], "normals": N["base"][vmap], "tangents4": tan, "uvs": uv, "joints": j, "weights": w, "indices": tris, "morphs": morphs}],
            )
            np.savez_compressed(
                os.path.join(build, "body", "%s_%s.npz" % (level, label)),
                positions=P["base"][vmap], normals=N["base"][vmap], tangents=tan, uv=uv, uvmh=mhuv, tris=tris,
                **{"m_" + k: v[vmap] for k, v in vmasks.items()},
            )
            out_meta[label] = {"vertices": len(vmap), "triangles": len(tris), "morphs": [m[0] for m in morphs]}
        return out_meta

    stats = {}
    stats["lod0"] = emit("lod0", Qc, packed, corner_mh_uv, is_head, S_c, W_c, masks)
    # hero: one Catmull-Clark level over the whole (unsplit) mesh, so the seam stays shared
    S, Qh, par, cor = subdiv.catmull_clark(Qc, len(used))
    Ph = {n: S.apply(S_c[n]) for n in shape_names}
    Wh = S.apply(W_c)
    mh_h = {k: S.apply(v) for k, v in masks.items()}
    stats["hero"] = emit("hero", Qh, subdiv.subdivide_corners(packed, par, cor), subdiv.subdivide_corners(corner_mh_uv, par, cor), is_head[par], Ph, Wh, mh_h)
    print("[body] levels", json.dumps(stats))

    # ---------------------------------------------------------------- placeholder uniform shells (phase 1 only)
    tris0 = quads_to_tris(Qc)
    N0 = {n: vertex_normals(S_c[n], tris0) for n in ["base"] + list(BUILDS)}
    Pv = S_c["base"]
    wn = lambda b: W_c[:, names.index(b)]  # noqa: E731
    arm = wn("upperArmL") + wn("upperArmR") + wn("forearmL") + wn("forearmR") + wn("handL") + wn("handR")
    leg = wn("thighL") + wn("thighR")
    neckhead = wn("neck") + wn("head")
    x, y, z = Pv[:, 0], Pv[:, 1], Pv[:, 2]
    vneck = (z > 0) & (y > 0.79 - 1.6 * np.abs(x))
    armhole = (np.abs(x) > 0.105) & (y > 0.66)
    jersey_v = (y > 0.47) & (arm < 0.25) & (neckhead < 0.35) & ~vneck & ~armhole & (leg < 0.5)
    shorts_v = (y > 0.31) & (y < 0.585) & (arm < 0.2)
    for label, vsel, off, slot in (("jersey", jersey_v, 0.007, "jersey"), ("shorts", shorts_v, 0.011, "shorts")):
        fsel = np.where(vsel[Qc].all(1))[0]
        vmap, uv, lq = split_region(fsel, Qc, packed)
        tris = quads_to_tris(lq)
        Pb = Pv[vmap] + N0["base"][vmap] * off
        Nb = vertex_normals(Pb, tris)
        morphs = []
        for n in BUILDS:
            Pk = S_c[n][vmap] + N0[n][vmap] * off
            morphs.append((n, (Pk - Pb).astype(np.float32), (vertex_normals(Pk, tris) - Nb).astype(np.float32)))
        j, w = top4(W_c[vmap])
        for level in ("lod1", "lod0", "hero"):
            common.write_raw(os.path.join(build, "raw", level, label), bones, [{"name": label, "positions": Pb, "normals": Nb, "uvs": uv, "joints": j, "weights": w, "indices": tris, "morphs": morphs, "tangents": False}])
        common.write_meta(build, label, {
            "name": label, "slot": slot, "placeholder": True,
            "license": "CC0-1.0 (toolchain-generated from MakeHuman CC0 assets)",
            "levels": {lv: {"raw": "raw/%s/%s.json" % (lv, label)} for lv in ("lod1", "lod0", "hero")},
        })

    # ---------------------------------------------------------------- meta
    def tex(level, region, res):
        d = "textures/%s/" % ("lod1" if res == 1024 else level)
        return {
            "normal": {"file": d + "skin_%s_normal.png" % region, "codec": "uastc"},
            "orm": {"file": d + "skin_%s_orm.png" % region, "codec": "etc1s"},
            "detail": {"file": d + "skin_%s_detail.png" % region, "codec": "etc1s"},
            "micro": {"file": "textures/shared/skin_micro.png", "codec": "uastc"},
        }

    for label in ("body", "head"):
        common.write_meta(build, label, {
            "name": label, "slot": label,
            "license": "CC0-1.0 (derived from MakeHuman CC0 assets)",
            "sources": ["makehuman:3dobjs/base.obj", "makehuman:targets/*", "makehuman:rigs/default_weights.mhw"],
            "levels": {
                "lod1": {"raw": "raw/lod0/%s.json" % label, "textures": tex("lod1", label, 1024)},
                "lod0": {"raw": "raw/lod0/%s.json" % label, "textures": tex("lod0", label, 2048)},
                "hero": {"raw": "raw/hero/%s.json" % label, "textures": tex("hero", label, 2048)},
            },
            "extras": {"headPivot": head_pivot.tolist(), "footCutY": FOOT_CUT_Y},
        })
    with open(os.path.join(build, "body", "info.json"), "w") as f:
        json.dump({**info, "levels": stats, "params": BASE}, f, indent=1)
    print("[body] done in %.1fs" % (time.time() - t0))


main()
