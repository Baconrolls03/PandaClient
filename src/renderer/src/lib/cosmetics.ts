// Drawing PandaClient cosmetics. The in-game mod implements the same rules, so what you see here is
// what other players see: capes are painted onto Minecraft's 64×32 cape texture from a pattern, and
// everything else is a set of coloured boxes in head/body space (skin pixels, face looking toward -z).
import { BoxGeometry, Group, Mesh, MeshLambertMaterial, type Object3D } from 'three'
import type { Cosmetic, CosmeticBox } from '@shared/types'

type RGB = [number, number, number]
const rgb = (hex: string): RGB => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB
/** Multi-stop gradient, t in 0..1. */
function ramp(stops: RGB[], t: number): RGB {
  if (stops.length === 1) return stops[0]
  const x = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1)
  const i = Math.floor(x)
  return mix(stops[i], stops[i + 1], x - i)
}
/** Small deterministic hash so "random" stars look the same everywhere. */
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

// 6×6 panda face for the "emblem" pattern: d = dark, w = white, . = background
const PANDA = ['d....d', 'wwwwww', 'wdwwdw', 'wwwwww', 'wwddww', '.wwww.']

/** Colour of one cape pixel. (u, v) are coordinates on a 10×16 cape face. */
export function capePixel(pattern: string, colors: string[], u: number, v: number): RGB {
  const c = colors.map(rgb)
  switch (pattern) {
    case 'gradient':
      return ramp(c, v / 15)
    case 'stripes':
      return Math.floor(v / 2) % 2 ? c[1] : c[0]
    case 'checker':
      return (Math.floor(u / 2) + Math.floor(v / 2)) % 2 ? c[1] : c[0]
    case 'split':
      return u < 5 ? c[0] : c[1]
    case 'trim':
      return u === 0 || u === 9 || v === 0 || v >= 14 ? c[1] : c[0]
    case 'waves': {
      const base = ramp([c[0], c[1]], v / 15)
      return (v + Math.round(Math.sin(u * 0.9) * 1.5) + 20) % 5 === 0 ? c[2] : base
    }
    case 'stars': {
      const base = ramp([c[0], c[1]], v / 15)
      return hash(u, v) > 0.9 ? c[2] : base
    }
    case 'dots':
      if (u % 3 === 1 && v % 3 === 1) return (u + v) % 4 === 0 ? c[2] : c[1]
      return c[0]
    case 'emblem': {
      const base = ramp([c[0], c[1]], Math.max(0, (v - 8) / 7))
      const x = u - 2
      const y = v - 4
      const cell = PANDA[y]?.[x]
      if (cell === 'd') return c[2]
      if (cell === 'w') return [243, 245, 248]
      return base
    }
    default:
      return c[0] ?? [110, 224, 143]
  }
}

/** Paint a cape texture (64×32, Minecraft's layout) for a cape cosmetic. */
export function drawCape(cosmetic: Pick<Cosmetic, 'model'>, scale = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 64 * scale
  canvas.height = 32 * scale
  const ctx = canvas.getContext('2d')!
  const { pattern = 'gradient', colors = ['#6EE08F'] } = cosmetic.model
  const put = (x: number, y: number, [r, g, b]: RGB) => {
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(x * scale, y * scale, scale, scale)
  }
  for (let v = 0; v < 16; v++) {
    for (let u = 0; u < 10; u++) {
      const px = capePixel(pattern, colors, u, v)
      put(1 + u, 1 + v, px) // outer face
      put(12 + (9 - u), 1 + v, px) // inner face (mirrored)
    }
    // sides
    put(0, 1 + v, capePixel(pattern, colors, 0, v))
    put(11, 1 + v, capePixel(pattern, colors, 9, v))
  }
  for (let u = 0; u < 10; u++) {
    put(1 + u, 0, capePixel(pattern, colors, u, 0))
    put(11 + u, 0, capePixel(pattern, colors, u, 15))
  }
  return canvas
}

