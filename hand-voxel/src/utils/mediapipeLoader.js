const BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4'
const CAM_UTILS = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js'

function loadScript(src) {
  return new Promise((resolve, reject) => {
    // avoid loading duplicates
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src     = src
    s.onload  = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

/**
 * Loads MediaPipe Hands + Camera Utils from CDN, then starts the camera loop.
 * @param {HTMLVideoElement} video
 * @param {function} onResult  - called every frame with MediaPipe results
 * @param {function} onReady   - called once tracking is live (or with 'error')
 */
export async function loadMediaPipe(video, onResult, onReady) {
  try {
    await loadScript(`${BASE}/hands.js`)
    await loadScript(CAM_UTILS)

    const hands = new window.Hands({
      locateFile: f => `${BASE}/${f}`,
    })

    hands.setOptions({
      maxNumHands:            2,
      modelComplexity:        1,
      minDetectionConfidence: 0.72,
      minTrackingConfidence:  0.55,
    })

    hands.onResults(onResult)

    const camera = new window.Camera(video, {
      onFrame: async () => { await hands.send({ image: video }) },
      width:  1280,
      height: 720,
    })

    await camera.start()
    onReady(null)
  } catch (err) {
    console.error('[MediaPipe] load error:', err)
    onReady('error')
  }
}