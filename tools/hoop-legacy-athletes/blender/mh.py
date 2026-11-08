"""MakeHuman CC0 asset readers and the macro-target blend, in plain Python + numpy (no MakeHuman code).

MakeHuman data is in decimetres, Y up, facing +Z, the figure's left at +X (the same axes as three.js).
"""
import json
import os

import numpy as np


class Obj:
    """A Wavefront OBJ: positions, UVs and polygon faces with per-corner UV indices and group names."""

    def __init__(self, path):
        V, VT, F, FT, G = [], [], [], [], []
        grp = None
        with open(path) as f:
            for line in f:
                if line.startswith("v "):
                    V.append([float(x) for x in line.split()[1:4]])
                elif line.startswith("vt "):
                    VT.append([float(x) for x in line.split()[1:3]])
                elif line.startswith("g "):
                    grp = line.split()[1]
                elif line.startswith("f "):
                    vs, ts = [], []
                    for tok in line.split()[1:]:
                        p = tok.split("/")
                        vs.append(int(p[0]) - 1)
                        ts.append(int(p[1]) - 1 if len(p) > 1 and p[1] else -1)
                    F.append(vs)
                    FT.append(ts)
                    G.append(grp)
        self.v = np.array(V, dtype=np.float64)
        self.vt = np.array(VT, dtype=np.float64) if VT else np.zeros((0, 2))
        self.f = F
        self.ft = FT
        self.g = G

    def faces_in(self, group):
        return [i for i, g in enumerate(self.g) if g == group]


def read_target(path, nverts):
    """Sparse `index dx dy dz` target -> dense (n, 3) delta array."""
    d = np.zeros((nverts, 3))
    with open(path) as f:
        for line in f:
            if not line or line[0] == "#":
                continue
            p = line.split()
            if len(p) == 4:
                d[int(p[0])] = (float(p[1]), float(p[2]), float(p[3]))
    return d


class Targets:
    """Lazy, cached access to targets under <mh>/targets."""

    def __init__(self, mh_dir, nverts):
        self.dir = os.path.join(mh_dir, "targets")
        self.n = nverts
        self.cache = {}

    def get(self, rel):
        if rel not in self.cache:
            self.cache[rel] = read_target(os.path.join(self.dir, rel + ".target"), self.n)
        return self.cache[rel]

    def exists(self, rel):
        return os.path.exists(os.path.join(self.dir, rel + ".target"))


def _tri(x, names):
    """Weights of a 0..1 slider over min/average/max style triples (average at 0.5)."""
    lo, mid, hi = names
    if x < 0.5:
        return {lo: 1 - 2 * x, mid: 2 * x}
    return {mid: 2 - 2 * x, hi: 2 * x - 1}


def macro_weights(muscle, weight, height, proportions=1.0, ethnic=(1 / 3, 1 / 3, 1 / 3)):
    """Target -> weight for a young (25 y) male, the macro blend used by MakeHuman's sliders.

    The base mesh is the neutral average; every macro target is a delta from it, weighted by the product of
    its factor weights (gender x age x muscle x weight [x height | x proportions]).
    """
    out = {}
    mus = _tri(muscle, ("minmuscle", "averagemuscle", "maxmuscle"))
    wei = _tri(weight, ("minweight", "averageweight", "maxweight"))
    hgt = {"minheight": 1 - 2 * height} if height < 0.5 else {"maxheight": 2 * height - 1}
    for race, w in zip(("african", "asian", "caucasian"), ethnic):
        if w > 0:
            out["macrodetails/%s-male-young" % race] = w
    for m, wm in mus.items():
        for ww, wwv in wei.items():
            base = wm * wwv
            if base <= 0:
                continue
            out["macrodetails/universal-male-young-%s-%s" % (m, ww)] = base
            for h, wh in hgt.items():
                if wh > 0:
                    out["macrodetails/height/male-young-%s-%s-%s" % (m, ww, h)] = base * wh
            if proportions > 0.5:
                out["macrodetails/proportions/male-young-%s-%s-idealproportions" % (m, ww)] = base * (2 * proportions - 1)
    return out


def apply_targets(base, targets, weights):
    v = base.copy()
    for rel, w in weights.items():
        if w:
            v += targets.get(rel) * w
    return v


class Skeleton:
    """MakeHuman .mhskel: bones with head/tail joints defined as centroids of base-mesh vertex sets."""

    def __init__(self, path, weights_path=None):
        with open(path) as f:
            d = json.load(f)
        self.bones = d["bones"]
        self.joints = d["joints"]
        self.order = []
        seen = set()

        def visit(n):
            if n in seen:
                return
            p = self.bones[n]["parent"]
            if p:
                visit(p)
            seen.add(n)
            self.order.append(n)

        for n in self.bones:
            visit(n)
        self.weights = None
        if weights_path:
            with open(weights_path) as f:
                self.weights = json.load(f)["weights"]

    def joint_pos(self, verts):
        return {k: verts[v].mean(0) for k, v in self.joints.items()}

    def head_tail(self, verts):
        jp = self.joint_pos(verts)
        return {n: (jp[b["head"]], jp[b["tail"]]) for n, b in self.bones.items()}


class Mhclo:
    """A MakeHuman proxy binding: each proxy vertex = sum(w_i * base[v_i]) + offset * per-axis scale."""

    def __init__(self, path):
        self.dir = os.path.dirname(path)
        self.refs = []
        self.offs = []
        self.scale = {}
        self.obj_file = None
        self.material = None
        self.z_depth = None
        mode = None
        with open(path) as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                p = line.split()
                key = p[0]
                if key == "verts":
                    mode = "verts"
                    continue
                if key in ("delete_verts", "weights"):
                    mode = key
                    continue
                if mode == "verts" and len(p) >= 9 and _isnum(p[0]):
                    v = [int(p[0]), int(p[1]), int(p[2])]
                    w = [float(p[3]), float(p[4]), float(p[5])]
                    o = [float(p[6]), float(p[7]), float(p[8])]
                    self.refs.append((v, w))
                    self.offs.append(o)
                    continue
                if mode == "verts" and len(p) == 1 and _isnum(p[0]):
                    self.refs.append(([int(p[0]), int(p[0]), int(p[0])], [1.0, 0.0, 0.0]))
                    self.offs.append([0.0, 0.0, 0.0])
                    continue
                if key == "obj_file":
                    self.obj_file = os.path.join(self.dir, p[1])
                elif key == "material":
                    self.material = os.path.join(self.dir, p[1])
                elif key == "z_depth":
                    self.z_depth = int(p[1])
                elif key in ("x_scale", "y_scale", "z_scale"):
                    self.scale[key[0]] = (int(p[1]), int(p[2]), float(p[3]))
                    mode = None
        self.idx = np.array([r[0] for r in self.refs], dtype=np.int64)
        self.w = np.array([r[1] for r in self.refs])
        self.off = np.array(self.offs)

    def fit(self, base_verts):
        """Proxy vertex positions for a given (morphed) base mesh."""
        p = (base_verts[self.idx] * self.w[:, :, None]).sum(1)
        s = np.ones(3)
        for k, ax in (("x", 0), ("y", 1), ("z", 2)):
            if k in self.scale:
                a, b, ref = self.scale[k]
                s[ax] = abs(base_verts[a][ax] - base_verts[b][ax]) / ref
        return p + self.off * s


def _isnum(s):
    try:
        float(s)
        return True
    except ValueError:
        return False