/** Flat preview of a cape for item cards (just the outer face). */
export function capeThumbnail(cosmetic: Pick<Cosmetic, 'model'>, scale = 8): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 10 * scale
  canvas.height = 16 * scale
  const ctx = canvas.getContext('2d')!
  const { pattern = 'gradient', colors = ['#6EE08F'] } = cosmetic.model
  for (let v = 0; v < 16; v++)
    for (let u = 0; u < 10; u++) {
      const [r, g, b] = capePixel(pattern, colors, u, v)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(u * scale, v * scale, scale, scale)
    }
  return canvas
}

/* ───────────── Default skin ───────────── */

/** An original PandaClient default skin (64×64), used until the player's real skin loads. */
export function defaultSkin(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')!
  const fill = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }
  const skin = '#E9C9A8'
  const hair = '#2A2235'
  const shirt = '#6EE08F'
  const shirtDark = '#3DBE6A'
  const pants = '#2A3546'
  const shoe = '#141B24'
  // Head (all faces), then hair on top and back, face details on the front (8,8).
  fill(skin, 0, 8, 32, 8)
  fill(hair, 8, 0, 8, 8)
  fill(hair, 0, 8, 8, 3)
  fill(hair, 16, 8, 8, 3)
  fill(hair, 24, 8, 8, 8)
  fill(hair, 8, 8, 8, 2)
  fill('#FFFFFF', 9, 12, 2, 1)
  fill('#FFFFFF', 13, 12, 2, 1)
  fill(hair, 10, 12, 1, 1)
  fill(hair, 13, 12, 1, 1)
  fill('#C98E7A', 11, 14, 2, 1)
  // Body (16,16) and arms (40,16 / 32,48): mint hoodie.
  fill(shirt, 16, 16, 24, 16)
  fill(shirtDark, 16, 16, 24, 4)
  fill(shirt, 40, 16, 16, 16)
  fill(shirt, 32, 48, 16, 16)
  fill(skin, 44, 28, 4, 4)
  fill(skin, 36, 60, 4, 4)
  // Legs (0,16 / 16,48).
  fill(pants, 0, 16, 16, 16)
  fill(pants, 16, 48, 16, 16)
  fill(shoe, 0, 28, 16, 4)
  fill(shoe, 16, 60, 16, 4)
  return c
}

/* ───────────── Box cosmetics (three.js) ───────────── */

const materials = new Map<string, MeshLambertMaterial>()
const material = (color: string) => {
  if (!materials.has(color)) materials.set(color, new MeshLambertMaterial({ color }))
  return materials.get(color)!
}

export interface CosmeticMesh {
  group: Group
  /** Wing parts to animate: rotate around their pivot by sin(t) × flap. */
  flaps: { pivot: Group; flap: number }[]
}

/**
 * Build a group for a box cosmetic in skinview3d's coordinates:
 * head group origin = neck (head spans y 0..8), body group origin = body centre (y -6..6); +z = front.
 */
export function buildCosmetic(c: Cosmetic): CosmeticMesh {
  const group = new Group()
  group.name = `cosmetic:${c.id}`
  const flaps: CosmeticMesh['flaps'] = []
  const yOffset = c.model.space === 'body' ? -6 : 0
  for (const b of c.model.boxes ?? []) {
    const mesh = boxMesh(b)
    if (b.pivot && b.flap) {
      const pivot = new Group()
      pivot.position.set(b.pivot[0], b.pivot[1] + yOffset, -b.pivot[2])
      mesh.position.x -= b.pivot[0]
      mesh.position.y += yOffset - (b.pivot[1] + yOffset)
      mesh.position.z += b.pivot[2]
      pivot.add(mesh)
      group.add(pivot)
      flaps.push({ pivot, flap: b.flap })
    } else {
      mesh.position.y += yOffset
      group.add(mesh)
    }
  }
  return { group, flaps }
}

