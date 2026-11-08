"""Conforms the MakeHuman athlete to the game rig (numpy only).

pass 1 (MakeHuman's 163-bone skeleton and CC0 weights): straightens the elbows, turns the palms to the rig's
hand convention (palm toward the body, thumb forward) and curls the fingers into a relaxed grip.
pass 2 (the 19 rig bones; MakeHuman weights summed per rig bone): snaps shoulders, elbows, wrists, hips,
knees and ankles exactly onto the rig's A-pose joints with per-segment rotation and axial scaling; the torso is
remapped vertically from the hip joints to the shoulders; neck and head keep their shape.

Both passes are linear blend skinning with fixed transforms computed from the base athlete, so every morph
shape (builds, face targets) goes through exactly the same deformation.
"""
import numpy as np

# MakeHuman bone -> rig bone (sides expanded below)
_MAP = {
    "root": "hips", "pelvis": "hips", "spine05": "hips",
    "spine04": "spine", "spine03": "spine",
    "spine02": "chest", "spine01": "chest", "breast": "chest",
    "neck01": "neck", "neck02": "neck",
    "neck03": "head", "head": "head",
    "clavicle": "clavicle", "shoulder01": "clavicle",
    "upperarm01": "upperArm", "upperarm02": "upperArm",
    "lowerarm01": "forearm", "lowerarm02": "forearm",
    "wrist": "hand", "metacarpal": "hand", "finger": "hand",
    "upperleg01": "thigh", "upperleg02": "thigh",
    "lowerleg01": "shin", "lowerleg02": "shin",
    "foot": "foot", "toe": "foot", "tarsal": "foot",
}


def rig_bone_for(mh_bone):
    side = ""
    name = mh_bone
    if mh_bone.endswith(".L"):
        side, name = "L", mh_bone[:-2]
    elif mh_bone.endswith(".R"):
        side, name = "R", mh_bone[:-2]
    stem = name.split("-")[0].rstrip("0123456789") if name.startswith(("finger", "toe", "metacarpal", "tarsal")) else name
    if stem in ("pelvis", "breast") and not side:
        side = ""
    rb = _MAP.get(name) or _MAP.get(stem)
    if rb is None:
        return "head"  # facial, eye, jaw and tongue bones
    if rb in ("clavicle", "upperArm", "forearm", "hand", "thigh", "shin", "foot"):
        return rb + (side or "L")
    return rb


def weight_matrix(skel, nverts, bones):
    """Dense (nverts, len(bones)) weights of the given bone list from the MakeHuman weights file."""
    ix = {b: i for i, b in enumerate(bones)}
    W = np.zeros((nverts, len(bones)))
    for b, items in skel.weights.items():
        if b not in ix:
            continue
        for vi, w in items:
            W[vi, ix[b]] += w
    s = W.sum(1, keepdims=True)
    s[s == 0] = 1
    return W / s


def rig_weights(skel, nverts, rig_names):
    ix = {b: i for i, b in enumerate(rig_names)}
    W = np.zeros((nverts, len(rig_names)))
    for b, items in skel.weights.items():
        j = ix[rig_bone_for(b)]
        for vi, w in items:
            W[vi, j] += w
    s = W.sum(1, keepdims=True)
    s[s == 0] = 1
    return W / s


