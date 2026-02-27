import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { addV, resetScene, mkPS } from '../utils/voxelHelpers.js'
import { classify }               from '../utils/gestureUtils.js'
import { interact }               from '../utils/interactionLogic.js'
import { drawOverlay }            from '../utils/overlayDraw.js'
import { loadMediaPipe }          from '../utils/mediapipeLoader.js'

// ─── CONTROLS LEGEND DATA ─────────────────────────────────────────────────────
const CONTROLS = [
  { icon: '🤏', title: 'PINCH near face',  desc: 'Move hand → build voxels', col: '#ff2d78' },
  { icon: '✊+🤏', title: 'FIST + PINCH', desc: 'Sweep to erase voxels',    col: '#ff6b35' },
  { icon: '☝️', title: 'POINT index',     desc: 'Move to rotate space',     col: '#00e5ff' },
  { icon: '🖐️🖐️', title: 'BOTH OPEN',    desc: 'Move hands to pan',        col: '#45ff8a' },
]

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function VoxelBuilder() {
  const vidRef = useRef(null)
  const tRef   = useRef(null)   // Three.js canvas
  const oRef   = useRef(null)   // 2D overlay canvas
  const S      = useRef(null)   // mutable scene state (never triggers re-render)

  const [msg,      setMsg]      = useState('⏳ Requesting camera access…')
  const [voxCount, setVoxCount] = useState(1)

  // ─── SETUP ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = vidRef.current
    const tCvs  = tRef.current
    const oCvs  = oRef.current

    // Match canvas resolution to viewport
    const W = window.innerWidth
    const H = window.innerHeight
    oCvs.width  = W
    oCvs.height = H
    const oCtx = oCvs.getContext('2d')

    // ── Three.js scene ──────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    const cam   = new THREE.PerspectiveCamera(55, W / H, 0.1, 200)
    cam.position.set(0, 0, 10)

    const ren = new THREE.WebGLRenderer({ canvas: tCvs, alpha: true, antialias: true })
    ren.setSize(W, H)
    ren.setClearColor(0x000000, 0)
    ren.setPixelRatio(Math.min(devicePixelRatio, 2))

    const piv = new THREE.Group()
    scene.add(piv)
    scene.add(new THREE.AmbientLight(0xffffff, 1))

    // Small white sphere marks the origin voxel's center
    const originMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    )
    piv.add(originMesh)

    // ── Shared mutable state object ─────────────────────────────────────────
    const state = {
      scene, cam, ren, piv,
      vox: new Set(),
      msh: new Map(),
      hnd: [null, null],
      ges: ['none', 'none'],
      rot: { x: 0.35, y: 0.45 },
      pan: { x: 0, y: 0 },
      rotPrev:  null,
      panPrev:  null,
      ps:       [mkPS(), mkPS()],
      actFace:  null,
    }
    S.current = state
    addV(state, 0, 0, 0)

    // ── Camera + MediaPipe ──────────────────────────────────────────────────
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(stream => {
        video.srcObject = stream
        video.play()
        setMsg('⚙️ Loading hand tracking model…')

        loadMediaPipe(
          video,
          // onResult – called every camera frame by MediaPipe
          results => {
            // Map Right/Left labels → index 0/1
            const hm = {}
            results.multiHandLandmarks?.forEach((lm, i) => {
              hm[results.multiHandedness[i].label] = lm
            })
            state.hnd[0] = hm['Right'] || null
            state.hnd[1] = hm['Left']  || null
            state.ges[0] = classify(state.hnd[0])
            state.ges[1] = classify(state.hnd[1])

            interact(state, oCvs.width, oCvs.height)
            drawOverlay(oCtx, state, oCvs.width, oCvs.height)
          },
          // onReady
          err => {
            if (err) setMsg('❌ MediaPipe failed – check your network connection')
            else     setMsg('✅ Ready!  Show your hands to the camera')
          }
        )
      })
      .catch(e => setMsg('❌ Camera error: ' + e.message))

    // ── Resize handler ──────────────────────────────────────────────────────
    const onResize = () => {
      const W2 = window.innerWidth, H2 = window.innerHeight
      cam.aspect = W2 / H2
      cam.updateProjectionMatrix()
      ren.setSize(W2, H2)
      oCvs.width  = W2
      oCvs.height = H2
    }
    window.addEventListener('resize', onResize)

    // ── Render loop ─────────────────────────────────────────────────────────
    let rafId, frame = 0
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      frame++

      // Apply rotation & pan
      piv.rotation.x = state.rot.x
      piv.rotation.y = state.rot.y + frame * 0.0004  // subtle auto-spin
      piv.position.set(state.pan.x, state.pan.y, 0)

      ren.render(scene, cam)

      // Sync voxel count to UI every 20 frames (avoid per-frame re-renders)
      if (frame % 20 === 0) setVoxCount(state.vox.size)
    }
    animate()

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      ren.dispose()
    }
  }, [])

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#08080f',
      overflow: 'hidden',
      fontFamily: '"Courier New", monospace',
    }}>

      {/* ── Camera feed (mirrored) ────────────────────────────────────────── */}
      <video
        ref={vidRef}
        autoPlay muted playsInline
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          opacity: 0.62,
          filter: 'saturate(0.6) brightness(0.7)',
        }}
      />

      {/* ── CRT scanline aesthetic ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.08) 2px, rgba(0,0,0,.08) 4px)',
        zIndex: 1,
      }} />

      {/* ── Three.js voxel canvas ─────────────────────────────────────────── */}
      <canvas ref={tRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2 }} />

      {/* ── Hand skeleton / gesture overlay canvas ────────────────────────── */}
      <canvas ref={oRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3 }} />

      {/* ── Top bar: title + status ───────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'linear-gradient(180deg, rgba(8,8,15,.9) 0%, transparent 100%)',
        padding: '14px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ color: '#ff2d78', fontSize: 13, fontWeight: 'bold', letterSpacing: 3, textTransform: 'uppercase' }}>
            Voxel Builder
          </div>
          <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 10, marginTop: 2 }}>
            HAND-TRACKED · AR MODE
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#45ff8a', fontSize: 11 }}>{msg}</div>
          <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 10, marginTop: 2 }}>
            VOXELS: {voxCount}
          </div>
        </div>
      </div>

      {/* ── Bottom controls legend ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        background: 'linear-gradient(0deg, rgba(8,8,15,.92) 0%, transparent 100%)',
        padding: '14px 20px 16px',
      }}>
        <div style={{
          display: 'flex', gap: 0, justifyContent: 'center', flexWrap: 'wrap',
          borderTop: '1px solid rgba(255,45,120,.25)', paddingTop: 10,
        }}>
          {CONTROLS.map(({ icon, title, desc, col }) => (
            <div key={title} style={{
              textAlign: 'center', padding: '0 18px',
              borderRight: '1px solid rgba(255,255,255,.1)',
            }}>
              <div style={{ fontSize: 18 }}>{icon}</div>
              <div style={{ color: col, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginTop: 2 }}>{title}</div>
              <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 9, marginTop: 1 }}>{desc}</div>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 20 }}>
            <button
              onClick={() => S.current && resetScene(S.current)}
              style={{
                background: 'rgba(255,45,120,.15)',
                border: '1px solid rgba(255,45,120,.5)',
                color: '#ff2d78', padding: '6px 16px',
                borderRadius: 4, cursor: 'pointer',
                fontSize: 10, letterSpacing: 2,
                fontFamily: 'inherit', textTransform: 'uppercase',
              }}
            >
              RESET
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}