import * as THREE from 'three'
import { DIRS, VS, vk, vp } from './voxelHelpers.js'
import { w2s } from './gestureUtils.js'

const FACE_HIT_PX = 110

export function nearFace(S, sx, sy) {
  const { cam, piv, vox, ren } = S
  const W = ren.domElement.width, H = ren.domElement.height
  let best = null, bd = FACE_HIT_PX

  for (const k of vox) {
    const [vx, vy, vz] = vp(k)
    for (const [dx, dy, dz] of DIRS) {
      if (vox.has(vk(vx + dx, vy + dy, vz + dz))) continue
      const fc = new THREE.Vector3(
        (vx + dx * .5) * VS,
        (vy + dy * .5) * VS,
        (vz + dz * .5) * VS
      )
      piv.localToWorld(fc)
      const s = w2s(fc, cam, W, H)
      if (!s.ok) continue
      const d = Math.hypot(sx - s.x, sy - s.y)
      if (d < bd) { bd = d; best = { vp: [vx, vy, vz], dir: [dx, dy, dz], scr: s } }
    }
  }
  return best
}

export function nearVox(S, sx, sy) {
  const { cam, piv, vox, ren } = S
  const W = ren.domElement.width, H = ren.domElement.height
  let best = null, bd = FACE_HIT_PX * 1.8

  for (const k of vox) {
    if (k === '0,0,0') continue
    const [vx, vy, vz] = vp(k)
    const wc = new THREE.Vector3(vx * VS, vy * VS, vz * VS)
    piv.localToWorld(wc)
    const s = w2s(wc, cam, W, H)
    if (!s.ok) continue
    const d = Math.hypot(sx - s.x, sy - s.y)
    if (d < bd) { bd = d; best = { vp: [vx, vy, vz] } }
  }
  return best
}

export function axisInfo(S, dir) {
  const { cam, piv, ren } = S
  const W = ren.domElement.width, H = ren.domElement.height
  const p0 = new THREE.Vector3(0, 0, 0)
  const p1 = new THREE.Vector3(dir[0] * VS, dir[1] * VS, dir[2] * VS)
  piv.localToWorld(p0)
  piv.localToWorld(p1)
  const s0 = w2s(p0, cam, W, H)
  const s1 = w2s(p1, cam, W, H)
  const dx = s1.x - s0.x, dy = s1.y - s0.y
  const mag = Math.hypot(dx, dy) || 1
  return { nx: dx / mag, ny: dy / mag, px: mag }
}