# ---------------------------------------------------------------- small linear algebra helpers
def unit(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-12 else v


def rot_between(a, b):
    """Minimal rotation matrix taking direction a to direction b."""
    a, b = unit(a), unit(b)
    v = np.cross(a, b)
    c = float(np.dot(a, b))
    if np.linalg.norm(v) < 1e-9:
        if c > 0:
            return np.eye(3)
        p = unit(np.cross(a, [1, 0, 0] if abs(a[0]) < 0.9 else [0, 1, 0]))
        return axis_angle(p, np.pi)
    k = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + k + k @ k * (1 / (1 + c))


def axis_angle(axis, ang):
    k = unit(np.asarray(axis, float))
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + np.sin(ang) * K + (1 - np.cos(ang)) * K @ K


def affine(R, pivot_from, pivot_to, S=None):
    """4x4 taking pivot_from to pivot_to, applying S (3x3) then R about it."""
    M = np.eye(4)
    L = R @ (S if S is not None else np.eye(3))
    M[:3, :3] = L
    M[:3, 3] = pivot_to - L @ pivot_from
    return M


def axial_scale(axis, s):
    a = unit(axis)
    return np.eye(3) + (s - 1) * np.outer(a, a)


def lbs(verts, W, mats):
    """Linear blend skinning of (n,3) verts with (n,b) weights and b 4x4 matrices."""
    out = np.zeros_like(verts)
    h = np.c_[verts, np.ones(len(verts))]
    for j in range(W.shape[1]):
        w = W[:, j]
        nz = w > 0
        if not nz.any():
            continue
        out[nz] += w[nz, None] * (h[nz] @ mats[j].T)[:, :3]
    return out


# ---------------------------------------------------------------- pass 1: hands
def hand_pose_mats(skel, v, side_sign, curl=(0.38, 0.62, 0.36), thumb_curl=(0.12, 0.25, 0.2)):
    """Global 4x4 per MakeHuman bone for one arm's forearm/hand/fingers; other bones identity."""
    s = "L" if side_sign > 0 else "R"
    ht = skel.head_tail(v)
    shoulder = ht["upperarm01." + s][0]
    elbow = ht["lowerarm01." + s][0]
    wrist = ht["wrist." + s][0]
    d_upper = unit(elbow - shoulder)
    d_fore = unit(wrist - elbow)
    # MakeHuman palm frame from the knuckles
    idx = ht["finger2-1." + s][0]
    pinky = ht["finger5-1." + s][0]
    mid = ht["finger3-1." + s][0]
    d_f = unit(mid - wrist)
    across = unit(idx - pinky)  # toward the thumb side
    n_palm = unit(np.cross(d_f, across)) * side_sign
    # targets: forearm continues the upper arm; palm toward the body (-X for the left side), thumb forward
    R_dir = rot_between(d_fore, d_upper)
    n_after = R_dir @ n_palm
    toward_body = np.array([-side_sign, 0.0, 0.0])
    n_target = unit(toward_body - np.dot(toward_body, d_upper) * d_upper)
    n_after = unit(n_after - np.dot(n_after, d_upper) * d_upper)
    twist = np.arctan2(np.dot(np.cross(n_after, n_target), d_upper), np.dot(n_after, n_target))
    mats = {}

    def chain(name, R, pivot_rest, pivot_posed):
        mats[name] = affine(R, pivot_rest, pivot_posed)

    # pronation spread along the forearm so the elbow never candy-wraps
    R1 = axis_angle(d_upper, twist / 3) @ R_dir
    R2 = axis_angle(d_upper, 2 * twist / 3) @ R_dir
    R3 = axis_angle(d_upper, twist) @ R_dir
    la2 = ht["lowerarm02." + s][0]
    chain("lowerarm01." + s, R1, elbow, elbow)
    p_la2 = mats["lowerarm01." + s] @ np.r_[la2, 1]
    chain("lowerarm02." + s, R2, la2, p_la2[:3])
    p_wr = mats["lowerarm02." + s] @ np.r_[wrist, 1]
    chain("wrist." + s, R3, wrist, p_wr[:3])
    W_hand = mats["wrist." + s]
    # fingers: flex toward the palm about an axis across the knuckles
    for b in skel.order:
        if not b.endswith("." + s):
            continue
        if b.startswith("metacarpal"):
            mats[b] = W_hand
        if not b.startswith("finger"):
            continue
        f = int(b[6])
        j = int(b.split("-")[1][0])
        head, tail = ht[b]
        dirf = unit(tail - head)
        axis = unit(np.cross(dirf, n_palm)) if f > 1 else unit(np.cross(dirf, n_palm) + 0.6 * d_f)
        c = (thumb_curl if f == 1 else curl)[j - 1]
        parent = skel.bones[b]["parent"]
        P = mats.get(parent, W_hand)
        Rp = P[:3, :3]
        # accumulate: this joint's flexion in rest space, then the parent's global transform
        Rl = axis_angle(axis, c)
        posed_head = (P @ np.r_[head, 1])[:3]
        mats[b] = affine(Rp @ Rl, head, posed_head)
    return mats


def pass1(skel, v_base, shapes):
    names = skel.order
    mats = {}
    for sgn in (1, -1):
        mats.update(hand_pose_mats(skel, v_base, sgn))
    M = [mats.get(n, np.eye(4)) for n in names]
    W = weight_matrix(skel, len(v_base), names)
    return {k: lbs(s, W, M) for k, s in shapes.items()}


# ---------------------------------------------------------------- pass 2: rig
def pass2(skel, rig, v_base, shapes, nverts_body):
    """Normalizes to unit height and snaps joints onto the rig. Returns (shapes, W19, info)."""
    names = [b["name"] for b in rig["bones"]]
    jp = {b["name"]: np.array(b["bindPos"], float) for b in rig["bones"]}
    body = v_base[:nverts_body]
    sole = body[:, 1].min()
    H = body[:, 1].max() - sole
    norm = lambda p: (np.asarray(p) - np.array([0.0, sole, 0.0])) / H
    shapes = {k: norm(s) for k, s in shapes.items()}
    vb = norm(v_base)
    ht = {k: (norm(a), norm(b)) for k, (a, b) in skel.head_tail(v_base).items()}

    def J(b):
        return ht[b][0]

    mh = {
        "shoulderL": J("upperarm01.L"), "shoulderR": J("upperarm01.R"),
        "elbowL": J("lowerarm01.L"), "elbowR": J("lowerarm01.R"),
        "hipL": J("upperleg01.L"), "hipR": J("upperleg01.R"),
        "kneeL": J("lowerleg01.L"), "kneeR": J("lowerleg01.R"),
        "ankleL": J("foot.L"), "ankleR": J("foot.R"),
    }
    # the wrist after pass 1 lies on the straightened forearm: elbow + |forearm| along the upper arm
    for s in "LR":
        fore = np.linalg.norm(J("wrist." + s) - mh["elbow" + s])
        mh["wrist" + s] = mh["elbow" + s] + unit(mh["elbow" + s] - mh["shoulder" + s]) * fore
    y_hip = 0.5 * (mh["hipL"][1] + mh["hipR"][1])
    y_sh = 0.5 * (mh["shoulderL"][1] + mh["shoulderR"][1])
    rig_hip = jp["thighL"][1]
    rig_sh = jp["upperArmL"][1]
    k = (rig_sh - rig_hip) / (y_sh - y_hip)
    A = np.eye(4)
    A[1, 1] = k
    A[1, 3] = rig_sh - k * y_sh
    T_head = np.eye(4)
    T_head[1, 3] = rig_sh - y_sh
    mats = {"hips": A, "spine": A, "chest": A, "neck": T_head, "head": T_head}

    def seg(bone, a_mh, b_mh, a_rig, b_rig, scale=True):
        d0, d1 = b_mh - a_mh, b_rig - a_rig
        R = rot_between(d0, d1)
        S = axial_scale(d0, np.linalg.norm(d1) / np.linalg.norm(d0)) if scale else None
        mats[bone] = affine(R, a_mh, a_rig, S)
        return R

    for s in "LR":
        sh, el, wr = jp["upperArm" + s], jp["forearm" + s], jp["hand" + s]
        hp, kn, an = jp["thigh" + s], jp["shin" + s], jp["foot" + s]
        C = A.copy()
        C[0, 3] += sh[0] - mh["shoulder" + s][0]
        mats["clavicle" + s] = C
        seg("upperArm" + s, mh["shoulder" + s], mh["elbow" + s], sh, el)
        Rf = seg("forearm" + s, mh["elbow" + s], mh["wrist" + s], el, wr)
        mats["hand" + s] = affine(Rf, mh["wrist" + s], wr)
        seg("thigh" + s, mh["hip" + s], mh["knee" + s], hp, kn)
        Rs = seg("shin" + s, mh["knee" + s], mh["ankle" + s], kn, an)
        mats["foot" + s] = affine(Rs, mh["ankle" + s], an)
    W = rig_weights(skel, len(v_base), names)
    M = [mats[n] for n in names]
    out = {kk: lbs(sv, W, M) for kk, sv in shapes.items()}
    info = {"heightDm": float(H), "torsoScale": float(k), "mhJoints": {kk: vv.tolist() for kk, vv in mh.items()}}
    return out, W, info
