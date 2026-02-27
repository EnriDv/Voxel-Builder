import { lm2s, GCOL, GLBL } from './gestureUtils.js'
import { axisInfo } from './sceneQueries.js'

const CONNS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[0,17],[17,18],[18,19],[19,20],
]

export function drawOverlay(ctx, S, W, H) {
  ctx.clearRect(0, 0, W, H)

  S.hnd.forEach((hand, i) => {
    if (!hand) return
    const col = GCOL[S.ges[i]] || '#fff'

    // ── Skeleton lines ────────────────────────────────────────
    ctx.strokeStyle = col
    ctx.lineWidth   = 2
    ctx.shadowColor = col
    ctx.shadowBlur  = 10
    ctx.beginPath()
    CONNS.forEach(([a, b]) => {
      const pa = lm2s(hand[a], W, H), pb = lm2s(hand[b], W, H)
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
    })
    ctx.stroke()
    ctx.shadowBlur = 0

    // ── Landmark dots ─────────────────────────────────────────
    ctx.fillStyle = col
    hand.forEach((lm, j) => {
      const { x, y } = lm2s(lm, W, H)
      const r = (j === 4 || j === 8) ? 8 : 3
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    })

    // ── Pinch dashed line ─────────────────────────────────────
    if (S.ges[i] === 'pinch') {
      const t  = lm2s(hand[4], W, H)
      const ix = lm2s(hand[8], W, H)
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth   = 1.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(t.x, t.y)
      ctx.lineTo(ix.x, ix.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // ── Gesture label badge ───────────────────────────────────
    const label = GLBL[S.ges[i]]
    if (label) {
      const wrist = lm2s(hand[0], W, H)
      ctx.font = 'bold 11px "Courier New", monospace'
      const tw = ctx.measureText(label).width
      const bx = wrist.x - tw / 2 - 8, by = wrist.y + 38
      ctx.fillStyle = 'rgba(0,0,0,0.65)'
      ctx.beginPath()
      ctx.roundRect(bx, by - 14, tw + 16, 20, 4)
      ctx.fill()
      ctx.fillStyle = col
      ctx.fillText(label, bx + 8, by + 1)
    }
  })

  // ── Active face indicator + arrow ────────────────────────────
  if (S.actFace) {
    const { scr, dir } = S.actFace

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth   = 2.5
    ctx.shadowColor = '#ff2d78'
    ctx.shadowBlur  = 20
    ctx.beginPath()
    ctx.arc(scr.x, scr.y, 24, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0

    const ai    = axisInfo(S, dir)
    const ax    = scr.x + ai.nx * 46
    const ay    = scr.y + ai.ny * 46
    const angle = Math.atan2(ai.ny, ai.nx)

    ctx.strokeStyle = '#ff2d78'
    ctx.lineWidth   = 3
    ctx.shadowColor = '#ff2d78'
    ctx.shadowBlur  = 12
    ctx.beginPath()
    ctx.moveTo(scr.x, scr.y)
    ctx.lineTo(ax, ay)
    ctx.stroke()
    ctx.shadowBlur = 0

    ctx.fillStyle = '#ff2d78'
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(ax - 13 * Math.cos(angle - .4), ay - 13 * Math.sin(angle - .4))
    ctx.lineTo(ax - 13 * Math.cos(angle + .4), ay - 13 * Math.sin(angle + .4))
    ctx.closePath()
    ctx.fill()
  }
}