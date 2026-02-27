import * as THREE from 'three'

export const VS = 1.0
export const DIRS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
export const VOXEL_COL = 0xff2d78

export const vk  = (x, y, z) => `${Math.round(x)},${Math.round(y)},${Math.round(z)}`
export const vp  = s => s.split(',').map(Number)

export function mkMesh(col = VOXEL_COL) {
  const geo   = new THREE.BoxGeometry(VS * .97, VS * .97, VS * .97)
  const edges = new THREE.EdgesGeometry(geo)
  const mat   = new THREE.LineBasicMaterial({ color: col })
  const lines = new THREE.LineSegments(edges, mat)

  const fillGeo = new THREE.BoxGeometry(VS * .93, VS * .93, VS * .93)
  const fillMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.07 })
  const fill    = new THREE.Mesh(fillGeo, fillMat)

  const grp = new THREE.Group()
  grp.add(lines)
  grp.add(fill)
  return grp
}

export function addV(S, x, y, z) {
  const k = vk(x, y, z)
  if (S.vox.has(k)) return false
  const m = mkMesh()
  m.position.set(x * VS, y * VS, z * VS)
  S.piv.add(m)
  S.msh.set(k, m)
  S.vox.add(k)
  return true
}

export function delV(S, x, y, z) {
  const k = vk(x, y, z)
  if (k === '0,0,0') return false
  const m = S.msh.get(k)
  if (!m) return false
  S.piv.remove(m)
  m.children.forEach(c => { c.geometry.dispose(); c.material.dispose() })
  S.msh.delete(k)
  S.vox.delete(k)
  return true
}

export function pruneOrphans(S) {
  if (!S.vox.has('0,0,0')) return
  const vis = new Set(['0,0,0']), q = ['0,0,0']
  while (q.length) {
    const [x, y, z] = vp(q.shift())
    for (const [dx, dy, dz] of DIRS) {
      const nk = vk(x + dx, y + dy, z + dz)
      if (S.vox.has(nk) && !vis.has(nk)) { vis.add(nk); q.push(nk) }
    }
  }
  for (const k of [...S.vox]) {
    if (!vis.has(k)) { const [x, y, z] = vp(k); delV(S, x, y, z) }
  }
}

export function isAdj(S, x, y, z) {
  return DIRS.some(([dx, dy, dz]) => S.vox.has(vk(x + dx, y + dy, z + dz)))
}

export function resetScene(S) {
  for (const k of [...S.vox]) {
    const [x, y, z] = vp(k)
    const m = S.msh.get(k)
    if (m) {
      S.piv.remove(m)
      m.children.forEach(c => { c.geometry.dispose(); c.material.dispose() })
    }
    S.msh.delete(k)
    S.vox.delete(k)
  }
  S.ps       = [mkPS(), mkPS()]
  S.actFace  = null
  addV(S, 0, 0, 0)
}

export const mkPS = () => ({ on: false, axis: null, front: null, prog: 0, prev: null })