"""UV-space rasterization helpers (numpy only): bake per-vertex data into textures, dilate island borders,
per-vertex tangent frames, image I/O through Blender."""
import os

import numpy as np


def tangents(P, N, UV, tris):
    """Per-vertex tangents (xyz, w) from UV gradients, area-weighted and orthogonalized to N.
    The renderer rebuilds the bitangent as cross(N, T) * w, so baked tangent-space maps use the same frame."""
    p0, p1, p2 = P[tris[:, 0]], P[tris[:, 1]], P[tris[:, 2]]
    u0, u1, u2 = UV[tris[:, 0]], UV[tris[:, 1]], UV[tris[:, 2]]
    e1, e2 = p1 - p0, p2 - p0
    d1, d2 = u1 - u0, u2 - u0
    det = d1[:, 0] * d2[:, 1] - d2[:, 0] * d1[:, 1]
    r = np.where(np.abs(det) > 1e-14, 1.0 / np.where(det == 0, 1, det), 0.0)
    t = (e1 * d2[:, 1:2] - e2 * d1[:, 1:2]) * r[:, None]
    b = (e2 * d1[:, 0:1] - e1 * d2[:, 0:1]) * r[:, None]
    area = 0.5 * np.linalg.norm(np.cross(e1, e2), axis=1)
    tn = t / (np.linalg.norm(t, axis=1, keepdims=True) + 1e-20) * area[:, None]
    bn = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-20) * area[:, None]
    T = np.zeros_like(P)
    Bv = np.zeros_like(P)
    for k in range(3):
        np.add.at(T, tris[:, k], tn)
        np.add.at(Bv, tris[:, k], bn)
    T = T - N * (T * N).sum(1, keepdims=True)
    bad = np.linalg.norm(T, axis=1) < 1e-12
    if bad.any():
        ref = np.where(np.abs(N[bad, 0:1]) < 0.9, np.array([[1.0, 0, 0]]), np.array([[0, 1.0, 0]]))
        T[bad] = np.cross(N[bad], ref)
    T /= np.linalg.norm(T, axis=1, keepdims=True)
    w = np.where((np.cross(N, T) * Bv).sum(1) < 0, -1.0, 1.0)
    return np.c_[T, w]


def rasterize(uv, tris, attrs, size):
    """Barycentric rasterization in UV space (glTF convention: v down, row 0 = v 0).
    attrs: dict name -> (n, c) per-vertex arrays. Returns (dict name -> (size, size, c), coverage mask)."""
    out = {k: np.zeros((size, size, v.shape[1]), np.float32) for k, v in attrs.items()}
    cov = np.zeros((size, size), bool)
    px = uv * size - 0.5
    for t in tris:
        a, b, c = px[t[0]], px[t[1]], px[t[2]]
        x0 = max(int(np.floor(min(a[0], b[0], c[0]))), 0)
        x1 = min(int(np.ceil(max(a[0], b[0], c[0]))), size - 1)
        y0 = max(int(np.floor(min(a[1], b[1], c[1]))), 0)
        y1 = min(int(np.ceil(max(a[1], b[1], c[1]))), size - 1)
        if x1 < x0 or y1 < y0:
            continue
        det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(det) < 1e-12:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        l0 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / det
        l1 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / det
        l2 = 1 - l0 - l1
        e = -1e-4
        m = (l0 >= e) & (l1 >= e) & (l2 >= e)
        if not m.any():
            continue
        yy, xx = ys[m], xs[m]
        w0, w1, w2 = l0[m, None], l1[m, None], l2[m, None]
        for k, v in attrs.items():
            out[k][yy, xx] = w0 * v[t[0]] + w1 * v[t[1]] + w2 * v[t[2]]
        cov[yy, xx] = True
    return out, cov


def dilate(img, cov, passes=16):
    """Grows island borders outward into empty texels (keeps mip levels from bleeding background)."""
    img = img.copy()
    cov = cov.copy()
    for _ in range(passes):
        acc = np.zeros_like(img)
        cnt = np.zeros(cov.shape, np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            sc = np.roll(np.roll(cov, dy, 0), dx, 1)
            si = np.roll(np.roll(img, dy, 0), dx, 1)
            acc += si * sc[..., None]
            cnt += sc
        grow = (~cov) & (cnt > 0)
        if not grow.any():
            break
        img[grow] = acc[grow] / cnt[grow, None]
        cov = cov | grow
    return img, cov


def blur(img, radius):
    """Separable box blur x3 (≈ Gaussian) with wrap-around, radius in texels."""
    r = max(1, int(radius))
    out = img.astype(np.float32)
    for _ in range(3):
        for ax in (0, 1):
            c = np.cumsum(np.concatenate([out.take(range(-r - 1, 0), axis=ax), out, out.take(range(0, r), axis=ax)], axis=ax), axis=ax)
            n = out.shape[ax]
            out = (c.take(range(2 * r + 1, 2 * r + 1 + n), axis=ax) - c.take(range(0, n), axis=ax)) / (2 * r + 1)
    return out


def sample(img, uv):
    """Bilinear sample of an (h, w, c) image at glTF-convention UVs (n, 2)."""
    h, w = img.shape[:2]
    x = np.clip(uv[..., 0] * w - 0.5, 0, w - 1.001)
    y = np.clip(uv[..., 1] * h - 0.5, 0, h - 1.001)
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx = (x - x0)[..., None]
    fy = (y - y0)[..., None]
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)


def load_image(path):
    """PNG -> float32 (h, w, 4), row 0 at the top."""
    import bpy

    im = bpy.data.images.load(path)
    w, h = im.size
    px = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(px)
    bpy.data.images.remove(im)
    return np.flipud(px.reshape(h, w, 4)).copy()


def save_image(path, img, colorspace="Non-Color"):
    """float (h, w, c in 1..4, 0..1) with row 0 at the top -> 8-bit RGBA PNG."""
    import bpy

    os.makedirs(os.path.dirname(path), exist_ok=True)
    h, w = img.shape[:2]
    c = img.shape[2] if img.ndim == 3 else 1
    rgba = np.ones((h, w, 4), np.float32)
    if c == 1:
        rgba[..., :3] = img.reshape(h, w, 1)
    else:
        rgba[..., :c] = img[..., :c]
    im = bpy.data.images.new(os.path.basename(path), width=w, height=h, alpha=True, float_buffer=False)
    im.colorspace_settings.name = colorspace
    im.pixels.foreach_set(np.flipud(np.clip(rgba, 0, 1)).ravel())
    im.filepath_raw = path
    im.file_format = "PNG"
    im.save()
    bpy.data.images.remove(im)


def downsample(img, factor):
    h, w = img.shape[:2]
    return img.reshape(h // factor, factor, w // factor, factor, -1).mean((1, 3))
