import { vk, addV, delV, pruneOrphans, isAdj, mkPS } from './voxelHelpers.js'
import { lm2s } from './gestureUtils.js'
import { nearFace, nearVox, axisInfo } from './sceneQueries.js'

export function interact(S, W, H) {
  const [g0, g1] = S.ges
  const [h0, h1] = S.hnd

  // ── ROTATE: one index finger pointing ──────────────────────
  let rotated = false
  for (let i = 0; i < 2; i++) {
    if (S.ges[i] === 'point' && S.hnd[i]) {
      const p = lm2s(S.hnd[i][8], W, H)
      if (S.rotPrev) {
        S.rot.y += (p.x - S.rotPrev.x) * 0.007
        S.rot.x  = Math.max(-1.2, Math.min(1.2, S.rot.x + (p.y - S.rotPrev.y) * 0.007))
      }
      S.rotPrev = p
      rotated = true
      break
    }
  }
  if (!rotated) S.rotPrev = null

  // ── PAN: both hands open ────────────────────────────────────
  if (g0 === 'open' && g1 === 'open' && h0 && h1) {
    const cx = ((1 - h0[0].x) + (1 - h1[0].x)) / 2 * W
    const cy = (h0[0].y + h1[0].y) / 2 * H
    if (S.panPrev) {
      S.pan.x += (cx - S.panPrev.x) / W * 14
      S.pan.y -= (cy - S.panPrev.y) / H * 14
    }
    S.panPrev = { x: cx, y: cy }
    S.ps = [mkPS(), mkPS()]
    S.actFace = null
    return
  }
  S.panPrev = null

  // ── PINCH: create / delete ──────────────────────────────────
  const delMode = g0 === 'fist' || g1 === 'fist'
  S.actFace = null

  for (let i = 0; i < 2; i++) {
    if (S.ges[i] === 'pinch' && S.hnd[i]) {
      handlePinch(S, i, delMode, W, H)
    } else {
      S.ps[i] = mkPS()
    }
  }
}

function handlePinch(S, idx, delMode, W, H) {
  const hand = S.hnd[idx]
  const pm   = { x: (hand[4].x + hand[8].x) / 2, y: (hand[4].y + hand[8].y) / 2 }
  const scr  = lm2s(pm, W, H)
  const ps   = S.ps[idx]

  // ── First frame of pinch ───────────────────────────────────
  if (!ps.on) {
    if (delMode) {
      const nv = nearVox(S, scr.x, scr.y)
      if (nv) {
        delV(S, ...nv.vp)
        pruneOrphans(S)
        ps.on   = true
        ps.prev = { ...scr }
      }
    } else {
      const f = nearFace(S, scr.x, scr.y)
      S.actFace = f
      if (f) {
        ps.on   = true
        ps.axis = f.dir
        ps.prev = { ...scr }
        ps.prog = 0
        const nx = f.vp[0] + f.dir[0]
        const ny = f.vp[1] + f.dir[1]
        const nz = f.vp[2] + f.dir[2]
        ps.front = [nx, ny, nz]
        if (!S.vox.has(vk(nx, ny, nz)) && isAdj(S, nx, ny, nz)) addV(S, nx, ny, nz)
      }
    }
    return
  }

  if (!ps.prev) { ps.prev = { ...scr }; return }

  // ── Erase sweep ────────────────────────────────────────────
  if (delMode) {
    const moved = Math.hypot(scr.x - ps.prev.x, scr.y - ps.prev.y)
    if (moved > 14) {
      const nv = nearVox(S, scr.x, scr.y)
      if (nv) { delV(S, ...nv.vp); pruneOrphans(S) }
      ps.prev = { ...scr }
    }
    return
  }

  // ── Build: axis-aligned continuous placement ────────────────
  const ddx = scr.x - ps.prev.x
  const ddy = scr.y - ps.prev.y
  ps.prev = { ...scr }
  const ai = axisInfo(S, ps.axis)
  ps.prog += ddx * ai.nx + ddy * ai.ny

  while (Math.abs(ps.prog) >= ai.px) {
    const sign = ps.prog > 0 ? 1 : -1
    ps.prog -= sign * ai.px
    const [cx, cy, cz] = ps.front
    const nx = cx + ps.axis[0] * sign
    const ny = cy + ps.axis[1] * sign
    const nz = cz + ps.axis[2] * sign
    if (!S.vox.has(vk(nx, ny, nz)) && isAdj(S, nx, ny, nz)) {
      addV(S, nx, ny, nz)
      ps.front = [nx, ny, nz]
    }
  }
}