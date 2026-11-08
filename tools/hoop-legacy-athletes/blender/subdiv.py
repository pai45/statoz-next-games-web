"""Catmull-Clark subdivision of an all-quad mesh as a sparse linear operator (numpy only).

Subdivision is linear in the control points, so one operator S subdivides positions, every morph target's
deltas and skin weights identically. Face-varying data (UVs) is subdivided bilinearly per face.
New vertex order: [vertex points (nv)] + [edge points (ne)] + [face points (nf)].
"""
import numpy as np


class Operator:
    def __init__(self, rows, cols, vals, shape):
        self.rows = np.asarray(rows, np.int64)
        self.cols = np.asarray(cols, np.int64)
        self.vals = np.asarray(vals, np.float64)
        self.shape = shape

    def apply(self, X):
        X = np.asarray(X)
        out = np.zeros((self.shape[0],) + X.shape[1:], dtype=np.float64)
        np.add.at(out, self.rows, X[self.cols] * self.vals.reshape((-1,) + (1,) * (X.ndim - 1)))
        return out


def catmull_clark(quads, nverts):
    """quads: (nf, 4) vertex indices. Returns (Operator, new_quads (4nf, 4), parent_face (4nf,), corner_k (4nf,))."""
    F = np.asarray(quads, np.int64)
    nf = len(F)
    edge_id = {}
    edges = []
    edge_faces = []
    face_edges = np.zeros((nf, 4), np.int64)
    for fi in range(nf):
        for k in range(4):
            a, b = int(F[fi, k]), int(F[fi, (k + 1) % 4])
            key = (a, b) if a < b else (b, a)
            ei = edge_id.get(key)
            if ei is None:
                ei = len(edges)
                edge_id[key] = ei
                edges.append(key)
                edge_faces.append([])
            edge_faces[ei].append(fi)
            face_edges[fi, k] = ei
    ne = len(edges)
    rows, cols, vals = [], [], []

    def add(r, c, w):
        rows.append(r)
        cols.append(c)
        vals.append(w)

    fbase = nverts + ne
    for fi in range(nf):
        for v in F[fi]:
            add(fbase + fi, int(v), 0.25)
    boundary = np.zeros(ne, bool)
    for ei, (a, b) in enumerate(edges):
        fs = edge_faces[ei]
        r = nverts + ei
        if len(fs) == 2:
            add(r, a, 0.25)
            add(r, b, 0.25)
            for f in fs:
                for v in F[f]:
                    add(r, int(v), 0.0625)
        else:
            boundary[ei] = True
            add(r, a, 0.5)
            add(r, b, 0.5)
    v_faces = [[] for _ in range(nverts)]
    v_edges = [[] for _ in range(nverts)]
    for fi in range(nf):
        for v in F[fi]:
            v_faces[int(v)].append(fi)
    for ei, (a, b) in enumerate(edges):
        v_edges[a].append(ei)
        v_edges[b].append(ei)
    for v in range(nverts):
        es = v_edges[v]
        if not es:
            add(v, v, 1.0)
            continue
        bes = [e for e in es if boundary[e]]
        if bes:
            # boundary (crease) rule: 3/4 P + 1/8 each boundary neighbour
            nb = [edges[e][0] if edges[e][1] == v else edges[e][1] for e in bes][:2]
            if len(nb) < 2:
                add(v, v, 1.0)
                continue
            add(v, v, 0.75)
            for u in nb:
                add(v, u, 0.125)
            continue
        n = len(es)
        fs = v_faces[v]
        # (Q + 2R + (n - 3) P) / n with Q = mean face point, R = mean edge midpoint
        for f in fs:
            for u in F[f]:
                add(v, int(u), 0.25 / len(fs) / n)
        for e in es:
            a, b = edges[e]
            add(v, a, 2 * 0.5 / len(es) / n)
            add(v, b, 2 * 0.5 / len(es) / n)
        add(v, v, (n - 3) / n)
    S = Operator(rows, cols, vals, (nverts + ne + nf, nverts))
    new = np.zeros((nf * 4, 4), np.int64)
    parent = np.repeat(np.arange(nf), 4)
    corner = np.tile(np.arange(4), nf)
    for fi in range(nf):
        for k in range(4):
            e_next = nverts + face_edges[fi, k]
            e_prev = nverts + face_edges[fi, (k + 3) % 4]
            new[fi * 4 + k] = (F[fi, k], e_next, fbase + fi, e_prev)
    return S, new, parent, corner


def subdivide_corners(corner_data, parent, corner):
    """Bilinear face-varying subdivision. corner_data: (nf, 4, d) -> (4nf, 4, d) matching catmull_clark's faces."""
    C = np.asarray(corner_data)
    p = C[parent]
    k = corner
    i = np.arange(len(k))
    c0 = p[i, k]
    c1 = 0.5 * (p[i, k] + p[i, (k + 1) % 4])
    c2 = p.mean(1)
    c3 = 0.5 * (p[i, (k + 3) % 4] + p[i, k])
    return np.stack([c0, c1, c2, c3], 1)
