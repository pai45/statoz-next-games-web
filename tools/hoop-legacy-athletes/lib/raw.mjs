// Builds a skinned glTF Document from the raw meshes written by blender/common.py write_raw():
// rig-ordered joint nodes (named by bone), identity inverse bind matrices, named morph targets
// (mesh.extras.targetNames) and tangents: the exported TANGENT when present (the frame the baker used),
// otherwise MikkTSpace computed from the exported normals and UVs.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Document } from '@gltf-transform/core'
import { generateTangents } from 'mikktspace'

const CTOR = { float32: Float32Array, uint16: Uint16Array, uint32: Uint32Array }
const TYPE = { 1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4' }

export function rawToDocument(jsonPath) {
  const raw = JSON.parse(readFileSync(jsonPath, 'utf8'))
  const bin = readFileSync(path.join(path.dirname(jsonPath), raw.bin))
  const view = (a) => new CTOR[a.dtype](bin.buffer.slice(bin.byteOffset + a.offset, bin.byteOffset + a.offset + a.count * a.size * CTOR[a.dtype].BYTES_PER_ELEMENT))

  const doc = new Document()
  const buffer = doc.createBuffer()
  const scene = doc.createScene()
  const root = doc.createNode('rig')
  scene.addChild(root)
  const joints = raw.bones.map((n) => {
    const j = doc.createNode(n)
    root.addChild(j)
    return j
  })
  const ibm = new Float32Array(16 * joints.length)
  for (let i = 0; i < joints.length; i++) for (const k of [0, 5, 10, 15]) ibm[i * 16 + k] = 1
  const skin = doc.createSkin('rig').setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buffer))
  for (const j of joints) skin.addJoint(j)

  const acc = (arr, size, normalized = false) => doc.createAccessor().setType(TYPE[size]).setArray(arr).setBuffer(buffer).setNormalized(normalized)
  for (const m of raw.meshes) {
    const prim = doc.createPrimitive()
    const attrs = {}
    for (const [sem, a] of Object.entries(m.attributes)) {
      attrs[sem] = view(a)
      prim.setAttribute(sem, acc(attrs[sem], a.size))
    }
    const idx = view(m.indices)
    prim.setIndices(acc(idx, 1))
    if (m.tangents && attrs.TEXCOORD_0) prim.setAttribute('TANGENT', acc(tangentsFor(attrs.POSITION, attrs.NORMAL, attrs.TEXCOORD_0, idx), 4))
    for (const mt of m.morphs) {
      const t = doc.createPrimitiveTarget(mt.name)
      t.setAttribute('POSITION', acc(view(mt.POSITION), 3))
      if (mt.NORMAL) t.setAttribute('NORMAL', acc(view(mt.NORMAL), 3))
      prim.addTarget(t)
    }
    const mesh = doc.createMesh(m.name).addPrimitive(prim)
    if (m.morphs.length) mesh.setExtras({ targetNames: m.morphs.map((mt) => mt.name) }).setWeights(m.morphs.map(() => 0))
    const node = doc.createNode(m.name).setMesh(mesh).setSkin(skin)
    scene.addChild(node)
  }
  return doc
}

/** MikkTSpace on unwelded corners, folded back onto the (already UV-split) vertices. */
function tangentsFor(P, N, UV, idx) {
  const n = idx.length
  const p = new Float32Array(n * 3)
  const nn = new Float32Array(n * 3)
  const uv = new Float32Array(n * 2)
  for (let c = 0; c < n; c++) {
    const v = idx[c]
    p.set(P.subarray(v * 3, v * 3 + 3), c * 3)
    nn.set(N.subarray(v * 3, v * 3 + 3), c * 3)
    uv.set(UV.subarray(v * 2, v * 2 + 2), c * 2)
  }
  const t = generateTangents(p, nn, uv)
  const vc = P.length / 3
  const out = new Float32Array(vc * 4)
  const seen = new Uint8Array(vc)
  for (let c = 0; c < n; c++) {
    const v = idx[c]
    out[v * 4] += t[c * 4]
    out[v * 4 + 1] += t[c * 4 + 1]
    out[v * 4 + 2] += t[c * 4 + 2]
    if (!seen[v]) {
      out[v * 4 + 3] = t[c * 4 + 3]
      seen[v] = 1
    }
  }
  for (let v = 0; v < vc; v++) {
    const l = Math.hypot(out[v * 4], out[v * 4 + 1], out[v * 4 + 2]) || 1
    out[v * 4] /= l
    out[v * 4 + 1] /= l
    out[v * 4 + 2] /= l
    if (!out[v * 4 + 3]) out[v * 4 + 3] = 1
  }
  return out
}