function boxMesh(b: CosmeticBox): Mesh {
  const [x1, x2] = [Math.min(b.from[0], b.to[0]), Math.max(b.from[0], b.to[0])]
  const [y1, y2] = [Math.min(b.from[1], b.to[1]), Math.max(b.from[1], b.to[1])]
  const [z1, z2] = [Math.min(b.from[2], b.to[2]), Math.max(b.from[2], b.to[2])]
  const mesh = new Mesh(new BoxGeometry(x2 - x1, y2 - y1, z2 - z1), material(b.color))
  // Our space has the face toward -z; skinview3d's front is +z, so flip z.
  mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, -(z1 + z2) / 2)
  return mesh
}

export function disposeCosmetic(obj: Object3D): void {
  obj.traverse((o) => {
    if (o instanceof Mesh) o.geometry.dispose()
  })
  obj.removeFromParent()
}

/* ───────────── Flat thumbnails for item cards ───────────── */

const shadeHex = (hex: string, k: number) => {
  const [r, g, b] = rgb(hex).map((x) => Math.max(0, Math.min(255, Math.round(x * k))))
  return `rgb(${r},${g},${b})`
}

/**
 * Orthographic view of a box cosmetic: head items from the front, body items (wings, backpacks) from the back,
 * over a faint silhouette of the head/body so you can see where it sits.
 */
export function boxThumbnail(c: Cosmetic, size = 160, silhouette = 'rgba(139,152,169,0.18)'): string {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const back = c.model.space === 'body'
  const boxes = c.model.boxes ?? []
  const base = back ? { x1: -4, x2: 4, y1: 0, y2: 12 } : { x1: -4, x2: 4, y1: 0, y2: 8 }
  let [minX, maxX, minY, maxY] = [base.x1, base.x2, base.y1, base.y2]
  for (const b of boxes) {
    minX = Math.min(minX, b.from[0], b.to[0])
    maxX = Math.max(maxX, b.from[0], b.to[0])
    minY = Math.min(minY, b.from[1], b.to[1])
    maxY = Math.max(maxY, b.from[1], b.to[1])
  }
  const span = Math.max(maxX - minX, maxY - minY) * 1.15
  const scale = size / span
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  // Front view looks along +z (face at -z); back view mirrors x.
  const sx = (x: number) => size / 2 + (back ? -(x - cx) : x - cx) * scale
  const sy = (y: number) => size / 2 - (y - cy) * scale
  const rect = (x1: number, x2: number, y1: number, y2: number, fill: string) => {
    const a = sx(x1)
    const b = sx(x2)
    ctx.fillStyle = fill
    ctx.fillRect(Math.min(a, b), sy(y2), Math.abs(b - a), sy(y1) - sy(y2))
  }
  rect(base.x1, base.x2, base.y1, base.y2, silhouette)
  // Draw far boxes first: front view = larger z is farther; back view = smaller z is farther.
  const depth = (b: CosmeticBox) => (back ? 1 : -1) * Math.max(b.from[2], b.to[2])
  for (const b of [...boxes].sort((p, q) => depth(q) - depth(p))) {
    const x1 = Math.min(b.from[0], b.to[0])
    const x2 = Math.max(b.from[0], b.to[0])
    const y1 = Math.min(b.from[1], b.to[1])
    const y2 = Math.max(b.from[1], b.to[1])
    rect(x1, x2, y1, y2, b.color)
    // A little top highlight and bottom shade so it reads as 3D.
    const h = Math.max(1, (y2 - y1) * scale * 0.18)
    ctx.fillStyle = shadeHex(b.color, 1.18)
    ctx.fillRect(Math.min(sx(x1), sx(x2)), sy(y2), Math.abs(sx(x2) - sx(x1)), Math.min(h, 3))
    ctx.fillStyle = shadeHex(b.color, 0.78)
    ctx.fillRect(Math.min(sx(x1), sx(x2)), sy(y1) - Math.min(h, 3), Math.abs(sx(x2) - sx(x1)), Math.min(h, 3))
  }
  return canvas.toDataURL()
}

export function cosmeticThumbnail(c: Cosmetic): string {
  return c.category === 'cape' ? capeThumbnail(c, 8).toDataURL() : boxThumbnail(c)
}
