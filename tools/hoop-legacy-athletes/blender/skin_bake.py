"""Stage 'skin': skin texture bakes for the authored body and head (per region, in their packed UV spaces).

- normal (tangent space, the exact frames shipped with the meshes):
    hero = pores/wrinkles/creases from a height field; lod0 = hero surface normals + the same detail,
    transferred onto the coarser base mesh; lod1 = lod0 at half resolution.
  Height: high-frequency luminance of MakeHuman's three CC0 young-male skin textures (pores, creases, veins),
  plus fine procedural grain.
- detail (tone-neutral): R luminance multiplier / 2, G redness/flush, B melanin/darkening, A lips.
- orm: R occlusion (Cycles AO, head and body together), G roughness, B oil/sheen mask.
- shared/skin_micro: a 512 px tiling pore normal used at high UV repeat in the shader.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import numpy as np  # noqa: E402

import common  # noqa: E402
import raster  # noqa: E402

SIZE = 2048
SKINS = ["young_african_male/young_darkskinned_male_diffuse.png", "young_asian_male/young_lightskinned_male_diffuse3.png", "young_caucasian_male/young_lightskinned_male_diffuse.png"]
# height amplitude in normalized units (athlete height = 1): ~0.25 mm on a 2 m player
HEIGHT_AMP = {"body": 0.00011, "head": 0.00008}


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def value_noise(size, cells, seed):
    """Tiling smooth value noise in [0, 1]."""
    rng = np.random.default_rng(seed)
    g = rng.random((cells, cells)).astype(np.float32)
    x = np.arange(size) * cells / size
    i0 = np.floor(x).astype(int)
    f = x - i0
    f = f * f * (3 - 2 * f)
    i1 = (i0 + 1) % cells
    a = g[i0][:, i0] * (1 - f)[None, :] + g[i0][:, i1] * f[None, :]
    b = g[i1][:, i0] * (1 - f)[None, :] + g[i1][:, i1] * f[None, :]
    return a * (1 - f)[:, None] + b * f[:, None]


def frame_images(r, cov):
    N = r["N"] / (np.linalg.norm(r["N"], axis=2, keepdims=True) + 1e-12)
    T = r["T"] - N * (r["T"] * N).sum(2, keepdims=True)
    T /= np.linalg.norm(T, axis=2, keepdims=True) + 1e-12
    w = np.where(r["w"][..., 0] < 0, -1.0, 1.0)[..., None]
    B = np.cross(N, T) * w
    return N, T, B


def encode_ts(n, N, T, B):
    ts = np.stack([(n * T).sum(2), (n * B).sum(2), (n * N).sum(2)], 2)
    ts /= np.linalg.norm(ts, axis=2, keepdims=True) + 1e-12
    return ts * 0.5 + 0.5


def bake_ao(build, regions, size):
    """Cycles ambient occlusion for each region, with every region present as an occluder."""
    common.reset_scene()
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = 48
    scn.render.bake.margin = 6
    world = bpy.data.worlds.new("w")
    world.light_settings.distance = 0.035
    scn.world = world
    objs = {}
    for label, d in regions.items():
        uv_bl = np.c_[d["uv"][:, 0], 1 - d["uv"][:, 1]]
        me = bpy.data.meshes.new(label)
        me.from_pydata([common.to_bl(p) for p in d["positions"].tolist()], [], d["tris"].tolist())
        uvl = me.uv_layers.new(name="UVMap")
        loops_v = np.zeros(len(me.loops), np.int64)
        me.loops.foreach_get("vertex_index", loops_v)
        uvl.data.foreach_set("uv", uv_bl[loops_v].ravel())
        for p in me.polygons:
            p.use_smooth = True
        ob = bpy.data.objects.new(label, me)
        scn.collection.objects.link(ob)
        img = bpy.data.images.new("ao_" + label, size, size, alpha=False, float_buffer=True)
        img.colorspace_settings.name = "Non-Color"
        mat = bpy.data.materials.new("m_" + label)
        mat.use_nodes = True
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = img
        mat.node_tree.nodes.active = node
        me.materials.append(mat)
        objs[label] = (ob, img)
    out = {}
    for label, (ob, img) in objs.items():
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        t0 = time.time()
        bpy.ops.object.bake(type="AO", margin=6, use_clear=True)
        px = np.empty(size * size * 4, np.float32)
        img.pixels.foreach_get(px)
        out[label] = np.flipud(px.reshape(size, size, 4))[..., 0].copy()
        print("[skin] AO %s %.1fs" % (label, time.time() - t0))
    return out


def micro_tile(size=512):
    """Tiling pore normal: sparse Worley pits on fine grain (tangent space)."""
    rng = np.random.default_rng(7)
    h = (value_noise(size, 64, 1) - 0.5) * 0.35 + (value_noise(size, 128, 2) - 0.5) * 0.25
    n = 2600
    pts = rng.random((n, 2)) * size
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    pit = np.zeros((size, size), np.float32)
    for (px, py), r in zip(pts, rng.uniform(1.2, 2.6, n)):
        dx = (xx - px + size / 2) % size - size / 2
        dy = (yy - py + size / 2) % size - size / 2
        m = (np.abs(dx) < 4) & (np.abs(dy) < 4)
        if m.any():
            pit[m] = np.minimum(pit[m], -np.exp(-(dx[m] ** 2 + dy[m] ** 2) / (r * r)))
    h = h * 0.5 + pit
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    s = 1.6
    nrm = np.stack([-gx * s, -gy * s, np.ones_like(h)], 2)
    nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
    return nrm * 0.5 + 0.5


def main():
    a = common.args()
    build, cache = a["build"], a["cache"]
    t0 = time.time()
    tex_dir = os.path.join(build, "textures")
    # MakeHuman skin textures: luminance, local contrast ratio, high-pass height, redness
    lums, reds = [], []
    for rel in SKINS:
        im = raster.load_image(os.path.join(cache, "mhsys", "skins", rel))[..., :3]
        L = im @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        lums.append(L)
        reds.append(im[..., 0] - 0.5 * (im[..., 1] + im[..., 2]))
    ratio = np.mean([L / (raster.blur(L, 28) + 1e-3) for L in lums], 0)
    hp = np.mean([(L - raster.blur(L, 3)) / (raster.blur(L, 28) + 1e-3) for L in lums], 0)
    red = reds[2] - raster.blur(reds[2], 40)
    mh_maps = np.stack([ratio, hp, red], 2).astype(np.float32)
    print("[skin] source maps %.1fs" % (time.time() - t0))

    lod0 = {r: dict(np.load(os.path.join(build, "body", "lod0_%s.npz" % r))) for r in ("body", "head")}
    hero = {r: dict(np.load(os.path.join(build, "body", "hero_%s.npz" % r))) for r in ("body", "head")}
    ao = bake_ao(build, lod0, 1024)
    grain = (value_noise(SIZE, 512, 11) - 0.5) * 0.6 + (value_noise(SIZE, 256, 12) - 0.5) * 0.4

    for region in ("body", "head"):
        h = hero[region]
        masks = {k[2:]: h[k][:, None] for k in h if k.startswith("m_")}
        rh, cov = raster.rasterize(h["uv"], h["tris"], {"N": h["normals"], "T": h["tangents"][:, :3], "w": h["tangents"][:, 3:4], "P": h["positions"], "uvmh": h["uvmh"], **masks}, SIZE)
        r0, cov0 = raster.rasterize(lod0[region]["uv"], lod0[region]["tris"], {"N": lod0[region]["normals"], "T": lod0[region]["tangents"][:, :3], "w": lod0[region]["tangents"][:, 3:4]}, SIZE)
        for k in rh:
            rh[k], _ = raster.dilate(rh[k], cov, 12)
        for k in r0:
            r0[k], _ = raster.dilate(r0[k], cov0, 12)
        src = raster.sample(mh_maps, rh["uvmh"])
        ratio_px, hp_px, red_px = src[..., 0], src[..., 1], src[..., 2]
        # ---- height -> perturbed world normal on the hero surface
        H = np.clip(hp_px, -0.4, 0.4) * 1.6 + grain * 0.35
        Pu = np.gradient(rh["P"], axis=1) * SIZE
        Pv = np.gradient(rh["P"], axis=0) * SIZE
        Hu = np.gradient(H, axis=1) * SIZE
        Hv = np.gradient(H, axis=0) * SIZE
        a11 = (Pu * Pu).sum(2)
        a12 = (Pu * Pv).sum(2)
        a22 = (Pv * Pv).sum(2)
        det = a11 * a22 - a12 * a12
        det = np.where(np.abs(det) < 1e-18, np.inf, det)
        cu = (a22 * Hu - a12 * Hv) / det
        cv = (a11 * Hv - a12 * Hu) / det
        g = Pu * cu[..., None] + Pv * cv[..., None]
        N, T, B = frame_images(rh, cov)
        g -= N * (g * N).sum(2, keepdims=True)
        n_det = N - g * HEIGHT_AMP[region]
        n_det /= np.linalg.norm(n_det, axis=2, keepdims=True) + 1e-12
        nrm_hero = encode_ts(n_det, N, T, B)
        N0, T0, B0 = frame_images(r0, cov0)
        nrm_lod0 = encode_ts(n_det, N0, T0, B0)
        # ---- detail (tone-neutral)
        m = {k: rh[k][..., 0] for k in masks}
        lips = smoothstep(0.25, 0.7, m["lips"]) if region == "head" else np.zeros_like(ratio_px)
        flush = np.clip(m["flush"] * 0.7 + np.clip(red_px * 3, 0, 1) * 0.3, 0, 1) if region == "head" else np.clip(red_px * 2.5, 0, 0.5)
        dark = np.clip(m["dark"] + 0.6 * m["undereye"] + np.clip(1 - ratio_px, 0, 0.3), 0, 1)
        mult = np.clip(ratio_px, 0.7, 1.25) * (1 + grain * 0.04)
        detail = np.stack([np.clip(mult * 0.5, 0, 1), flush, dark, lips], 2)
        # ---- orm
        ao_img = np.repeat(np.repeat(ao[region], SIZE // 1024, 0), SIZE // 1024, 1)
        ao_img = 0.25 + 0.75 * np.clip(ao_img, 0, 1)
        rough = 0.56 + 0.12 * np.clip(-hp_px * 2, -0.5, 1) - 0.14 * lips
        oil = np.zeros_like(rough)
        if region == "head":
            tz = smoothstep(0.2, 0.8, m["nose"]) * 0.8
            rough -= 0.12 * tz
            oil = np.clip(tz + 0.35 * m["head"], 0, 1)
        else:
            oil = np.full_like(rough, 0.55)
        rough += 0.1 * m["dark"]
        orm = np.stack([ao_img, np.clip(rough, 0.25, 0.9), oil], 2)
        for level, nrm in (("hero", nrm_hero), ("lod0", nrm_lod0)):
            raster.save_image(os.path.join(tex_dir, level, "skin_%s_normal.png" % region), nrm)
            raster.save_image(os.path.join(tex_dir, level, "skin_%s_orm.png" % region), orm)
            raster.save_image(os.path.join(tex_dir, level, "skin_%s_detail.png" % region), detail)
        raster.save_image(os.path.join(tex_dir, "lod1", "skin_%s_normal.png" % region), raster.downsample(nrm_lod0, 2))
        raster.save_image(os.path.join(tex_dir, "lod1", "skin_%s_orm.png" % region), raster.downsample(orm, 2))
        raster.save_image(os.path.join(tex_dir, "lod1", "skin_%s_detail.png" % region), raster.downsample(detail, 2))
        print("[skin] %s baked %.1fs" % (region, time.time() - t0))
    raster.save_image(os.path.join(tex_dir, "shared", "skin_micro.png"), micro_tile())
    print("[skin] done in %.1fs" % (time.time() - t0))


main()
