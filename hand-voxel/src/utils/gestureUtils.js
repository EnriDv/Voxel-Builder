// ─── GESTURE CLASSIFICATION ────────────────────────────────────
const PINCH_THRESH = 0.08

export function classify(lm) {
  if (!lm?.length) return 'none'
  const t = lm[4], i = lm[8]
  if (Math.hypot(t.x - i.x, t.y - i.y) < PINCH_THRESH) return 'pinch'
  const ext = [
    lm[8].y  < lm[6].y,
    lm[12].y < lm[10].y,
    lm[16].y < lm[14].y,
    lm[20].y < lm[18].y,
  ]
  const n = ext.filter(Boolean).length
  if (n === 0)                              return 'fist'
  if (n >= 3)                               return 'open'
  if (ext[0] && !ext[1] && !ext[2] && !ext[3]) return 'point'
  return 'none'
}

// ─── COORDINATE HELPERS ───────────────────────────────────────
// Convert a MediaPipe landmark to screen pixels (mirrored X)
export const lm2s = (lm, W, H) => ({ x: (1 - lm.x) * W, y: lm.y * H })

// Project a Three.js world-space Vector3 to screen pixels
export function w2s(v3, cam, W, H) {
  const p = v3.clone().project(cam)
  return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, ok: p.z < 1 }
}

export const GCOL = {
  pinch: '#ff2d78',
  fist:  '#ff6b35',
  point: '#00e5ff',
  open:  '#45ff8a',
  none:  '#555',
}

export const GLBL = {
  pinch: 'PINCH · BUILD',
  fist:  'FIST · ERASE',
  point: 'POINT · ROTATE',
  open:  'OPEN · PAN',
  none:  '',
}